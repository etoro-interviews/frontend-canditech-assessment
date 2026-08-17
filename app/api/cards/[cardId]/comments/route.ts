import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { created, ok, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

const createSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  // Allows clients to attribute the comment (e.g. imported history).
  authorId: z.string().uuid().optional(),
});

async function assertCardAccess(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  cardId: string,
  userId: string,
) {
  const { data: card } = await supabase
    .from("cards")
    .select("id, list_id, lists!inner(board_id, boards!inner(workspace_id))")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) throw notFound();

  const workspaceId = (
    card.lists as unknown as {
      boards: { workspace_id: string };
    }
  ).boards.workspace_id;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw forbidden();
  return card;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await context.params;
    const { supabase, user } = await requireUser();
    await assertCardAccess(supabase, cardId, user.id);

    const { data: rows, error } = await supabase
      .from("comments")
      .select("id, card_id, author_id, body, created_at")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });
    if (error) throw badRequest(error.message);

    // Resolve author profiles one-by-one so we can tolerate missing profiles.
    const comments = [];
    for (const row of rows ?? []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, name")
        .eq("id", row.author_id)
        .maybeSingle();
      comments.push({
        id: row.id,
        cardId: row.card_id,
        authorId: row.author_id,
        body: row.body,
        createdAt: row.created_at,
        author: profile
          ? { id: profile.id, email: profile.email, name: profile.name }
          : { id: row.author_id, email: "", name: "Unknown" },
      });
    }

    return ok({ comments });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await context.params;
    const body = parseBody(createSchema, await request.json());
    const { supabase, user } = await requireUser();
    await assertCardAccess(supabase, cardId, user.id);

    console.log("creating comment", { cardId, body, userId: user.id });

    const authorId = body.authorId ?? user.id;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        card_id: cardId,
        author_id: authorId,
        body: body.body,
      })
      .select("id, card_id, author_id, body, created_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Create failed");

    return created({
      comment: {
        id: data.id,
        cardId: data.card_id,
        authorId: data.author_id,
        body: data.body,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}
