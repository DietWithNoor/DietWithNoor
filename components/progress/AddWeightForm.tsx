"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { addWeightLog } from "@/lib/db";
import { recomputeTrackingStreak, checkWeightLossAchievement } from "@/lib/gamification";
import { toLocalDateTimeInput } from "@/lib/utils";
import type { WeightUnit } from "@/types/index";

export function AddWeightForm({
  userId,
  unit,
  firstWeight,
  onAdded,
  trigger,
}: {
  userId: string;
  unit: WeightUnit;
  firstWeight: number | null;
  onAdded: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [loggedAt, setLoggedAt] = useState(() => toLocalDateTimeInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setWeight("");
    setLoggedAt(toLocalDateTimeInput());
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Enter a valid weight.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addWeightLog(userId, w, unit, new Date(loggedAt).toISOString());
      await recomputeTrackingStreak(userId);
      if (firstWeight != null) await checkWeightLossAchievement(userId, w, firstWeight);
      setOpen(false);
      reset();
      onAdded();
    } catch (err) {
      // Surface the failure in-place instead of closing on a silent error.
      setError(err instanceof Error ? err.message : "Couldn't save that entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log your weight</DialogTitle>
          <DialogDescription>Weigh in at a consistent time of day for the most useful trend.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <InlineError message={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight ({unit})</Label>
            <div className="relative">
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                required
                autoFocus
                placeholder={unit === "kg" ? "72.5" : "160"}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-16 pr-16 text-3xl font-semibold tabular-nums sm:text-3xl"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                {unit}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loggedAt">Date &amp; time</Label>
            <Input
              id="loggedAt"
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
