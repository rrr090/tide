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
import '../styles/home.css';

function section(...children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'section' }, h('div', { class: 'wrap' }, children));
}

export function homePage(): RouteResult {
  const readout = h('p', { class: 'hero__readout', 'aria-hidden': 'true' });

  const hero = h(
    'section',
    { class: 'hero' },
    h(
      'div',
      { class: 'wrap hero__inner' },
      h('h1', { class: 'hero__title' }, 'Learn AI by building things with other students.'),
      h(
        'p',
        { class: 'hero__lead' },
        'TIDE is a student AI club. Come to a hands-on workshop, take the materials home, and build something real with a team. Open to all students, no experience needed.',
      ),
      h(
        'div',
        { class: 'hero__actions' },
        h('a', { class: 'btn btn--primary', href: '#/signup' }, 'Join TIDE'),
        h('a', { class: 'btn btn--ghost', href: '#/events' }, 'See upcoming events'),
      ),
    ),
    readout,
  );

  const eventsHost = h('div');
  fill(eventsHost, listEvents, (items) => {
    const upcoming = items.filter((e) => isUpcoming(e)).slice(0, 3);
    return upcoming.length
      ? h('ul', { class: 'timeline', role: 'list' }, upcoming.map((e) => eventRow(e)))
      : emptyState('No events announced yet', 'New events are posted here first.');
  });

  const workshopsHost = h('div');
  fill(workshopsHost, listWorkshops, (items) =>
    items.length
      ? h('ul', { class: 'workshop-list', role: 'list' }, items.slice(0, 4).map(workshopRow))
      : emptyState('No workshops published yet', 'Materials appear here after each session.'),
  );

  const directionsHost = h('div');
  fill(directionsHost, listDirections, (items) =>
    items.length
      ? h('ul', { class: 'directions', role: 'list' }, items.map(directionRow))
      : emptyState('No directions yet', 'Organizers can add them from the admin panel.'),
  );

  const about = h(
    'div',
    { class: 'about__text' },
    h(
      'p',
      null,
      'Workshops are hands-on, with live code and someone to help when you get stuck. Every session ends with something you can run on your own laptop.',
    ),
    h(
      'p',
      null,
      'Afterwards, the notes, PDFs and notebooks go into the ',
      h('a', { href: '#/workshops' }, 'workshop archive'),
      ', so you can catch up if you missed one.',
    ),
    h(
      'p',
      null,
      'If you want to build something bigger, join one of the ',
      h('a', { href: '#/teams' }, 'project teams'),
      ' or start your own, and ask questions in the ',
      h('a', { href: '#/community' }, 'community'),
      '.',
    ),
  );

  const el = h(
    'div',
    { class: 'home' },
    hero,
    section(sectionHead('Upcoming events', undefined, { label: 'All events', href: '#/events' }), eventsHost),
    section(
      sectionHead('Recent workshops', 'Missed a session? Catch up with the notes and code.', {
        label: 'All workshops',
        href: '#/workshops',
      }),
      workshopsHost,
    ),
    section(sectionHead('What we work on'), directionsHost),
    section(sectionHead('How the club works'), about),
  );

  return {
    title: '',
    el,
    mount: () => {
      const stopDescent: unknown = mountDescent(hero, readout);
      return () => {
        if (typeof stopDescent === 'function') (stopDescent as () => void)();
      };
    },
  };
}
