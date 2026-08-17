import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSettingsClient } from "@/components/workspace/WorkspaceSettingsClient";
import { getAuthUser } from "@/lib/api/session";
import { isUuid } from "@/lib/api/slug";
import type { Role, WorkspaceDetail } from "@/lib/api/types";

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

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slugOrId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/sign-in");

  const { data: row } = await supabase
    .from("workspace_members")
    .select(
      "role, workspace:workspaces!inner(id, name, slug, created_at, members:workspace_members(count))",
    )
    .eq("user_id", user.id)
    .eq(isUuid(slugOrId) ? "workspace.id" : "workspace.slug", slugOrId)
    .maybeSingle()
    .overrideTypes<MembershipRow>();

  const workspace = row?.workspace;
  if (!workspace) notFound();

  if (slugOrId !== workspace.slug) {
    redirect(`/workspaces/${workspace.slug}/settings`);
  }

  const detail: WorkspaceDetail = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.created_at,
    role: row.role as Role,
    memberCount: workspace.members?.[0]?.count ?? 0,
  };

  return <WorkspaceSettingsClient workspace={detail} />;
}
