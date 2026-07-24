"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WeightCard({
  currentWeight,
  firstWeight,
  unit,
}: {
  currentWeight: number | null;
  firstWeight: number | null;
  unit: "kg" | "lbs";
}) {
  const diff = currentWeight != null && firstWeight != null ? currentWeight - firstWeight : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
          <p className="text-5xl font-bold tracking-tight">
            {currentWeight != null ? currentWeight.toFixed(1) : "--"}
            <span className="text-lg font-medium text-muted-foreground ml-1">{unit}</span>
          </p>
          {diff != null && (
            <Badge variant={diff <= 0 ? "success" : "warning"} className="mt-3">
              {diff <= 0 ? "▼" : "▲"} {Math.abs(diff).toFixed(1)} {unit} since start
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
