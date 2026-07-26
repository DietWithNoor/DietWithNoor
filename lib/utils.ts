import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Local calendar date as YYYY-MM-DD.
 * `toISOString()` converts to UTC first, so for a UTC+5 user any time after
 * 19:00 local reported *yesterday* — wellness rows were landing on the wrong day.
 */
export function toLocalISODate(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toLocalISODate();
}

/** Value for an <input type="datetime-local">, in local time. */
export function toLocalDateTimeInput(date: Date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${toLocalISODate(date)}T${hh}:${mm}`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Parses YYYY-MM-DD as a *local* date (bare `new Date("2026-01-01")` is UTC). */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "Today" / "Yesterday" / "Tomorrow", else "Mon, Jul 26". */
export function friendlyDate(iso: string) {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === toLocalISODate(addDays(new Date(), -1))) return "Yesterday";
  if (iso === toLocalISODate(addDays(new Date(), 1))) return "Tomorrow";
  return parseISODate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function clientIdLabel(userNumber: number) {
  return `#${userNumber}`;
}

/** Up to two initials for avatar chips; falls back to "?" for empty names. */
export function initialsOf(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/* ---------------- Height helpers (canonical unit is cm) ---------------- */

export function cmToFtIn(cm: number) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  // 5'12" is not a thing — carry it.
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches };
}

export function ftInToCm(feet: number, inches: number) {
  return (feet * 12 + inches) * 2.54;
}

export function formatHeight(cm: number | null | undefined) {
  if (cm == null) return "--";
  const { feet, inches } = cmToFtIn(cm);
  return `${Math.round(cm)} cm · ${feet}'${inches}"`;
}

export function ageFromDob(dob: string | null | undefined) {
  if (!dob) return null;
  const birth = parseISODate(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Rounds to at most 1 decimal and drops a trailing ".0". */
export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function formatNumber(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
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
