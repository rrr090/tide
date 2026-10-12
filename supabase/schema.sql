-- TIDE AI Club: database schema, roles and Row Level Security.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'member' check (role in ('member', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Every new auth user gets a profile with the lowest role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True for signed-in users whose role is editor or admin.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('editor', 'admin')
  );
$$;

-- A user can read only their own profile. Nobody can change roles through the
-- API: there are no insert/update/delete policies. Promote people with SQL below.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.directions (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  summary    text not null default '',
  level      text,
  sort_order integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  summary          text not null default '',
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  location         text,
  registration_url text check (registration_url is null or registration_url ~* '^https?://'),
  tags             text[] not null default '{}',
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.workshops (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text not null default '',
  body_md      text not null default '',
  held_on      date not null,
  speaker      text,
  tags         text[] not null default '{}',
  pdf_url      text check (pdf_url is null or pdf_url ~* '^https?://'),
  notebook_url text check (notebook_url is null or notebook_url ~* '^https?://'),
  video_url    text check (video_url is null or video_url ~* '^https?://'),
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists directions_sort_idx on public.directions (sort_order);
create index if not exists events_starts_idx   on public.events (starts_at);
create index if not exists events_tags_idx     on public.events using gin (tags);
create index if not exists workshops_held_idx  on public.workshops (held_on desc);
create index if not exists workshops_tags_idx  on public.workshops using gin (tags);

do $$
declare
  t text;
begin
  foreach t in array array['directions', 'events', 'workshops'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);

    execute format('alter table public.%I enable row level security', t);

    -- Visitors see published rows only. Staff see everything, including drafts.
    execute format('drop policy if exists "read published" on public.%I', t);
    execute format(
      'create policy "read published" on public.%I for select
         using (published or public.is_staff())', t);

    execute format('drop policy if exists "staff insert" on public.%I', t);
    execute format(
      'create policy "staff insert" on public.%I for insert
         with check (public.is_staff())', t);

    execute format('drop policy if exists "staff update" on public.%I', t);
    execute format(
      'create policy "staff update" on public.%I for update
         using (public.is_staff()) with check (public.is_staff())', t);

    execute format('drop policy if exists "staff delete" on public.%I', t);
    execute format(
      'create policy "staff delete" on public.%I for delete
         using (public.is_staff())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Make your first organizer
-- 1. Authentication > Users > Add user (email + password).
-- 2. Run the statement below with that email.
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
