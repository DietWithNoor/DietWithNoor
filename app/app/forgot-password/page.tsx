"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, MailCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { AuthShell } from "@/components/auth/AuthShell";
import { sendPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fresh-soft text-primary">
            <MailCheck className="h-7 w-7" strokeWidth={1.9} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            If an account exists for <span className="font-semibold text-foreground break-all">{email}</span>, we&rsquo;ve
            sent a link to reset your password.
          </p>
          <Button asChild size="lg" className="mt-7 w-full">
            <Link href="/app/login">Back to sign in</Link>
          </Button>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <KeyRound className="h-6 w-6" strokeWidth={1.9} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Enter the email you signed up with and we&rsquo;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <InlineError message={error} />}
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
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/app/login"
            className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
