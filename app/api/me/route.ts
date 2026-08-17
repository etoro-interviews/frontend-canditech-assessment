import { getProfile } from "@/lib/api/auth";
import { ok, fromError } from "@/lib/api/response";
import { notFound } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await getProfile();
    if (!user) throw notFound("Profile not found");
    return ok({ user });
  } catch (error) {
    return fromError(error);
  }
}
