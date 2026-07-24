"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppUser } from "@/lib/hooks";
import { getWeightLogs } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { AddWeightForm } from "@/components/progress/AddWeightForm";
import { WeightHistoryTable } from "@/components/progress/WeightHistoryTable";
import { StickyAction } from "@/components/common/StickyAction";
import type { WeightLog } from "@/types/index";

const RECENT_LIMIT = 10; // monetization gate: free tier only sees recent entries, not full history/export

export default function ProgressPage() {
  const { user, profile } = useAppUser();
  const [logs, setLogs] = useState<WeightLog[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const data = await getWeightLogs(user.id, 30);
    setLogs(data);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!user) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Progress</h1>
        <AddWeightForm
          userId={user.id}
          unit={profile?.weight_unit ?? "kg"}
          firstWeight={logs.length ? logs[logs.length - 1].weight : null}
          onAdded={reload}
          trigger={<Button size="sm">Log Weight</Button>}
        />
      </div>

      <TrendChart logs={logs} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <WeightHistoryTable logs={logs.slice(0, RECENT_LIMIT)} />
          {logs.length >= RECENT_LIMIT && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Unlock full history &amp; CSV export with Diet With Noor Premium.
            </p>
          )}
        </CardContent>
      </Card>

      <AddWeightForm
        userId={user.id}
        unit={profile?.weight_unit ?? "kg"}
        firstWeight={logs.length ? logs[logs.length - 1].weight : null}
        onAdded={reload}
        trigger={
          <span>
            <StickyAction label="Log Weight" />
          </span>
        }
      />
    </div>
  );
}
