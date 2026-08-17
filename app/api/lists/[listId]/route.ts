import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { ok, fromError, noContent } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  position: z.number().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ listId: string }> },
) {
  try {
    const { listId } = await context.params;
    const body = parseBody(patchSchema, await request.json());
    const { supabase, user } = await requireUser();

    const { data: list } = await supabase
      .from("lists")
      .select("id, board_id, boards!inner(workspace_id)")
      .eq("id", listId)
      .maybeSingle();
    if (!list) throw notFound();
    const workspaceId = (list.boards as unknown as { workspace_id: string })
      .workspace_id;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw forbidden();

    if (body.archived === false) {
      throw badRequest("Unarchive is not supported in v1");
    }

    const updates: Record<string, unknown> = {};
    if (body.name != null) updates.name = body.name;
    if (body.position != null) updates.position = body.position;
    if (body.archived === true) updates.archived_at = new Date().toISOString();
    if (Object.keys(updates).length === 0) throw badRequest("No updates");

    const { data, error } = await supabase
      .from("lists")
      .update(updates)
      .eq("id", listId)
      .select("id, board_id, name, position, archived_at, created_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Update failed");

    return ok({
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ listId: string }> },
) {
  try {
    const { listId } = await context.params;
    const { supabase, user } = await requireUser();
    const { data: list } = await supabase
      .from("lists")
      .select("id, boards!inner(workspace_id)")
      .eq("id", listId)
      .maybeSingle();
    if (!list) throw notFound();
    const workspaceId = (list.boards as unknown as { workspace_id: string })
      .workspace_id;
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw forbidden();

    const { error } = await supabase
      .from("lists")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", listId);
    if (error) throw badRequest(error.message);
    return noContent();
  } catch (error) {
    return fromError(error);
  }
}
