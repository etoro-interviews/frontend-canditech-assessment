import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { ok, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

const schema = z.object({
  listId: z.string().uuid(),
  position: z.number(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await context.params;
    const body = parseBody(schema, await request.json());
    const { supabase, user } = await requireUser();

    const { data: card } = await supabase
      .from("cards")
      .select("id, list_id")
      .eq("id", cardId)
      .maybeSingle();
    if (!card) throw notFound();

    const { data: targetList } = await supabase
      .from("lists")
      .select("id, boards!inner(workspace_id)")
      .eq("id", body.listId)
      .is("archived_at", null)
      .maybeSingle();
    if (!targetList) throw notFound();

    const workspaceId = (
      targetList.boards as unknown as { workspace_id: string }
    ).workspace_id;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw forbidden();

    const { data, error } = await supabase
      .from("cards")
      .update({
        list_id: body.listId,
        position: body.position,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .select("id, list_id, title, position, due_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Move failed");

    return ok({
      card: {
        id: data.id,
        listId: data.list_id,
        title: data.title,
        position: Number(data.position),
        dueAt: data.due_at,
        labelIds: [],
        assigneeIds: [],
        checklist: { done: 0, total: 0 },
        commentCount: 0,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
