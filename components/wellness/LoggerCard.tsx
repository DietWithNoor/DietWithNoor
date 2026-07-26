"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Shared frame for every wellness logger.
 *
 * When nothing has been logged for the day the card renders an empty state with
 * a single CTA that reveals the control — so an untouched Wellness tab reads as
 * a to-do list rather than five blank panels.
 */
export function LoggerCard({
  icon: Icon,
  title,
  summary,
  emptyDescription,
  emptyCta,
  logged,
  expanded,
  onExpand,
  saveState,
  errorMessage,
  onRetry,
  tone = "primary",
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Rendered next to the title once a value exists. */
  summary?: React.ReactNode;
  emptyDescription: string;
  emptyCta: string;
  logged: boolean;
  expanded: boolean;
  onExpand: () => void;
  saveState: SaveState;
  errorMessage?: string | null;
  onRetry?: () => void;
  tone?: "primary" | "accent" | "fresh" | "berry";
  children: React.ReactNode;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent-soft text-accent-foreground",
    fresh: "bg-fresh-soft text-fresh",
    berry: "bg-berry-soft text-berry",
  } as const;

  const open = logged || expanded;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3.5">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
              <AnimatePresence>
                {saveState === "saving" && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </motion.span>
                )}
                {saveState === "saved" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-fresh text-white"
                    role="status"
                    aria-label="Saved"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            {open && summary && <div className="mt-0.5 text-[13px] text-muted-foreground">{summary}</div>}
            {!open && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{emptyDescription}</p>
            )}
          </div>

          {!open && (
            <Button size="sm" variant="outline" className="shrink-0" onClick={onExpand}>
              {emptyCta}
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {saveState === "error" && errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-md bg-destructive/[0.06] px-3.5 py-2.5 text-xs text-destructive"
          >
            <span className="leading-relaxed">{errorMessage}</span>
            {onRetry && (
              <button onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2">
                Retry
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
