import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardShell } from "@/components/board/BoardShell";
import { getAuthUser } from "@/lib/api/session";
import { isUuid } from "@/lib/api/slug";
import type { BoardPage, ListWithCards } from "@/lib/api/types";

type CardRow = {
  id: string;
  list_id: string;
  title: string;
  position: number;
  due_at: string | null;
};

type BoardRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  position: number;
  workspace: { id: string; name: string; slug: string } | null;
  lists: { id: string; name: string; position: number; cards: CardRow[] }[];
};

export default async function BoardPageView({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId: wsSlugOrId, boardId: boardSlugOrId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/sign-in");

  // Single round trip: board, its workspace, lists and cards. Row-level
  // security already restricts this to workspaces the user belongs to.
  const { data: board } = await supabase
    .from("boards")
    .select(
      "id, workspace_id, name, slug, position, workspace:workspaces!inner(id, name, slug), lists(id, name, position, cards(id, list_id, title, position, due_at))",
    )
    .eq(isUuid(boardSlugOrId) ? "id" : "slug", boardSlugOrId)
    .eq(isUuid(wsSlugOrId) ? "workspace.id" : "workspace.slug", wsSlugOrId)
    .is("archived_at", null)
    .is("lists.archived_at", null)
    .is("lists.cards.archived_at", null)
    .order("position", { referencedTable: "lists", ascending: true })
    .order("position", { referencedTable: "lists.cards", ascending: true })
    .maybeSingle()
    .overrideTypes<BoardRow>();

  const workspace = board?.workspace;
  if (!board || !workspace) notFound();

  if (wsSlugOrId !== workspace.slug || boardSlugOrId !== board.slug) {
    redirect(`/workspaces/${workspace.slug}/boards/${board.slug}`);
  }

  const listsWithCards: ListWithCards[] = (board.lists ?? []).map((list) => ({
    id: list.id,
    name: list.name,
    position: Number(list.position),
    cards: (list.cards ?? []).map((c) => ({
      id: c.id,
      listId: c.list_id,
      title: c.title,
      position: Number(c.position),
      dueAt: c.due_at,
      labelIds: [],
      assigneeIds: [],
      checklist: { done: 0, total: 0 },
      commentCount: 0,
    })),
  }));

  const boardPage: BoardPage = {
    board: {
      id: board.id,
      name: board.name,
      slug: board.slug,
      workspaceId: board.workspace_id,
      position: Number(board.position),
    },
    lists: listsWithCards,
    labels: [],
    members: [],
  };

  return (
    <BoardShell
      workspaceSlug={workspace.slug}
      initial={boardPage}
      currentUserId={user.id}
    />
  );
}
