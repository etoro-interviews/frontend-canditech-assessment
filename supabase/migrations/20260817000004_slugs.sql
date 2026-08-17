-- Add human-readable slugs for workspace and board URLs.
-- Workspace slug is globally unique; board slug is unique within a workspace.
-- Slugs are fixed on rename (set at create / backfill only).

create or replace function public.slugify(input text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(coalesce(input, ''));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  if s = '' then
    s := 'item';
  end if;
  return left(s, 60);
end;
$$;

alter table public.workspaces
  add column if not exists slug text;

alter table public.boards
  add column if not exists slug text;

-- Backfill workspaces
with ranked as (
  select
    id,
    public.slugify(name) as base,
    row_number() over (
      partition by public.slugify(name)
      order by created_at, id
    ) as rn
  from public.workspaces
  where slug is null or slug = ''
)
update public.workspaces w
set slug = case
  when r.rn = 1 then r.base
  else r.base || '-' || r.rn::text
end
from ranked r
where w.id = r.id;

-- Backfill boards (unique per workspace)
with ranked as (
  select
    id,
    workspace_id,
    public.slugify(name) as base,
    row_number() over (
      partition by workspace_id, public.slugify(name)
      order by created_at, id
    ) as rn
  from public.boards
  where slug is null or slug = ''
)
update public.boards b
set slug = case
  when r.rn = 1 then r.base
  else r.base || '-' || r.rn::text
end
from ranked r
where b.id = r.id;

alter table public.workspaces
  alter column slug set not null;

alter table public.boards
  alter column slug set not null;

create unique index if not exists workspaces_slug_unique
  on public.workspaces (slug);

create unique index if not exists boards_workspace_slug_unique
  on public.boards (workspace_id, slug);

notify pgrst, 'reload schema';
