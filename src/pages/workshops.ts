import { h } from '../lib/dom';
import type { RouteResult } from '../lib/router';
import { listWorkshops } from '../lib/data';
import type { Workshop } from '../lib/types';
import { emptyState, fill, workshopRow } from '../components/ui';

export function workshopsPage(): RouteResult {
  const host = h('div');

  fill(host, listWorkshops, (all) => {
    if (!all.length) {
      return emptyState('No workshops published yet', 'Materials appear here after each session.');
    }

    let activeTag: string | null = null;
    let query = '';

    const tagCounts = new Map<string, number>();
    for (const w of all) for (const t of w.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const results = h('div');
    const status = h('p', { class: 'filters__status', role: 'status', 'aria-live': 'polite' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by topic' });
    const search = h('input', {
      class: 'input',
      type: 'search',
      placeholder: 'Search by title, topic or speaker',
      'aria-label': 'Search workshops',
    });

    const matches = (w: Workshop): boolean => {
      if (activeTag && !w.tags.includes(activeTag)) return false;
      if (!query) return true;
      const haystack = [w.title, w.summary, w.speaker ?? '', w.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query);
    };

    const renderChips = (): void => {
      const make = (label: string, value: string | null): HTMLButtonElement =>
        h(
          'button',
          {
            class: 'chip',
            type: 'button',
            'aria-pressed': String(activeTag === value),
            onclick: () => {
              activeTag = value;
              renderChips();
              apply();
            },
          },
          label,
        );
      chips.replaceChildren(make('All', null), ...tags.map(([t]) => make(t, t)));
    };

    const apply = (): void => {
      const shown = all.filter(matches);
      status.textContent = `${shown.length} of ${all.length} workshops`;
      results.replaceChildren(
        shown.length
          ? h('ul', { class: 'workshop-list', role: 'list' }, shown.map(workshopRow))
          : emptyState(
              'No workshops match',
              'Try a different word or clear the filters.',
              h(
                'button',
                {
                  class: 'btn btn--ghost btn--small',
                  type: 'button',
                  onclick: () => {
                    activeTag = null;
                    query = '';
                    search.value = '';
                    renderChips();
                    apply();
                  },
                },
                'Clear filters',
              ),
            ),
      );
    };

    search.addEventListener('input', () => {
      query = search.value.trim().toLowerCase();
      apply();
    });

    renderChips();
    apply();

    return h(
      'div',
      null,
      h('div', { class: 'filters' }, search, tags.length ? chips : null),
      status,
      results,
    );
  });

  const el = h(
    'div',
    null,
    h(
      'section',
      { class: 'page-head' },
      h(
        'div',
        { class: 'wrap' },
        h('h1', null, 'Workshops'),
        h('p', null, 'Every session we have run, with notes, slides and code you can take home.'),
      ),
    ),
    h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, host)),
  );
  return { title: 'Workshops', el };
}
