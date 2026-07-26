"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * iOS-style segmented control with a sliding indicator (shared layoutId), used
 * for unit toggles and meal-type pickers. Every segment is a real button so it
 * is keyboard reachable, and the row is tall enough to hit on a phone.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "default" | "sm";
  className?: string;
  ariaLabel?: string;
}) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative flex w-full items-stretch gap-1 rounded-md bg-muted p-1",
        size === "sm" ? "h-10" : "h-12",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "text-[13px]" : "text-sm",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-sm bg-card shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 truncate">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
