"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating action pill, parked above the 5-item bottom nav.
 * forwardRef + prop spread so it can be used as a Radix `DialogTrigger asChild`.
 */
export const StickyAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ label, className, ...props }, ref) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2"
  >
    <button
      ref={ref}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary-light hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]",
        className
      )}
      {...props}
    >
      <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
      {label}
    </button>
  </motion.div>
));
StickyAction.displayName = "StickyAction";
