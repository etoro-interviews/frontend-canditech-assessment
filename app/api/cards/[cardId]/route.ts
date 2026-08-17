import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { ok, noContent, fromError } from "@/lib/api/response";
import { badRequest, notFound } from "@/lib/api/errors";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(20000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  position: z.number().optional(),
  listId: z.string().uuid().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await context.params;
    const body = parseBody(patchSchema, await request.json());
    const { supabase } = await requireUser();

    if (body.archived === false) {
      throw badRequest("Unarchive is not supported in v1");
    }

    const updates: Record<string, unknown> = {};
    if (body.title != null) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dueAt !== undefined) updates.due_at = body.dueAt;
    if (body.position != null) updates.position = body.position;
    if (body.listId != null) updates.list_id = body.listId;
    if (body.archived === true) updates.archived_at = new Date().toISOString();
    if (Object.keys(updates).length === 0) throw badRequest("No updates");

    const { data, error } = await supabase
      .from("cards")
      .update(updates)
      .eq("id", cardId)
      .is("archived_at", null)
      .select(
        "id, list_id, title, description, position, due_at, archived_at, created_at",
      )
      .maybeSingle();
    if (error) throw badRequest(error.message);
    if (!data) throw notFound();

    return ok({
      card: {
        id: data.id,
        listId: data.list_id,
        title: data.title,
        description: data.description,
        position: Number(data.position),
        dueAt: data.due_at,
        archivedAt: data.archived_at,
        createdAt: data.created_at,
        labelIds: [] as string[],
        assigneeIds: [] as string[],
      },
    });
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await context.params;
    const { supabase } = await requireUser();

    const { data, error } = await supabase
      .from("cards")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", cardId)
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
