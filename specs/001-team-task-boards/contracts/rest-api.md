# REST API Contract: Team Task Boards

**Status**: Canonical for this feature  
**Base**: `/api`  
**Auth**: Supabase session cookie (`@supabase/ssr`)  
**Envelope**: `{ "data": T }` or `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }`  
**Types**: Shared TypeScript types live in `lib/api/types.ts` (`Profile`, `Workspace`, `WorkspaceDetail`, `Board`, `BoardPage`, `ListWithCards`, `CardSummary`, etc.).

## Error codes

`unauthorized` | `forbidden` | `not_found` | `validation_error` | `conflict` | `bad_request`

UI maps codes via `errors.*` i18n keys (do not show raw `message` as primary copy).

## Auth

| Method | Path | Auth | Body / result |
| --- | --- | --- | --- |
| POST | `/api/auth/sign-up` | no | `{ email, password, name }` → `201 { user }` |
| POST | `/api/auth/sign-in` | no | `{ email, password }` → `200 { user }` |
| POST | `/api/auth/sign-out` | yes | `204` |
| GET | `/api/me` | yes | `{ user: Profile }` |

## Workspaces

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/api/workspaces` | — | list mine |
| POST | `/api/workspaces` | — | creator becomes **sole owner**; slug fixed on create |
| GET | `/api/workspaces/:workspaceId` | member | id or slug |
| PATCH | `/api/workspaces/:workspaceId` | owner | rename (slug unchanged) |
| DELETE | `/api/workspaces/:workspaceId` | owner | hard delete cascade |

## Members, leave, transfer

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/api/workspaces/:workspaceId/members` | member | |
| DELETE | `/api/workspaces/:workspaceId/members/:userId` | owner | cannot remove owner without transfer first; `409` if would leave zero owners |
| POST | `/api/workspaces/:workspaceId/leave` | member | caller leaves; owner → `409` until transfer |
| POST | `/api/workspaces/:workspaceId/transfer-ownership` | owner | body `{ userId }` — target must be current member; atomic role swap; previous owner becomes `member` |

```ts
type TransferOwnershipRequest = { userId: string };
```

## Invites

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/api/workspaces/:workspaceId/invites` | owner | link-first; optional `email` |
| GET | `/api/workspaces/:workspaceId/invites` | owner | pending |
| GET | `/api/invites/:token` | yes | peek |
| POST | `/api/invites/:token/accept` | yes | join as `member` |

## Boards / lists / cards

**Clarify**: `DELETE` board/list/card = archive (`archived_at`); **no unarchive** in v1. `PATCH` with `archived: false` → `400`.  
**Clarify**: Create board starts with **zero lists**.  
**Clarify**: Core entities MUST expose rename + remove in the product UI (workspaces: rename/delete; boards/lists/cards: rename/archive).

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/api/workspaces/:workspaceId/boards` | member | non-archived |
| POST | `/api/workspaces/:workspaceId/boards` | member | `{ name }` → board with slug |
| GET | `/api/boards/:boardId` | member | hydrate `BoardPage` |
| PATCH | `/api/boards/:boardId` | member | rename / reorder / archive |
| DELETE | `/api/boards/:boardId` | member | archive |
| POST | `/api/boards/:boardId/lists` | member | `{ name }` |
| PATCH | `/api/lists/:listId` | member | rename / reorder / archive |
| DELETE | `/api/lists/:listId` | member | archive |
| POST | `/api/lists/:listId/cards` | member | `{ title }` |
| PATCH | `/api/cards/:cardId` | member | title / fields / archive |
| POST | `/api/cards/:cardId/move` | member | `{ listId, position }` |
| DELETE | `/api/cards/:cardId` | member | archive |

## Labels, assignees, checklist, comments (planned)

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET/POST | `/api/boards/:boardId/labels` | member | |
| PATCH/DELETE | `/api/labels/:labelId` | member | |
| PUT/DELETE | `/api/cards/:cardId/labels/:labelId` | member | assign / unassign |
| PUT/DELETE | `/api/cards/:cardId/assignees/:userId` | member | |
| GET/POST | `/api/cards/:cardId/checklist` | member | |
| PATCH/DELETE | `/api/checklist-items/:itemId` | member | |
| GET/POST | `/api/cards/:cardId/comments` | member | |
| DELETE | `/api/comments/:commentId` | author **or** workspace owner | else `403` |

## Not in v1

Unarchive endpoints; promote-to-co-owner; Realtime; Storage attachments.
