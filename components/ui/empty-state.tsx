"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Every surface that can be empty gets one of these: an iconic mark, a
 * headline, one line of explanation, and a primary action that opens the
 * relevant add-form. Never a blank panel.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "primary",
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "primary" | "accent" | "fresh" | "berry";
  compact?: boolean;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent-soft text-accent-foreground",
    fresh: "bg-fresh-soft text-fresh",
    berry: "bg-berry-soft text-berry",
  } as const;

  const rings = {
    primary: "bg-primary/5",
    accent: "bg-accent/5",
    fresh: "bg-fresh/5",
    berry: "bg-berry/5",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className
      )}
    >
      <div className={cn("relative flex items-center justify-center rounded-full", rings[tone], compact ? "h-16 w-16" : "h-20 w-20")}>
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            tones[tone],
            compact ? "h-11 w-11" : "h-14 w-14"
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.9} />
        </div>
      </div>

      <h3 className={cn("font-display font-semibold tracking-tight", compact ? "mt-3 text-base" : "mt-4 text-lg")}>
        {title}
      </h3>
      <p className="mt-1.5 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
