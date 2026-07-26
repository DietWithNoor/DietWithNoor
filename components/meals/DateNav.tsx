"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, friendlyDate, parseISODate, toLocalISODate, todayISO } from "@/lib/utils";

/** Prev / next day stepper with a real date input for jumping further. */
export function DateNav({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const isToday = date === todayISO();
  const atFuture = date >= todayISO();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(toLocalISODate(addDays(parseISODate(date), -1)))}
        aria-label="Previous day"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <label className="relative flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-3 shadow-xs transition-colors hover:bg-muted">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-semibold">{friendlyDate(date)}</span>
        {/* The native picker sits invisibly on top so the whole pill is the target */}
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pick a date"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      <button
        onClick={() => onChange(toLocalISODate(addDays(parseISODate(date), 1)))}
        disabled={atFuture}
        aria-label="Next day"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {!isToday && (
        <button
          onClick={() => onChange(todayISO())}
          className="h-11 shrink-0 rounded-md bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-light"
        >
          Today
        </button>
      )}
    </div>
  );
}
