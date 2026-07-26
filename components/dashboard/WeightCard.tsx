"use client";

import { motion } from "framer-motion";
import { Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, round1 } from "@/lib/utils";
import type { WeightUnit } from "@/types/index";

export function WeightCard({
  currentWeight,
  firstWeight,
  goalWeight,
  unit,
  emptyAction,
}: {
  currentWeight: number | null;
  firstWeight: number | null;
  goalWeight?: number | null;
  unit: WeightUnit;
  /** Rendered inside the empty state — should open the log-weight form. */
  emptyAction?: React.ReactNode;
}) {
  if (currentWeight == null) {
    return (
      <Card>
        <EmptyState
          icon={Scale}
          title="No weigh-ins yet"
          description="Log your first weight to unlock your trend, streak and goal progress."
          action={emptyAction}
        />
      </Card>
    );
  }

  const diff = firstWeight != null ? round1(currentWeight - firstWeight) : null;
  const losing = diff != null && diff < 0;
  const flat = diff != null && Math.abs(diff) < 0.05;

  // Progress toward the goal, measured from the starting weight.
  let goalPct: number | null = null;
  let remaining: number | null = null;
  if (goalWeight != null && firstWeight != null && Math.abs(goalWeight - firstWeight) > 0.05) {
    const total = Math.abs(goalWeight - firstWeight);
    const done = Math.abs(currentWeight - firstWeight);
    const movingRightWay = goalWeight < firstWeight ? currentWeight <= firstWeight : currentWeight >= firstWeight;
    goalPct = Math.max(0, Math.min(100, movingRightWay ? (done / total) * 100 : 0));
    remaining = round1(Math.abs(goalWeight - currentWeight));
  }

  const DeltaIcon = flat ? Minus : losing ? TrendingDown : TrendingUp;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        {/* Warm gradient wash gives the hero metric visual primacy */}
        <div className="bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/[0.07]">
          <CardContent className="p-6 pt-6">
            <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Current weight
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[56px] font-semibold leading-none tracking-tight tnum">
                {round1(currentWeight)}
              </span>
              <span className="text-lg font-medium text-muted-foreground">{unit}</span>
            </div>

            {diff != null && (
              <div
                className={cn(
                  "mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                  flat
                    ? "bg-muted text-muted-foreground"
                    : losing
                      ? "bg-fresh-soft text-fresh"
                      : "bg-accent-soft text-accent-foreground"
                )}
              >
                <DeltaIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                {flat ? "No change" : `${Math.abs(diff)} ${unit} ${losing ? "lost" : "gained"}`}
                <span className="font-medium opacity-70">since start</span>
              </div>
            )}

            {goalPct != null && goalWeight != null && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-medium text-muted-foreground">
                    Goal{" "}
                    <span className="font-semibold text-foreground tnum">
                      {round1(goalWeight)} {unit}
                    </span>
                  </p>
                  <p className="text-[13px] font-semibold text-primary tnum">{Math.round(goalPct)}%</p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                    initial={{ width: 0 }}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                {remaining != null && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {remaining < 0.05 ? "You've reached your goal. Outstanding." : `${remaining} ${unit} to go.`}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}
