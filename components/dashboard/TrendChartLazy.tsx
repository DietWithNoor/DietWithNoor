"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is the single biggest dependency on the dashboard, progress, and
 * admin-detail bundles (it was pulled in eagerly even on first paint, before
 * any chart data existed to show). Loading it as a separate chunk means the
 * rest of the page — the parts visible immediately — isn't waiting on it.
 */
export const TrendChart = dynamic(
  () => import("@/components/dashboard/TrendChart").then((m) => m.TrendChart),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    ),
  }
);
