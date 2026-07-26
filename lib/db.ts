import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLevel,
  DraftMealItem,
  Food,
  MacroTotals,
  MealType,
  MealWithItems,
  WeightUnit,
} from "@/types/index";

/**
 * Client-side data-access helpers. All queries rely on RLS to scope rows to the
 * caller.
 *
 * NOTE: these throw on error rather than swallowing it into an empty array.
 * Callers render a real error state with a retry — silently returning `[]` is
 * what made a broken query look like an empty account.
 */

export async function getCurrentAppUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWeightLogs(userId: string, limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function addWeightLog(userId: string, weight: number, unit: WeightUnit, loggedAt: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, weight, unit, logged_at: loggedAt })
    .select()
    .single();
  if (error) throw error;

  // "Current weight" must be the most recent entry by date, not simply the one
  // just typed — entries can be backdated, and a backdated weigh-in must not
  // overwrite a newer reading.
  const { data: latest } = await supabase
    .from("weight_logs")
    .select("weight, unit")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      current_weight: latest?.weight ?? weight,
      weight_unit: latest?.unit ?? unit,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;

  return data;
}

export async function deleteWeightLog(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("weight_logs").delete().eq("id", id);
  if (error) throw error;
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

  const failure = [water, sleep, mood, activity].find((r) => r.error);
  if (failure?.error) throw failure.error;

  return {
    water: water.data,
    sleep: sleep.data,
    mood: mood.data,
    activity: activity.data,
  };
}

/** Last `days` days of wellness rows, used for the real weekly wellness score. */
export async function getWellnessRange(userId: string, sinceDate: string) {
  const supabase = createClient();
  const [water, sleep] = await Promise.all([
    supabase.from("water_logs").select("date, glasses").eq("user_id", userId).gte("date", sinceDate),
    supabase.from("sleep_logs").select("date, hours").eq("user_id", userId).gte("date", sinceDate),
  ]);
  if (water.error) throw water.error;
  if (sleep.error) throw sleep.error;
  return { water: water.data ?? [], sleep: sleep.data ?? [] };
}

export async function getAchievements(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("achievements").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export interface OnboardingPayload {
  date_of_birth: string;
  height_cm: number;
  starting_weight: number;
  goal_weight: number;
  goal_target_date: string | null;
  weight_unit: WeightUnit;
  /** Date the starting weight was actually measured (YYYY-MM-DD). */
  measured_on: string;
}

/**
 * Writes the profile and seeds weight_logs with the starting weight so the
 * dashboard and trend chart have data the moment onboarding finishes.
 */
export async function completeOnboarding(userId: string, payload: OnboardingPayload) {
  const supabase = createClient();
  const measuredAtISO = new Date(`${payload.measured_on}T09:00:00`).toISOString();

  // Upsert, not update: if the post-signup trigger hasn't created the profile
  // row yet, an update would silently affect zero rows and the onboarding gate
  // would loop forever.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        date_of_birth: payload.date_of_birth,
        height_cm: payload.height_cm,
        starting_weight: payload.starting_weight,
        goal_weight: payload.goal_weight,
        goal_target_date: payload.goal_target_date,
        current_weight: payload.starting_weight,
        weight_unit: payload.weight_unit,
        first_weight_entry_date: payload.measured_on,
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
  if (profileError) throw profileError;

  // Seed the first weigh-in, but don't duplicate it if the user already has one.
  const { data: existing, error: existingError } = await supabase
    .from("weight_logs")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (existingError) throw existingError;

  if (!existing || existing.length === 0) {
    const { error: logError } = await supabase.from("weight_logs").insert({
      user_id: userId,
      weight: payload.starting_weight,
      unit: payload.weight_unit,
      logged_at: measuredAtISO,
    });
    if (logError) throw logError;
  }
}

/* ------------------------------------------------------------------ */
/* Meals                                                               */
/* ------------------------------------------------------------------ */

/** Debounced `ilike` search against the shared foods lookup table. */
export async function searchFoods(query: string, limit = 12): Promise<Food[]> {
  const supabase = createClient();
  let q = supabase.from("foods").select("*").order("name").limit(limit);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Food[];
}

/**
 * All meals logged on a given local calendar day, with their items.
 * `date` is YYYY-MM-DD in the user's local timezone; we bound the query by the
 * local day's start/end converted to UTC so late-night meals land on the right day.
 */
export async function getMealsForDate(userId: string, date: string): Promise<MealWithItems[]> {
  const supabase = createClient();
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("meal_logs")
    .select("*, meal_items(*)")
    .eq("user_id", userId)
    .gte("logged_at", start.toISOString())
    .lt("logged_at", end.toISOString())
    .order("logged_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MealWithItems[];
}

export async function createMeal(params: {
  userId: string;
  mealType: MealType;
  loggedAt: string;
  notes?: string | null;
  items: DraftMealItem[];
}) {
  const supabase = createClient();
  const { data: meal, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: params.userId,
      meal_type: params.mealType,
      logged_at: params.loggedAt,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.items.length) {
    const { error: itemsError } = await supabase
      .from("meal_items")
      .insert(params.items.map((i) => ({ ...i, meal_log_id: meal.id })));
    if (itemsError) {
      // Don't leave an orphaned empty meal behind if the items insert fails.
      await supabase.from("meal_logs").delete().eq("id", meal.id);
      throw itemsError;
    }
  }

  return meal;
}

export async function updateMeal(
  mealId: string,
  params: { mealType: MealType; loggedAt: string; notes?: string | null }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_logs")
    .update({ meal_type: params.mealType, logged_at: params.loggedAt, notes: params.notes ?? null })
    .eq("id", mealId);
  if (error) throw error;
}

export async function deleteMeal(mealId: string) {
  const supabase = createClient();
  // meal_items cascade via the FK, so one delete is enough.
  const { error } = await supabase.from("meal_logs").delete().eq("id", mealId);
  if (error) throw error;
}

export async function addMealItems(mealId: string, items: DraftMealItem[]) {
  if (!items.length) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_items")
    .insert(items.map((i) => ({ ...i, meal_log_id: mealId })));
  if (error) throw error;
}

export async function updateMealItem(itemId: string, item: DraftMealItem) {
  const supabase = createClient();
  const { error } = await supabase.from("meal_items").update(item).eq("id", itemId);
  if (error) throw error;
}

export async function deleteMealItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("meal_items").delete().eq("id", itemId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Macro math                                                          */
/* ------------------------------------------------------------------ */

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Any row carrying macro columns — DB rows use `number | null`, drafts may omit them. */
type MacroBearing = {
  [K in keyof MacroTotals]?: number | null;
};

/**
 * Item macros are stored already multiplied by quantity at write time, so
 * totalling is a straight sum. Nulls count as zero.
 */
export function sumMacros(items: Array<MacroBearing | null | undefined>): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, i) => ({
      calories: acc.calories + (i?.calories ?? 0),
      protein_g: acc.protein_g + (i?.protein_g ?? 0),
      carbs_g: acc.carbs_g + (i?.carbs_g ?? 0),
      fat_g: acc.fat_g + (i?.fat_g ?? 0),
    }),
    { ...EMPTY_TOTALS }
  );
}

export function sumMealMacros(meals: MealWithItems[]): MacroTotals {
  return sumMacros(meals.flatMap((m) => m.meal_items ?? []));
}
