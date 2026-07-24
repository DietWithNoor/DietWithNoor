"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Droplet, Plus, Minus } from "lucide-react";
import { useAppUser } from "@/lib/hooks";
import { addWaterLog, addSleepLog, addMoodLog, addActivityLog, getTodayWellness } from "@/lib/db";
import { checkHydrationHero } from "@/lib/gamification";
import { todayISO, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { ActivityLevel } from "@/types/index";

const MOODS = ["😄", "🙂", "😐", "😔", "😢"];
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export default function WellnessPage() {
  const { user } = useAppUser();
  const date = todayISO();
  const [glasses, setGlasses] = useState(0);
  const [sleepHours, setSleepHours] = useState("");
  const [energy, setEnergy] = useState([5]);
  const [mood, setMood] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getTodayWellness(user.id, date);
    setGlasses(data.water?.glasses ?? 0);
    setSleepHours(data.sleep?.hours != null ? String(data.sleep.hours) : "");
    setEnergy([data.mood?.energy_level ?? 5]);
    setMood(data.mood?.mood ?? null);
    setActivity(data.activity?.activity_level ?? null);
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateGlasses(delta: number) {
    if (!user) return;
    const next = Math.max(0, glasses + delta);
    setGlasses(next);
    await addWaterLog(user.id, date, next);
    if (next >= 8) await checkHydrationHero(user.id);
  }

  async function saveSleep(value: string) {
    setSleepHours(value);
    if (!user || !value) return;
    await addSleepLog(user.id, date, parseFloat(value));
  }

  async function saveMood(emoji: string) {
    if (!user) return;
    setMood(emoji);
    await addMoodLog(user.id, date, emoji, energy[0]);
  }

  async function saveEnergy(value: number[]) {
    setEnergy(value);
    if (!user || !mood) return;
    await addMoodLog(user.id, date, mood, value[0]);
  }

  async function saveActivity(level: ActivityLevel) {
    if (!user) return;
    setActivity(level);
    await addActivityLog(user.id, date, level);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Wellness</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Droplet className="h-4 w-4 text-primary" /> Water Intake
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0">
          <Button variant="outline" size="icon" onClick={() => updateGlasses(-1)}>
            <Minus className="h-4 w-4" />
          </Button>
          <motion.span key={glasses} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-3xl font-bold">
            {glasses} <span className="text-sm font-normal text-muted-foreground">glasses</span>
          </motion.span>
          <Button size="icon" onClick={() => updateGlasses(1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleep Hours</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Input
            type="number"
            step="0.5"
            min={0}
            max={24}
            value={sleepHours}
            onChange={(e) => saveSleep(e.target.value)}
            placeholder="e.g. 7.5"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Energy Level</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Slider min={1} max={10} step={1} value={energy} onValueChange={saveEnergy} />
          <p className="text-center text-sm text-muted-foreground">{energy[0]} / 10</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mood</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between pt-0">
          {MOODS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => saveMood(emoji)}
              className={cn(
                "text-3xl rounded-full p-2 tap-target transition-transform",
                mood === emoji ? "scale-110 bg-primary/10" : "opacity-60"
              )}
            >
              {emoji}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Level</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          {ACTIVITY_LEVELS.map((level) => (
            <Button
              key={level.value}
              variant={activity === level.value ? "default" : "outline"}
              className="flex-1"
              onClick={() => saveActivity(level.value)}
            >
              {level.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
