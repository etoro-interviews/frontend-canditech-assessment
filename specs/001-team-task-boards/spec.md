# Feature Specification: Team Task Boards

**Feature Branch**: `001-team-task-boards`

**Created**: 2026-08-17

**Status**: Draft

**Input**: Greenfield Trello-style team collaboration boards (Core + rich cards MVP)

## Clarifications

### Session 2026-08-17

- Q: Should users be able to restore archived boards, lists, or cards in v1, or is archive permanent hide-only until a later release? → A: Archive only (no restore UI) in v1
- Q: Who is allowed to delete a comment on a card? → A: Comment author or workspace owner
- Q: Can a non-owner member leave a workspace on their own in v1? → A: Yes — any member can leave; last owner cannot leave/remove self
- Q: When someone creates a new board, should it start empty or with default lists? → A: Empty board (no lists)
- Q: Can a workspace have more than one owner in v1 (can an owner promote a member to owner)? → A: Single owner only; explicit transfer ownership to exactly one other member

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up, create a workspace, and open a board (Priority: P1)

A new user creates an account with email and password, creates a workspace, creates a board, and sees an empty board ready for lists and cards.

**Why this priority**: Without accounts, workspaces, and a board surface, no other collaboration value exists.

**Independent Test**: A new user can register, create one workspace and one board, and land on that board in under three minutes.

**Acceptance Scenarios**:

1. **Given** I have no account, **When** I sign up with email, password, and name, **Then** I am signed in and can create a workspace.
2. **Given** I am signed in with no workspaces, **When** I create a workspace with a name, **Then** I become its owner and see its home with an empty boards area and a clear create-board action.
3. **Given** I am on a workspace home, **When** I create a board, **Then** I open that board with no lists yet and can add lists.

---

### User Story 2 - Organize work with lists, cards, and drag-and-drop (Priority: P1)

A team member structures a board into lists, adds cards, renames items inline, and reorders cards within and across lists by dragging. Changes remain after refresh.

**Why this priority**: This is the core job of the product — moving work across stages.

**Independent Test**: On a seeded board, a user can create lists and cards, drag cards between lists, refresh, and see the same order.

**Acceptance Scenarios**:

1. **Given** an open board, **When** I add a list and cards with titles, **Then** they appear immediately without leaving the board.
2. **Given** cards in multiple lists, **When** I drag a card to another list or position, **Then** the new placement is visible and persists after reload.
3. **Given** a list or card, **When** I rename it inline, **Then** the new title is saved and shown to others after they reload.
4. **Given** a board, list, or card I no longer need, **When** I archive it, **Then** it disappears from the default board view and there is no v1 UI to restore it.

---

### User Story 3 - Invite teammates and collaborate in one workspace (Priority: P2)

A workspace owner shares an invite link. Another signed-in user accepts and can view and edit the same boards. Members can leave; the single owner can transfer ownership to another member before leaving. Owners manage membership and can remove members.

**Why this priority**: Team collaboration is the product differentiator over a personal todo list; boards are useless for teams without shared access.

**Independent Test**: User A creates an invite link; User B accepts and opens the same board; both can add cards; after refresh both see updates.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner, **When** I create an invite link, **Then** I receive a shareable link I can copy.
2. **Given** a valid invite link and I am signed in, **When** I accept, **Then** I join as a member and see the workspace boards.
3. **Given** I am a member (not owner), **When** I try to invite or remove members or delete the workspace, **Then** I am denied.
4. **Given** I am an owner, **When** I remove a member, **Then** they lose access to that workspace’s boards.
5. **Given** I am the sole owner, **When** I attempt to remove myself as owner or leave the workspace, **Then** the system blocks the action.
6. **Given** I am a member (not the sole owner), **When** I leave the workspace, **Then** I lose access to its boards and no longer appear in the member list.
7. **Given** I am the workspace owner and there is at least one other member, **When** I transfer ownership to that member, **Then** they become the sole owner and I become a member (or I may leave afterward).
8. **Given** I am the workspace owner, **When** I try to promote a second concurrent owner without transferring, **Then** the system does not allow multiple owners.

---

### User Story 4 - Enrich cards with details that teams need day to day (Priority: P2)

