"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Oura-style completion ring. Colour is backed up by the label underneath so
 * the reading never depends on hue alone.
 */
export function WellnessScore({ score }: { score: number }) {
  const size = 92;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const band =
    score >= 70
      ? { color: "hsl(var(--primary))", label: "On track" }
      : score >= 40
        ? { color: "hsl(var(--accent))", label: "Building" }
        : { color: "hsl(var(--berry))", label: "Just starting" };

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col items-center justify-center p-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={band.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold leading-none tnum">{score}</span>
            <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="mt-2.5 text-xs font-semibold" style={{ color: band.color }}>
          {band.label}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">Wellness score</p>
      </CardContent>
    </Card>
  );
}
