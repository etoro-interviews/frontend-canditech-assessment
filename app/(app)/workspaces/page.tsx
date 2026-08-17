import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspacesClient } from "@/components/workspace/WorkspacesClient";
import { getAuthUser } from "@/lib/api/session";
import type { Role, WorkspaceDetail } from "@/lib/api/types";

type WorkspaceRow = {
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    members: { count: number }[];
  } | null;
};

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/sign-in");

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select(
      "role, workspace:workspaces!inner(id, name, slug, created_at, members:workspace_members(count))",
    )
    .eq("user_id", user.id)
    .overrideTypes<WorkspaceRow[]>();

  if (error) {
    return <WorkspacesClient initial={[]} />;
  }

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

  return <WorkspacesClient initial={workspaces} />;
}
