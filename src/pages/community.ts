import { h } from '../lib/dom';
import { fmtRelative } from '../lib/format';
import { FormError, authReady, currentUser } from '../lib/auth';
import { CATEGORIES, authorName, createThread, listThreads, type ThreadSummary } from '../lib/community';
import { isDemo } from '../lib/supabase';
import type { RouteResult } from '../lib/router';
import { emptyState, fill } from '../components/ui';
import { field, formError, needsBackend, onSubmit, pageShell, signInLink, signInRequired } from '../components/forms';

function threadRow(t: ThreadSummary): HTMLElement {
  const replies = t.comment_count === 1 ? '1 reply' : `${t.comment_count} replies`;
  return h(
    'li',
    { class: 'thread' },
    h('h3', null, h('a', { class: 'thread__link', href: `#/community/${t.id}` }, t.title)),
    h(
      'p',
      { class: 'meta' },
      h('span', null, CATEGORIES[t.category] ?? t.category),
      h('span', null, authorName(t.author)),
      h('span', null, replies),
      h('span', null, fmtRelative(t.last_activity_at)),
    ),
  );
}

export async function communityPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('Community');
  await authReady();

  const host = h('div');
  fill(host, listThreads, (all) => {
    if (!all.length) {
      return emptyState('No posts yet', 'Ask a question or say what you are working on.');
    }
    let active: string | null = null;
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' });
    const results = h('ul', { class: 'thread-list', role: 'list' });

    const render = (): void => {
      const chip = (label: string, value: string | null) =>
        h(
          'button',
          {
            class: 'chip',
            type: 'button',
            'aria-pressed': String(active === value),
            onclick: () => {
              active = value;
              render();
            },
          },
          label,
        );
      chips.replaceChildren(chip('All', null), ...Object.entries(CATEGORIES).map(([key, label]) => chip(label, key)));
      const shown = all.filter((t) => !active || t.category === active);
      results.replaceChildren(
        ...(shown.length ? shown.map(threadRow) : [h('li', { class: 'thread muted' }, 'Nothing in this category yet.')]),
      );
    };
    render();
    return h('div', null, h('div', { class: 'community__filters' }, chips), results);
  });

  const action = currentUser()
    ? h('a', { class: 'btn btn--primary', href: '#/community/new' }, 'New post')
    : signInLink('Sign in to post');
  return pageShell('Community', 'Ask questions, share what you are building, and find people to work with.', host, action);
}

export async function newThreadPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('New post');
  await authReady();
  const user = currentUser();
  if (!user) return signInRequired('New post', 'Sign in to write a post.');

  const category = h(
    'select',
    { class: 'input' },
    Object.entries(CATEGORIES).map(([value, label]) => h('option', { value }, label)),
  );
  const title = h('input', { class: 'input', type: 'text', maxlength: 140 });
  const body = h('textarea', { class: 'input', rows: 8, maxlength: 10000 });
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Post');
  const form = h(
    'form',
    { class: 'panel form', novalidate: true },
    field('Category', category),
    field('Title', title),
    field('Post', body),
    error,
    h('div', { class: 'form__actions' }, submit, h('a', { class: 'btn btn--ghost', href: '#/community' }, 'Cancel')),
  );
  onSubmit(form, submit, 'Posting', error, async () => {
    if (title.value.trim().length < 3) throw new FormError('Give your post a title of at least 3 characters.');
    if (!body.value.trim()) throw new FormError('Write something in your post.');
    const id = await createThread(user.id, category.value, title.value.trim(), body.value.trim());
    window.location.hash = `#/community/${id}`;
  });
  return pageShell('New post', null, h('div', { class: 'narrow' }, form));
}
