"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KpiCard } from "@/components/admin/KpiCard";

interface Kpis {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  newRegistrations: number;
  totalWeightEntries: number;
  avgActivity: string;
}

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [{ count: totalUsers }, { count: newRegistrations }, { count: totalWeightEntries }, { data: activityRows }, { data: activeTodayRows }, { data: activeWeekRows }] =
        await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
          supabase.from("weight_logs").select("*", { count: "exact", head: true }),
          supabase.from("activity_logs").select("activity_level").gte("date", weekAgo.slice(0, 10)),
          supabase.from("weight_logs").select("user_id").gte("logged_at", today),
          supabase.from("weight_logs").select("user_id").gte("logged_at", weekAgo),
        ]);

      const activeToday = new Set((activeTodayRows ?? []).map((r: { user_id: string }) => r.user_id)).size;
      const activeThisWeek = new Set((activeWeekRows ?? []).map((r: { user_id: string }) => r.user_id)).size;

      const levelScore: Record<string, number> = { low: 1, moderate: 2, high: 3 };
      const scores = (activityRows ?? []).map((r: { activity_level: string }) => levelScore[r.activity_level] ?? 0);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const avgActivity = avg === 0 ? "N/A" : avg < 1.5 ? "Low" : avg < 2.5 ? "Moderate" : "High";

      setKpis({
        totalUsers: totalUsers ?? 0,
        activeToday,
        activeThisWeek,
        newRegistrations: newRegistrations ?? 0,
        totalWeightEntries: totalWeightEntries ?? 0,
        avgActivity,
      });
    })();
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Overview</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Users" value={kpis?.totalUsers ?? "--"} />
        <KpiCard label="Active Today" value={kpis?.activeToday ?? "--"} />
        <KpiCard label="Active This Week" value={kpis?.activeThisWeek ?? "--"} />
        <KpiCard label="New Registrations (30d)" value={kpis?.newRegistrations ?? "--"} />
        <KpiCard label="Total Weight Entries" value={kpis?.totalWeightEntries ?? "--"} />
        <KpiCard label="Avg Activity" value={kpis?.avgActivity ?? "--"} />
      </div>
    </div>
  );
}
