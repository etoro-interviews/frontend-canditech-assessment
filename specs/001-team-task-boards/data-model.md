# Data Model: Team Task Boards

**Feature**: `001-team-task-boards`  
**Date**: 2026-08-17  
**Source**: Feature spec + clarifications; schema detail in `data-model.md` and `supabase/migrations/`.

## Entities

### profiles
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | = `auth.users.id` |
| email | text unique not null | |
| name | text not null | |
| created_at | timestamptz | default now() |

Created by trigger on `auth.users` insert (`raw_user_meta_data.name`).

### workspaces
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| name | text not null | |
| created_at | timestamptz | |

### workspace_members
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| workspace_id | uuid FK → workspaces on delete cascade | |
| user_id | uuid FK → profiles | |
| role | text check (`owner` \| `member`) | |
| joined_at | timestamptz | |

**Constraints**: Unique `(workspace_id, user_id)`. **Partial unique index**: at most one row with `role = 'owner'` per `workspace_id`.

### invites
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| workspace_id | uuid FK cascade | |
| email | text null | display only |
| token | text unique not null | unguessable |
| role | text | always `member` on accept in v1 |
| expires_at | timestamptz not null | |
| accepted_at | timestamptz null | |
| created_at | timestamptz | |

### boards
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| workspace_id | uuid FK cascade | |
| name | text not null | |
| position | numeric not null | gap ordering within workspace |
| archived_at | timestamptz null | no restore UI in v1 |
| created_at | timestamptz | |

New boards: no child lists.

### lists
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| board_id | uuid FK cascade | |
| name | text not null | |
| position | numeric not null | |
| archived_at | timestamptz null | |
| created_at | timestamptz | |

### cards
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| list_id | uuid FK cascade | |
| title | text not null | |
| description | text not null default `''` | |
| due_at | timestamptz null | |
| position | numeric not null | |
| archived_at | timestamptz null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### labels
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| board_id | uuid FK cascade | |
| name | text not null | |
| color | text not null | hex |

### card_labels
| card_id | label_id | PK composite; both FK cascade |

### card_assignees
| card_id | user_id | PK composite; user must be workspace member (enforce in API) |

### checklist_items
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| card_id | uuid FK cascade | |
| title | text not null | |
| done | boolean not null default false | |
| position | numeric not null | |

Hard delete.

### comments
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| card_id | uuid FK cascade | |
| author_id | uuid FK → profiles | |
| body | text not null | |
| created_at | timestamptz | |

Hard delete. Delete allowed for author or workspace owner (API + policy).

## Relationships (summary)

```text
profiles 1—* workspace_members *—1 workspaces
workspaces 1—* boards 1—* lists 1—* cards
boards 1—* labels; cards *—* labels via card_labels
cards *—* profiles via card_assignees
cards 1—* checklist_items; cards 1—* comments
workspaces 1—* invites
```

## State transitions

| Entity | Transition | Rule |
| --- | --- | --- |
| Board/List/Card | active → archived | set `archived_at`; excluded from default reads; **no reverse in v1** |
| Invite | pending → accepted | set `accepted_at`; create `workspace_members` as `member` |
| Invite | pending → expired | `expires_at` < now; accept rejected |
| Membership | join | via invite accept |
| Membership | leave | member deletes own membership; owner must transfer first |
| Ownership | transfer | single transaction: old owner → `member`, target → `owner` |

## Validation rules

- Names/titles: non-empty trimmed strings (reasonable max length e.g. 200 / 500).
- Comment body / description: non-empty for comments; description may be empty string.
- Assignees: subset of workspace member user ids.
- Label colors: allowlist of hex tokens.
- Positions: finite numbers; server may renumber on conflict.

## RLS helpers

- `is_workspace_member(workspace_id uuid) returns boolean`
- `is_workspace_owner(workspace_id uuid) returns boolean`

Child tables resolve `workspace_id` via board/list/card joins. Default deny.
