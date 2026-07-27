"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Scale, Lock } from "lucide-react";
import { useAppUser } from "@/lib/auth-context";
import { getWeightLogs } from "@/lib/db";
import { round1 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { TrendChart } from "@/components/dashboard/TrendChartLazy";
import { AddWeightForm } from "@/components/progress/AddWeightForm";
import { WeightHistoryTable } from "@/components/progress/WeightHistoryTable";
import { StickyAction } from "@/components/common/StickyAction";
import type { WeightLog } from "@/types/index";

const RECENT_LIMIT = 10; // monetization gate: free tier sees recent entries, not full history/export

type LoadState = "loading" | "error" | "ready";

export default function ProgressPage() {
  const { user, profile, status: authStatus } = useAppUser();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setError(null);
    try {
      setLogs(await getWeightLogs(user.id, 30));
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your history");
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authStatus === "ready") reload();
  }, [authStatus, reload]);

  const unit = profile?.weight_unit ?? "kg";
  const startWeight = profile?.starting_weight ?? (logs.length ? logs[logs.length - 1].weight : null);
  const current = profile?.current_weight ?? (logs.length ? logs[0].weight : null);
  const goal = profile?.goal_weight ?? null;

  if (authStatus === "loading" || (state === "loading" && logs.length === 0)) {
    return <ProgressSkeleton />;
  }

  const trigger = (
    <Button>
      <Plus className="h-4 w-4" />
      Log weight
    </Button>
  );

  const form = user ? (
    <AddWeightForm userId={user.id} unit={unit} firstWeight={startWeight} onAdded={reload} trigger={trigger} />
  ) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" description="Every weigh-in you've logged." action={form} />

      {state === "error" ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {logs.length > 0 && (
            <Card>
              <CardContent className="grid grid-cols-3 divide-x divide-border/70 p-0">
                <Stat label="Start" value={startWeight} unit={unit} />
                <Stat label="Current" value={current} unit={unit} highlight />
                <Stat label="Goal" value={goal} unit={unit} />
              </CardContent>
            </Card>
          )}

          <TrendChart
            logs={logs}
            unit={unit}
            goalWeight={goal}
            title="Your trend"
            emptyAction={
              user ? (
                <AddWeightForm
                  userId={user.id}
                  unit={unit}
                  firstWeight={startWeight}
                  onAdded={reload}
                  trigger={trigger}
                />
              ) : null
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {logs.length === 0 ? (
                <EmptyState
                  compact
                  icon={Scale}
                  title="No entries yet"
                  description="Log your first weigh-in and it'll show up here with the change since last time."
                  action={
                    user ? (
                      <AddWeightForm
                        userId={user.id}
                        unit={unit}
                        firstWeight={startWeight}
                        onAdded={reload}
                        trigger={
                          <Button>
                            <Plus className="h-4 w-4" />
                            Log your first weight
                          </Button>
                        }
                      />
                    ) : null
                  }
                />
              ) : (
                <>
                  <WeightHistoryTable logs={logs.slice(0, RECENT_LIMIT)} />
                  {logs.length >= RECENT_LIMIT && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-md bg-secondary px-3.5 py-3">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary-foreground" />
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        Showing your {RECENT_LIMIT} most recent entries. Unlock full history &amp; CSV export with
                        Diet With Noor Premium.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {user && logs.length > 0 && (
        <AddWeightForm
          userId={user.id}
          unit={unit}
          firstWeight={startWeight}
          onAdded={reload}
          trigger={<StickyAction label="Log Weight" />}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: number | null;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-2 py-4 text-center">
      <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display font-semibold leading-none tnum ${
          highlight ? "text-2xl text-primary" : "text-xl"
        }`}
      >
        {value != null ? round1(value) : "--"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{unit}</p>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="grid grid-cols-3 gap-px rounded-lg border bg-card p-4 shadow-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-52 w-full" />
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-4 w-20" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
