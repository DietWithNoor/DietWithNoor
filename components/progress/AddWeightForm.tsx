"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWeightLog } from "@/lib/db";
import { recomputeTrackingStreak, checkWeightLossAchievement } from "@/lib/gamification";
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
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    try {
      const w = parseFloat(weight);
      await addWeightLog(userId, w, unit, new Date(loggedAt).toISOString());
      await recomputeTrackingStreak(userId);
      if (firstWeight != null) await checkWeightLossAchievement(userId, w, firstWeight);
      setOpen(false);
      setWeight("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log your weight</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight ({unit})</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              autoFocus
            />
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
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
