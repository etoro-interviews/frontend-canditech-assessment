# Implementation Plan: Team Task Boards

**Branch**: `001-team-task-boards` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-team-task-boards/spec.md`

## Summary

Build a Trello-style team board MVP: auth, single-owner workspaces with invites/leave/transfer, empty boards with lists/cards and drag-and-drop, rich cards (labels, due dates, assignees, checklists, comments), archive-without-restore, and full UI i18n (`en` only). Technical approach: one Next.js App Router app + Supabase (Auth, Postgres, RLS), JSON REST under `/api/*`, Zod validation, `next-intl`, `@dnd-kit` — per constitution and this feature pack.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22+ (Next.js App Router)

**Primary Dependencies**: Next.js 15, React 19, Tailwind CSS, `@supabase/supabase-js` + `@supabase/ssr`, Zod, `next-intl`, `@dnd-kit/core` + sortable

**Storage**: Supabase Postgres with RLS; SQL migrations via Supabase CLI

**Testing**: Manual E2E via `quickstart.md`; Vitest for Zod/helpers (light); optional Playwright later — not blocking MVP

**Target Platform**: Web (desktop/tablet primary); deploy Next.js to Vercel + existing Supabase project

**Project Type**: Full-stack web application (single Next.js repo)

**Performance Goals**: Board hydrate usable under ~2s on typical broadband for boards with ≤200 cards; DnD feels immediate (optimistic UI)

**Constraints**: No Realtime/Storage/Edge Functions/queues in MVP; no service role in browser or normal request path; all UI strings via translation keys; REST contracts match `contracts/rest-api.md` (leave, transfer, archive-only, single owner)

**Scale/Scope**: Small teams (≤50 members/workspace, ≤20 boards, ≤500 cards/board) for v1 validation

**Env (runtime)**:
- App (browser/SSR/middleware/handlers): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional seed only: `SUPABASE_SERVICE_ROLE_KEY`, `SEED_PASSWORD` (never ship service role to the client)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
| --- | --- | --- |
| I. Board-First Simplicity | PASS | Empty boards, inline add/rename, thin chrome, no dashboard clutter |
| II. Simple System Architecture | PASS | Single Next.js app + Supabase; REST Route Handlers only |
| III. Tenant Safety by Membership | PASS | RLS + owner checks; publishable key for sessions; service role seed-only |
| IV. Translation-Keyed UI | PASS | `next-intl` + `messages/en.json` |
| V. Spec Fidelity & MVP Discipline | PASS | Scope matches feature spec + clarifications; no Realtime/attachments |
| Stack / API envelope | PASS | Locked stack; `{ data }` / `{ error.code }` envelope |
| Design constraints | PASS | Light theme, simple motion budget |

**Post-Phase 1 re-check**: PASS — data model, contracts, and quickstart stay within gates; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-team-task-boards/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
└── tasks.md                 # created by /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
app/
  (auth)/sign-in/ sign-up/
  (app)/workspaces/ .../boards/[boardId]/
  api/                       # REST handlers per contracts/rest-api.md
  invite/[token]/
components/
  ui/ board/ card/ workspace/
lib/
  supabase/                  # browser, server, middleware clients
  api/                       # types, zod schemas, errors, mappers
  i18n/
messages/
  en.json
supabase/
  migrations/
middleware.ts
```

**Structure Decision**: Single Next.js application at repo root (constitution). No monorepo, no separate backend package.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
