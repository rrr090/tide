import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/main.css';
import { h } from './lib/dom';
import { route, setNotFound, startRouter } from './lib/router';
import { buildFooter, buildHeader } from './components/chrome';
import { homePage } from './pages/home';
import { eventsPage } from './pages/events';
import { workshopsPage } from './pages/workshops';
import { workshopPage } from './pages/workshop';
import { teamsPage } from './pages/teams';
import { adminPage } from './pages/admin';
import { notFoundPage } from './pages/notfound';
import { initPageTransitions } from './lib/transition';

route('/', homePage);
route('/events', eventsPage);
route('/workshops', workshopsPage);
route('/workshops/:slug', workshopPage);
route('/teams', teamsPage);
route('/admin', adminPage);
setNotFound(() => notFoundPage());

const header = buildHeader();
const main = h('main', { id: 'main', tabindex: '-1', class: 'main' });

document.getElementById('root')!.replaceChildren(header.el, main, buildFooter());

// The router owns the hash, so "#main" would be treated as an unknown route.
document.querySelector('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});

initPageTransitions();

startRouter(main, header.update);