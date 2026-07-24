import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function clientIdLabel(userNumber: number) {
  return `#${userNumber}`;
}

/** kg <-> lbs conversion helpers */
export function toKg(weight: number, unit: "kg" | "lbs") {
  return unit === "kg" ? weight : weight * 0.453592;
}

export function convertWeight(weight: number, from: "kg" | "lbs", to: "kg" | "lbs") {
  if (from === to) return weight;
  const kg = toKg(weight, from);
  return to === "kg" ? kg : kg / 0.453592;
}

/**
 * Weekly wellness score, 0-100.
 * 40% tracking consistency (days logged / 7)
 * 30% water intake (avg glasses / 8 target, capped at 1)
 * 30% sleep (avg hours / 8 target, capped at 1)
 */
export function computeWellnessScore(params: {
  daysLoggedLast7: number;
  avgGlassesLast7: number;
  avgSleepHoursLast7: number;
}) {
  const consistency = Math.min(params.daysLoggedLast7 / 7, 1);
  const water = Math.min(params.avgGlassesLast7 / 8, 1);
  const sleep = Math.min(params.avgSleepHoursLast7 / 8, 1);
  const score = consistency * 40 + water * 30 + sleep * 30;
  return Math.round(score);
}

export function weightChangeLabel(current: number, first: number, unit: WeightUnitLike) {
  const diff = current - first;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)} ${unit}`;
}

type WeightUnitLike = "kg" | "lbs";
