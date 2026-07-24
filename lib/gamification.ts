import { createClient } from "@/lib/supabase/client";

export const ACHIEVEMENT_TYPES = {
  FIRST_CHECK_IN: "first_check_in",
  SEVEN_DAYS_CONSISTENT: "seven_days_consistent",
  LOST_FIRST_KG: "lost_first_kg",
  CONSISTENCY_CHAMPION: "consistency_champion",
  HYDRATION_HERO: "hydration_hero",
} as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[keyof typeof ACHIEVEMENT_TYPES];

export const ACHIEVEMENT_META: Record<AchievementType, { label: string; emoji: string; description: string }> = {
  [ACHIEVEMENT_TYPES.FIRST_CHECK_IN]: {
    label: "First Check-In",
    emoji: "🎯",
    description: "Logged your first weight entry",
  },
  [ACHIEVEMENT_TYPES.SEVEN_DAYS_CONSISTENT]: {
    label: "7 Days Consistent",
    emoji: "🔥",
    description: "Tracked for 7 days in a row",
  },
  [ACHIEVEMENT_TYPES.LOST_FIRST_KG]: {
    label: "Lost First KG",
    emoji: "🏆",
    description: "Lost your first kilogram",
  },
  [ACHIEVEMENT_TYPES.CONSISTENCY_CHAMPION]: {
    label: "Consistency Champion",
    emoji: "👑",
    description: "Tracked for 30 days in a row",
  },
  [ACHIEVEMENT_TYPES.HYDRATION_HERO]: {
    label: "Hydration Hero",
    emoji: "💧",
    description: "Hit your water goal 7 days in a row",
  },
};

/** Award an achievement if not already unlocked. Safe to call repeatedly. */
export async function unlockAchievement(userId: string, type: AchievementType) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_type", type)
    .maybeSingle();

  if (existing) return false;

  await supabase.from("achievements").insert({
    user_id: userId,
    achievement_type: type,
    unlocked_at: new Date().toISOString(),
  });
  return true;
}

/** Recompute a user's tracking streak based on weight_logs and upsert into streaks + profiles. */
export async function recomputeTrackingStreak(userId: string) {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("weight_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (!logs || logs.length === 0) return 0;

  const days = new Set(logs.map((l: { logged_at: string }) => l.logged_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (days.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  await supabase
    .from("streaks")
    .upsert(
      { user_id: userId, streak_type: "tracking", current_count: streak },
      { onConflict: "user_id,streak_type" }
    );

  await supabase
    .from("profiles")
    .update({ tracking_streak: streak, last_tracked_date: new Date().toISOString().slice(0, 10) })
    .eq("user_id", userId);

  if (streak >= 1) await unlockAchievement(userId, ACHIEVEMENT_TYPES.FIRST_CHECK_IN);
  if (streak >= 7) await unlockAchievement(userId, ACHIEVEMENT_TYPES.SEVEN_DAYS_CONSISTENT);
  if (streak >= 30) await unlockAchievement(userId, ACHIEVEMENT_TYPES.CONSISTENCY_CHAMPION);

  return streak;
}

export async function checkWeightLossAchievement(userId: string, currentWeight: number, firstWeight: number) {
  if (currentWeight < firstWeight) {
    await unlockAchievement(userId, ACHIEVEMENT_TYPES.LOST_FIRST_KG);
  }
}

export async function checkHydrationHero(userId: string) {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const { data } = await supabase
    .from("water_logs")
    .select("date, glasses")
    .eq("user_id", userId)
    .gte("date", since.toISOString().slice(0, 10));

  if (!data || data.length < 7) return;
  const allHitGoal = data.every((d: { glasses: number }) => d.glasses >= 8);
  if (allHitGoal) await unlockAchievement(userId, ACHIEVEMENT_TYPES.HYDRATION_HERO);
}
