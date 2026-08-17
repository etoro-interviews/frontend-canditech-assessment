import { createClient } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/api/errors";
import { getAuthUser } from "@/lib/api/session";
import type { Profile } from "@/lib/api/types";

export async function requireUser() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) throw unauthorized();
  return { supabase, user };
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, created_at")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    createdAt: data.created_at,
  };
}

export function mapProfile(row: {
  id: string;
  email: string;
  name: string;
  created_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}
