import { h } from '../lib/dom';
import { CLUB } from '../config';
import { isDemo } from '../lib/supabase';

const MARK =
  '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true">' +
  '<path d="M3 7c8 0 9 17 17 17h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="20" cy="24" r="3.4" fill="#61B7DE"/></svg>';

function brand(): HTMLAnchorElement {
  const a = h('a', { class: 'brand', href: '#/', 'aria-label': `${CLUB.fullName}, home` });
  const mark = document.createElement('span');
  mark.className = 'brand__mark';
  mark.innerHTML = MARK;
  a.append(mark, h('span', { class: 'brand__name' }, CLUB.name));
  return a;
}

const NAV_ITEMS: { label: string; href: string; match: (p: string) => boolean }[] = [
  { label: 'Home', href: '#/', match: (p) => p === '/' },
  { label: 'Events', href: '#/events', match: (p) => p.startsWith('/events') },
  { label: 'Workshops', href: '#/workshops', match: (p) => p.startsWith('/workshops') },
  { label: 'Teams', href: '#/teams', match: (p) => p.startsWith('/teams') },
];

export function buildHeader(): { el: HTMLElement; update: (path: string) => void } {
  const links = NAV_ITEMS.map((item) => ({
    item,
    a: h('a', { class: 'nav__link', href: item.href }, item.label),
  }));
  const el = h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'wrap site-header__inner' },
      brand(),
      h(
        'nav',
        { class: 'nav', 'aria-label': 'Main' },
        links.map((l) => l.a),
      ),
    ),
  );
  const update = (path: string): void => {
    for (const { item, a } of links) {
      if (item.match(path)) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  };
  return { el, update };
}

export function buildFooter(): HTMLElement {
  const social: [string, string][] = [];
  if (CLUB.links.email) social.push(['Email', `mailto:${CLUB.links.email}`]);
  if (CLUB.links.github) social.push(['GitHub', CLUB.links.github]);
  if (CLUB.links.telegram) social.push(['Telegram', CLUB.links.telegram]);
  if (CLUB.links.discord) social.push(['Discord', CLUB.links.discord]);

  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'wrap site-footer__inner' },
      h(
        'div',
        { class: 'site-footer__about' },
        brand(),
        h(
          'p',
          null,
          'A student club for people who want to learn AI by building with it.',
        ),
      ),
      h(
        'nav',
        { class: 'site-footer__nav', 'aria-label': 'Footer' },
        h('a', { href: '#/events' }, 'Events'),
        h('a', { href: '#/workshops' }, 'Workshops'),
        h('a', { href: '#/teams' }, 'Teams'),
        ...social.map(([label, href]) =>
          h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label),
        ),
        h('a', { href: '#/admin' }, 'Organizer sign in'),
      ),
    ),
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'site-footer__legal' },
        h('span', null, `© ${new Date().getFullYear()} ${CLUB.fullName}`),
        isDemo ? h('span', null, 'Showing demo content. Connect Supabase to publish your own.') : null,
      ),
    ),
  );
}