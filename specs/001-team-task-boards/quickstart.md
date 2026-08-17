# Quickstart Validation: Team Task Boards

**Feature**: `001-team-task-boards`  
**Date**: 2026-08-17

Manual validation guide after implementation. Contracts: [contracts/rest-api.md](./contracts/rest-api.md). Data model: [data-model.md](./data-model.md).

## Prerequisites

1. Node 22+, npm/pnpm, Supabase CLI (for migrations).
2. `.env` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - optional: `SUPABASE_SERVICE_ROLE_KEY` + `SEED_PASSWORD` (seed script only)
3. Apply migrations: `supabase db push` (or paste SQL from `supabase/migrations/` / `supabase/bootstrap-schema.sql` into the SQL editor).
4. `npm install && npm run dev` — app on `http://localhost:3000`.

## Scenario A — Sign up to empty board (< 3 min)

1. Open `/sign-up`, create user A (email/password/name).
2. Create workspace → land on workspace home (empty boards CTA).
3. Create board → board opens with **no lists**.
4. **Expect**: All chrome strings come from i18n (no hardcoded English in DOM for buttons/empty states).

## Scenario B — Lists, cards, DnD persist

1. Add two lists; add cards; drag a card across lists.
2. Hard refresh.
3. **Expect**: Same list membership and order (`SC-003`).

## Scenario C — Invite + leave + transfer

1. As owner A, create invite link; copy URL.
2. Sign up/sign in as user B; accept invite → see boards.
3. As B, leave workspace → lose access.
4. Re-invite B; as A, **transfer ownership** to B; A becomes member; A can leave.
5. **Expect**: Owner cannot leave before transfer (`409` / forbidden UX); only one owner at a time.

## Scenario D — Rich card + comment ACL

1. Open card: set description, label, due date, assignee, checklist, comment.
2. Confirm card face badges.
3. As non-owner other member, try delete A’s comment → denied.
4. As author or owner, delete comment → succeeds.

## Scenario E — Archive (no restore)

1. Archive a card/list/board.
2. **Expect**: Gone from default views; no UI/API to restore in v1.

## Scenario F — Tenant isolation

1. User C (no membership) opens A’s board URL / API.
2. **Expect**: `403`/`404` and no workspace data leakage (`SC-006`).

## Smoke API checks (optional)

```bash
# After sign-in cookie jar setup of your choice:
curl -s localhost:3000/api/me
curl -s localhost:3000/api/workspaces
```

## Pass criteria

All scenarios A–F match [spec.md](./spec.md) success criteria SC-001–SC-007 and clarify decisions in `## Clarifications`.
