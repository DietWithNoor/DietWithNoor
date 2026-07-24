"use client";

import { useEffect, useState } from "react";
import { useAppUser } from "@/lib/hooks";
import { getWeightLogs, getTodayWellness } from "@/lib/db";
import { computeWellnessScore, todayISO } from "@/lib/utils";
import { WeightCard } from "@/components/dashboard/WeightCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { WellnessScore } from "@/components/dashboard/WellnessScore";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { MotivationalCard } from "@/components/common/MotivationalCard";
import type { WeightLog } from "@/types/index";

export default function DashboardPage() {
  const { user, profile, loading } = useAppUser();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const weightLogs = await getWeightLogs(user.id, 30);
      setLogs(weightLogs);

      // naive last-7-days wellness score using today's snapshot as a stand-in
      const today = await getTodayWellness(user.id, todayISO());
      const daysLogged = weightLogs.filter((l) => {
        const d = new Date(l.logged_at);
        const diff = (Date.now() - d.getTime()) / 86400000;
        return diff <= 7;
      }).length;
      setScore(
        computeWellnessScore({
          daysLoggedLast7: Math.min(daysLogged, 7),
          avgGlassesLast7: today.water?.glasses ?? 0,
          avgSleepHoursLast7: today.sleep?.hours ?? 0,
        })
      );
    })();
  }, [user]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Hi, {user?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
        <p className="text-sm text-muted-foreground">Here&rsquo;s your wellness snapshot</p>
      </div>

      <WeightCard
        currentWeight={profile?.current_weight ?? null}
        firstWeight={logs.length ? logs[logs.length - 1].weight : null}
        unit={profile?.weight_unit ?? "kg"}
      />

      <div className="grid grid-cols-2 gap-3">
        <StreakBadge streak={profile?.tracking_streak ?? 0} />
        <div className="flex items-center justify-center rounded-2xl border bg-card shadow-sm">
          <WellnessScore score={score} />
        </div>
      </div>

      <TrendChart logs={logs} />

      <MotivationalCard />
    </div>
  );
}
