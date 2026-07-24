"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightLog } from "@/types/index";

export function TrendChart({ logs }: { logs: WeightLog[] }) {
  const data = [...logs]
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((l) => ({
      date: new Date(l.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: l.weight,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">30-Day Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-56 pt-0">
        {data.length < 2 ? (
          <p className="text-sm text-muted-foreground">Log at least two weigh-ins to see your trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
