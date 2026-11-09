import { h, safeUrl } from '../lib/dom';
import { FormError, authReady, currentUser, isStaffMember } from '../lib/auth';
import {
  approveMember,
  authorName,
  createTeam,
  deleteTeam,
  getOwnTeam,
  getTeam,
  removeMember,
  requestToJoin,
  updateTeam,
  type TeamDetail,
  type TeamInput,
} from '../lib/community';
import { isDemo } from '../lib/supabase';
import type { RouteResult } from '../lib/router';
import { fill, tagList } from '../components/ui';
import { STATUS_LABEL } from '../components/team';
import { errorText, field, formError, needsBackend, onSubmit, pageShell, signInLink, signInRequired } from '../components/forms';
import { notFoundPage } from './notfound';

export async function teamPage(params: Record<string, string>): Promise<RouteResult> {
  if (isDemo) return notFoundPage('Project pages need a live database.');
  await authReady();

  const host = h('div');
  const show = (): void =>
    fill(
      host,
      () => getTeam(params.id),
      (team) => (team ? render(team) : notFoundPage('That project does not exist or was removed.').el),
    );

  const render = (team: TeamDetail): HTMLElement => {
    document.title = `${team.title} | TIDE AI Club`;
    const user = currentUser();
    const manages = Boolean(user && (team.owner_id === user.id || isStaffMember()));
    const mine = user ? team.team_members.find((m) => m.user_id === user.id) : undefined;
    const active = team.team_members.filter((m) => m.status === 'active');
    const pending = team.team_members.filter((m) => m.status === 'pending');
    const problem = formError();

    const act = (button: () => Promise<void>) => async (): Promise<void> => {
      problem.textContent = '';
      try {
        await button();
        show();
      } catch (failure) {
        problem.textContent = errorText(failure);
      }
    };
    const textButton = (label: string, onclick: () => void): HTMLElement =>
      h('button', { class: 'text-button', type: 'button', onclick }, label);

    const links: [string, string | null][] = [
      ['Repository', safeUrl(team.repo_url)],
      ['Live demo', safeUrl(team.demo_url)],
    ];

    const memberRows = [
      ...team.members.map((m) => h('li', null, h('strong', null, m.name), h('span', null, m.role))),
      ...active.map((m) =>
        h(
          'li',
          null,
          h('strong', null, authorName(m.member)),
          h('span', null, m.role),
          manages && m.user_id !== team.owner_id
            ? textButton('Remove', () => {
                if (window.confirm(`Remove ${authorName(m.member)} from this project?`)) void act(() => removeMember(team.id, m.user_id))();
              })
            : null,
        ),
      ),
    ];

    let joinArea: HTMLElement | null = null;
    if (!user) {
      if (team.status === 'recruiting') joinArea = signInLink('Sign in to ask to join');
    } else if (mine?.status === 'pending') {
      joinArea = h(
        'p',
        { class: 'team-join__state' },
        'Your request is waiting for approval. ',
        textButton('Cancel request', act(() => removeMember(team.id, user.id))),
      );
    } else if (mine?.status === 'active') {
      if (team.owner_id !== user.id) {
        joinArea = h(
          'p',
          { class: 'team-join__state' },
          'You are on this team. ',
          textButton('Leave team', () => {
            if (window.confirm('Leave this project?')) void act(() => removeMember(team.id, user.id))();
          }),
        );
      }
    } else if (team.status === 'recruiting') {
      const note = h('textarea', { class: 'input', rows: 3, maxlength: 500 });
      const error = formError();
      const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Ask to join');
      const form = h('form', { class: 'form team-join', novalidate: true }, field('Why do you want to join?', note, 'Optional. Only the project owner sees this.'), error, submit);
      onSubmit(form, submit, 'Sending', error, async () => {
        await requestToJoin(team.id, user.id, note.value.trim());
        show();
      });
      joinArea = form;
    }

    return h(
      'article',
      { class: 'section section--tight' },
      h(
        'div',
        { class: 'wrap wrap--narrow' },
        h(
          'header',
          { class: 'article-head' },
          h('a', { class: 'back-link', href: '#/teams' }, 'All teams'),
          h('h1', null, team.title),
          h('p', { class: `team-status team-status--${team.status}` }, STATUS_LABEL[team.status] ?? team.status),
          team.summary ? h('p', { class: 'article-head__lead' }, team.summary) : null,
        ),
        team.description ? h('p', { class: 'post-text' }, team.description) : null,
        tagList(team.tags),
        h('p', { class: 'team__links' }, links.map(([label, href]) => (href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label) : null))),
        problem,
        h('h2', { class: 'subhead' }, 'Team'),
        memberRows.length ? h('ul', { class: 'team-people', role: 'list' }, memberRows) : h('p', { class: 'muted' }, 'Nobody has joined yet.'),
        joinArea,
        manages && pending.length
          ? h(
              'section',
              null,
              h('h2', { class: 'subhead' }, 'Requests to join'),
              h(
                'ul',
                { class: 'team-requests', role: 'list' },
                pending.map((m) =>
                  h(
                    'li',
                    null,
                    h('strong', null, authorName(m.member)),
                    m.message ? h('p', { class: 'post-text' }, m.message) : null,
                    h(
                      'div',
                      { class: 'form__actions' },
                      h('button', { class: 'btn btn--primary btn--small', type: 'button', onclick: act(() => approveMember(team.id, m.user_id)) }, 'Approve'),
                      h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: act(() => removeMember(team.id, m.user_id)) }, 'Decline'),
                    ),
                  ),
                ),
              ),
            )
          : null,
        manages
          ? h(
              'div',
              { class: 'form__actions team-manage' },
              h('a', { class: 'btn btn--ghost btn--small', href: `#/teams/${team.id}/edit` }, 'Edit project'),
              h(
                'button',
                {
                  class: 'btn btn--danger btn--small',
                  type: 'button',
                  onclick: async () => {
                    if (!window.confirm(`Delete "${team.title}"? This cannot be undone.`)) return;
                    try {
                      await deleteTeam(team.id);
                      window.location.hash = '#/teams';
                    } catch (failure) {
                      problem.textContent = errorText(failure);
                    }
                  },
                },
                'Delete project',
              ),
            )
          : null,
      ),
    );
  };

  show();
  return { title: 'Project', el: h('div', null, host) };
}

