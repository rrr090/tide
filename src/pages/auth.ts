import { h } from '../lib/dom';
import {
  FormError,
  authReady,
  currentMember,
  currentUser,
  sendPasswordReset,
  setNewPassword,
  signIn,
  signOut,
  signUp,
  takeReturn,
  updateMember,
} from '../lib/auth';
import { isDemo } from '../lib/supabase';
import type { RouteResult } from '../lib/router';
import { field, formError, needsBackend, onSubmit, pageShell, signInRequired } from '../components/forms';

const emailInput = () => h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true });
const passwordInput = (autocomplete: string) => h('input', { class: 'input', type: 'password', autocomplete, required: true });

function requirePassword(value: string): void {
  if (value.length < 8) throw new FormError('Use at least 8 characters for your password.');
}

function message(title: string, text: string): HTMLElement {
  return h('div', { class: 'panel panel--narrow' }, h('h2', null, title), h('p', null, text));
}

export async function signInPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('Sign in');
  await authReady();
  if (currentUser()) return pageShell('Sign in', null, message('You are signed in', 'Open your account from the menu at the top.'));

  const email = emailInput();
  const password = passwordInput('current-password');
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Sign in');
  const form = h(
    'form',
    { class: 'panel panel--narrow form', novalidate: true },
    field('Email', email),
    field('Password', password),
    error,
    submit,
    h(
      'p',
      { class: 'form__links' },
      h('a', { href: '#/signup' }, 'Create an account'),
      h('a', { href: '#/forgot-password' }, 'Forgot your password?'),
    ),
  );
  onSubmit(form, submit, 'Signing in', error, async () => {
    if (!email.value.trim() || !password.value) throw new FormError('Enter your email and password.');
    await signIn(email.value.trim(), password.value);
    window.location.hash = takeReturn();
  });
  return pageShell('Sign in', null, form);
}

export async function signUpPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('Join TIDE');
  await authReady();
  if (currentUser()) return pageShell('Join TIDE', null, message('You are already a member', 'Open your account from the menu at the top.'));

  const name = h('input', { class: 'input', type: 'text', autocomplete: 'name', maxlength: 50, required: true });
  const email = emailInput();
  const password = passwordInput('new-password');
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Create account');
  const holder = h('div');
  const form = h(
    'form',
    { class: 'panel panel--narrow form', novalidate: true },
    field('Your name', name, 'Shown next to your posts and on your teams.'),
    field('Email', email, 'Never shown to other members.'),
    field('Password', password, 'At least 8 characters.'),
    error,
    submit,
    h('p', { class: 'form__links' }, h('a', { href: '#/signin' }, 'Already have an account? Sign in')),
  );
  onSubmit(form, submit, 'Creating account', error, async () => {
    if (!name.value.trim()) throw new FormError('Enter your name.');
    if (!email.value.trim()) throw new FormError('Enter your email.');
    requirePassword(password.value);
    const signedIn = await signUp(email.value.trim(), password.value, name.value.trim());
    if (signedIn) window.location.hash = takeReturn();
    else holder.replaceChildren(message('Check your email', `We sent a confirmation link to ${email.value.trim()}. Open it to finish creating your account.`));
  });
  holder.append(form);
  return pageShell('Join TIDE', 'Create an account to post in the community and join project teams.', holder);
}

export function forgotPasswordPage(): RouteResult {
  if (isDemo) return needsBackend('Reset your password');
  const email = emailInput();
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Send reset link');
  const holder = h('div');
  const form = h('form', { class: 'panel panel--narrow form', novalidate: true }, field('Email', email), error, submit);
  onSubmit(form, submit, 'Sending', error, async () => {
    if (!email.value.trim()) throw new FormError('Enter your email.');
    await sendPasswordReset(email.value.trim());
    holder.replaceChildren(message('Check your email', 'If that address has an account, a reset link is on its way.'));
  });
  holder.append(form);
  return pageShell('Reset your password', null, holder);
}

export function resetPasswordPage(): RouteResult {
  if (isDemo) return needsBackend('Choose a new password');
  const password = passwordInput('new-password');
  const error = formError();
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Save password');
  const form = h('form', { class: 'panel panel--narrow form', novalidate: true }, field('New password', password, 'At least 8 characters.'), error, submit);
  onSubmit(form, submit, 'Saving', error, async () => {
    requirePassword(password.value);
    await setNewPassword(password.value);
    window.location.hash = '#/community';
  });
  return pageShell('Choose a new password', null, form);
}

export async function accountPage(): Promise<RouteResult> {
  if (isDemo) return needsBackend('Your account');
  await authReady();
  const user = currentUser();
  if (!user) return signInRequired('Your account', 'Sign in to see your account.');

  const profile = currentMember();
  const name = h('input', { class: 'input', type: 'text', maxlength: 50, value: profile?.display_name ?? '' });
  const bio = h('textarea', { class: 'input', rows: 4, maxlength: 500 });
  bio.value = profile?.bio ?? '';
  const error = formError();
  const status = h('p', { class: 'notice notice--success', role: 'status', hidden: true });
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Save');
  const form = h(
    'form',
    { class: 'panel panel--narrow form', novalidate: true },
    h('p', { class: 'muted' }, `Signed in as ${user.email ?? 'unknown'}`),
    status,
    field('Your name', name),
    field('About you', bio, 'Optional. What are you learning or building?'),
    error,
    h(
      'div',
      { class: 'form__actions' },
      submit,
      h(
        'button',
        {
          class: 'btn btn--ghost',
          type: 'button',
          onclick: async () => {
            await signOut();
            window.location.hash = '#/';
          },
        },
        'Sign out',
      ),
    ),
  );
  onSubmit(form, submit, 'Saving', error, async () => {
    if (!name.value.trim()) throw new FormError('Enter your name.');
    status.hidden = true;
    await updateMember(name.value.trim(), bio.value.trim());
    status.textContent = 'Saved.';
    status.hidden = false;
  });
  return pageShell('Your account', null, form);
}
