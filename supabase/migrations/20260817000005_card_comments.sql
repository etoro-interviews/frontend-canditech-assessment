-- Card comments (rich-card MVP)

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_card_id_created_at_idx
  on public.comments (card_id, created_at);

alter table public.comments enable row level security;

create policy comments_member_all on public.comments
  for all to authenticated
  using (public.is_workspace_member(public.card_workspace_id(card_id)))
  with check (public.is_workspace_member(public.card_workspace_id(card_id)));

grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.comments to service_role;
