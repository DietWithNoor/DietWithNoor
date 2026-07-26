"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, round1 } from "@/lib/utils";
import type { WeightLog } from "@/types/index";

export function TrendChart({
  logs,
  goalWeight,
  unit = "kg",
  emptyAction,
  title = "Weight trend",
}: {
  logs: WeightLog[];
  goalWeight?: number | null;
  unit?: string;
  emptyAction?: React.ReactNode;
  title?: string;
}) {
  const data = useMemo(
    () =>
      [...logs]
        .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
        .map((l) => ({
          date: new Date(l.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          fullDate: l.logged_at,
          weight: l.weight,
        })),
    [logs]
  );

  const domain = useMemo<[number, number] | undefined>(() => {
    if (data.length < 2) return undefined;
    const values = data.map((d) => d.weight);
    if (goalWeight != null) values.push(goalWeight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Breathing room so the line never touches the frame.
    const pad = Math.max((max - min) * 0.18, 0.5);
    return [round1(min - pad), round1(max + pad)];
  }, [data, goalWeight]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {data.length >= 2 && (
          <span className="text-xs font-medium text-muted-foreground">Last {data.length} entries</span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <EmptyState
            compact
            icon={LineChartIcon}
            title="Nothing to chart yet"
            description="Your trend line appears once you've logged a couple of weigh-ins."
            action={emptyAction}
          />
        ) : data.length === 1 ? (
          <EmptyState
            compact
            icon={LineChartIcon}
            title="One entry so far"
            description={`We have ${round1(data[0].weight)} ${unit} from ${formatDate(
              data[0].fullDate
            )}. Log one more to draw your trend.`}
            action={emptyAction}
          />
        ) : (
          <div className="-ml-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  minTickGap={24}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={domain ?? ["auto", "auto"]}
                  width={42}
                />
                {goalWeight != null && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="hsl(var(--accent))"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Goal",
                      position: "insideTopRight",
                      fill: "hsl(var(--accent))",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Tooltip
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                  formatter={(value: number) => [`${round1(value)} ${unit}`, "Weight"]}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#weightFill)"
                  dot={{ r: 3, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
