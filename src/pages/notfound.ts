import { h } from '../lib/dom';
import type { RouteResult } from '../lib/router';

export function notFoundPage(
  message = 'The page you were looking for does not exist.',
): RouteResult {
  return {
    title: 'Page not found',
    el: h(
      'section',
      { class: 'section' },
      h(
        'div',
        { class: 'wrap wrap--narrow notfound' },
        h('h1', null, 'Page not found'),
        h('p', null, message),
        h('a', { class: 'btn btn--primary', href: '#/' }, 'Go to the home page'),
      ),
    ),
  };
}
