-- profiles + workspaces + membership (single owner)

create extension if not exists "pgcrypto";

create table public.profiles (
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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create unique index workspace_one_owner
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

-- security definer: reading the table directly inside its own policy would recurse
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

create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid());

create policy workspaces_select_member on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));

create policy workspaces_insert_authenticated on public.workspaces
  for insert to authenticated with check (true);

create policy workspaces_update_owner on public.workspaces
  for update to authenticated using (public.is_workspace_owner(id));

create policy workspaces_delete_owner on public.workspaces
  for delete to authenticated using (public.is_workspace_owner(id));

create policy workspace_members_select on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- self-insert is allowed only to seat the creator of a brand-new workspace;
-- joining an existing workspace must go through an owner (or, later, an invite)
create policy workspace_members_insert on public.workspace_members
  for insert to authenticated with check (
    public.is_workspace_owner(workspace_id)
    or (
      user_id = auth.uid()
      and role = 'owner'
      and not public.workspace_has_members(workspace_id)
    )
  );

create policy workspace_members_update_owner on public.workspace_members
  for update to authenticated using (public.is_workspace_owner(workspace_id));

create policy workspace_members_delete on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid()
    or public.is_workspace_owner(workspace_id)
  );
