import { h, safeUrl } from '../lib/dom';
import { isDemo } from '../lib/supabase';
import type { Team } from '../lib/teams';
import { tagList } from './ui';

export const STATUS_LABEL: Record<string, string> = {
  building: 'Building',
  shipped: 'Shipped',
  recruiting: 'Looking for members',
};

export function teamCard(t: Team): HTMLElement {
  const links: Array<[string, string]> = [];
  const repo = safeUrl(t.repo_url);
  if (repo) links.push(['Repository', repo]);
  const demo = safeUrl(t.demo_url);
  if (demo) links.push(['Live demo', demo]);

  const status = t.status || 'building';

  return h(
    'li',
    { class: 'team', 'data-status': status },
    h(
      'div',
      { class: 'team__body' },
      h(
        'div',
        { class: 'team__head' },
        h('h3', null, isDemo ? t.title : h('a', { class: 'team__title-link', href: `#/teams/${t.id}` }, t.title)),
        h('span', { class: 'badge team__status' }, STATUS_LABEL[status] ?? status),
      ),
      t.summary ? h('p', null, t.summary) : null,
      t.description ? h('p', { class: 'team__desc' }, t.description) : null,
      tagList(t.tags),
      links.length
        ? h(
            'div',
            { class: 'team__links' },
            links.map(([label, href]) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label)),
          )
        : null,
    ),
    t.members.length
      ? h(
          'ul',
          { class: 'team__members', role: 'list', 'aria-label': `${t.title} members` },
          t.members.map((m) => h('li', null, h('strong', null, m.name), m.role ? h('span', null, m.role) : null)),
        )
      : null,
  );
}
