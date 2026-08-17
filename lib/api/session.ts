import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = { id: string; email: string | null };

/**
 * Resolves the signed-in user by verifying the session JWT locally against the
 * cached JWKS. `auth.getUser()` would be a network round trip to the Auth
 * server on every request, which dominates page latency.
 *
 * Requires an asymmetric signing key (ES256/RS256) on the project; with a
 * legacy symmetric secret Supabase falls back to a server call automatically.
 */
export async function getAuthUser(
  supabase: SupabaseClient,
): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
