import { h } from '../lib/dom';
import type { RouteResult } from '../lib/router';
import { listTeams } from '../lib/teams';
import { teamCard } from '../components/team';
import { emptyState, fill } from '../components/ui';
import '../styles/teams.css';

export function teamsPage(): RouteResult {
  const host = h('div');

  fill(host, listTeams, (items) =>
    items.length
      ? h('ul', { class: 'teams', role: 'list' }, items.map(teamCard))
      : emptyState('No teams yet', 'Organizers can add teams from the admin panel.'),
  );

  const el = h(
    'div',
    null,
    h(
      'section',
      { class: 'page-head' },
      h(
        'div',
        { class: 'wrap' },
        h('h1', null, 'Teams'),
        h('p', null, 'Small groups, one project each. Find the one that pulls you in, or start your own.'),
      ),
    ),
    h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, host)),
  );
  return { title: 'Teams', el };
}