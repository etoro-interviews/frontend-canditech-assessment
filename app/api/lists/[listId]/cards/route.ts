import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { created, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

const schema = z.object({
  title: z.string().trim().min(1).max(500),
  position: z.number().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ listId: string }> },
) {
  try {
    const { listId } = await context.params;
    const body = parseBody(schema, await request.json());
    const { supabase, user } = await requireUser();

    const { data: list } = await supabase
      .from("lists")
      .select("id, board_id, boards!inner(workspace_id)")
      .eq("id", listId)
      .is("archived_at", null)
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

    let position = body.position;
    if (position == null) {
      const { data: last } = await supabase
        .from("cards")
        .select("position")
        .eq("list_id", listId)
        .is("archived_at", null)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      position = Number(last?.position ?? 0) + 1000;
    }

    const { data, error } = await supabase
      .from("cards")
      .insert({ list_id: listId, title: body.title, position })
      .select("id, list_id, title, position, due_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Create failed");

    return created({
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
