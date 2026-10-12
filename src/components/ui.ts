import { h, icon, safeUrl } from '../lib/dom';
import { fmtDay, fmtMonth, fmtTime } from '../lib/format';
import type { Direction, EventItem, Workshop } from '../lib/types';

export const badge = (text: string): HTMLElement => h('span', { class: 'badge' }, text);

export function tagList(list: string[]): HTMLElement | null {
  if (!list.length) return null;
  return h(
    'ul',
    { class: 'tags', role: 'list' },
    list.map((t) => h('li', null, badge(t))),
  );
}

export function sectionHead(
  title: string,
  lead?: string,
  action?: { label: string; href: string },
): HTMLElement {
  return h(
    'div',
    { class: 'section-head' },
    h('div', null, h('h2', null, title), lead ? h('p', { class: 'section-head__lead' }, lead) : null),
    action ? h('a', { class: 'link-more', href: action.href }, action.label) : null,
  );
}

export const loading = (): HTMLElement =>
  h(
    'div',
    { class: 'state', role: 'status' },
    h('span', { class: 'spinner', 'aria-hidden': 'true' }),
    h('span', null, 'Loading'),
  );

export function emptyState(title: string, text: string, action?: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'state state--empty' },
    h('p', { class: 'state__title' }, title),
    h('p', { class: 'state__text' }, text),
    action,
  );
}

export function errorState(text: string, retry: () => void): HTMLElement {
  return h(
    'div',
    { class: 'state state--error', role: 'alert' },
    h('p', { class: 'state__title' }, 'This section did not load'),
    h('p', { class: 'state__text' }, text),
    h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: retry }, 'Try again'),
  );
}

/** Shows a loader, then renders data into `host`. Failures offer a retry. */
export function fill<T>(
  host: HTMLElement,
  load: () => Promise<T>,
  render: (data: T) => Node | null,
): void {
  const run = (): void => {
    host.replaceChildren(loading());
    load()
      .then((data) => {
        const node = render(data);
        host.replaceChildren(...(node ? [node] : []));
      })
      .catch((error) => {
        console.error(error);
        host.replaceChildren(
          errorState('Check your connection and try again.', run),
        );
      });
  };
  run();
}

const linkProps = (href: string) => ({
  href,
  target: '_blank',
  rel: 'noopener noreferrer',
});

export function materials(w: Workshop, compact = false): HTMLElement | null {
  const items: [string, string, ReturnType<typeof icon>][] = [];
  const pdf = safeUrl(w.pdf_url);
  const nb = safeUrl(w.notebook_url);
  const vid = safeUrl(w.video_url);
  if (pdf) items.push([pdf, 'PDF', icon('pdf')]);
  if (nb) items.push([nb, 'Notebook', icon('notebook')]);
  if (vid) items.push([vid, 'Recording', icon('video')]);
  if (!items.length) return null;
  return h(
    'ul',
    { class: compact ? 'materials materials--compact' : 'materials', role: 'list' },
    items.map(([href, label, ic]) =>
      h(
        'li',
        null,
        compact
          ? h('a', { class: 'materials__link', ...linkProps(href) }, ic, label)
          : h('a', { class: 'btn btn--ghost btn--small', ...linkProps(href) }, ic, label),
      ),
    ),
  );
}

export function directionRow(d: Direction): HTMLElement {
  return h(
    'li',
    { class: 'direction' },
    h('h3', { class: 'direction__title' }, d.title),
    h('p', { class: 'direction__summary' }, d.summary),
    d.level ? h('div', { class: 'direction__level' }, badge(d.level)) : null,
  );
}

export function eventRow(e: EventItem, past = false): HTMLElement {
  const date = new Date(e.starts_at);
  const url = safeUrl(e.registration_url);
  return h(
    'li',
    { class: past ? 'event event--past' : 'event' },
    h(
      'time',
      { class: 'event__date', datetime: e.starts_at },
      h('span', { class: 'event__day' }, String(date.getDate())),
      h('span', { class: 'event__month' }, fmtMonth(e.starts_at)),
    ),
    h(
      'div',
      { class: 'event__body' },
      h('h3', { class: 'event__title' }, e.title),
      e.summary ? h('p', { class: 'event__summary' }, e.summary) : null,
      h(
        'p',
        { class: 'event__meta' },
        h('span', null, icon('clock'), fmtTime(e.starts_at)),
        e.location ? h('span', null, icon('pin'), e.location) : null,
      ),
      tagList(e.tags),
    ),
    url && !past
      ? h(
          'a',
          { class: 'btn btn--primary btn--small event__cta', ...linkProps(url) },
          'Register',
        )
      : null,
  );
}

export function workshopRow(w: Workshop): HTMLElement {
  return h(
    'li',
    { class: 'workshop' },
    h('time', { class: 'workshop__date', datetime: w.held_on }, fmtDay(w.held_on)),
    h(
      'div',
      { class: 'workshop__main' },
      h(
        'h3',
        { class: 'workshop__title' },
        h(
          'a',
          { class: 'workshop__link', href: `#/workshops/${encodeURIComponent(w.slug)}` },
          w.title,
        ),
      ),
      w.summary ? h('p', { class: 'workshop__summary' }, w.summary) : null,
      w.speaker ? h('p', { class: 'workshop__speaker' }, `Led by ${w.speaker}`) : null,
    ),
    h('div', { class: 'workshop__side' }, tagList(w.tags), materials(w, true)),
  );
}
