---
description: "Task list for Team Task Boards feature implementation"
---

# Tasks: Team Task Boards

**Input**: Design documents from `/specs/001-team-task-boards/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in spec — manual validation via `quickstart.md` only (no automated test tasks).

**Organization**: Tasks grouped by user story for incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec.md user stories
- Paths are repo-root Next.js layout from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js app and tooling

- [x] T001 Scaffold Next.js App Router + TypeScript + Tailwind at repo root (`package.json`, `app/`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`)
- [x] T002 [P] Add dependencies in `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `next-intl`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [x] T003 [P] Document env template in `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (optional seed: `SUPABASE_SERVICE_ROLE_KEY`, `SEED_PASSWORD`; no secrets committed)
- [x] T004 [P] Initialize Supabase CLI config in `supabase/config.toml` and `supabase/migrations/`
- [x] T005 [P] Configure ESLint defaults in `eslint.config.mjs` if not created by scaffold

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infra that MUST exist before any user story UI/API

**CRITICAL**: No user story work until this phase completes

- [x] T006 Create Supabase clients in `lib/supabase/server.ts`, `lib/supabase/middleware.ts` using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser client deferred; auth via Route Handlers)
- [x] T007 Implement session refresh + route protection in `middleware.ts` (protect `/app` routes)
- [x] T008 [P] Add API helpers in `lib/api/errors.ts`, `lib/api/response.ts`, `lib/api/validate.ts` (`{ data }` / `{ error.code }` envelope)
- [x] T009 [P] Add shared domain types in `lib/api/types.ts` mirroring `contracts/rest-api.md` / domain model (plus leave/transfer types)
- [x] T010 [P] Wire `next-intl` with `messages/en.json` skeleton namespaces (`common`, `auth`, `workspaces`, `boards`, `lists`, `cards`, `labels`, `checklist`, `comments`, `invites`, `empty`, `errors`, `a11y`) and `lib/i18n/` request config
- [x] T011 Create migration `supabase/migrations/20260817000001_profiles_workspaces.sql`: `profiles` + trigger on `auth.users`, `workspaces`, `workspace_members` (single-owner unique index), RLS helpers `is_workspace_member` / `is_workspace_owner`
- [x] T012 Create migration `supabase/migrations/20260817000002_boards_core.sql`: `boards`, `lists`, `cards` + RLS via workspace membership; default filter `archived_at is null`
- [x] T013 [P] Create base UI primitives in `components/ui/` (Button, Input, Textarea, Modal/Drawer shell, Toast) using light theme + one accent
- [x] T014 Add protected app shell layout in `app/(app)/layout.tsx` with nav chrome driven by `t(...)`

**Checkpoint**: Foundation ready — user stories can begin

---

## Phase 3: User Story 1 — Sign up, create workspace, open board (P1) MVP

**Goal**: New user registers, creates a workspace, creates an empty board, lands on board surface

**Independent Test**: Sign-up to empty board in under 3 minutes (`quickstart.md` Scenario A)

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement auth routes in `app/api/auth/sign-up/route.ts`, `app/api/auth/sign-in/route.ts`, `app/api/auth/sign-out/route.ts`
- [x] T016 [P] [US1] Implement `GET /api/me` in `app/api/me/route.ts`
- [x] T017 [US1] Build sign-up / sign-in pages in `app/(auth)/sign-up/page.tsx` and `app/(auth)/sign-in/page.tsx` (copy via `messages/en.json` `auth.*`)
- [x] T018 [US1] Implement workspace APIs in `app/api/workspaces/route.ts` and `app/api/workspaces/[workspaceId]/route.ts` (list/create/get/patch/delete; creator = sole owner)
- [x] T019 [US1] Build workspaces list + create flow in `app/(app)/workspaces/page.tsx` and empty state (`empty.*` keys)
- [x] T020 [US1] Build workspace home in `app/(app)/workspaces/[workspaceId]/page.tsx` (boards grid CTA)
- [x] T021 [US1] Implement boards list/create APIs in `app/api/workspaces/[workspaceId]/boards/route.ts` (new board starts with zero lists)
- [x] T022 [US1] Implement `GET /api/boards/[boardId]` hydrate in `app/api/boards/[boardId]/route.ts` returning empty `lists: []`
- [x] T023 [US1] Build board page shell in `app/(app)/workspaces/[workspaceId]/boards/[boardId]/page.tsx` with empty-board CTA
- [x] T024 [US1] Map API error codes to `errors.*` toasts on auth/workspace/board flows

**Checkpoint**: US1 independently demoable (auth + workspace + empty board)

---

## Phase 4: User Story 2 — Lists, cards, drag-and-drop (P1)

