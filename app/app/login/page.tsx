"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineError } from "@/components/ui/error-state";
import { AuthShell } from "@/components/auth/AuthShell";
import { signIn, resendConfirmation } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton mx-auto h-7 w-40" />
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // The auth callback route forwards failures here as ?error=
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  useEffect(() => {
    const paramError = searchParams.get("error");
    if (paramError) {
      setError(paramError);
      setNeedsConfirmation(/browser you signed up|confirmation link/i.test(paramError));
    }
  }, [searchParams]);

  async function handleResend() {
    if (!email) return;
    setResendState("sending");
    try {
      await resendConfirmation(email);
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email, password);

      // Send the user where they actually belong instead of always /dashboard —
      // an unonboarded user would otherwise just be bounced by middleware.
      // Admins skip the client onboarding wizard entirely.
      const supabase = createClient();
      const [{ data: appUser }, { data: profile }] = await Promise.all([
        supabase.from("users").select("role").eq("id", result.user.id).maybeSingle(),
        supabase.from("profiles").select("onboarding_completed").eq("user_id", result.user.id).maybeSingle(),
      ]);

      if (appUser?.role === "admin") {
        router.push("/app/admin");
      } else {
        router.push(profile?.onboarding_completed ? "/app/dashboard" : "/app/onboarding");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to pick up where you left off</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <InlineError message={error} />}

        {needsConfirmation && (
          <div className="-mt-1 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Enter your email above, then</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!email || resendState === "sending" || resendState === "sent"}
              className="font-semibold text-primary underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
            >
              {resendState === "sending"
                ? "Sending..."
                : resendState === "sent"
                ? "Email sent — check your inbox"
                : "resend the confirmation email"}
            </button>
          </div>
        )}
        {resendState === "error" && <InlineError message="Couldn't resend that email — try again in a moment." />}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
            Remember me
          </label>
          <Link
            href="/app/forgot-password"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/app/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}
