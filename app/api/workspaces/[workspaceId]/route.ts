import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { ok, noContent, fromError } from "@/lib/api/response";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { resolveWorkspaceId } from "@/lib/api/slug";
import type { Role, WorkspaceDetail } from "@/lib/api/types";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

async function getMembership(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  workspaceId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId: slugOrId } = await context.params;
    const { supabase, user } = await requireUser();
    const workspaceId = await resolveWorkspaceId(supabase, slugOrId);
    if (!workspaceId) throw notFound();
    const membership = await getMembership(supabase, workspaceId, user.id);
    if (!membership) throw forbidden();

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, name, slug, created_at")
      .eq("id", workspaceId)
      .single();
    if (error || !workspace) throw notFound();

    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const detail: WorkspaceDetail = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.created_at,
      role: membership.role as Role,
      memberCount: count ?? 0,
    };
    return ok({ workspace: detail });
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId: slugOrId } = await context.params;
    const body = parseBody(patchSchema, await request.json());
    const { supabase, user } = await requireUser();
    const workspaceId = await resolveWorkspaceId(supabase, slugOrId);
    if (!workspaceId) throw notFound();
    const membership = await getMembership(supabase, workspaceId, user.id);
    if (!membership || membership.role !== "owner") throw forbidden();

    // Name updates do not change slug (fixed on create).
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .update({ name: body.name })
      .eq("id", workspaceId)
      .select("id, name, slug, created_at")
      .single();
    if (error || !workspace) throw badRequest(error?.message ?? "Update failed");

    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    return ok({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.created_at,
        role: "owner" as const,
        memberCount: count ?? 0,
      },
    });
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId: slugOrId } = await context.params;
    const { supabase, user } = await requireUser();
    const workspaceId = await resolveWorkspaceId(supabase, slugOrId);
    if (!workspaceId) throw notFound();
    const membership = await getMembership(supabase, workspaceId, user.id);
    if (!membership || membership.role !== "owner") throw forbidden();

    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);
    if (error) throw badRequest(error.message);
    return noContent();
  } catch (error) {
    return fromError(error);
  }
}
