"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { MacroTotals } from "@/types/index";

/** Daily calorie + macro roll-up, pinned to the top of the day view. */
export function DayTotals({ totals, mealCount }: { totals: MacroTotals; mealCount: number }) {
  const macroSum = totals.protein_g + totals.carbs_g + totals.fat_g;
  const share = (v: number) => (macroSum > 0 ? (v / macroSum) * 100 : 0);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-accent/[0.09] via-transparent to-primary/[0.07]">
        <CardContent className="p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                Total today
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <Flame className="h-6 w-6 self-center text-accent" strokeWidth={2} />
                <span className="font-display text-[44px] font-semibold leading-none tracking-tight tnum">
                  {formatNumber(totals.calories)}
                </span>
                <span className="text-base font-medium text-muted-foreground">kcal</span>
              </div>
            </div>
            <p className="pb-1 text-xs text-muted-foreground">
              {mealCount} meal{mealCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Macro split bar — proportions at a glance */}
          {macroSum > 0 && (
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.span
                className="bg-fresh"
                initial={{ width: 0 }}
                animate={{ width: `${share(totals.protein_g)}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${share(totals.carbs_g)}%` }}
                transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="bg-berry"
                initial={{ width: 0 }}
                animate={{ width: `${share(totals.fat_g)}%` }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Macro label="Protein" value={totals.protein_g} dot="bg-fresh" />
            <Macro label="Carbs" value={totals.carbs_g} dot="bg-accent" />
            <Macro label="Fat" value={totals.fat_g} dot="bg-berry" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function Macro({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-md bg-card/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-base font-bold leading-none tnum">{formatNumber(value, 1)}g</p>
    </div>
  );
}
