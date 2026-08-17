import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { parseBody } from "@/lib/api/validate";
import { created, ok, fromError } from "@/lib/api/response";
import { badRequest } from "@/lib/api/errors";
import { uniqueWorkspaceSlug } from "@/lib/api/slug";
import type { Role, WorkspaceDetail } from "@/lib/api/types";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

type MembershipRow = {
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    members: { count: number }[];
  } | null;
};

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: memberships, error } = await supabase
      .from("workspace_members")
      .select(
        "role, workspace:workspaces!inner(id, name, slug, created_at, members:workspace_members(count))",
      )
      .eq("user_id", user.id)
      .overrideTypes<MembershipRow[]>();
    if (error) throw badRequest(error.message);

    const workspaces: WorkspaceDetail[] = (memberships ?? []).flatMap((row) => {
      const ws = row.workspace;
      if (!ws) return [];
      return [
        {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          createdAt: ws.created_at,
          role: row.role as Role,
          memberCount: ws.members?.[0]?.count ?? 0,
        },
      ];
    });

    return ok({ workspaces });
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = parseBody(createSchema, await request.json());
    const { supabase, user } = await requireUser();
    const slug = await uniqueWorkspaceSlug(supabase, body.name);

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({ name: body.name, slug })
      .select("id, name, slug, created_at")
      .single();
    if (error || !workspace) throw badRequest(error?.message ?? "Create failed");

    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });
    if (memberError) throw badRequest(memberError.message);

    const detail: WorkspaceDetail = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.created_at,
      role: "owner",
      memberCount: 1,
    };
    return created({ workspace: detail });
  } catch (error) {
    return fromError(error);
  }
}
