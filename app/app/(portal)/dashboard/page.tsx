"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, UtensilsCrossed, ChevronRight, Flame } from "lucide-react";
import { useAppUser } from "@/lib/auth-context";
import { getWeightLogs, getWellnessRange, getMealsForDate, sumMealMacros } from "@/lib/db";
import { computeWellnessScore, todayISO, toLocalISODate, addDays, formatNumber } from "@/lib/utils";
import { WeightCard } from "@/components/dashboard/WeightCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { WellnessScore } from "@/components/dashboard/WellnessScore";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { MotivationalCard } from "@/components/common/MotivationalCard";
import { AddWeightForm } from "@/components/progress/AddWeightForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { MacroTotals, WeightLog } from "@/types/index";

type LoadState = "loading" | "error" | "ready";

export default function DashboardPage() {
  const { user, profile, status: authStatus } = useAppUser();

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [score, setScore] = useState(0);
  const [todayMacros, setTodayMacros] = useState<MacroTotals | null>(null);
  const [mealCount, setMealCount] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setError(null);
    try {
      const since = toLocalISODate(addDays(new Date(), -6));
      const [weightLogs, wellness, meals] = await Promise.all([
        getWeightLogs(user.id, 30),
        getWellnessRange(user.id, since),
        getMealsForDate(user.id, todayISO()),
      ]);

      setLogs(weightLogs);
      setMealCount(meals.length);
      setTodayMacros(meals.length ? sumMealMacros(meals) : null);

      // Real 7-day averages rather than today's snapshot standing in for a week.
      const daysLogged = new Set(
        weightLogs
          .filter((l) => (Date.now() - new Date(l.logged_at).getTime()) / 86400000 <= 7)
          .map((l) => l.logged_at.slice(0, 10))
      ).size;
      const avgGlasses = wellness.water.length
        ? wellness.water.reduce((a, w) => a + (w.glasses ?? 0), 0) / wellness.water.length
        : 0;
      const avgSleep = wellness.sleep.length
        ? wellness.sleep.reduce((a, s) => a + (s.hours ?? 0), 0) / wellness.sleep.length
        : 0;

      setScore(
        computeWellnessScore({
          daysLoggedLast7: Math.min(daysLogged, 7),
          avgGlassesLast7: avgGlasses,
          avgSleepHoursLast7: avgSleep,
        })
      );
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your dashboard");
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authStatus === "ready") load();
  }, [authStatus, load]);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  // Oldest fetched log is the fallback starting point when the profile has none.
  const firstWeight = profile?.starting_weight ?? (logs.length ? logs[logs.length - 1].weight : null);
  const unit = profile?.weight_unit ?? "kg";

  if (authStatus === "loading" || (state === "loading" && logs.length === 0)) {
    return <DashboardSkeleton />;
  }

  if (state === "error") {
    return (
      <div className="space-y-5">
        <Greeting name={firstName} />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const logWeightTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4" />
      Log weight
    </Button>
  );

  return (
    <div className="space-y-4">
      <Greeting name={firstName} />

      <WeightCard
        currentWeight={profile?.current_weight ?? null}
        firstWeight={firstWeight}
        goalWeight={profile?.goal_weight ?? null}
        unit={unit}
        emptyAction={
          user ? (
            <AddWeightForm
              userId={user.id}
              unit={unit}
              firstWeight={firstWeight}
              onAdded={load}
              trigger={logWeightTrigger}
            />
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StreakBadge streak={profile?.tracking_streak ?? 0} />
        <WellnessScore score={score} />
      </div>

      <TodayNutritionCard macros={todayMacros} mealCount={mealCount} />

      <TrendChart
        logs={logs}
        unit={unit}
        goalWeight={profile?.goal_weight ?? null}
        emptyAction={
          user ? (
            <AddWeightForm
              userId={user.id}
              unit={unit}
              firstWeight={firstWeight}
              onAdded={load}
              trigger={logWeightTrigger}
            />
          ) : null
        }
      />

      <MotivationalCard />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="pb-1">
      <p className="text-sm font-medium text-muted-foreground">{part},</p>
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{name}</h1>
    </div>
  );
}

/** Cross-link into /app/meals, with its own empty state. */
function TodayNutritionCard({ macros, mealCount }: { macros: MacroTotals | null; mealCount: number }) {
  if (!macros || mealCount === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground">
            <UtensilsCrossed className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">No meals logged today</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Track what you eat to see calories and macros here.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/app/meals">Add</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <Link href="/app/meals" className="block rounded-lg transition-colors hover:bg-muted/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  Today&rsquo;s intake
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="h-5 w-5 text-accent" strokeWidth={2} />
                    <span className="font-display text-3xl font-semibold leading-none tnum">
                      {formatNumber(macros.calories)}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">kcal</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  across {mealCount} meal{mealCount === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MacroPill label="Protein" value={macros.protein_g} tone="fresh" />
              <MacroPill label="Carbs" value={macros.carbs_g} tone="accent" />
              <MacroPill label="Fat" value={macros.fat_g} tone="berry" />
            </div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}

function MacroPill({ label, value, tone }: { label: string; value: number; tone: "fresh" | "accent" | "berry" }) {
  const tones = {
    fresh: "bg-fresh-soft text-fresh",
    accent: "bg-accent-soft text-accent-foreground",
    berry: "bg-berry-soft text-berry",
  } as const;

  return (
    <div className={`rounded-md px-3 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum">{formatNumber(value)}g</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="pb-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-8 w-40" />
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-14 w-44" />
        <Skeleton className="mt-4 h-7 w-40 rounded-full" />
        <Skeleton className="mt-5 h-2 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-3 h-7 w-12" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
        <div className="flex flex-col items-center rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-[92px] w-[92px] rounded-full" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-32" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-52 w-full" />
      </div>
    </div>
  );
}
