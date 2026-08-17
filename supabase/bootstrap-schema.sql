-- Schema bootstrap for Task Boards (no seed credentials).
-- Paste into Supabase SQL Editor, or apply via: psql "$DATABASE_URL" -f supabase/bootstrap-schema.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles + workspaces
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists workspaces_slug_unique
  on public.workspaces (slug);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create unique index if not exists workspace_one_owner
  on public.workspace_members (workspace_id)
  where role = 'owner';

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.workspace_has_members(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));

drop policy if exists workspaces_insert_authenticated on public.workspaces;
create policy workspaces_insert_authenticated on public.workspaces
  for insert to authenticated with check (true);

drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner on public.workspaces
  for update to authenticated using (public.is_workspace_owner(id));

drop policy if exists workspaces_delete_owner on public.workspaces;
create policy workspaces_delete_owner on public.workspaces
  for delete to authenticated using (public.is_workspace_owner(id));

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members
  for insert to authenticated with check (
    public.is_workspace_owner(workspace_id)
    or (
      user_id = auth.uid()
      and role = 'owner'
      and not public.workspace_has_members(workspace_id)
    )
  );

drop policy if exists workspace_members_update_owner on public.workspace_members;
create policy workspace_members_update_owner on public.workspace_members
  for update to authenticated using (public.is_workspace_owner(workspace_id));

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid()
    or public.is_workspace_owner(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- boards / lists / cards
-- ---------------------------------------------------------------------------

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists boards_workspace_slug_unique
  on public.boards (workspace_id, slug);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.board_workspace_id(p_board_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.boards where id = p_board_id;
$$;

create or replace function public.list_workspace_id(p_list_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.workspace_id
  from public.lists l
  join public.boards b on b.id = l.board_id
  where l.id = p_list_id;
$$;

create or replace function public.card_workspace_id(p_card_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.workspace_id
  from public.cards c
  join public.lists l on l.id = c.list_id
  join public.boards b on b.id = l.board_id
  where c.id = p_card_id;
$$;

alter table public.boards enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;

drop policy if exists boards_member_all on public.boards;
create policy boards_member_all on public.boards
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists lists_member_all on public.lists;
create policy lists_member_all on public.lists
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

drop policy if exists cards_member_all on public.cards;
create policy cards_member_all on public.cards
  for all to authenticated
  using (public.is_workspace_member(public.list_workspace_id(list_id)))
  with check (public.is_workspace_member(public.list_workspace_id(list_id)));

notify pgrst, 'reload schema';

-- Explicit Data API grants (required for PostgREST visibility)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
