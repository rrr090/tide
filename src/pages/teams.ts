import { h } from '../lib/dom';
import { authReady } from '../lib/auth';
import type { RouteResult } from '../lib/router';
import { listTeams } from '../lib/teams';
import { teamCard } from '../components/team';
import { emptyState, fill } from '../components/ui';
import '../styles/teams.css';

export function teamsPage(): RouteResult {
  const host = h('div');

  // Wait for sign-in so each row knows whether to offer Edit.
  const load = () => authReady().then(listTeams);

  fill(host, load, (items) =>
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
        h('p', null, 'Small groups, each working on one project. Join one or start your own.'),
        h('a', { class: 'btn btn--primary', href: '#/teams/new' }, 'Start a project'),
      ),
    ),
    h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, host)),
  );
  return { title: 'Teams', el };
}