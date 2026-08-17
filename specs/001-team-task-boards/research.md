# Research: Team Task Boards

**Feature**: `001-team-task-boards`  
**Date**: 2026-08-17

## R1 — Auth session with Supabase + Next.js App Router

- **Decision**: `@supabase/ssr` cookie sessions; middleware refreshes session; API handlers use server client bound to user cookies with the publishable key. Auth routes wrap `signUp` / `signInWithPassword` / `signOut`.
- **Rationale**: Matches constitution; RLS evaluates `auth.uid()` correctly per request.
- **Alternatives considered**: Server Actions only (rejected — REST contract locked); service_role for all API (rejected — bypasses RLS).

## R2 — Public vs service role keys

- **Decision**: App request path uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` for optional seed scripts only.
- **Rationale**: Publishable key is the user-scoped client credential; RLS remains primary AuthZ.
- **Alternatives considered**: Service-role-only request path (rejected for MVP tenant safety).

## R3 — API style

- **Decision**: Next.js Route Handlers under `app/api/**` returning `{ data }` or `{ error: { code, message, fields? } }`. Shared Zod schemas in `lib/api`.
- **Rationale**: Locked in the feature spec and constitution; leave + transfer endpoints documented in `contracts/rest-api.md`.
- **Alternatives considered**: Server Actions as primary (rejected); tRPC (extra complexity).

## R4 — Ordering / DnD persistence

- **Decision**: Gap `position` (float/numeric); insert at `max+1000` or midpoint; renumber siblings in the same handler if precision collapses. `@dnd-kit` on client with optimistic UI then `POST /api/cards/:id/move` or list PATCH.
- **Rationale**: Spec’d in product doc; no background jobs.
- **Alternatives considered**: Integer ranks only with full rewrite every move (chatty); fractional indexing libraries (unnecessary).

## R5 — Archive policy

- **Decision**: `archived_at` on boards/lists/cards; default queries filter null; **no unarchive API/UI in v1**.
- **Rationale**: Clarify session answer B.
- **Alternatives considered**: Soft restore UI (deferred); hard delete only (harder accidental recovery later).

## R6 — Ownership model

- **Decision**: Exactly one `owner` per workspace. `POST .../transfer-ownership` swaps roles in one transaction. Members `POST .../leave`. Owner cannot leave without transfer.
- **Rationale**: Clarify session answer B (+ leave answer A).
- **Alternatives considered**: Multiple concurrent owners (rejected); no transfer (owner trapped).

## R7 — i18n

- **Decision**: `next-intl` with `messages/en.json`; map API `error.code` → `errors.*` keys.
- **Rationale**: Constitution non-negotiable.
- **Alternatives considered**: Hardcoded English (forbidden); next-i18next (heavier for App Router).

## R8 — Board empty state

- **Decision**: Create board with zero lists; UI empty state CTA to add first list.
- **Rationale**: Clarify session.
- **Alternatives considered**: Default To Do/Doing/Done columns (rejected).

## R9 — Comment delete ACL

- **Decision**: Author or workspace owner; enforce in handler + RLS if expressible, else handler check after membership resolve.
- **Rationale**: Clarify session answer A.
- **Alternatives considered**: Any member delete (too loose); author-only (owners cannot moderate).

## R10 — Profiles sync

- **Decision**: DB trigger on `auth.users` insert → `public.profiles` (`id`, `email`, `name` from metadata).
- **Rationale**: Constitution / product spec single path.
- **Alternatives considered**: App-side upsert only (easy to forget on OAuth later).

## Resolved unknowns

All Technical Context items resolved; no remaining `NEEDS CLARIFICATION` for planning.
