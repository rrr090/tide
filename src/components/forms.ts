import { h } from '../lib/dom';
import { FormError, rememberReturn } from '../lib/auth';
import type { RouteResult } from '../lib/router';

let nextId = 0;

/** Label, control and optional help text, wired together for screen readers. */
export function field(
  label: string,
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  help?: string,
): HTMLElement {
  const id = `field-${++nextId}`;
  control.id = id;
  if (help) control.setAttribute('aria-describedby', `${id}-help`);
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    control,
    help ? h('p', { class: 'field__help', id: `${id}-help` }, help) : null,
  );
}

export const formError = (): HTMLParagraphElement => h('p', { class: 'form__error', role: 'alert' });

export function errorText(error: unknown): string {
  if (error instanceof FormError) return error.message;
  const code = (error as { code?: string } | null)?.code;
  if (code === '23505') return 'You have already done that.';
  if (code === '23514') return 'Some of that text is too short or too long.';
  if (code === '42501') return 'You do not have permission to do that.';
  return 'Something went wrong. Try again.';
}

/** Runs the action on submit, with a busy button and a visible error on failure. */
export function onSubmit(
  form: HTMLFormElement,
  button: HTMLButtonElement,
  busyLabel: string,
  error: HTMLElement,
  action: () => Promise<void>,
): void {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const label = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel;
    try {
      await action();
    } catch (failure) {
      if (!(failure instanceof FormError)) console.error(failure);
      error.textContent = errorText(failure);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

export function pageShell(title: string, lead: string | null, content: Node, action?: HTMLElement): RouteResult {
  return {
    title,
    el: h(
      'div',
      null,
      h(
        'section',
        { class: 'page-head' },
        h('div', { class: 'wrap' }, h('h1', null, title), lead ? h('p', null, lead) : null, action),
      ),
      h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, content)),
    ),
  };
}

export const needsBackend = (title: string): RouteResult =>
  pageShell(
    title,
    null,
    h(
      'div',
      { class: 'panel' },
      h('h2', null, 'This needs a live database'),
      h('p', null, 'The site is running on demo content, so accounts and posts are switched off.'),
    ),
  );

/** A link to sign in that brings the visitor back to this page afterwards. */
export const signInLink = (label: string, className = 'btn btn--primary'): HTMLAnchorElement =>
  h('a', { class: className, href: '#/signin', onclick: rememberReturn }, label);

export const signInRequired = (title: string, text: string): RouteResult => {
  const box = h('div', { class: 'panel panel--narrow' }, h('p', null, text), signInLink('Sign in'));
  return pageShell(title, null, box);
};
