import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceHomeClient } from "@/components/workspace/WorkspaceHomeClient";
import { getAuthUser } from "@/lib/api/session";
import { isUuid } from "@/lib/api/slug";
import type { Board, Role, WorkspaceDetail } from "@/lib/api/types";

type BoardRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  position: number;
  archived_at: string | null;
  created_at: string;
};

type MembershipRow = {
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    members: { count: number }[];
    boards: BoardRow[];
  } | null;
};

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slugOrId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/sign-in");

  // Single round trip: membership + role, workspace, member count and boards.
  const { data: row } = await supabase
    .from("workspace_members")
    .select(
      "role, workspace:workspaces!inner(id, name, slug, created_at, members:workspace_members(count), boards(id, workspace_id, name, slug, position, archived_at, created_at))",
    )
    .eq("user_id", user.id)
    .eq(isUuid(slugOrId) ? "workspace.id" : "workspace.slug", slugOrId)
    .is("workspace.boards.archived_at", null)
    .order("position", {
      referencedTable: "workspace.boards",
      ascending: true,
    })
    .maybeSingle()
    .overrideTypes<MembershipRow>();

  const workspace = row?.workspace;
  if (!workspace) notFound();

  if (slugOrId !== workspace.slug) {
    redirect(`/workspaces/${workspace.slug}`);
  }

  const detail: WorkspaceDetail = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.created_at,
    role: row.role as Role,
    memberCount: workspace.members?.[0]?.count ?? 0,
  };

  const boards: Board[] = (workspace.boards ?? []).map((b) => ({
    id: b.id,
    workspaceId: b.workspace_id,
    name: b.name,
    slug: b.slug,
    position: Number(b.position),
    archivedAt: b.archived_at,
    createdAt: b.created_at,
  }));

  return <WorkspaceHomeClient workspace={detail} boards={boards} />;
}
