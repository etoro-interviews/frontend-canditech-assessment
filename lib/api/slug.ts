import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "item";
}

export async function uniqueWorkspaceSlug(
  supabase: SupabaseClient,
  name: string,
): Promise<string> {
  const base = slugify(name);
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function uniqueBoardSlug(
  supabase: SupabaseClient,
  workspaceId: string,
  name: string,
): Promise<string> {
  const base = slugify(name);
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await supabase
      .from("boards")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function resolveWorkspaceId(
  supabase: SupabaseClient,
  slugOrId: string,
): Promise<string | null> {
  if (isUuid(slugOrId)) {
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", slugOrId)
      .maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slugOrId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function resolveBoard(
  supabase: SupabaseClient,
  workspaceId: string,
  slugOrId: string,
): Promise<{ id: string; slug: string } | null> {
  if (isUuid(slugOrId)) {
    const { data } = await supabase
      .from("boards")
      .select("id, slug")
      .eq("id", slugOrId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return data ?? null;
  }
  const { data } = await supabase
    .from("boards")
    .select("id, slug")
    .eq("workspace_id", workspaceId)
    .eq("slug", slugOrId)
    .maybeSingle();
  return data ?? null;
}