**Goal**: Structure board with lists/cards; reorder/move via DnD; archive without restore; persist after refresh

**Independent Test**: `quickstart.md` Scenario B (+ E archive)

### Implementation for User Story 2

- [x] T025 [P] [US2] Add Zod schemas for list/card create/update/move in `lib/api/schemas/board.ts`
- [x] T026 [US2] Implement list APIs in `app/api/boards/[boardId]/lists/route.ts`, `app/api/lists/[listId]/route.ts` (create/rename/reorder/archive)
- [x] T027 [US2] Implement card APIs in `app/api/lists/[listId]/cards/route.ts`, `app/api/cards/[cardId]/route.ts`, `app/api/cards/[cardId]/move/route.ts`
- [x] T028 [US2] Add position helpers (gap insert + renumber) in `lib/api/position.ts` used by list/card handlers
- [x] T029 [US2] Expand `GET /api/boards/[boardId]` in `app/api/boards/[boardId]/route.ts` to return non-archived lists + card summaries sorted by position
- [x] T030 [US2] Build Kanban UI in `components/board/BoardCanvas.tsx`, `components/board/ListColumn.tsx`, `components/board/CardFace.tsx` with `@dnd-kit` optimistic moves
- [x] T031 [US2] Wire inline add/rename in `components/board/AddListForm.tsx`, `components/board/AddCardForm.tsx`, `components/board/InlineTitle.tsx` (i18n `lists.*` / `cards.*`)
- [x] T032 [US2] Add archive actions (board/list/card) under `components/board/` with no restore UI
- [x] T032a [US2] Add rename UI for workspace/board/list/card and owner workspace delete; PATCH/DELETE APIs for boards and cards
- [x] T033 [US2] Integrate BoardCanvas into `app/(app)/workspaces/[workspaceId]/boards/[boardId]/page.tsx`

**Checkpoint**: US1+US2 — full core board usable solo

---

## Phase 5: User Story 3 — Invites, members, leave, transfer (P2)

**Goal**: Owner invites via link; members collaborate; leave + single-owner transfer

**Independent Test**: `quickstart.md` Scenario C (+ F isolation)

### Implementation for User Story 3

- [ ] T034 [P] [US3] Migration `supabase/migrations/20260817000003_invites.sql` for `invites` table + RLS
- [ ] T035 [P] [US3] Zod schemas in `lib/api/schemas/workspace.ts` for invite, leave, transfer
- [ ] T036 [US3] Implement members APIs in `app/api/workspaces/[workspaceId]/members/route.ts` and `app/api/workspaces/[workspaceId]/members/[userId]/route.ts`
- [ ] T037 [US3] Implement invite APIs in `app/api/workspaces/[workspaceId]/invites/route.ts`, `app/api/invites/[token]/route.ts`, `app/api/invites/[token]/accept/route.ts`
- [ ] T038 [US3] Implement leave in `app/api/workspaces/[workspaceId]/leave/route.ts` (owner blocked until transfer)
- [ ] T039 [US3] Implement transfer ownership in `app/api/workspaces/[workspaceId]/transfer-ownership/route.ts` (atomic sole-owner swap)
- [ ] T040 [US3] Build invite accept page in `app/invite/[token]/page.tsx`
- [ ] T041 [US3] Build members + invite + leave + transfer UI in `app/(app)/workspaces/[workspaceId]/settings/page.tsx` and `components/workspace/MembersPanel.tsx`
- [ ] T042 [US3] Enforce membership on board/workspace page load (forbidden UX for non-members)

**Checkpoint**: Two users can share a board; ownership transfer works

---

## Phase 6: User Story 4 — Rich cards (P2)

**Goal**: Description, labels, due date, assignees, checklist, comments; card-face badges; comment delete ACL

**Independent Test**: `quickstart.md` Scenario D

### Implementation for User Story 4

