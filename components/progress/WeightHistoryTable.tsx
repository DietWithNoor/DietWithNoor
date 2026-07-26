"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatDate, formatTime, round1 } from "@/lib/utils";
import type { WeightLog } from "@/types/index";

/**
 * A card list rather than a table — on a 375px screen a two-column table wastes
 * most of the width and the delta is the thing people actually scan for.
 * `logs` arrives newest-first.
 */
export function WeightHistoryTable({ logs }: { logs: WeightLog[] }) {
  return (
    <ul className="divide-y divide-border/70">
      {logs.map((log, index) => {
        const previous = logs[index + 1];
        const delta = previous ? round1(log.weight - previous.weight) : null;
        const down = delta != null && delta < 0;
        const flat = delta != null && Math.abs(delta) < 0.05;
        const DeltaIcon = flat ? Minus : down ? ArrowDown : ArrowUp;

        return (
          <motion.li
            key={log.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.2) }}
            className="flex items-center justify-between gap-3 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{formatDate(log.logged_at)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatTime(log.logged_at)}</p>
            </div>

            <div className="flex items-center gap-2.5">
              {delta != null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold tnum",
                    flat
                      ? "bg-muted text-muted-foreground"
                      : down
                        ? "bg-fresh-soft text-fresh"
                        : "bg-accent-soft text-accent-foreground"
                  )}
                >
                  <DeltaIcon className="h-3 w-3" strokeWidth={2.6} />
                  {flat ? "0" : Math.abs(delta)}
                </span>
              )}
              <span className="text-base font-semibold tnum">
                {round1(log.weight)}
                <span className="ml-0.5 text-xs font-medium text-muted-foreground">{log.unit}</span>
              </span>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
