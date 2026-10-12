import { h } from '../lib/dom';
import type { RouteResult } from '../lib/router';
import { listDirections, listEvents, listWorkshops, isUpcoming } from '../lib/data';
import { mountDescent } from '../components/descent';
import {
  directionRow,
  emptyState,
  eventRow,
  fill,
  sectionHead,
  workshopRow,
} from '../components/ui';

export function homePage(): RouteResult {
  const readout = h('p', { class: 'hero__readout', 'aria-hidden': 'true' });
  const hero = h(
    'section',
    { class: 'hero' },
    h(
      'div',
      { class: 'wrap hero__inner' },
      h('h1', { class: 'hero__title' }, 'Learn AI by building it together.'),
      h(
        'p',
        { class: 'hero__lead' },
        'TIDE is a student club for hands-on machine learning. Join a workshop, take the materials home, and ship something with a team.',
      ),
      h(
        'div',
        { class: 'hero__actions' },
        h('a', { class: 'btn btn--primary', href: '#/events' }, 'See upcoming events'),
        h('a', { class: 'btn btn--outline', href: '#/workshops' }, 'Browse workshops'),
      ),
    ),
    readout,
  );

  const about = h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap about' },
      h(
        'div',
        { class: 'about__intro' },
        h('h2', null, 'A club for people who learn by building.'),
        h(
          'p',
          { class: 'about__lead' },
          'We work through real problems in machine learning, from a first neural network to a working language model demo. You do not need experience. A laptop and some curiosity are enough.',
        ),
      ),
      h(
        'dl',
        { class: 'about__list' },
        h(
          'div',
          null,
          h('dt', null, 'Workshops'),
          h('dd', null, 'Hands-on sessions with slides and code you can reuse.'),
        ),
        h(
          'div',
          null,
          h('dt', null, 'Projects'),
          h('dd', null, 'Small teams build demos and share what they learned.'),
        ),
        h(
          'div',
          null,
          h('dt', null, 'Open materials'),
          h('dd', null, 'Every workshop is archived with its notes, PDF and notebook.'),
        ),
      ),
    ),
  );

  const directionsHost = h('div');
  fill(directionsHost, listDirections, (items) =>
    items.length
      ? h('ul', { class: 'directions', role: 'list' }, items.map(directionRow))
      : emptyState('No directions yet', 'Organizers can add them from the admin panel.'),
  );
  const directions = h(
    'section',
    { class: 'section section--ice' },
    h(
      'div',
      { class: 'wrap' },
      sectionHead(
        'Pick a direction',
        'Each one runs its own sessions and projects. Start with the one that matches what you want to learn.',
      ),
      directionsHost,
    ),
  );

  const eventsHost = h('div');
  fill(eventsHost, listEvents, (items) => {
    const upcoming = items.filter((e) => isUpcoming(e)).slice(0, 3);
    return upcoming.length
      ? h('ul', { class: 'timeline', role: 'list' }, upcoming.map((e) => eventRow(e)))
      : emptyState('No events announced yet', 'New dates are posted here first.');
  });
  const events = h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      sectionHead('Coming up', undefined, { label: 'All events', href: '#/events' }),
      eventsHost,
    ),
  );

  const workshopsHost = h('div');
  fill(workshopsHost, listWorkshops, (items) =>
    items.length
      ? h('ul', { class: 'workshop-list', role: 'list' }, items.slice(0, 4).map(workshopRow))
      : emptyState('No workshops published yet', 'Materials appear here after each session.'),
  );
  const workshops = h(
    'section',
    { class: 'section section--ice' },
    h(
      'div',
      { class: 'wrap' },
      sectionHead(
        'Recent workshops',
        'Missed a session? The notes and code are all here.',
        { label: 'Browse the archive', href: '#/workshops' },
      ),
      workshopsHost,
    ),
  );

  const el = h('div', null, hero, about, directions, events, workshops);
  return {
    title: '',
    el,
    mount: () => mountDescent(hero, readout),
  };
}
