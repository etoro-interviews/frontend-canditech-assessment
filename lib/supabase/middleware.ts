import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api/session";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required",
    );
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  return { supabase, supabaseResponse };
}

/** Refresh the auth session and enforce protected/auth routes. */
export async function updateSession(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  const user = await getAuthUser(supabase);

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app") || path.startsWith("/workspaces");
  const isAuthPage =
    path.startsWith("/sign-in") || path.startsWith("/sign-up");

  if (!user && isApp) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/workspaces";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