- [ ] T043 [P] [US4] Migration `supabase/migrations/20260817000004_rich_cards.sql` for labels, card_labels, card_assignees, checklist_items, comments + RLS
- [ ] T044 [P] [US4] Zod schemas in `lib/api/schemas/card.ts` for rich-card mutations
- [ ] T045 [US4] Implement card detail `GET/PATCH` in `app/api/cards/[cardId]/route.ts` returning `CardDetail`
- [ ] T046 [P] [US4] Implement labels APIs in `app/api/boards/[boardId]/labels/route.ts`, `app/api/labels/[labelId]/route.ts`, `app/api/cards/[cardId]/labels/route.ts`
- [ ] T047 [P] [US4] Implement assignees API in `app/api/cards/[cardId]/assignees/route.ts`
- [ ] T048 [P] [US4] Implement checklist APIs in `app/api/cards/[cardId]/checklist/route.ts`, `app/api/checklist-items/[itemId]/route.ts`
- [ ] T049 [US4] Implement comments APIs in `app/api/cards/[cardId]/comments/route.ts`, `app/api/comments/[commentId]/route.ts` (delete: author or owner only)
- [ ] T050 [US4] Extend board hydrate summaries with labels, assignees, checklist progress, commentCount in `app/api/boards/[boardId]/route.ts`
- [ ] T051 [US4] Build card drawer in `components/card/CardDrawer.tsx` (labels, due, assignees, checklist, comments)
- [ ] T052 [US4] Update `components/board/CardFace.tsx` badges and open drawer on click
- [ ] T053 [US4] Add rich-card strings to `messages/en.json` (`cards.*`, `labels.*`, `checklist.*`, `comments.*`)

**Checkpoint**: Rich cards complete; comment ACL verified

---

## Phase 7: User Story 5 — Empty and error states (P3)

**Goal**: Clear empty states and forbidden/invalid-invite messaging without data leaks

**Independent Test**: Spec US5 acceptance + `quickstart.md` Scenario F

### Implementation for User Story 5

- [ ] T054 [P] [US5] Audit and complete `empty.*` and `errors.*` keys in `messages/en.json`
- [x] T055 [US5] Empty states for workspace home / empty board (inline in clients; dedicated EmptyState component not needed)
- [ ] T056 [US5] Ensure invite invalid/expired paths render i18n errors in `app/invite/[token]/page.tsx` without leaking workspace internals
- [ ] T057 [US5] Ensure forbidden API responses map to toasts on workspace/board pages without cross-tenant hints

**Checkpoint**: Quality bar for empty/error UX met

---

## Phase 8: Polish and Cross-Cutting

**Purpose**: Ship readiness across stories

- [ ] T058 [P] Write root `README.md` with setup, env vars, migration commands, and link to `specs/001-team-task-boards/quickstart.md`
- [ ] T059 [P] Optional seed script `scripts/seed.ts` for demo data using server-only credentials (never import into client bundles)
- [ ] T060 Apply design polish: spacing/type scale CSS variables in `app/globals.css`
- [ ] T061 Run full `quickstart.md` scenarios A–F and fix gaps
- [ ] T062 Confirm no hardcoded UI strings and no privileged key usage inside `app/api/**` request handlers
- [x] T063 Keep `contracts/rest-api.md` + `lib/api/types.ts` as the API source of truth (bootstrap `docs/SPEC.md` removed)

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 Setup → no deps
- Phase 2 Foundational → after Setup; blocks all stories
- US1 (Phase 3) → after Foundational (MVP)
- US2 (Phase 4) → after US1 board shell
- US3 (Phase 5) → after US1 workspace; can overlap late US2
- US4 (Phase 6) → after US2 cards
- US5 (Phase 7) → after US1–US4 surfaces
- Polish (Phase 8) → after desired stories complete

### User Story Dependencies

| Story | Depends on | Independently testable? |
| --- | --- | --- |
| US1 | Foundation | Yes — auth/workspace/empty board |
| US2 | US1 board route | Yes — solo board DnD |
| US3 | US1 workspace | Yes — invite/leave/transfer with two users |
| US4 | US2 cards | Yes — rich fields on existing cards |
| US5 | US1–US4 UI | Yes — empty/error paths |

### Parallel Opportunities

- Phase 1: T002–T005 after T001
- Phase 2: T008–T010, T013 after T006
- US1: T015–T016 in parallel
- US3: T034–T035 in parallel; API files T036–T039 can split by path
- US4: T046–T048 in parallel after T045
- US5: T054 copy pass in parallel with UI wiring

---

## Parallel Example: User Story 4

```bash
# After CardDetail GET exists:
Task: labels APIs under app/api/boards/[boardId]/labels/ and related routes
Task: assignees API in app/api/cards/[cardId]/assignees/route.ts
Task: checklist APIs under app/api/cards/[cardId]/checklist/ and checklist-items
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + 2
2. Phase 3 (US1)
3. STOP — validate Scenario A
4. Demo auth → workspace → empty board

### Incremental Delivery

US1 MVP → US2 core board → US3 collaboration → US4 rich cards → US5 polish → Phase 8 ship

### Suggested MVP scope

**Phases 1–3 (T001–T024)** = smallest valuable product. Add US2 before inviting others.

---

## Notes

- All UI strings via `messages/en.json` / `t(...)`
- Archive sets `archived_at`; no unarchive tasks
- Single owner + transfer/leave per clarify session
- Do not add Realtime, Storage, or co-owners
- Commit after each task or logical group
