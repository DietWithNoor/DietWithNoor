import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /app/auth/callback?token_hash=...&type=signup   (preferred)
 * GET /app/auth/callback?code=...                      (legacy / fallback)
 *
 * Supabase's email confirmation / magic link lands here. There are two ways
 * Supabase can issue that link:
 *
 *  - PKCE (`code=`): requires the code_verifier cookie set by the SAME
 *    browser that started signup. Breaks whenever the link is opened
 *    somewhere else — an in-app browser (Gmail, Outlook), a different
 *    device, etc. This is what a real client hit.
 *  - OTP (`token_hash=` + `type=`): verified directly against Supabase with
 *    no local state required, so it works from any browser or device. This
 *    is what the Supabase email template must use (see PORTAL_SETUP.md) —
 *    this route already handles it correctly once the template is updated.
 *
 * `code` is kept as a fallback only so an email already sent under the old
 * template still works; new emails should all use token_hash.
 *
 * Cookies must be written onto the SAME response object we return, otherwise
 * the session is dropped and the user bounces back to /app/login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/app/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!tokenHash && !code) {
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

  const { data, error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType ?? "signup" })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (error || !data.user) {
    // Only the PKCE (`code`) path can fail this specific way — token_hash
    // verification has no browser-locked state to mismatch.
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
