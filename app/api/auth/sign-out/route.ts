import { createClient } from "@/lib/supabase/server";
import { noContent, fromError } from "@/lib/api/response";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return noContent();
  } catch (error) {
    return fromError(error);
  }
}
