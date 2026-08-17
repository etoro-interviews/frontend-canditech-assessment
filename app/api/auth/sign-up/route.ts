import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api/validate";
import { created, fromError } from "@/lib/api/response";
import { badRequest } from "@/lib/api/errors";
import { mapProfile } from "@/lib/api/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  try {
    const body = parseBody(schema, await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { name: body.name } },
    });
    if (error) throw badRequest(error.message);
    if (!data.user) throw badRequest("Sign up failed");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .eq("id", data.user.id)
      .single();

    return created({
      user: profile
        ? mapProfile(profile)
        : {
            id: data.user.id,
            email: body.email,
            name: body.name,
            createdAt: new Date().toISOString(),
          },
    });
  } catch (error) {
    return fromError(error);
  }
}
