import { createClient } from "@/lib/supabase/client";
import type { ActivityLevel } from "@/types/index";

/** Client-side data-access helpers. All queries rely on RLS to scope rows to the caller. */

export async function getCurrentAppUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
  return data;
}

export async function getProfile(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  return data;
}

export async function getWeightLogs(userId: string, limit = 30) {
  const supabase = createClient();
  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function addWeightLog(userId: string, weight: number, unit: "kg" | "lbs", loggedAt: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, weight, unit, logged_at: loggedAt })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("profiles")
    .update({ current_weight: weight, weight_unit: unit })
    .eq("user_id", userId);

  return data;
}

export async function addWaterLog(userId: string, date: string, glasses: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("water_logs")
    .upsert({ user_id: userId, date, glasses }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function addSleepLog(userId: string, date: string, hours: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("sleep_logs")
    .upsert({ user_id: userId, date, hours }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function addMoodLog(userId: string, date: string, mood: string, energyLevel: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("mood_logs")
    .upsert({ user_id: userId, date, mood, energy_level: energyLevel }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function addActivityLog(userId: string, date: string, level: ActivityLevel) {
  const supabase = createClient();
  const { error } = await supabase
    .from("activity_logs")
    .upsert({ user_id: userId, date, activity_level: level }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function getTodayWellness(userId: string, date: string) {
  const supabase = createClient();
  const [water, sleep, mood, activity] = await Promise.all([
    supabase.from("water_logs").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("sleep_logs").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("mood_logs").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("activity_logs").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
  ]);
  return {
    water: water.data,
    sleep: sleep.data,
    mood: mood.data,
    activity: activity.data,
  };
}

export async function getAchievements(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("achievements").select("*").eq("user_id", userId);
  return data ?? [];
}
