import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { created, ok, fromError } from "@/lib/api/response";
import { badRequest, forbidden } from "@/lib/api/errors";
import { resolveWorkspaceId, uniqueBoardSlug } from "@/lib/api/slug";
import type { Board } from "@/lib/api/types";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

async function assertMember(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  workspaceId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw forbidden();
}

function mapBoard(row: {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  position: number;
  archived_at: string | null;
  created_at: string;
}): Board {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    position: Number(row.position),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId: slugOrId } = await context.params;
    const { supabase, user } = await requireUser();
    const workspaceId = await resolveWorkspaceId(supabase, slugOrId);
    if (!workspaceId) throw forbidden();
    await assertMember(supabase, workspaceId, user.id);

    const { data, error } = await supabase
      .from("boards")
      .select("id, workspace_id, name, slug, position, archived_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("position", { ascending: true });
    if (error) throw badRequest(error.message);

    return ok({ boards: (data ?? []).map(mapBoard) });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId: slugOrId } = await context.params;
    const body = parseBody(createSchema, await request.json());
    const { supabase, user } = await requireUser();
    const workspaceId = await resolveWorkspaceId(supabase, slugOrId);
    if (!workspaceId) throw forbidden();
    await assertMember(supabase, workspaceId, user.id);

    const { data: last } = await supabase
      .from("boards")
      .select("position")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = Number(last?.position ?? 0) + 1000;
    const slug = await uniqueBoardSlug(supabase, workspaceId, body.name);

    const { data, error } = await supabase
      .from("boards")
      .insert({
        workspace_id: workspaceId,
        name: body.name,
        slug,
        position,
      })
      .select("id, workspace_id, name, slug, position, archived_at, created_at")
      .single();
    if (error || !data) throw badRequest(error?.message ?? "Create failed");

    return created({ board: mapBoard(data) });
  } catch (error) {
    return fromError(error);
  }
}
