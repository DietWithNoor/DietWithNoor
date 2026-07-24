export type UserRole = "user" | "admin";
export type WeightUnit = "kg" | "lbs";
export type ActivityLevel = "low" | "moderate" | "high";

export interface AppUser {
  id: string;
  email: string;
  user_number: number;
  full_name: string;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
  role: UserRole;
}

export interface Profile {
  user_id: string;
  current_weight: number | null;
  weight_unit: WeightUnit;
  first_weight_entry_date: string | null;
  tracking_streak: number;
  last_tracked_date: string | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  unit: WeightUnit;
  logged_at: string;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string;
  glasses: number;
  created_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  created_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  date: string;
  mood: string;
  energy_level: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  date: string;
  activity_level: ActivityLevel;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  unlocked_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  streak_type: string;
  current_count: number;
  best_count: number;
  last_completed_date: string | null;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface Announcement {
  id: string;
  admin_id: string;
  title: string;
  message: string;
  created_at: string;
  active: boolean;
}

// Minimal Supabase Database type placeholder. Regenerate with `supabase gen types typescript`
// once the real project exists for full type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
