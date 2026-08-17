import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { created, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  position: z.number().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const body = parseBody(schema, await request.json());
    const { supabase, user } = await requireUser();

    const { data: board } = await supabase
      .from("boards")
      .select("id, workspace_id")
      .eq("id", boardId)
      .is("archived_at", null)
      .maybeSingle();
    if (!board) throw notFound();

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", board.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw forbidden();

    let position = body.position;
    if (position == null) {
      const { data: last } = await supabase
        .from("lists")
        .select("position")
        .eq("board_id", boardId)
        .is("archived_at", null)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      position = Number(last?.position ?? 0) + 1000;
    }

    const { data, error } = await supabase
      .from("lists")
      .insert({ board_id: boardId, name: body.name, position })
      .select("id, board_id, name, position, archived_at, created_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Create failed");

    return created({
      list: {
        id: data.id,
        boardId: data.board_id,
        name: data.name,
        position: Number(data.position),
        archivedAt: data.archived_at,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
