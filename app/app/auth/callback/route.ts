import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

/**
 * GET /app/auth/callback?code=...
 *
 * Supabase's email confirmation / magic link lands here. We exchange the code
 * for a session (which sets the auth cookies via the response), then route the
 * user onward:
 *   - onboarding not finished -> /app/auth/confirmed (shows "Email verified",
 *     whose CTA continues to /app/onboarding)
 *   - otherwise               -> /app/dashboard
 *
 * Cookies must be written onto the SAME response object we return, otherwise
 * the session is dropped and the user bounces back to /app/login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/app/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/app/login?error=${encodeURIComponent("That confirmation link is missing or malformed.")}`
    );
  }

  // Placeholder destination; rewritten below once we know the profile state.
  let response = NextResponse.redirect(`${origin}/app/dashboard`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) => fetch(url, { ...options, cache: "no-store" }),
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    // PKCE's verifier is stored as a cookie in the browser that started the
    // signup — opening the email link in a different browser or app (very
    // common: an in-app browser like Gmail's) means that cookie isn't there.
    // The raw SDK message is technical; give the user something actionable.
    const isPkceMismatch = /pkce|code verifier/i.test(error?.message ?? "");
    const friendlyMessage = isPkceMismatch
      ? "This confirmation link needs to be opened in the same browser you signed up in. If you tapped it from an email app, try “Open in Browser” or copy the link into Safari/Chrome — or request a new email below."
      : (error?.message ?? "That confirmation link has expired. Request a new one.");

    return NextResponse.redirect(`${origin}/app/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  const [{ data: appUser }, { data: profile }] = await Promise.all([
    supabase.from("users").select("role").eq("id", data.user.id).maybeSingle(),
    supabase.from("profiles").select("onboarding_completed").eq("user_id", data.user.id).maybeSingle(),
  ]);

  // Admins never go through the client onboarding wizard.
  const isAdmin = appUser?.role === "admin";
  const onboarded = isAdmin || profile?.onboarding_completed === true;
  const destination = next ?? (isAdmin ? "/app/admin" : onboarded ? "/app/dashboard" : "/app/auth/confirmed");

  // Re-target the redirect while preserving the auth cookies already staged on
  // `response` — copying them over rather than building a fresh response.
  const finalResponse = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));

  return finalResponse;
}
