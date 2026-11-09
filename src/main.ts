import '@fontsource-variable/source-sans-3';
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
import { accountPage, forgotPasswordPage, resetPasswordPage, signInPage, signUpPage } from './pages/auth';
import { communityPage, newThreadPage } from './pages/community';
import { threadPage } from './pages/thread';
import { editTeamPage, newTeamPage, teamPage } from './pages/team';
import './styles/community.css';

route('/', homePage);
route('/events', eventsPage);
route('/workshops', workshopsPage);
route('/workshops/:slug', workshopPage);
route('/teams', teamsPage);
route('/teams/new', newTeamPage);
route('/teams/:id', teamPage);
route('/teams/:id/edit', editTeamPage);
route('/community', communityPage);
route('/community/new', newThreadPage);
route('/community/:id', threadPage);
route('/signin', signInPage);
route('/signup', signUpPage);
route('/forgot-password', forgotPasswordPage);
route('/reset-password', resetPasswordPage);
route('/account', accountPage);
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

startRouter(main, header.update);