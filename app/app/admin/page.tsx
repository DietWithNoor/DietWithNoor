"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, CalendarRange, UserPlus, Scale, Activity, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { todayISO, toLocalISODate, addDays } from "@/lib/utils";

interface Kpis {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  newRegistrations: number;
  totalWeightEntries: number;
  avgActivity: string;
}

type LoadState = "loading" | "error" | "ready";

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const supabase = createClient();
      const todayStart = new Date(`${todayISO()}T00:00:00`).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [totalUsersRes, newRegRes, weightCountRes, activityRes, activeTodayRes, activeWeekRes] =
        await Promise.all([
          // Admins aren't clients — exclude them from every client-facing count.
          supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "user"),
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user")
            .gte("created_at", monthAgo),
          supabase.from("weight_logs").select("*", { count: "exact", head: true }),
          supabase
            .from("activity_logs")
            .select("activity_level")
            .gte("date", toLocalISODate(addDays(new Date(), -7))),
          supabase.from("weight_logs").select("user_id").gte("logged_at", todayStart),
          supabase.from("weight_logs").select("user_id").gte("logged_at", weekAgo),
        ]);

      const failure = [totalUsersRes, newRegRes, weightCountRes, activityRes, activeTodayRes, activeWeekRes].find(
        (r) => r.error
      );
      if (failure?.error) throw failure.error;

      const activeToday = new Set((activeTodayRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;
      const activeThisWeek = new Set((activeWeekRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

      const levelScore: Record<string, number> = { low: 1, moderate: 2, high: 3 };
      const scores = (activityRes.data ?? []).map(
        (r: { activity_level: string }) => levelScore[r.activity_level] ?? 0
      );
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const avgActivity = avg === 0 ? "N/A" : avg < 1.5 ? "Low" : avg < 2.5 ? "Moderate" : "High";

      setKpis({
        totalUsers: totalUsersRes.count ?? 0,
        activeToday,
        activeThisWeek,
        newRegistrations: newRegRes.count ?? 0,
        totalWeightEntries: weightCountRes.count ?? 0,
        avgActivity,
      });
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the overview");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loading = state === "loading";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">How your clients are engaging with the portal.</p>
      </div>

      {state === "error" ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <KpiCard
              label="Total clients"
              value={kpis?.totalUsers ?? "--"}
              icon={Users}
              loading={loading}
              tone="primary"
            />
            <KpiCard
              label="Active today"
              value={kpis?.activeToday ?? "--"}
              icon={UserCheck}
              hint="Logged a weigh-in"
              loading={loading}
              tone="fresh"
            />
            <KpiCard
              label="Active this week"
              value={kpis?.activeThisWeek ?? "--"}
              icon={CalendarRange}
              loading={loading}
              tone="fresh"
            />
            <KpiCard
              label="New registrations"
              value={kpis?.newRegistrations ?? "--"}
              icon={UserPlus}
              hint="Last 30 days"
              loading={loading}
              tone="accent"
            />
            <KpiCard
              label="Weight entries"
              value={kpis?.totalWeightEntries ?? "--"}
              icon={Scale}
              hint="All time"
              loading={loading}
              tone="berry"
            />
            <KpiCard
              label="Avg activity"
              value={kpis?.avgActivity ?? "--"}
              icon={Activity}
              hint="Last 7 days"
              loading={loading}
              tone="accent"
            />
          </div>

          <Card>
            <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">Client directory</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Search clients, review their history and export their data.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/app/admin/export">Export data</Link>
                </Button>
                <Button asChild>
                  <Link href="/app/admin/users">
                    View clients
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
