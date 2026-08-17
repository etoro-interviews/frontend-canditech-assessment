export type Role = "owner" | "member";

export type Profile = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type WorkspaceDetail = Workspace & {
  role: Role;
  memberCount: number;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  profile: Pick<Profile, "id" | "email" | "name">;
};

export type Board = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  position: number;
  archivedAt: string | null;
  createdAt: string;
};

export type CardSummary = {
  id: string;
  listId: string;
  title: string;
  position: number;
  dueAt: string | null;
  labelIds: string[];
  assigneeIds: string[];
  checklist: { done: number; total: number };
  commentCount: number;
};

export type ListWithCards = {
  id: string;
  name: string;
  position: number;
  cards: CardSummary[];
};

export type Label = {
  id: string;
  boardId: string;
  name: string;
  color: string;
};

export type BoardPage = {
  board: Pick<Board, "id" | "name" | "slug" | "workspaceId" | "position">;
  lists: ListWithCards[];
  labels: Label[];
  members: Array<Pick<Profile, "id" | "email" | "name">>;
};

export type TransferOwnershipRequest = {
  userId: string;
};

export type CardComment = {
  id: string;
  cardId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: Pick<Profile, "id" | "email" | "name">;
};
