import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/app/dashboard",
  "/app/progress",
  "/app/wellness",
  "/app/meals",
  "/app/profile",
  "/app/onboarding",
  "/app/admin",
];
const ADMIN_PREFIX = "/app/admin";
const ONBOARDING_PATH = "/app/onboarding";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Supabase's default fetch is cached by Next, which served stale role /
        // onboarding values. Keep this — it is load-bearing.
        fetch: (url: RequestInfo | URL, options?: RequestInit) => fetch(url, { ...options, cache: "no-store" }),
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isOnboardingRoute = pathname.startsWith(ONBOARDING_PATH);

  if (!isProtected) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const [{ data: appUser }, { data: profile }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle(),
  ]);

  const isAdmin = appUser?.role === "admin";
  // A missing profile row counts as "not onboarded" — the wizard upserts it.
  const onboarded = profile?.onboarding_completed === true;

  if (isAdminRoute) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Admins go straight into the console. Gating the admin panel behind the
    // client onboarding wizard would lock a coach out of their own dashboard.
    return response;
  }

  // Gate: an unonboarded user can only be on the wizard...
  if (!onboarded && !isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = ONBOARDING_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ...and an onboarded user can never go back to it.
  if (onboarded && isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/app/dashboard/:path*",
    "/app/progress/:path*",
    "/app/wellness/:path*",
    "/app/meals/:path*",
    "/app/profile/:path*",
    "/app/onboarding/:path*",
    "/app/admin/:path*",
  ],
};
