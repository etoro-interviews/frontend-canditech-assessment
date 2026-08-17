-- boards, lists, cards

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.cards (
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

create policy boards_member_all on public.boards
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy lists_member_all on public.lists
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy cards_member_all on public.cards
  for all to authenticated
  using (public.is_workspace_member(public.list_workspace_id(list_id)))
  with check (public.is_workspace_member(public.list_workspace_id(list_id)));
