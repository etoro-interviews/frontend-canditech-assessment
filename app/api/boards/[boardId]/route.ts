import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { ok, noContent, fromError } from "@/lib/api/response";
import { badRequest, notFound } from "@/lib/api/errors";
import type { BoardPage, ListWithCards } from "@/lib/api/types";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  position: z.number().optional(),
  archived: z.boolean().optional(),
});

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
  workspace: {
    members: {
      profile: { id: string; email: string; name: string } | null;
    }[];
  } | null;
  lists: { id: string; name: string; position: number; cards: CardRow[] }[];
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const { supabase } = await requireUser();

    // Single round trip: board, workspace members, lists and cards. Row-level
    // security scopes this to workspaces the caller belongs to, so a
    // non-member simply gets no row.
    const { data: board, error } = await supabase
      .from("boards")
      .select(
        "id, workspace_id, name, slug, position, workspace:workspaces!inner(members:workspace_members(profile:profiles(id, email, name))), lists(id, name, position, cards(id, list_id, title, position, due_at))",
      )
      .eq("id", boardId)
      .is("archived_at", null)
      .is("lists.archived_at", null)
      .is("lists.cards.archived_at", null)
      .order("position", { referencedTable: "lists", ascending: true })
      .order("position", { referencedTable: "lists.cards", ascending: true })
      .maybeSingle()
      .overrideTypes<BoardRow>();
    if (error) throw badRequest(error.message);
    if (!board) throw notFound();

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
      members: (board.workspace?.members ?? []).flatMap((m) =>
        m.profile ? [m.profile] : [],
      ),
    };

    return ok({ boardPage });
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const body = parseBody(patchSchema, await request.json());
    const { supabase } = await requireUser();

    if (body.archived === false) {
      throw badRequest("Unarchive is not supported in v1");
    }

    const updates: Record<string, unknown> = {};
    if (body.name != null) updates.name = body.name;
    if (body.position != null) updates.position = body.position;
    if (body.archived === true) updates.archived_at = new Date().toISOString();
    if (Object.keys(updates).length === 0) throw badRequest("No updates");

    const { data, error } = await supabase
      .from("boards")
      .update(updates)
      .eq("id", boardId)
      .is("archived_at", null)
      .select("id, workspace_id, name, slug, position, archived_at, created_at")
      .maybeSingle();
    if (error) throw badRequest(error.message);
    if (!data) throw notFound();

    return ok({
      board: {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        slug: data.slug,
        position: Number(data.position),
        archivedAt: data.archived_at,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const { supabase } = await requireUser();

    const { data, error } = await supabase
      .from("boards")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", boardId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw badRequest(error.message);
    if (!data) throw notFound();
    return noContent();
  } catch (error) {
    return fromError(error);
  }
}
