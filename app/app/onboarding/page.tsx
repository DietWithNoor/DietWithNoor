"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Cake,
  Flag,
  Loader2,
  Ruler,
  Scale,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { useAppUser } from "@/lib/auth-context";
import { completeOnboarding } from "@/lib/db";
import {
  cmToFtIn,
  ftInToCm,
  ageFromDob,
  parseISODate,
  todayISO,
  toLocalISODate,
  addDays,
  round1,
  cn,
} from "@/lib/utils";
import type { WeightUnit } from "@/types/index";

type HeightMode = "cm" | "ftin";

interface WizardState {
  dob: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  heightMode: HeightMode;
  weight: string;
  weightUnit: WeightUnit;
  measuredOn: string;
  goalWeight: string;
  targetDate: string;
  skipTargetDate: boolean;
}

const TOTAL_STEPS = 6;

const WEIGHT_BOUNDS: Record<WeightUnit, { min: number; max: number }> = {
  kg: { min: 25, max: 400 },
  lbs: { min: 55, max: 880 },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, status, error: authError, refresh } = useAppUser();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    dob: "",
    heightCm: "",
    heightFt: "",
    heightIn: "",
    heightMode: "cm",
    weight: "",
    weightUnit: "kg",
    measuredOn: todayISO(),
    goalWeight: "",
    targetDate: "",
    skipTargetDate: false,
  });

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  /* -------------------- derived values & validation -------------------- */

  const resolvedHeightCm = useMemo(() => {
    if (state.heightMode === "cm") {
      const v = parseFloat(state.heightCm);
      return Number.isFinite(v) ? v : null;
    }
    const ft = parseFloat(state.heightFt);
    const inch = state.heightIn === "" ? 0 : parseFloat(state.heightIn);
    if (!Number.isFinite(ft) || !Number.isFinite(inch)) return null;
    return round1(ftInToCm(ft, inch));
  }, [state.heightMode, state.heightCm, state.heightFt, state.heightIn]);

  const weightNum = parseFloat(state.weight);
  const goalNum = parseFloat(state.goalWeight);
  const bounds = WEIGHT_BOUNDS[state.weightUnit];

  const stepError = useMemo<string | null>(() => {
    switch (step) {
      case 0: {
        if (!state.dob) return null;
        const age = ageFromDob(state.dob);
        if (age === null) return "That date doesn't look right.";
        if (parseISODate(state.dob) > new Date()) return "Your date of birth can't be in the future.";
        if (age < 13) return "You need to be at least 13 to use the portal.";
        if (age > 100) return "Please double-check that year.";
        return null;
      }
      case 1: {
        if (resolvedHeightCm === null) return null;
        if (resolvedHeightCm < 100 || resolvedHeightCm > 250)
          return "Enter a height between 100 cm (3'3\") and 250 cm (8'2\").";
        return null;
      }
      case 2: {
        if (state.weight && (!Number.isFinite(weightNum) || weightNum < bounds.min || weightNum > bounds.max))
          return `Enter a weight between ${bounds.min} and ${bounds.max} ${state.weightUnit}.`;
        if (state.measuredOn) {
          if (state.measuredOn > todayISO()) return "You can't log a weigh-in in the future.";
          if (parseISODate(state.measuredOn) < addDays(new Date(), -365))
            return "That's more than a year ago — pick a more recent weigh-in.";
        }
        return null;
      }
      case 3: {
        if (state.goalWeight && (!Number.isFinite(goalNum) || goalNum < bounds.min || goalNum > bounds.max))
          return `Enter a goal between ${bounds.min} and ${bounds.max} ${state.weightUnit}.`;
        return null;
      }
      case 4: {
        if (state.skipTargetDate || !state.targetDate) return null;
        if (state.targetDate <= todayISO()) return "Pick a date in the future.";
        if (parseISODate(state.targetDate) > addDays(new Date(), 365 * 5))
          return "Let's keep the target within the next five years.";
        return null;
      }
      default:
        return null;
    }
  }, [step, state, resolvedHeightCm, weightNum, goalNum, bounds]);

  const canAdvance = useMemo(() => {
    if (stepError) return false;
    switch (step) {
      case 0:
        return Boolean(state.dob);
      case 1:
        return resolvedHeightCm !== null;
      case 2:
        return Boolean(state.weight) && Number.isFinite(weightNum) && Boolean(state.measuredOn);
      case 3:
        return Boolean(state.goalWeight) && Number.isFinite(goalNum);
      case 4:
        return state.skipTargetDate || Boolean(state.targetDate);
      default:
        return true;
    }
  }, [step, stepError, state, resolvedHeightCm, weightNum, goalNum]);

  function next() {
    if (!canAdvance) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFinish() {
    if (!user || resolvedHeightCm === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await completeOnboarding(user.id, {
        date_of_birth: state.dob,
        height_cm: resolvedHeightCm,
        starting_weight: weightNum,
        goal_weight: goalNum,
        goal_target_date: state.skipTargetDate || !state.targetDate ? null : state.targetDate,
        weight_unit: state.weightUnit,
        measured_on: state.measuredOn,
      });
      // refresh() so middleware re-reads onboarding_completed on the next nav.
      router.push("/app/dashboard");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save your details");
      setSubmitting(false);
    }
  }

  /* ---------------------------- gate states ---------------------------- */

  if (status === "loading") return <OnboardingSkeleton />;

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm">
          <ErrorState message={authError} onRetry={refresh} />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Your session has expired.</p>
          <Button className="mt-4 w-full" onClick={() => router.push("/app/login")}>
            Sign in again
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              aria-label="Go back"
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <div className="h-10 w-10" aria-hidden="true" />
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </header>

      {/* Question */}
      <main className="flex flex-1 items-start justify-center px-5 pb-40 pt-8">
        <div className="w-full max-w-md">
          {/* Keyed enter-only animation. AnimatePresence mode="wait" deadlocks
              under React StrictMode's double-invoke — the exiting step never
              unmounts, so the next step never appears. */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
              {step === 0 && (
                <StepShell
                  icon={<Cake className="h-6 w-6" strokeWidth={1.9} />}
                  title="When were you born?"
                  description="Your age helps us set realistic, safe targets for your plan."
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      max={todayISO()}
                      value={state.dob}
                      onChange={(e) => set("dob", e.target.value)}
                    />
                    {state.dob && !stepError && (
                      <p className="pt-1 text-sm text-muted-foreground">
                        You&rsquo;re <span className="font-semibold text-foreground">{ageFromDob(state.dob)}</span> years old.
                      </p>
                    )}
                  </div>
                </StepShell>
              )}

              {step === 1 && (
                <StepShell
                  icon={<Ruler className="h-6 w-6" strokeWidth={1.9} />}
                  title="How tall are you?"
                  description="We use your height to track body composition over time."
                >
                  <Segmented
                    ariaLabel="Height unit"
                    options={[
                      { value: "cm", label: "Centimetres" },
                      { value: "ftin", label: "Feet & inches" },
                    ]}
                    value={state.heightMode}
                    onChange={(mode) => {
                      // Carry the value across so switching units never loses input.
                      if (mode === "ftin" && state.heightCm) {
                        const { feet, inches } = cmToFtIn(parseFloat(state.heightCm));
                        setState((s) => ({
                          ...s,
                          heightMode: mode,
                          heightFt: String(feet),
                          heightIn: String(inches),
                        }));
                        return;
                      }
                      if (mode === "cm" && state.heightFt) {
                        setState((s) => ({
                          ...s,
                          heightMode: mode,
                          heightCm: String(
                            round1(ftInToCm(parseFloat(s.heightFt) || 0, parseFloat(s.heightIn) || 0))
                          ),
                        }));
                        return;
                      }
                      set("heightMode", mode);
                    }}
                  />

                  <div className="mt-5">
                    {state.heightMode === "cm" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="heightCm">Height (cm)</Label>
                        <BigNumberInput
                          id="heightCm"
                          suffix="cm"
                          placeholder="165"
                          value={state.heightCm}
                          onChange={(v) => set("heightCm", v)}
                        />
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <Label htmlFor="heightFt">Feet</Label>
                          <BigNumberInput
                            id="heightFt"
                            suffix="ft"
                            placeholder="5"
                            value={state.heightFt}
                            onChange={(v) => set("heightFt", v)}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Label htmlFor="heightIn">Inches</Label>
                          <BigNumberInput
                            id="heightIn"
                            suffix="in"
                            placeholder="5"
                            value={state.heightIn}
                            onChange={(v) => set("heightIn", v)}
                          />
                        </div>
                      </div>
                    )}

                    {resolvedHeightCm !== null && !stepError && (
                      <p className="pt-3 text-sm text-muted-foreground">
                        That&rsquo;s{" "}
                        <span className="font-semibold text-foreground">
                          {state.heightMode === "cm"
                            ? `${cmToFtIn(resolvedHeightCm).feet}'${cmToFtIn(resolvedHeightCm).inches}"`
                            : `${Math.round(resolvedHeightCm)} cm`}
                        </span>
                        .
                      </p>
                    )}
                  </div>
                </StepShell>
              )}

              {step === 2 && (
                <StepShell
                  icon={<Scale className="h-6 w-6" strokeWidth={1.9} />}
                  title="What do you weigh right now?"
                  description="This becomes your starting point — the first entry on your chart."
                >
                  <Segmented
                    ariaLabel="Weight unit"
                    options={[
                      { value: "kg", label: "Kilograms" },
                      { value: "lbs", label: "Pounds" },
                    ]}
                    value={state.weightUnit}
                    onChange={(unit) => set("weightUnit", unit)}
                  />

                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="weight">Current weight</Label>
                      <BigNumberInput
                        id="weight"
                        suffix={state.weightUnit}
                        placeholder={state.weightUnit === "kg" ? "72.5" : "160"}
                        value={state.weight}
                        onChange={(v) => set("weight", v)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="measuredOn">When did you weigh yourself?</Label>
                      <Input
                        id="measuredOn"
                        type="date"
                        max={todayISO()}
                        value={state.measuredOn}
                        onChange={(e) => set("measuredOn", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Defaults to today — change it if this reading is from an earlier day.
                      </p>
                    </div>
                  </div>
                </StepShell>
              )}

              {step === 3 && (
                <StepShell
                  icon={<Flag className="h-6 w-6" strokeWidth={1.9} />}
                  title="What's your goal weight?"
                  description="Something you'd be genuinely happy to reach. You can change it any time."
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="goalWeight">Goal weight ({state.weightUnit})</Label>
                    <BigNumberInput
                      id="goalWeight"
                      suffix={state.weightUnit}
                      placeholder={state.weightUnit === "kg" ? "65" : "145"}
                      value={state.goalWeight}
                      onChange={(v) => set("goalWeight", v)}
                    />
                  </div>

                  {Number.isFinite(goalNum) && Number.isFinite(weightNum) && !stepError && (
                    <div className="mt-4 rounded-md bg-secondary px-4 py-3.5">
                      <p className="text-sm leading-relaxed text-secondary-foreground">
                        {Math.abs(goalNum - weightNum) < 0.05 ? (
                          <>That&rsquo;s your current weight — you&rsquo;re aiming to maintain. Nice.</>
                        ) : (
                          <>
                            That&rsquo;s{" "}
                            <span className="font-semibold">
                              {round1(Math.abs(goalNum - weightNum))} {state.weightUnit}
                            </span>{" "}
                            to {goalNum < weightNum ? "lose" : "gain"}.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </StepShell>
              )}

              {step === 4 && (
                <StepShell
                  icon={<CalendarDays className="h-6 w-6" strokeWidth={1.9} />}
                  title="Any date in mind?"
                  description="A target date keeps things focused — but it's completely optional."
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="targetDate">Target date</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      min={toLocalISODate(addDays(new Date(), 1))}
                      value={state.targetDate}
                      disabled={state.skipTargetDate}
                      onChange={(e) => set("targetDate", e.target.value)}
                      className={state.skipTargetDate ? "opacity-50" : undefined}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        skipTargetDate: !s.skipTargetDate,
                        targetDate: !s.skipTargetDate ? "" : s.targetDate,
                      }))
                    }
                    className={cn(
                      "mt-4 flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left transition-colors",
                      state.skipTargetDate
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        state.skipTargetDate ? "border-primary bg-primary text-primary-foreground" : "border-input"
                      )}
                    >
                      {state.skipTargetDate && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-medium">I&rsquo;d rather not set a date</span>
                  </button>
                </StepShell>
              )}

              {step === 5 && (
                <StepShell
                  icon={<Sparkles className="h-6 w-6" strokeWidth={1.9} />}
                  title="Does this look right?"
                  description="You can change any of this later from your profile."
                >
                  <dl className="divide-y divide-border overflow-hidden rounded-md border bg-card">
                    <SummaryRow label="Date of birth" value={`${state.dob} · ${ageFromDob(state.dob)} yrs`} />
                    <SummaryRow
                      label="Height"
                      value={
                        resolvedHeightCm !== null
                          ? `${Math.round(resolvedHeightCm)} cm · ${cmToFtIn(resolvedHeightCm).feet}'${
                              cmToFtIn(resolvedHeightCm).inches
                            }"`
                          : "--"
                      }
                    />
                    <SummaryRow
                      label="Starting weight"
                      value={`${round1(weightNum)} ${state.weightUnit} on ${state.measuredOn}`}
                    />
                    <SummaryRow label="Goal weight" value={`${round1(goalNum)} ${state.weightUnit}`} />
                    <SummaryRow
                      label="Target date"
                      value={state.skipTargetDate || !state.targetDate ? "No date set" : state.targetDate}
                    />
                  </dl>

                  {submitError && (
                    <div className="mt-4">
                      <InlineError message={submitError} />
                    </div>
                  )}
                </StepShell>
              )}
          </motion.div>

          {stepError && (
            <div className="mt-5">
              <InlineError message={stepError} />
            </div>
          )}
        </div>
      </main>

      {/* Sticky footer action — always reachable with a thumb */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/60 bg-background/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={back} className="px-6">
              Back
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button size="lg" className="flex-1" onClick={next} disabled={!canAdvance}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={handleFinish} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Setting up..." : "Finish setup"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>
      <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

/** Large numeric field — the number is the hero of the screen. */
function BigNumberInput({
  id,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-16 pr-16 text-3xl font-semibold tabular-nums sm:text-3xl"
      />
      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-background px-5 pt-6">
      <div className="mx-auto w-full max-w-md">
        <div className="skeleton h-1.5 w-full" />
        <div className="skeleton mt-9 h-14 w-14 rounded-2xl" />
        <div className="skeleton mt-5 h-8 w-3/4" />
        <div className="skeleton mt-3 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-2/3" />
        <div className="skeleton mt-8 h-12 w-full" />
        <div className="skeleton mt-4 h-16 w-full" />
      </div>
    </div>
  );
}
