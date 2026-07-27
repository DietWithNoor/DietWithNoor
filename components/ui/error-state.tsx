"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A failed query must never look like an eternal loading spinner. Show what
 * broke and give a way out (role="alert" so it is announced).
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  compact = false,
  className,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/[0.04] text-center",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
        {message || "We couldn't load this right now. Check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

/** Compact inline variant for form-level failures. */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/[0.05] px-3.5 py-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 leading-relaxed">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}
