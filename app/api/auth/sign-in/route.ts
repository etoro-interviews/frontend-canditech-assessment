import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api/validate";
import { ok, fromError } from "@/lib/api/response";
import { badRequest } from "@/lib/api/errors";
import { mapProfile } from "@/lib/api/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = parseBody(schema, await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) throw badRequest(error.message);
    if (!data.user) throw badRequest("Sign in failed");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", data.user.id)
      .single();

    return ok({
      user: profile
        ? mapProfile(profile)
        : {
            id: data.user.id,
            email: data.user.email ?? body.email,
            name: data.user.user_metadata?.name ?? "User",
            createdAt: data.user.created_at,
          },
    });
  } catch (error) {
    return fromError(error);
  }
}
