import { requireUser } from "@/lib/api/auth";
import { noContent, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const { supabase, user } = await requireUser();

    const { data: comment } = await supabase
      .from("comments")
      .select(
        "id, author_id, card_id, cards!inner(list_id, lists!inner(board_id, boards!inner(workspace_id)))",
      )
      .eq("id", commentId)
      .maybeSingle();
    if (!comment) throw notFound();

    const workspaceId = (
      comment.cards as unknown as {
        lists: { boards: { workspace_id: string } };
      }
    ).lists.boards.workspace_id;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw forbidden();

    // Members can moderate noisy threads on shared boards.
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) throw badRequest(error.message);

    return noContent();
  } catch (error) {
    return fromError(error);
  }
}
