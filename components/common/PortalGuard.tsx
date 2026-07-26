"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useAppUser } from "@/lib/auth-context";

/**
 * Handles the two auth outcomes that are identical on every portal screen:
 * a failed load (retry) and an expired session (sign in again).
 *
 * It deliberately does NOT own the loading state — each page renders its own
 * skeleton so the placeholder matches that page's real layout.
 */
export function PortalGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, error, refresh } = useAppUser();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/app/login");
  }, [status, router]);

  if (status === "error") {
    return (
      <div className="px-1 py-10">
        <ErrorState
          title="We couldn't load your account"
          message={error}
          onRetry={refresh}
        />
        <Button variant="ghost" className="mt-4 w-full" onClick={() => router.push("/app/login")}>
          Sign in again
        </Button>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="px-1 py-10 text-center">
        <p className="text-sm text-muted-foreground">Session expired. Redirecting you to sign in...</p>
      </div>
    );
  }

  return <>{children}</>;
}
