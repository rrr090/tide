-- TIDE AI Club: member accounts, forum, and member-run project teams.
-- Run after schema.sql: SQL Editor > New query > paste > Run. Safe to run again.

-- ---------------------------------------------------------------------------
-- Public member profiles. Emails stay private in public.profiles.
-- ---------------------------------------------------------------------------
create table if not exists public.member_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio          text not null default '' check (char_length(bio) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into public.member_profiles (id, display_name)
select id, 'Member' from auth.users
on conflict (id) do nothing;

-- Every new account gets both a private and a public profile. This must never
-- raise, because an error here would abort the sign-up itself.
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

  insert into public.member_profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 50), ''), 'Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Forum
-- ---------------------------------------------------------------------------
create table if not exists public.threads (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid references public.member_profiles (id) on delete set null,
  category         text not null default 'general'
                   check (category in ('general', 'help', 'find-a-team', 'show-and-tell')),
  title            text not null check (char_length(title) between 3 and 140),
  body             text not null check (char_length(body) between 1 and 10000),
  comment_count    integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads (id) on delete cascade,
  author_id  uuid references public.member_profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists threads_activity_idx on public.threads (last_activity_at desc);
create index if not exists comments_thread_idx  on public.comments (thread_id, created_at);

-- Keeps the reply count and "latest activity" order correct.
create or replace function public.sync_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.threads
       set comment_count = comment_count + 1, last_activity_at = now()
     where id = new.thread_id;
    return new;
  end if;
  update public.threads
     set comment_count = greatest(comment_count - 1, 0)
   where id = old.thread_id;
  return old;
end;
$$;

drop trigger if exists sync_thread_activity on public.comments;
create trigger sync_thread_activity
  after insert or delete on public.comments
  for each row execute function public.sync_thread_activity();

-- ---------------------------------------------------------------------------
-- Member-run teams. A team is one project, as on the existing Teams page.
-- ---------------------------------------------------------------------------
alter table public.teams
  add column if not exists owner_id uuid references public.member_profiles (id) on delete set null;

-- Members can now write these, so the database has to enforce them too.
alter table public.teams drop constraint if exists teams_repo_url_http;
alter table public.teams add constraint teams_repo_url_http
  check (repo_url is null or repo_url ~* '^https?://') not valid;
alter table public.teams drop constraint if exists teams_demo_url_http;
alter table public.teams add constraint teams_demo_url_http
  check (demo_url is null or demo_url ~* '^https?://') not valid;
alter table public.teams drop constraint if exists teams_text_lengths;
alter table public.teams add constraint teams_text_lengths
  check (char_length(title) <= 80 and char_length(summary) <= 200 and char_length(description) <= 4000) not valid;

create table if not exists public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.member_profiles (id) on delete cascade,
  role       text not null default '' check (char_length(role) <= 50),
  status     text not null default 'pending' check (status in ('pending', 'active')),
  message    text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_idx on public.team_members (user_id);

create or replace function public.is_team_owner(team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.teams where id = team and owner_id = auth.uid());
$$;

-- Project owners may edit their project's content, not its place on the site.
-- SQL Editor sessions have no auth.uid() and are left alone.
create or replace function public.guard_team_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id   := auth.uid();
    new.published  := true;
    new.sort_order := 1000;
    new.members    := '[]'::jsonb;
  else
    new.owner_id   := old.owner_id;
    new.published  := old.published;
    new.sort_order := old.sort_order;
    new.members    := old.members;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_team_write on public.teams;
create trigger guard_team_write
  before insert or update on public.teams
  for each row execute function public.guard_team_write();

-- The person who starts a project is its first member.
create or replace function public.add_team_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.team_members (team_id, user_id, role, status)
    values (new.id, new.owner_id, 'Owner', 'active')
    on conflict (team_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists add_team_owner on public.teams;
create trigger add_team_owner
  after insert on public.teams
  for each row execute function public.add_team_owner();

-- ---------------------------------------------------------------------------
-- Column permissions: what the browser is allowed to send at all.
-- ---------------------------------------------------------------------------
revoke insert, update on public.member_profiles from anon, authenticated;
grant update (display_name, bio) on public.member_profiles to authenticated;

revoke insert, update on public.threads from anon, authenticated;
grant insert (author_id, category, title, body) on public.threads to authenticated;

revoke insert, update on public.comments from anon, authenticated;
grant insert (thread_id, author_id, body) on public.comments to authenticated;

revoke insert, update on public.team_members from anon, authenticated;
grant insert (team_id, user_id, message) on public.team_members to authenticated;
grant update (status, role) on public.team_members to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.member_profiles enable row level security;
alter table public.threads          enable row level security;
alter table public.comments         enable row level security;
alter table public.team_members     enable row level security;

drop policy if exists "read member profiles" on public.member_profiles;
create policy "read member profiles" on public.member_profiles for select using (true);

drop policy if exists "update own member profile" on public.member_profiles;
create policy "update own member profile" on public.member_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read threads" on public.threads;
create policy "read threads" on public.threads for select using (true);

drop policy if exists "post threads" on public.threads;
create policy "post threads" on public.threads for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "delete threads" on public.threads;
create policy "delete threads" on public.threads for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments for select using (true);

drop policy if exists "post comments" on public.comments;
create policy "post comments" on public.comments for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "delete comments" on public.comments;
create policy "delete comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

drop policy if exists "member create team" on public.teams;
create policy "member create team" on public.teams for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "owner update team" on public.teams;
create policy "owner update team" on public.teams for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner delete team" on public.teams;
create policy "owner delete team" on public.teams for delete to authenticated
  using (owner_id = auth.uid());

-- Everyone sees who is on a team. Only the applicant and the owner see requests.
drop policy if exists "read team members" on public.team_members;
create policy "read team members" on public.team_members for select using (
  status = 'active' or user_id = auth.uid() or public.is_team_owner(team_id) or public.is_staff()
);

drop policy if exists "request to join" on public.team_members;
create policy "request to join" on public.team_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.teams t where t.id = team_id and t.published)
  );

drop policy if exists "manage team members" on public.team_members;
create policy "manage team members" on public.team_members for update to authenticated
  using ((public.is_team_owner(team_id) and user_id <> auth.uid()) or public.is_staff())
  with check ((public.is_team_owner(team_id) and user_id <> auth.uid()) or public.is_staff());

-- Members can leave and owners can remove people, but an owner cannot leave.
drop policy if exists "leave or remove" on public.team_members;
create policy "leave or remove" on public.team_members for delete to authenticated using (
  (user_id = auth.uid() and not public.is_team_owner(team_id))
  or (public.is_team_owner(team_id) and user_id <> auth.uid())
  or public.is_staff()
);
