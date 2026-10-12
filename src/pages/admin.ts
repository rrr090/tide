import type { Session } from '@supabase/supabase-js';
import { h, slugify } from '../lib/dom';
import { supabase } from '../lib/supabase';
import { invalidate } from '../lib/data';
import { renderMarkdown } from '../lib/markdown';
import { fmtDateTime, fmtDay, toLocalInput } from '../lib/format';
import type { RouteResult } from '../lib/router';

type Row = Record<string, any>;
type FieldType =
  | 'text'
  | 'textarea'
  | 'markdown'
  | 'datetime'
  | 'date'
  | 'url'
  | 'tags'
  | 'number'
  | 'checkbox';

interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
}

interface Entity {
  key: 'events' | 'workshops' | 'directions';
  label: string;
  noun: string;
  orderBy: string;
  ascending: boolean;
  fields: Field[];
  meta: (row: Row) => string;
  defaults: () => Row;
}

const ENTITIES: Entity[] = [
  {
    key: 'events',
    label: 'Events',
    noun: 'event',
    orderBy: 'starts_at',
    ascending: false,
    meta: (r) => (r.starts_at ? fmtDateTime(r.starts_at) : ''),
    defaults: () => ({ published: true, tags: [] }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'summary', label: 'Summary', type: 'textarea', help: 'One or two sentences shown under the title.' },
      { key: 'starts_at', label: 'Starts', type: 'datetime', required: true },
      { key: 'ends_at', label: 'Ends', type: 'datetime' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'registration_url', label: 'Registration link', type: 'url', help: 'Shows a Register button when filled in.' },
      { key: 'tags', label: 'Tags', type: 'tags', help: 'Separate with commas, for example: beginner, nlp.' },
      { key: 'published', label: 'Published', type: 'checkbox', help: 'Unpublished items stay hidden from the public site.' },
    ],
  },
  {
    key: 'workshops',
    label: 'Workshops',
    noun: 'workshop',
    orderBy: 'held_on',
    ascending: false,
    meta: (r) => (r.held_on ? fmtDay(r.held_on) : ''),
    defaults: () => ({ published: true, tags: [], body_md: '' }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Address', type: 'text', help: 'The end of the page URL. Leave empty to create it from the title.' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'held_on', label: 'Date held', type: 'date', required: true },
      { key: 'speaker', label: 'Led by', type: 'text' },
      { key: 'tags', label: 'Tags', type: 'tags', help: 'Separate with commas. Tags become filters on the workshops page.' },
      { key: 'pdf_url', label: 'PDF link', type: 'url' },
      { key: 'notebook_url', label: 'Notebook link', type: 'url', help: 'Colab, GitHub, Kaggle or any other public link.' },
      { key: 'video_url', label: 'Recording link', type: 'url' },
      { key: 'body_md', label: 'Article', type: 'markdown', help: 'Markdown. Headings, lists, tables and code blocks are supported.' },
      { key: 'published', label: 'Published', type: 'checkbox', help: 'Unpublished items stay hidden from the public site.' },
    ],
  },
  {
    key: 'directions',
    label: 'Directions',
    noun: 'direction',
    orderBy: 'sort_order',
    ascending: true,
    meta: (r) => (r.level ? String(r.level) : ''),
    defaults: () => ({ published: true, sort_order: 0 }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Address', type: 'text', help: 'Short identifier. Leave empty to create it from the title.' },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
      { key: 'level', label: 'Level', type: 'text', help: 'Shown as a badge, for example: Beginner friendly.' },
      { key: 'sort_order', label: 'Order', type: 'number', help: 'Lower numbers come first.' },
      { key: 'published', label: 'Published', type: 'checkbox', help: 'Unpublished items stay hidden from the public site.' },
    ],
  },
];

const STAFF_ROLES = ['editor', 'admin'];