On a card, users add description, labels, due date, assignees, checklist items, and comments. The board card face shows enough summary (labels, due, checklist progress, comment count) that members rarely must open every card.

**Why this priority**: Rich cards make boards usable for real team work without requiring live sync or attachments in v1.

**Independent Test**: Open a card, set each rich field, close and reopen; card face badges match; another member sees the same after reload.

**Acceptance Scenarios**:

1. **Given** an open card, **When** I edit description, due date, labels, and assignees, **Then** those values save and reappear when I reopen the card.
2. **Given** a card, **When** I add checklist items and toggle some done, **Then** progress shows on the card face as done/total.
3. **Given** a card, **When** I post a comment, **Then** it appears with author and time in chronological order.
4. **Given** I authored a comment (or I am a workspace owner), **When** I delete that comment, **Then** it is removed; other members who are not owners cannot delete my comment.
5. **Given** a card with labels, due date, checklist, and comments, **When** I view the board, **Then** the card face shows those signals without opening the card.

---

### User Story 5 - Understand empty and error states without confusion (Priority: P3)

First-time empty workspaces/boards and common failures (bad invite, forbidden action) show clear, user-facing messages and a single next action where appropriate.

**Why this priority**: Reduces drop-off and support burden; not required to prove core board value but required for shippable quality.

**Independent Test**: New account sees empty-state copy and CTA; expired/invalid invite and forbidden actions show understandable messages.

**Acceptance Scenarios**:

1. **Given** a new workspace with no boards, **When** I open workspace home, **Then** I see one short empty message and one create-board action.
2. **Given** an invalid or expired invite, **When** I try to accept, **Then** I see a clear failure message and cannot join.
3. **Given** I lack permission for an action, **When** I attempt it, **Then** I am told I cannot perform it (without exposing other workspaces’ data).

---

### Edge Cases

- What happens when the invite token is unknown, expired, or already used?
- Owner cannot leave or be removed until ownership is transferred to another member.
- Members may leave a workspace; the owner must transfer ownership before leaving.
- v1 allows exactly one owner per workspace (no concurrent co-owners).
- What happens when a user who is not a workspace member tries to open a board URL directly?
- Archived boards/lists/cards are excluded from default views; v1 has no restore/unarchive UI.
- What happens when two members edit the same card and then refresh (last write wins; no live merge in v1)?
- Checklist items may be deleted by any workspace member; comments may be deleted only by the author or a workspace owner.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to register and sign in with email and password, and sign out.
- **FR-002**: System MUST allow an authenticated user to create, rename, and delete workspaces they own; creators MUST become workspace owners. Rename and delete MUST be available in the product UI (settings), not only via API.
- **FR-003**: System MUST support workspace roles `owner` and `member`. Each workspace MUST have exactly one owner at a time. The owner can manage membership, transfer ownership, and delete the workspace; members can use boards but cannot manage membership, transfer ownership, or delete the workspace.
- **FR-003a**: System MUST allow non-owner members to leave a workspace voluntarily. System MUST allow the owner to leave only after transferring ownership to another member. System MUST provide an explicit transfer-ownership action that designates exactly one other current member as the new sole owner (previous owner becomes a member).
- **FR-004**: System MUST allow owners to create shareable invite links (optionally noting an email for display); authenticated users MUST be able to accept a valid invite and join the workspace.
- **FR-005**: System MUST prevent a workspace from having zero owners (no owner removal or leave without a completed ownership transfer to another member).
- **FR-006**: System MUST allow members to create, rename, and archive boards within their workspace, and open a board view of lists and cards. Rename and archive MUST be available in the product UI. A newly created board MUST start with zero lists (no default columns). Archived boards MUST NOT appear in default workspace board lists in v1; the system MUST NOT provide restore/unarchive UI in v1.
- **FR-007**: System MUST allow members to create, rename, reorder, and archive lists on a board. Rename and archive MUST be available in the product UI (inline title edit + archive action). Archived lists MUST NOT appear on the default board view; the system MUST NOT provide restore/unarchive UI in v1.
- **FR-008**: System MUST allow members to create, rename, reorder, move across lists, and archive cards. Rename and archive MUST be available in the product UI (inline title edit + archive action). Archived cards MUST NOT appear on the default board view; the system MUST NOT provide restore/unarchive UI in v1.
- **FR-008a**: System MUST expose edit and remove for every entity the UI can create in the same release: workspaces (rename/delete), boards/lists/cards (rename/archive), and later labels/checklist items/comments (edit/delete per existing ACL). Create-only UI without edit/remove is not acceptable.
- **FR-009**: System MUST persist list and card order so that after reload the arrangement matches the last successful change.
- **FR-010**: System MUST allow members to edit card description, due date, board-defined labels (create/assign), assignees (workspace members only), checklist items, and comments. System MUST allow deleting a comment only when the actor is the comment author or a workspace owner.
- **FR-011**: System MUST show on each card face: title, label indicators, due date if set, checklist progress when applicable, and comment count when applicable.
- **FR-012**: System MUST deny access to workspace and board data for users who are not members of that workspace.
- **FR-013**: System MUST present all product UI copy through language translation keys, with English as the only shipped language in v1; user-authored content (titles, descriptions, comments, names) MUST NOT be treated as translation catalog entries.
- **FR-014**: System MUST map failure reasons to stable error codes that the UI turns into user-facing messages (users MUST NOT rely on raw technical error text as primary copy).
- **FR-015**: System MUST provide clear empty states for first workspace/board/list experiences with a single primary call to action.
- **FR-016**: System MUST NOT require live multi-user presence or instant push updates in v1; consistency after refresh is sufficient.
- **FR-017**: System MUST NOT include in v1: file attachments, cover images, calendar/timeline views, automations, SSO, private boards within a workspace, additional languages beyond English, or restore/unarchive of archived boards, lists, or cards.

