"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * User-facing confirmation screen after the callback route redeems the code.
 * We resolve where "Continue" should go based on the live session so the
 * button never dead-ends on a protected route.
 */
export default function EmailConfirmedPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [nextHref, setNextHref] = useState("/app/onboarding");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      if (!session) {
        setSignedIn(false);
        setNextHref("/app/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;
      setSignedIn(true);
      setNextHref(profile?.onboarding_completed ? "/app/dashboard" : "/app/onboarding");
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 16 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-fresh-soft"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
        </motion.div>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Email verified</h1>
        <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          {signedIn === false
            ? "Your email is confirmed. Sign in to start setting up your plan."
            : "You're all set. Let's set up your profile so we can track your progress properly."}
        </p>

        <Button
          size="lg"
          className="mt-8 w-full"
          disabled={signedIn === null}
          onClick={() => router.push(nextHref)}
        >
          {signedIn === false ? "Sign In" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>

        {signedIn !== false && (
          <Link
            href="/app/login"
            className="mt-4 text-sm font-medium text-muted-foreground underline underline-offset-4"
          >
            Use a different account
          </Link>
        )}
      </motion.div>
    </AuthShell>
  );
}
