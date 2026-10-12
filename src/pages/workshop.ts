import { h } from '../lib/dom';
import { fmtDay } from '../lib/format';
import { renderMarkdown } from '../lib/markdown';
import { getWorkshop } from '../lib/data';
import { setTitle, type RouteResult } from '../lib/router';
import { fill, materials, tagList } from '../components/ui';
import { notFoundPage } from './notfound';

export function workshopPage(params: Record<string, string>): RouteResult {
  const host = h('div');
  fill(
    host,
    () => getWorkshop(params.slug),
    (w) => {
      if (!w) return notFoundPage('That workshop does not exist or is no longer published.').el;
      setTitle(w.title);

      const body = h('div', { class: 'prose' });
      body.innerHTML = renderMarkdown(w.body_md ?? '');

      return h(
        'article',
        null,
        h(
          'header',
          { class: 'article-head' },
          h(
            'div',
            { class: 'wrap wrap--narrow' },
            h('a', { class: 'back-link', href: '#/workshops' }, 'All workshops'),
            h('h1', null, w.title),
            w.summary ? h('p', { class: 'article-head__lead' }, w.summary) : null,
            h(
              'p',
              { class: 'article-head__meta' },
              h('time', { datetime: w.held_on }, fmtDay(w.held_on)),
              w.speaker ? h('span', null, `Led by ${w.speaker}`) : null,
            ),
            tagList(w.tags),
            materials(w),
          ),
        ),
        h('div', { class: 'section section--tight' }, h('div', { class: 'wrap wrap--narrow' }, body)),
      );
    },
  );

  return { title: 'Workshop', el: h('div', null, host) };
}