### Key Entities

- **User (Profile)**: A person with email and display name who can own or join workspaces.
- **Workspace**: A team container with a name, members, and boards.
- **Workspace membership**: Links a user to a workspace with role owner or member; at most one owner per workspace.
- **Invite**: A tokenized invitation to join a workspace, with expiry and optional email note.
- **Board**: A named collaboration surface inside a workspace; can be archived.
- **List**: An ordered column on a board; can be archived.
- **Card**: An ordered work item in a list, with title and optional rich fields; can be archived.
- **Label**: A named colored tag defined on a board and assignable to cards.
- **Checklist item**: A done/undone step on a card.
- **Comment**: A dated message on a card authored by a member.
- **Assignment**: Association of one or more workspace members to a card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from sign-up to an open board in under 3 minutes.
- **SC-002**: Creating a card or list appears on the board without requiring a full manual page reload to see one’s own change.
- **SC-003**: After moving a card and refreshing, 100% of tested moves retain the intended list and order.
- **SC-004**: A second user who accepted an invite can open the same board and see prior lists/cards after refresh; unauthorized users cannot access that board.
- **SC-005**: In a structured walkthrough, users can set description, label, due date, assignee, checklist, and comment on a card and confirm all appear correctly on reopen and (where applicable) on the card face.
- **SC-006**: Spot-checks find zero cases of one workspace’s data visible to a user who is not a member of that workspace.
- **SC-007**: UI review finds no hardcoded product English strings outside the translation catalog (user content excluded).

## Assumptions

- Target users are small teams familiar with kanban-style boards (similar to common board tools).
- New boards start empty (no pre-seeded lists).
- Workspaces have a single owner; ownership changes only via explicit transfer to another member.
- Email confirmation may be disabled in early environments; production may enable it later without changing the core stories.
- Invite UX is link-first; sending email from the product is out of scope for v1.
- Concurrent edits resolve by last successful save; no conflict UI in v1.
- Soft “archive” hides boards/lists/cards from default views; restore/unarchive UI is explicitly out of scope for v1.
- Tablet use is expected; phone may scroll horizontally and need not be a polished primary target.
- Product and governance details in `.specify/memory/constitution.md` and the rest of this feature pack (`plan.md`, `data-model.md`, `contracts/rest-api.md`) constrain planning/implementation; this feature spec states only user-facing needs.
- Bootstrap product brief (`docs/SPEC.md`) was retired once Spec Kit artifacts became the source of truth.