function teamForm(initial: TeamDetail | null, save: (input: TeamInput) => Promise<string>): HTMLElement {
  const title = h('input', { class: 'input', type: 'text', maxlength: 80, value: initial?.title ?? '' });
  const summary = h('input', { class: 'input', type: 'text', maxlength: 200, value: initial?.summary ?? '' });
  const description = h('textarea', { class: 'input', rows: 6, maxlength: 4000 });
  description.value = initial?.description ?? '';
  const status = h(
    'select',
    { class: 'input' },
    ['recruiting', 'building', 'shipped'].map((value) => h('option', { value }, STATUS_LABEL[value])),
  );
  status.value = initial?.status ?? 'recruiting';
  const tags = h('input', { class: 'input', type: 'text', value: initial?.tags.join(', ') ?? '' });
  const repo = h('input', { class: 'input', type: 'url', value: initial?.repo_url ?? '' });
  const demo = h('input', { class: 'input', type: 'url', value: initial?.demo_url ?? '' });
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, initial ? 'Save' : 'Create project');
  const form = h(
    'form',
    { class: 'panel form', novalidate: true },
    field('Project name', title),
    field('One-line summary', summary, 'What are you building?'),
    field('Description', description, 'Where is it now, and what kind of help do you need?'),
    field('Status', status, '"Looking for members" lets people ask to join.'),
    field('Tags', tags, 'Separate with commas, for example: llm, python.'),
    field('Repository link', repo),
    field('Live demo link', demo),
    error,
    h(
      'div',
      { class: 'form__actions' },
      submit,
      h('a', { class: 'btn btn--ghost', href: initial ? `#/teams/${initial.id}` : '#/teams' }, 'Cancel'),
    ),
  );
  const optionalUrl = (input: HTMLInputElement, label: string): string | null => {
    const value = input.value.trim();
    if (value && !/^https?:\/\//i.test(value)) throw new FormError(`${label} must start with http:// or https://.`);
    return value || null;
  };
  onSubmit(form, submit, 'Saving', error, async () => {
    if (!title.value.trim()) throw new FormError('Enter a project name.');
    const id = await save({
      title: title.value.trim(),
      summary: summary.value.trim(),
      description: description.value.trim(),
      status: status.value,
      tags: [...new Set(tags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
      repo_url: optionalUrl(repo, 'Repository link'),
      demo_url: optionalUrl(demo, 'Live demo link'),
    });
    window.location.hash = `#/teams/${id}`;
  });
  return form;
}

export async function newTeamPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('Start a project');
  await authReady();
  const user = currentUser();
  if (!user) return signInRequired('Start a project', 'Sign in to start a project.');
  // Only a courtesy: if this check fails, the database still enforces the limit.
  const own = await getOwnTeam(user.id).catch(() => null);
  if (own) {
    return pageShell(
      'Start a project',
      null,
      h(
        'div',
        { class: 'panel panel--narrow' },
        h('h2', null, 'You already have a project'),
        h('p', null, 'Each member can start one project. You can still join other teams.'),
        h(
          'div',
          { class: 'form__actions' },
          h('a', { class: 'btn btn--primary', href: `#/teams/${own.id}/edit` }, 'Edit your project'),
          h('a', { class: 'btn btn--ghost', href: '#/teams' }, 'Browse teams'),
        ),
      ),
    );
  }
  const form = teamForm(null, (input) => createTeam(user.id, input));
  return pageShell('Start a project', 'Describe your idea, then others can ask to join.', h('div', { class: 'narrow' }, form));
}

export async function editTeamPage(params: Record<string, string>): Promise<RouteResult> {
  if (isDemo) return needsBackend('Edit project');
  await authReady();
  const user = currentUser();
  if (!user) return signInRequired('Edit project', 'Sign in to edit this project.');
  const team = await getTeam(params.id);
  if (!team) return notFoundPage('That project does not exist or was removed.');
  if (team.owner_id !== user.id && !isStaffMember()) return notFoundPage('Only the project owner can edit this.');
  const form = teamForm(team, async (input) => {
    await updateTeam(team.id, input);
    return team.id;
  });
  return pageShell('Edit project', null, h('div', { class: 'narrow' }, form));
}
