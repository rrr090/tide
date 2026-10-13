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

const TOPICS = [
  'Neural networks',
  'Transformers',
  'Computer vision',
  'Reinforcement learning',
  'LLM demos',
  'Data pipelines',
  'Diffusion models',
  'MLOps',
];

function marquee(): HTMLElement {
  const track = (hidden: boolean) =>
    h(
      'ul',
      { class: 'marquee__track', role: hidden ? 'presentation' : 'list', 'aria-hidden': hidden ? 'true' : 'false' },
      TOPICS.map((t) => h('li', { class: 'marquee__item' }, t)),
    );
  return h('div', { class: 'marquee', 'aria-label': 'Topics we cover' }, track(false), track(true));
}

function stat(value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, h('strong', { class: 'stat__value' }, value), h('span', { class: 'stat__label' }, label));
}

function bentoCard(index: string, title: string, text: string, modifier = ''): HTMLElement {
  return h(
    'article',
    { class: `bento__card reveal ${modifier}`.trim() },
    h(
      'div',
      { class: 'bento__topline' },
      h('span', { class: 'bento__index' }, index),
      h('span', { class: 'bento__signal', 'aria-hidden': 'true' }, '↗'),
    ),
    h(
      'div',
      { class: 'bento__body' },
      h('h3', { class: 'bento__title' }, title),
      h('p', { class: 'bento__text' }, text),
    ),
    h('span', { class: 'bento__watermark', 'aria-hidden': 'true' }, index),
  );
}

function sectionIndex(num: string, label: string): HTMLElement {
  return h('div', { class: 'section__index', 'aria-hidden': 'true' }, h('span', null, num), h('span', null, label));
}

export function homePage(): RouteResult {
  const readout = h('p', { class: 'hero__readout', 'aria-hidden': 'true' });

  /* ---------- Hero ---------- */
  const hero = h(
    'section',
    { class: 'hero hero--v2' },
    h('div', { class: 'hero__glow hero__glow--a', 'aria-hidden': 'true' }),
    h('div', { class: 'hero__glow hero__glow--b', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'wrap hero__inner' },
      h('span', { class: 'pill' }, h('i', { class: 'pill__dot', 'aria-hidden': 'true' }), 'TIDE AI Club · open to all students'),
      h(
        'h1',
        { class: 'hero__title' },
        'Learn AI by ',
        h('span', { class: 'grad' }, 'riding the wave'),
        ' together.',
      ),
      h(
        'p',
        { class: 'hero__lead' },
        'A student club for hands-on AI. Catch a workshop, take the materials home, and ship something real with a team.',
      ),
      h(
        'div',
        { class: 'hero__actions' },
        h('a', { class: 'btn btn--primary btn--glow', href: '#/events' }, 'See upcoming events'),
        h('a', { class: 'btn btn--ghost', href: '#/workshops' }, 'Browse workshops →'),
      ),
      h(
        'div',
        { class: 'hero__principles' },
        h('span', { class: 'hero__principle' }, h('i', null, '✦'), 'Hands-on'),
        h('span', { class: 'hero__principle-separator', 'aria-hidden': 'true' }, '/'),
        h('span', { class: 'hero__principle' }, h('i', null, '✦'), 'Open materials'),
        h('span', { class: 'hero__principle-separator', 'aria-hidden': 'true' }, '/'),
        h('span', { class: 'hero__principle' }, h('i', null, '✦'), 'Beginner friendly'),
      ),
      h(
        'div',
        { class: 'stats', role: 'list' },
        stat('Weekly', 'live-code sessions'),
        stat('100%', 'open materials'),
        stat('0', 'prior experience needed'),
      ),
    ),
    marquee(),
    readout,
  );

  /* ---------- About (bento) ---------- */
  const about = h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'about-head reveal' },
        h('span', { class: 'eyebrow' }, 'What we do'),
        h('h2', { class: 'about-head__title' }, 'A current of knowledge for those who build.'),
        h(
          'p',
          { class: 'about-head__lead' },
          'We dive into real AI problems, from a first neural network to a working language model demo. No prior depth required, just a laptop and curiosity.',
        ),
      ),
      h(
        'div',
        { class: 'about-note reveal' },
        h('span', { class: 'about-note__mark', 'aria-hidden': 'true' }, '“'),
        h('p', null, 'Every session ends with something you can run on your own laptop.'),
        h('span', { class: 'about-note__label' }, 'OUR APPROACH'),
      ),
      h(
        'div',
        { class: 'bento' },
        bentoCard('01', 'Workshops', 'Hands-on sessions with live code, reusable slides and someone to unblock you.'),
        bentoCard('02', 'Projects', 'Small teams, shared goals, real AI demos you can show off.','bento__card--wide'),
        bentoCard('03', 'Open materials', 'Notes, PDFs and notebooks archived after every session.', 'bento__card--ultra'),
      ),
    ),
  );

  /* ---------- Directions ---------- */
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
      { class: 'wrap reveal' },
      sectionIndex('02', 'Directions'),
      sectionHead(
        'Pick your wave',
        'Each direction runs its own specialized sessions and projects. Dive into the one that matches your current learning goal.',
      ),
      directionsHost,
    ),
  );

  /* ---------- Events ---------- */
  const eventsHost = h('div');
  fill(eventsHost, listEvents, (items) => {
    const upcoming = items.filter((e) => isUpcoming(e)).slice(0, 3);
    return upcoming.length
      ? h('ul', { class: 'timeline', role: 'list' }, upcoming.map((e) => eventRow(e)))
      : emptyState('No events announced yet', 'New tides are posted here first.');
  });
  const events = h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap reveal' },
      sectionIndex('03', 'Events'),
      sectionHead('Coming up', undefined, { label: 'All events', href: '#/events' }),
      eventsHost,
    ),
  );

  /* ---------- Workshops ---------- */
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
      { class: 'wrap reveal' },
      sectionIndex('04', 'Workshops'),
      sectionHead(
        'Recent tides (Workshops)',
        'Missed a session? Catch up with the archived notes and code.',
        { label: 'Browse the archive', href: '#/workshops' },
      ),
      workshopsHost,
    ),
  );

  /* ---------- Closing CTA ---------- */
  const cta = h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'cta reveal' },
        h('div', { class: 'cta__glow', 'aria-hidden': 'true' }),
        h('span', { class: 'cta__eyebrow' }, h('i', { 'aria-hidden': 'true' }), 'NEXT SESSION'),
        h('h2', { class: 'cta__title' }, 'The next tide is coming in.'),
        h('p', { class: 'cta__text' }, 'Join a session, meet the team, and build your first model with us.'),
        h('a', { class: 'btn btn--primary btn--glow', href: '#/events' }, 'Find your first workshop'),
      ),
    ),
  );

  const el = h('div', { class: 'home' }, hero, about, directions, events, workshops, cta);

  return {
    title: '',
    el,
    mount: () => {
      const stopDescent: unknown = mountDescent(hero, readout);

      // Reveal-on-scroll
      const targets = Array.from(el.querySelectorAll<HTMLElement>('.reveal'));
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let io: IntersectionObserver | undefined;
      if (reduce || !('IntersectionObserver' in window)) {
        targets.forEach((t) => t.classList.add('is-in'));
      } else {
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io?.unobserve(entry.target);
              }
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
        );
        targets.forEach((t, i) => {
          t.style.setProperty('--reveal-delay', `${(i % 3) * 70}ms`);
          io!.observe(t);
        });
      }

      return () => {
        io?.disconnect();
        if (typeof stopDescent === 'function') (stopDescent as () => void)();
      };
    },
  };
}