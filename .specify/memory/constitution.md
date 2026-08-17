<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Modified principles:
  - V. Spec Fidelity — canonical product/API detail is specs/001-team-task-boards/
    (docs/SPEC.md removed after Spec Kit bootstrap)
- Modified sections:
  - Technology & API Constraints / Source of truth
  - Governance — product detail location
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# Task Board Platform Constitution

## Core Principles

### I. Board-First Simplicity
Every feature MUST serve moving and understanding work on the board.
Workspace, settings, and chrome exist only to support that surface.
Create/rename flows MUST stay low-friction (inline where possible; no modal
for basic add list/card). Prefer boring, reliable behavior over clever
features (no custom fields, automations, or dashboard clutter in MVP).

**Rationale:** Product value is card flow and team readability, not feature
surface area (`specs/001-team-task-boards/spec.md`).

### II. Simple System Architecture
The system MUST remain one Next.js App Router application plus one Supabase
project (Auth, Postgres, RLS). Client reads/writes that hydrate or mutate
MUST go through JSON REST Route Handlers under `/api/*`. Do NOT introduce
separate API servers, queues, Edge Functions, microservices, caches, or
event buses for MVP. Prefer conventions and shared `lib/` helpers over new
frameworks.

**Rationale:** Few moving parts with real multi-tenant safety
(`specs/001-team-task-boards/plan.md`, `research.md`).

### III. Tenant Safety by Membership
Authorization MUST deny by default. Row Level Security MUST protect every
app table; policies MUST key off `auth.uid()` and workspace membership.
Owner-only actions (invite/remove members, rename/delete workspace) MUST be
enforced in handlers in addition to RLS. App clients MUST use
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the
user session. The service role key MUST NEVER ship to the browser and MUST
NOT be used in app request paths except optional server-side seed scripts.
Cross-workspace data leakage is a blocking defect.

**Rationale:** Explicit membership is the tenancy model
(`specs/001-team-task-boards/data-model.md`).

### IV. Translation-Keyed UI (NON-NEGOTIABLE)
Every user-facing UI string MUST render via a translation key (`next-intl`).
No hardcoded copy in components, toasts, empty states, buttons, labels,
placeholders, aria-labels, or client-visible validation messages.
v1 ships English only (`messages/en.json`); structure MUST allow later
locales without rewriting components. User-generated content (titles,
descriptions, comments, label names) is data — NOT message catalog entries.
API handlers MUST return stable `error.code` values; the UI MUST map codes
to `errors.*` keys and MUST NOT treat raw `error.message` as primary copy.

**Rationale:** Locked i18n decision in the feature spec and plan.

### V. Spec Fidelity & MVP Discipline
Implementation MUST follow `specs/001-team-task-boards/` for product scope
(`spec.md`), domain model (`data-model.md`), REST contracts
(`contracts/rest-api.md`), and tasks (`tasks.md`). Do NOT implement
explicitly deferred items (Realtime, Storage attachments, SSO, extra
locales, unarchive, etc.) without amending the feature artifacts and this
constitution. REST request/response shapes MUST match `lib/api/types.ts`
and the contract. Complexity and new dependencies MUST be justified against
the "simple yet effective" bar.

**Rationale:** Spec-driven delivery keeps agents and humans aligned; MVP
exit criteria stay testable via `quickstart.md`.

## Technology & API Constraints

- **Stack (locked):** React, Next.js App Router, TypeScript, Tailwind,
  `@dnd-kit`, Supabase Auth + Postgres + RLS, Zod, `next-intl`, Vercel host.
- **API:** Same-origin `/api` JSON with `{ data }` / `{ error: { code, message, fields? } }`
  envelope; session via Supabase SSR cookies.
- **Schema:** SQL migrations under `supabase/migrations`; profiles via
  trigger on `auth.users`; fractional/gap `position` ordering with inline
  renumber — no background jobs.
- **Archive:** boards/lists/cards use `archived_at`; comments/checklist items
  hard-delete; workspace delete is owner-only cascade with confirmation.
- **Secrets:** Browser/public app env is `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is
  server-only for optional seed scripts — never in request handlers.
- **Source of truth for endpoints:** `specs/001-team-task-boards/contracts/rest-api.md`
  plus `lib/api/types.ts`. Changes to routes or DTOs require a contract/types
  amendment in the same change set.

## Design & UX Constraints

- Light theme only for MVP; neutral gray canvas, white cards/lists, one
  accent; no gradients, glows, or purple-on-white defaults.
- Thin board chrome; fixed-width list columns; card face shows title plus
  quiet meta (labels, due, checklist progress, comment count).
- Motion budget: drawer/modal open-close and drag feedback only.
- Empty states: one sentence + one CTA, driven by i18n keys.
- Small local UI primitives preferred over heavy component kits unless they
  clearly reduce complexity.

## Governance

- This constitution supersedes ad-hoc coding preferences when they conflict.
- Product/technical detail lives under `specs/001-team-task-boards/`; this
  document governs non-negotiable principles. Feature work proceeds through
  Spec Kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`) and MUST remain consistent with those artifacts.
- Amendments: update this file, bump **Version** using semver
  (MAJOR = principle removal/redefinition; MINOR = new principle/section;
  PATCH = clarification), set **Last Amended** to the change date, and
  refresh the Sync Impact Report comment.
- Compliance: reviews and Spec Kit analyze/checklist passes MUST flag
  violations of tenant safety, i18n hardcoding, stack sprawl, or out-of-MVP
  scope creep. Unjustified complexity MUST be rejected or deferred.

**Version**: 1.3.0 | **Ratified**: 2026-08-17 | **Last Amended**: 2026-08-17
