"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, MailCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { AuthShell } from "@/components/auth/AuthShell";
import { signUp, resendConfirmation } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 45;

export default function SignupPage() {
  const [stage, setStage] = useState<"form" | "check-email">("form");
  const [email, setEmail] = useState("");

  return (
    <AuthShell>
      {/* Keyed render, not AnimatePresence mode="wait" — the latter deadlocks
          under React StrictMode's double-invoke and strands the old stage. */}
      {stage === "form" ? (
        <SignupForm
          key="form"
          onSuccess={(submittedEmail) => {
            setEmail(submittedEmail);
            setStage("check-email");
          }}
        />
      ) : (
        <CheckEmail key="check" email={email} onBack={() => setStage("form")} />
      )}
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */

function SignupForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp({ email, password, fullName, phoneNumber: phone || undefined });
      onSuccess(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22 }}
    >
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start your wellness journey with Noor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <InlineError message={error} />}

        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            required
            autoComplete="name"
            placeholder="Ayesha Khan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

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
          <Label htmlFor="phone">
            Phone number <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
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
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/app/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Replaces the old `setTimeout(() => router.push("/app/login"), 2000)`.
 * Stays put, shows the address we mailed, allows a throttled resend, and
 * advances on its own when the user confirms in another tab.
 */
function CheckEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const advanced = useRef(false);

  // Countdown for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const advance = useCallback(async () => {
    if (advanced.current) return;
    advanced.current = true;
    setVerified(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let destination = "/app/onboarding";
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.onboarding_completed) destination = "/app/dashboard";
    }

    setTimeout(() => router.push(destination), 900);
  }, [router]);

  // Two paths to detect confirmation: the auth event (same tab / storage sync)
  // and a slow poll (covers the case where the event doesn't propagate).
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) advance();
    });

    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) advance();
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [advance]);

  async function handleResend() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await resendConfirmation(email);
      setNotice("Sent. Check your inbox again in a moment.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the email");
    } finally {
      setResending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22 }}
      className="text-center"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/[0.08]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
          <MailCheck className="h-6 w-6" strokeWidth={1.9} />
        </div>
      </div>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        We sent a confirmation link to
        <br />
        <span className="font-semibold text-foreground break-all">{email}</span>
      </p>

      <div className="mt-6 rounded-md border bg-muted/50 px-4 py-3.5 text-left">
        <p className="text-sm font-semibold">What to do next</p>
        <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>1. Open the email from Diet With Noor.</li>
          <li>2. Tap the confirmation link.</li>
          <li>3. You&rsquo;ll come straight back here to set up your plan.</li>
        </ol>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Nothing yet? It can take a minute — check your spam or promotions folder.
        </p>
      </div>

      <AnimatePresence>
        {verified && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-md bg-fresh-soft px-3.5 py-2.5 text-sm font-medium text-primary"
            role="status"
          >
            Email confirmed — taking you to setup...
          </motion.p>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      )}
      {notice && !error && (
        <p role="status" className="mt-4 rounded-md bg-fresh-soft px-3.5 py-2.5 text-sm text-primary">
          {notice}
        </p>
      )}

      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={handleResend}
        disabled={cooldown > 0 || resending || verified}
      >
        {resending && <Loader2 className="h-4 w-4 animate-spin" />}
        {cooldown > 0 ? `Resend email in ${cooldown}s` : resending ? "Sending..." : "Resend email"}
      </Button>

      <div className="mt-5 flex items-center justify-center gap-4 text-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Use a different email
        </button>
        <span aria-hidden="true" className="text-border">
          |
        </span>
        <Link href="/app/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}