export function adminPage(): RouteResult {
  const root = h('div', { class: 'admin' });
  const el = h(
    'div',
    null,
    h('section', { class: 'page-head' }, h('div', { class: 'wrap' }, h('h1', null, 'Organizer panel'))),
    h('section', { class: 'section section--tight' }, h('div', { class: 'wrap' }, root)),
  );

  if (!supabase) {
    root.append(
      h(
        'div',
        { class: 'panel' },
        h('h2', null, 'Connect Supabase to manage content'),
        h(
          'p',
          null,
          'The site is running on demo content. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment, run the SQL in supabase/schema.sql, then reload this page.',
        ),
      ),
    );
    return { title: 'Organizer panel', el };
  }

  const client = supabase;
  let session: Session | null = null;
  let role: string | null = null;
  let tab: Entity['key'] = 'events';
  let notice = '';
  let disposed = false;

  const entity = (): Entity => ENTITIES.find((e) => e.key === tab)!;

  async function fetchRole(userId: string): Promise<string | null> {
    const { data, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error(error);
      return null;
    }
    return (data as { role?: string } | null)?.role ?? null;
  }

  async function boot(): Promise<void> {
    const { data } = await client.auth.getSession();
    session = data.session;
    role = session ? await fetchRole(session.user.id) : null;
    if (!disposed) render();
  }

  function render(): void {
    root.replaceChildren();
    if (!session) return void root.append(loginView());
    if (!role || !STAFF_ROLES.includes(role)) return void root.append(noAccessView());
    root.append(dashboardView());
  }

  // Sign in
  function loginView(error = ''): HTMLElement {
    const email = h('input', { class: 'input', type: 'email', id: 'login-email', autocomplete: 'username', required: true });
    const password = h('input', { class: 'input', type: 'password', id: 'login-password', autocomplete: 'current-password', required: true });
    const message = h('p', { class: 'form__error', role: 'alert' }, error);
    const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Sign in');
    const form = h(
      'form',
      { class: 'panel panel--narrow form', novalidate: true },
      h('h2', null, 'Sign in'),
      h('p', { class: 'muted' }, 'For club organizers. Accounts are created by an administrator.'),
      h('div', { class: 'field' }, h('label', { for: 'login-email' }, 'Email'), email),
      h('div', { class: 'field' }, h('label', { for: 'login-password' }, 'Password'), password),
      message,
      submit,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!email.value || !password.value) {
        message.textContent = 'Enter your email and password.';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Signing in';
      const { error: authError } = await client.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      });
      if (authError) {
        submit.disabled = false;
        submit.textContent = 'Sign in';
        message.textContent = 'The email or password is incorrect.';
        return;
      }
      await boot();
    });
    return form;
  }

  function noAccessView(): HTMLElement {
    return h(
      'div',
      { class: 'panel panel--narrow' },
      h('h2', null, 'This account cannot edit content'),
      h('p', null, `Signed in as ${session?.user.email ?? 'unknown'}. Ask an administrator to give this account the editor role.`),
      signOutButton(),
    );
  }

  function signOutButton(): HTMLButtonElement {
    return h(
      'button',
      {
        class: 'btn btn--ghost btn--small',
        type: 'button',
        onclick: async () => {
          await client.auth.signOut();
          session = null;
          role = null;
          notice = '';
          render();
        },
      },
      'Sign out',
    );
  }

  // Dashboard
  function dashboardView(): HTMLElement {
    const tabs = h(
      'div',
      { class: 'tabs', role: 'tablist', 'aria-label': 'Content type' },
      ENTITIES.map((e) =>
        h(
          'button',
          {
            class: 'tab',
            type: 'button',
            role: 'tab',
            'aria-selected': String(e.key === tab),
            onclick: () => {
              tab = e.key;
              notice = '';
              render();
            },
          },
          e.label,
        ),
      ),
    );
    const listHost = h('div', { class: 'admin__list' });
    const view = h(
      'div',
      null,
      h(
        'div',
        { class: 'admin__bar' },
        tabs,
        h(
          'div',
          { class: 'admin__user' },
          h('span', { class: 'muted' }, session?.user.email ?? ''),
          signOutButton(),
        ),
      ),
      notice ? h('p', { class: 'notice', role: 'status' }, notice) : null,
      listHost,
    );
    void loadList(listHost);
    return view;
  }

  async function loadList(host: HTMLElement): Promise<void> {
    const e = entity();
    host.replaceChildren(h('p', { class: 'muted', role: 'status' }, 'Loading'));
    const { data, error } = await client
      .from(e.key)
      .select('*')
      .order(e.orderBy, { ascending: e.ascending });
    if (disposed) return;
    if (error) {
      host.replaceChildren(
        h('p', { class: 'form__error', role: 'alert' }, `Could not load ${e.label.toLowerCase()}: ${error.message}`),
      );
      return;
    }
    const rows = (data ?? []) as Row[];
    const newButton = h(
      'button',
      {
        class: 'btn btn--primary btn--small',
        type: 'button',
        onclick: () => openForm(null, rows),
      },
      `New ${e.noun}`,
    );

    if (!rows.length) {
      host.replaceChildren(
        h(
          'div',
          { class: 'state state--empty' },
          h('p', { class: 'state__title' }, `No ${e.label.toLowerCase()} yet`),
          h('p', { class: 'state__text' }, `Create the first ${e.noun} to show it on the site.`),
          newButton,
        ),
      );
      return;
    }

    host.replaceChildren(
      h('div', { class: 'admin__actions' }, newButton),
      h(
        'table',
        { class: 'table' },
        h(
          'thead',
          null,
          h('tr', null, h('th', { scope: 'col' }, 'Title'), h('th', { scope: 'col' }, 'Details'), h('th', { scope: 'col' }, 'Status'), h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Actions'))),
        ),
        h(
          'tbody',
          null,
          rows.map((row) =>
            h(
              'tr',
              null,
              h('td', { class: 'table__title' }, String(row.title ?? '')),
              h('td', { class: 'muted' }, e.meta(row)),
              h('td', null, h('span', { class: row.published ? 'badge' : 'badge badge--draft' }, row.published ? 'Published' : 'Draft')),
              h(
                'td',
                { class: 'table__actions' },
                h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: () => openForm(row, rows) }, 'Edit'),
                h('button', { class: 'btn btn--danger btn--small', type: 'button', onclick: () => remove(row) }, 'Delete'),
              ),
            ),
          ),
        ),
      ),
    );
  }

  async function remove(row: Row): Promise<void> {
    const e = entity();
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    const { error } = await client.from(e.key).delete().eq('id', row.id);
    if (error) {
      notice = `Could not delete: ${error.message}`;
    } else {
      invalidate();
      notice = 'Deleted.';
    }
    render();
  }

  // Editor form
  function openForm(row: Row | null, rows: Row[]): void {
    const e = entity();
    const initial: Row = row ?? e.defaults();
    if (!row && e.key === 'directions') {
      initial.sort_order = rows.reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), 0) + 1;
    }

    const controls = e.fields.map((f) => ({ field: f, ...control(f, initial[f.key]) }));
    const error = h('p', { class: 'form__error', role: 'alert' });
    const save = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Save');
    const cancel = h(
      'button',
      {
        class: 'btn btn--ghost',
        type: 'button',
        onclick: () => {
          notice = '';
          render();
        },
      },
      'Cancel',
    );

    const form = h(
      'form',
      { class: 'panel form', novalidate: true },
      h('h2', null, row ? `Edit ${e.noun}` : `New ${e.noun}`),
      controls.map((c) => c.wrapper),
      error,
      h('div', { class: 'form__actions' }, save, cancel),
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      const payload: Row = {};
      for (const c of controls) {
        const value = c.read();
        const empty = value === '' || value === null;
        if (c.field.required && (empty || value === undefined)) {
          error.textContent = `${c.field.label} is required.`;
          c.focus();
          return;
        }
        if (c.field.type === 'url' && typeof value === 'string' && value && !/^https?:\/\//i.test(value)) {
          error.textContent = `${c.field.label} must start with http:// or https://.`;
          c.focus();
          return;
        }
        payload[c.field.key] = empty ? null : value;
      }
      if ('slug' in payload && !payload.slug) payload.slug = slugify(String(payload.title ?? ''));
      // Text columns that are NOT NULL in the schema.
      if ('summary' in payload && payload.summary == null) payload.summary = '';
      if ('body_md' in payload && payload.body_md == null) payload.body_md = '';

      save.disabled = true;
      save.textContent = 'Saving';
      const query = row
        ? client.from(e.key).update(payload).eq('id', row.id)
        : client.from(e.key).insert(payload);
      const { error: dbError } = await query;
      if (dbError) {
        save.disabled = false;
        save.textContent = 'Save';
        error.textContent =
          dbError.code === '23505'
            ? 'That address is already used. Change it and save again.'
            : dbError.code === '42501'
              ? 'Your account does not have permission to save this.'
              : `Could not save: ${dbError.message}`;
        return;
      }
      invalidate();
      notice = 'Saved.';
      render();
    });

    root.replaceChildren(form);
    window.scrollTo({ top: 0, behavior: 'instant' });
    controls[0]?.focus();
  }

  function control(
    f: Field,
    value: unknown,
  ): { wrapper: HTMLElement; read: () => unknown; focus: () => void } {
    const id = `f-${f.key}`;
    const help = f.help ? h('p', { class: 'field__help', id: `${id}-help` }, f.help) : null;
    const describedBy = f.help ? `${id}-help` : undefined;
    const label = h('label', { for: id }, f.label, f.required ? h('span', { class: 'field__req' }, ' (required)') : null);

    if (f.type === 'checkbox') {
      const input = h('input', { type: 'checkbox', id, checked: Boolean(value), 'aria-describedby': describedBy });
      return {
        wrapper: h('div', { class: 'field field--check' }, h('div', { class: 'check' }, input, label), help),
        read: () => input.checked,
        focus: () => input.focus(),
      };
    }

    if (f.type === 'textarea') {
      const input = h('textarea', { class: 'input', id, rows: 3, 'aria-describedby': describedBy });
      input.value = String(value ?? '');
      return {
        wrapper: h('div', { class: 'field' }, label, input, help),
        read: () => input.value.trim(),
        focus: () => input.focus(),
      };
    }

    if (f.type === 'markdown') {
      const input = h('textarea', { class: 'input input--code', id, rows: 18, spellcheck: 'true', 'aria-describedby': describedBy });
      input.value = String(value ?? '');
      const preview = h('div', { class: 'prose editor__preview', 'aria-label': 'Preview' });
      let timer = 0;
      const update = (): void => {
        const html = renderMarkdown(input.value);
        if (html.trim()) preview.innerHTML = html;
        else preview.replaceChildren(h('p', { class: 'muted' }, 'The preview appears here as you type.'));
      };
      input.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(update, 150);
      });
      update();
      return {
        wrapper: h('div', { class: 'field' }, label, h('div', { class: 'editor' }, input, preview), help),
        read: () => input.value,
        focus: () => input.focus(),
      };
    }

    const typeMap: Record<string, string> = {
      text: 'text',
      url: 'url',
      tags: 'text',
      number: 'number',
      datetime: 'datetime-local',
      date: 'date',
    };
    const input = h('input', { class: 'input', id, type: typeMap[f.type], 'aria-describedby': describedBy });
    if (f.type === 'tags') input.value = Array.isArray(value) ? value.join(', ') : '';
    else if (f.type === 'datetime') input.value = toLocalInput(value as string | null);
    else if (f.type === 'date') input.value = value ? String(value).slice(0, 10) : '';
    else input.value = value === null || value === undefined ? '' : String(value);

    const read = (): unknown => {
      const raw = input.value.trim();
      switch (f.type) {
        case 'tags':
          return [...new Set(raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
        case 'datetime':
          return raw ? new Date(raw).toISOString() : '';
        case 'number':
          return raw === '' ? 0 : Number(raw);
        default:
          return raw;
      }
    };

    return {
      wrapper: h('div', { class: 'field' }, label, input, help),
      read,
      focus: () => input.focus(),
    };
  }

  const { data: listener } = client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      window.setTimeout(() => {
        session = null;
        role = null;
        if (!disposed) render();
      }, 0);
    }
  });

  return {
    title: 'Organizer panel',
    el,
    mount: () => {
      void boot();
      return () => {
        disposed = true;
        listener.subscription.unsubscribe();
      };
    },
  };
}
