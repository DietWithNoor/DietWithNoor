import { createClient } from "@/lib/supabase/client";

/**
 * Where Supabase sends the user after they click the confirmation link.
 * Must point at the Route Handler that exchanges the code for a session —
 * landing on a plain page leaves the code unredeemed and the user signed out.
 * Supabase Site URL / redirect allow-list is configured for
 * https://diet-with-noor.vercel.app/**
 */
export function authCallbackUrl(next?: string) {
  const base = `${window.location.origin}/app/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(params: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: authCallbackUrl(),
      data: {
        full_name: params.fullName,
        phone_number: params.phoneNumber ?? null,
      },
    },
  });
  if (error) throw error;
  return data;
}

/** Re-sends the confirmation email. The UI gates this behind a cooldown. */
export async function resendConfirmation(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authCallbackUrl() },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl("/app/profile"),
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
