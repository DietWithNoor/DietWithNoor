"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Droplet, Moon, Zap, Smile, Activity, Plus, Minus } from "lucide-react";
import { useAppUser } from "@/lib/auth-context";
import { addWaterLog, addSleepLog, addMoodLog, addActivityLog, getTodayWellness } from "@/lib/db";
import { checkHydrationHero } from "@/lib/gamification";
import { todayISO, cn, friendlyDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { LoggerCard, type SaveState } from "@/components/wellness/LoggerCard";
import type { ActivityLevel } from "@/types/index";

const WATER_GOAL = 8;

const MOODS = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😢", label: "Rough" },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const SLEEP_PRESETS = [6, 7, 8, 9];

type LoadState = "loading" | "error" | "ready";
type LoggerKey = "water" | "sleep" | "energy" | "mood" | "activity";

export default function WellnessPage() {
  const { user, status: authStatus } = useAppUser();
  const date = todayISO();

  const [state, setState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // null = never logged today (drives the empty state); a value = logged.
  const [glasses, setGlasses] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<string>("");
  const [sleepLogged, setSleepLogged] = useState(false);
  const [energy, setEnergy] = useState<number>(5);
  // mood_logs holds mood + energy in one row, so track "has this been logged"
  // per control — otherwise saving energy alone collapses the card straight
  // back to its empty state because `mood` is still null.
  const [energyLogged, setEnergyLogged] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);

  const [expanded, setExpanded] = useState<Record<LoggerKey, boolean>>({
    water: false,
    sleep: false,
    energy: false,
    mood: false,
    activity: false,
  });
  const [saveStates, setSaveStates] = useState<Record<LoggerKey, SaveState>>({
    water: "idle",
    sleep: "idle",
    energy: "idle",
    mood: "idle",
    activity: "idle",
  });
  const [saveErrors, setSaveErrors] = useState<Record<LoggerKey, string | null>>({
    water: null,
    sleep: null,
    energy: null,
    mood: null,
    activity: null,
  });

  const savedTimers = useRef<Partial<Record<LoggerKey, ReturnType<typeof setTimeout>>>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setLoadError(null);
    try {
      const data = await getTodayWellness(user.id, date);
      setGlasses(data.water ? data.water.glasses : null);
      setSleepHours(data.sleep?.hours != null ? String(data.sleep.hours) : "");
      setSleepLogged(Boolean(data.sleep));
      setEnergy(data.mood?.energy_level ?? 5);
      setEnergyLogged(Boolean(data.mood));
      setMood(data.mood?.mood ?? null);
      setActivity(data.activity?.activity_level ?? null);
      setState("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load today's wellness");
      setState("error");
    }
  }, [user, date]);

  useEffect(() => {
    if (authStatus === "ready") load();
  }, [authStatus, load]);

  useEffect(() => {
    const timers = savedTimers.current;
    return () => Object.values(timers).forEach((t) => t && clearTimeout(t));
  }, []);

  /** Wraps a save with per-card saving/saved/error feedback. */
  const runSave = useCallback(async (key: LoggerKey, fn: () => Promise<void>) => {
    setSaveStates((s) => ({ ...s, [key]: "saving" }));
    setSaveErrors((e) => ({ ...e, [key]: null }));
    try {
      await fn();
      setSaveStates((s) => ({ ...s, [key]: "saved" }));
      if (savedTimers.current[key]) clearTimeout(savedTimers.current[key]);
      savedTimers.current[key] = setTimeout(
        () => setSaveStates((s) => ({ ...s, [key]: "idle" })),
        1800
      );
    } catch (err) {
      setSaveErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : "Couldn't save" }));
      setSaveStates((s) => ({ ...s, [key]: "error" }));
    }
  }, []);

  const expand = (key: LoggerKey) => setExpanded((e) => ({ ...e, [key]: true }));

  /* ------------------------------ actions ------------------------------ */

  async function updateGlasses(delta: number) {
    if (!user) return;
    const next = Math.max(0, (glasses ?? 0) + delta);
    setGlasses(next);
    await runSave("water", async () => {
      await addWaterLog(user.id, date, next);
      if (next >= WATER_GOAL) await checkHydrationHero(user.id);
    });
  }

  async function saveSleep(value: string) {
    setSleepHours(value);
    const parsed = parseFloat(value);
    if (!user || !value || !Number.isFinite(parsed)) return;
    setSleepLogged(true);
    await runSave("sleep", () => addSleepLog(user.id, date, parsed));
  }

  async function saveMood(emoji: string) {
    if (!user) return;
    setMood(emoji);
    await runSave("mood", () => addMoodLog(user.id, date, emoji, energy));
  }

  // Mood is only "logged" once the user actually picks one — saving energy
  // writes a placeholder mood, which must not light up the mood card.
  const moodLogged = mood !== null;

  async function saveEnergy(value: number) {
    setEnergy(value);
    if (!user) return;
    setEnergyLogged(true);
    // mood_logs holds both; keep whatever mood is set (default neutral).
    await runSave("energy", () => addMoodLog(user.id, date, mood ?? "😐", value));
  }

  async function saveActivity(level: ActivityLevel) {
    if (!user) return;
    setActivity(level);
    await runSave("activity", () => addActivityLog(user.id, date, level));
  }

  /* ------------------------------ render ------------------------------- */

  if (authStatus === "loading" || state === "loading") return <WellnessSkeleton />;

  if (state === "error") {
    return (
      <div className="space-y-5">
        <PageHeader title="Wellness" description={friendlyDate(date)} />
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  const waterPct = Math.min(100, ((glasses ?? 0) / WATER_GOAL) * 100);

  return (
    <div className="space-y-3.5">
      <PageHeader title="Wellness" description={`How you're doing · ${friendlyDate(date)}`} />

      {/* Water */}
      <LoggerCard
        icon={Droplet}
        tone="primary"
        title="Water"
        emptyDescription="Aim for 8 glasses a day. Tap to start counting."
        emptyCta="Log water"
        logged={glasses !== null}
        expanded={expanded.water}
        onExpand={() => {
          expand("water");
          updateGlasses(1);
        }}
        saveState={saveStates.water}
        errorMessage={saveErrors.water}
        onRetry={() => updateGlasses(0)}
        summary={
          <>
            {glasses ?? 0} of {WATER_GOAL} glasses
            {(glasses ?? 0) >= WATER_GOAL && <span className="ml-1.5 font-semibold text-fresh">Goal hit</span>}
          </>
        }
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Remove a glass"
            onClick={() => updateGlasses(-1)}
            disabled={(glasses ?? 0) === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <motion.p
              key={glasses ?? 0}
              initial={{ scale: 0.94, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.24, ease: [0.34, 1.4, 0.64, 1] }}
              className="text-center font-display text-3xl font-semibold leading-none tnum"
            >
              {glasses ?? 0}
            </motion.p>
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: WATER_GOAL }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors duration-300",
                    i < (glasses ?? 0) ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground tnum">{Math.round(waterPct)}% of goal</p>
          </div>

          <Button size="icon" aria-label="Add a glass" onClick={() => updateGlasses(1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </LoggerCard>

      {/* Sleep */}
      <LoggerCard
        icon={Moon}
        tone="berry"
        title="Sleep"
        emptyDescription="How many hours did you get last night?"
        emptyCta="Log sleep"
        logged={sleepLogged}
        expanded={expanded.sleep}
        onExpand={() => expand("sleep")}
        saveState={saveStates.sleep}
        errorMessage={saveErrors.sleep}
        onRetry={() => saveSleep(sleepHours)}
        summary={sleepHours ? `${sleepHours} hours` : "Not set"}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            {SLEEP_PRESETS.map((h) => (
              <button
                key={h}
                onClick={() => saveSleep(String(h))}
                className={cn(
                  "h-11 flex-1 rounded-md border text-sm font-semibold transition-colors",
                  parseFloat(sleepHours) === h
                    ? "border-primary bg-primary/[0.08] text-primary"
                    : "border-input bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {h}h
              </button>
            ))}
          </div>
          <Input
            type="number"
            step="0.5"
            min={0}
            max={24}
            inputMode="decimal"
            value={sleepHours}
            onChange={(e) => saveSleep(e.target.value)}
            placeholder="Or enter exactly, e.g. 7.5"
            aria-label="Hours of sleep"
          />
        </div>
      </LoggerCard>

      {/* Mood */}
      <LoggerCard
        icon={Smile}
        tone="accent"
        title="Mood"
        emptyDescription="A quick check-in on how you're feeling today."
        emptyCta="Log mood"
        logged={moodLogged}
        expanded={expanded.mood}
        onExpand={() => expand("mood")}
        saveState={saveStates.mood}
        errorMessage={saveErrors.mood}
        onRetry={() => mood && saveMood(mood)}
        summary={mood ? `${mood} ${MOODS.find((m) => m.emoji === mood)?.label ?? ""}` : "Not set"}
      >
        <div className="flex justify-between gap-1">
          {MOODS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => saveMood(emoji)}
              aria-label={label}
              aria-pressed={mood === emoji}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-md py-2.5 transition-all duration-200",
                mood === emoji ? "scale-105 bg-accent-soft" : "opacity-55 hover:opacity-100"
              )}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </LoggerCard>

      {/* Energy */}
      <LoggerCard
        icon={Zap}
        tone="accent"
        title="Energy"
        emptyDescription="Rate your energy from 1 to 10."
        emptyCta="Log energy"
        logged={energyLogged}
        expanded={expanded.energy}
        onExpand={() => {
          expand("energy");
          saveEnergy(energy);
        }}
        saveState={saveStates.energy}
        errorMessage={saveErrors.energy}
        onRetry={() => saveEnergy(energy)}
        summary={`${energy} out of 10`}
      >
        <div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[energy]}
            onValueChange={(v) => setEnergy(v[0])}
            onValueCommit={(v) => saveEnergy(v[0])}
            aria-label="Energy level"
          />
          <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Drained</span>
            <span className="font-display text-base font-semibold text-foreground tnum">{energy}</span>
            <span>Buzzing</span>
          </div>
        </div>
      </LoggerCard>

      {/* Activity */}
      <LoggerCard
        icon={Activity}
        tone="fresh"
        title="Activity"
        emptyDescription="How active were you today?"
        emptyCta="Log activity"
        logged={activity !== null}
        expanded={expanded.activity}
        onExpand={() => expand("activity")}
        saveState={saveStates.activity}
        errorMessage={saveErrors.activity}
        onRetry={() => activity && saveActivity(activity)}
        summary={activity ? ACTIVITY_LEVELS.find((l) => l.value === activity)?.label : "Not set"}
      >
        <Segmented
          ariaLabel="Activity level"
          options={ACTIVITY_LEVELS}
          value={activity ?? ("" as ActivityLevel)}
          onChange={saveActivity}
        />
      </LoggerCard>
    </div>
  );
}

function WellnessSkeleton() {
  return (
    <div className="space-y-3.5">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-1 h-4 w-48" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
