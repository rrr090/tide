export interface RouteResult {
  title: string;
  el: HTMLElement;
  /** Called after `el` is in the document. May return a cleanup function. */
  mount?: () => void | (() => void);
}

type Params = Record<string, string>;
type Handler = (params: Params) => RouteResult | Promise<RouteResult>;

interface Route {
  regex: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];
let notFound: Handler = () => {
  throw new Error('No not-found handler registered');
};
const BASE_TITLE = 'TIDE AI Club';

export function route(pattern: string, handler: Handler): void {
  const keys: string[] = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  routes.push({ regex: new RegExp(`^${source}/?$`), keys, handler });
}

export function setNotFound(handler: Handler): void {
  notFound = handler;
}

export function setTitle(title: string): void {
  document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
}

export const currentPath = (): string => {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0] || '/';
};

export function startRouter(outlet: HTMLElement, onChange: (path: string) => void): void {
  let token = 0;
  let cleanup: void | (() => void);

  const render = async (): Promise<void> => {
    const current = ++token;
    const path = currentPath();
    onChange(path);

    let result: RouteResult;
    try {
      const match = routes
        .map((r) => ({ r, m: r.regex.exec(path) }))
        .find((entry) => entry.m !== null);
      if (match && match.m) {
        const params: Params = {};
        match.r.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match.m![i + 1]);
        });
        result = await match.r.handler(params);
      } else {
        result = await notFound({});
      }
    } catch (error) {
      console.error(error);
      result = await notFound({});
    }
    if (current !== token) return;

    if (typeof cleanup === 'function') cleanup();
    outlet.replaceChildren(result.el);
    setTitle(result.title);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    outlet.focus({ preventScroll: true });
    cleanup = result.mount?.();
  };

  window.addEventListener('hashchange', () => void render());
  void render();
}
