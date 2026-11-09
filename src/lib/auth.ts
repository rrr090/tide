import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Member {
  id: string;
  display_name: string;
  bio: string;
}

export class FormError extends Error {}

let user: User | null = null;
let member: Member | null = null;
let staff = false;
const listeners = new Set<() => void>();

export const currentUser = (): User | null => user;
export const currentMember = (): Member | null => member;
export const isStaffMember = (): boolean => staff;

export function onAuthChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function refresh(next: User | null): Promise<void> {
  user = next;
  if (supabase && next) {
    const [profile, account] = await Promise.all([
      supabase.from('member_profiles').select('id,display_name,bio').eq('id', next.id).maybeSingle(),
      supabase.from('profiles').select('role').eq('id', next.id).maybeSingle(),
    ]);
    member = (profile.data as Member | null) ?? null;
    staff = ['editor', 'admin'].includes((account.data as { role?: string } | null)?.role ?? '');
  } else {
    member = null;
    staff = false;
  }
  listeners.forEach((listener) => listener());
}

const ready: Promise<void> = supabase
  ? supabase.auth.getSession().then(({ data }) => refresh(data.session?.user ?? null))
  : Promise.resolve();

/** Resolves once we know whether the visitor is signed in. */
export const authReady = (): Promise<void> => ready;

supabase?.auth.onAuthStateChange((event, session) => {
  // Calling Supabase inside this callback can deadlock, so step out of it first.
  window.setTimeout(() => {
    if (event === 'PASSWORD_RECOVERY') window.location.hash = '#/reset-password';
    if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && session?.user.id !== user?.id)) {
      void refresh(session?.user ?? null);
    }
  }, 0);
});

const client = () => {
  if (!supabase) throw new FormError('Accounts are not available on this demo site.');
  return supabase;
};
const redirectTo = (): string => window.location.origin + window.location.pathname;

function authMessage(message: string): string {
  if (/invalid login/i.test(message)) return 'The email or password is incorrect.';
  if (/not confirmed/i.test(message)) return 'Confirm your email first. The link is in the message we sent you.';
  if (/already registered/i.test(message)) return 'That email already has an account. Try signing in.';
  if (/signups? (are )?not allowed|signup is disabled/i.test(message)) return 'Registration is closed right now.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a few minutes and try again.';
  if (/password/i.test(message)) return 'Choose a longer, harder to guess password.';
  return 'Something went wrong. Try again.';
}

/** Returns false when the visitor still has to confirm their email. */
export async function signUp(email: string, password: string, displayName: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName }, emailRedirectTo: redirectTo() },
  });
  if (error) throw new FormError(authMessage(error.message));
  if (!data.session) return false;
  await refresh(data.user);
  return true;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new FormError(authMessage(error.message));
  await refresh(data.user);
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
  await refresh(null);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw new FormError(authMessage(error.message));
}

export async function setNewPassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw new FormError(/session/i.test(error.message) ? 'This reset link has expired. Request a new one.' : authMessage(error.message));
}

export async function updateMember(displayName: string, bio: string): Promise<void> {
  if (!user) throw new FormError('Sign in first.');
  const { error } = await client().from('member_profiles').update({ display_name: displayName, bio }).eq('id', user.id);
  if (error) throw error;
  await refresh(user);
}

const RETURN_KEY = 'tide.return';

/** Sends people back to the page they were on after they sign in. */
export function rememberReturn(): void {
  try {
    sessionStorage.setItem(RETURN_KEY, window.location.hash);
  } catch {
    /* private mode: they simply land on the community page */
  }
}

export function takeReturn(): string {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (saved) return saved;
  } catch {
    /* see above */
  }
  return '#/community';
}
