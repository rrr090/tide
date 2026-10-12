import { h } from '../lib/dom';
import type { RouteResult } from '../lib/router';
import { isUpcoming, listEvents } from '../lib/data';
import { emptyState, eventRow, fill } from '../components/ui';

export function eventsPage(): RouteResult {
  const host = h('div');
  fill(host, listEvents, (items) => {
    const now = Date.now();
    const upcoming = items.filter((e) => isUpcoming(e, now));
    const past = items.filter((e) => !isUpcoming(e, now)).reverse().slice(0, 12);

    const wrapper = h('div');
    wrapper.append(
      upcoming.length
        ? h('ul', { class: 'timeline', role: 'list' }, upcoming.map((e) => eventRow(e)))
        : emptyState(
            'No upcoming events',
            'Nothing is scheduled right now. Check the workshop archive in the meantime.',
            h('a', { class: 'btn btn--ghost btn--small', href: '#/workshops' }, 'Browse workshops'),
          ),
    );
    if (past.length) {
      wrapper.append(
        h('h2', { class: 'subhead' }, 'Past events'),
        h('ul', { class: 'timeline timeline--past', role: 'list' }, past.map((e) => eventRow(e, true))),
      );
    }
    return wrapper;
  });

  const el = h(
    'div',
    null,
    h(
      'section',
      { class: 'page-head' },
      h('div', { class: 'wrap' }, h('h1', null, 'Events'), h('p', null, 'Open nights, workshops and reading groups. Everyone is welcome.')),
    ),
    h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, host)),
  );
  return { title: 'Events', el };
}
