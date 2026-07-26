import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared frame for every unauthenticated screen (login, signup, verify,
 * confirmed, forgot password). Keeps the brand mark, the cream ground and the
 * card treatment identical across the whole auth flow.
 */
export function AuthShell({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-10">
      {/* Soft brand wash — keeps the cream from reading as flat paper */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-[22rem] w-[22rem] rounded-full bg-accent/[0.09] blur-3xl"
      />

      <div className={cn("relative w-full", wide ? "max-w-md" : "max-w-sm")}>
        <div className="mb-7 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Leaf className="h-6 w-6" strokeWidth={2} />
          </div>
          <p className="mt-3 font-display text-lg font-semibold tracking-tight">Diet With Noor</p>
        </div>

        <div className={cn("rounded-lg border bg-card p-7 shadow-lg", className)}>{children}</div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your data stays private and is only shared with your coach.
        </p>
      </div>
    </div>
  );
}
