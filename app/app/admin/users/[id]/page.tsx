"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  Droplet,
  Moon,
  Smile,
  Activity,
  UtensilsCrossed,
  Mail,
  Phone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  clientIdLabel,
  ageFromDob,
  formatHeight,
  round1,
  formatNumber,
  formatTime,
} from "@/lib/utils";
import { sumMacros } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { TrendChart } from "@/components/dashboard/TrendChartLazy";
import type {
  AppUser,
  Profile,
  WeightLog,
  WaterLog,
  SleepLog,
  MoodLog,
  ActivityLog,
  MealWithItems,
} from "@/types/index";

type LoadState = "loading" | "error" | "ready";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const supabase = createClient();
      const [u, p, w, water, sleep, mood, activity, mealRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("weight_logs").select("*").eq("user_id", userId).order("logged_at", { ascending: false }),
        supabase.from("water_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("sleep_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("mood_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("activity_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase
          .from("meal_logs")
          .select("*, meal_items(*)")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(60),
      ]);

      const failure = [u, p, w, water, sleep, mood, activity, mealRes].find((r) => r.error);
      if (failure?.error) throw failure.error;
      if (!u.data) throw new Error("That client no longer exists.");

      setUser(u.data);
      setProfile(p.data);
      setWeightLogs(w.data ?? []);
      setWaterLogs(water.data ?? []);
      setSleepLogs(sleep.data ?? []);
      setMoodLogs(mood.data ?? []);
      setActivityLogs(activity.data ?? []);
      setMeals((mealRes.data ?? []) as MealWithItems[]);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this client");
      setState("error");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") return <DetailSkeleton />;

  if (state === "error" || !user) {
    return (
      <div className="space-y-5">
        <BackLink />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const unit = profile?.weight_unit ?? "kg";

  return (
    <div className="space-y-5">
      <BackLink />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar className="h-14 w-14 text-xl">
            <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold tracking-tight">{user.full_name}</h1>
              <Badge variant="secondary">{clientIdLabel(user.user_number)}</Badge>
              {user.role === "admin" && <Badge>Admin</Badge>}
              {profile?.onboarding_completed === false && <Badge variant="warning">Onboarding pending</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </span>
              {user.phone_number && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone_number}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Joined</p>
            <p className="mt-0.5 text-sm font-semibold">{formatDate(user.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none sm:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ---------------- Profile ---------------- */}
        <TabsContent value="profile">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <Detail label="Age" value={ageFromDob(profile?.date_of_birth) ?? "--"} />
              <Detail label="Height" value={formatHeight(profile?.height_cm)} />
              <Detail
                label="Starting weight"
                value={profile?.starting_weight != null ? `${round1(profile.starting_weight)} ${unit}` : "--"}
              />
              <Detail
                label="Current weight"
                value={profile?.current_weight != null ? `${round1(profile.current_weight)} ${unit}` : "--"}
              />
              <Detail
                label="Goal weight"
                value={profile?.goal_weight != null ? `${round1(profile.goal_weight)} ${unit}` : "--"}
              />
              <Detail
                label="Target date"
                value={profile?.goal_target_date ? formatDate(profile.goal_target_date) : "None"}
              />
              <Detail label="Streak" value={`${profile?.tracking_streak ?? 0} days`} />
              <Detail
                label="Last tracked"
                value={profile?.last_tracked_date ? formatDate(profile.last_tracked_date) : "Never"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Weight ---------------- */}
        <TabsContent value="weight">
          {weightLogs.length === 0 ? (
            <Card>
              <EmptyState
                icon={Scale}
                title="No weigh-ins recorded"
                description="This client hasn't logged any weight yet. Their trend will appear here once they do."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <TrendChart
                logs={weightLogs}
                unit={unit}
                goalWeight={profile?.goal_weight ?? null}
                title="Weight history"
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weightLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{formatDate(l.logged_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatTime(l.logged_at)}</TableCell>
                      <TableCell className="font-semibold tnum">
                        {round1(l.weight)} {l.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------- Meals ---------------- */}
        <TabsContent value="meals">
          {meals.length === 0 ? (
            <Card>
              <EmptyState
                tone="accent"
                icon={UtensilsCrossed}
                title="No meals logged"
                description="Once this client starts logging what they eat, their meals and macros show up here."
              />
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Calories</TableHead>
                  <TableHead>P / C / F</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((meal) => {
                  const totals = sumMacros(meal.meal_items ?? []);
                  return (
                    <TableRow key={meal.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDate(meal.logged_at)}
                        <span className="ml-1.5 text-xs text-muted-foreground">{formatTime(meal.logged_at)}</span>
                      </TableCell>
                      <TableCell className="capitalize">{meal.meal_type}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {(meal.meal_items ?? []).map((i) => i.food_name).join(", ") || "--"}
                      </TableCell>
                      <TableCell className="font-semibold tnum">{formatNumber(totals.calories)}</TableCell>
                      <TableCell className="text-muted-foreground tnum">
                        {formatNumber(totals.protein_g, 1)} / {formatNumber(totals.carbs_g, 1)} /{" "}
                        {formatNumber(totals.fat_g, 1)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ---------------- Wellness ---------------- */}
        <TabsContent value="wellness">
          <div className="grid gap-4 lg:grid-cols-3">
            <LogPanel
              title="Water"
              icon={Droplet}
              emptyTitle="No water logs"
              emptyDescription="Daily hydration will appear here."
              rows={waterLogs.map((l) => ({ id: l.id, date: l.date, value: `${l.glasses} glasses` }))}
            />
            <LogPanel
              title="Sleep"
              icon={Moon}
              tone="berry"
              emptyTitle="No sleep logs"
              emptyDescription="Nightly sleep hours will appear here."
              rows={sleepLogs.map((l) => ({ id: l.id, date: l.date, value: `${l.hours} hrs` }))}
            />
            <LogPanel
              title="Mood & energy"
              icon={Smile}
              tone="accent"
              emptyTitle="No mood logs"
              emptyDescription="Daily mood check-ins will appear here."
              rows={moodLogs.map((l) => ({
                id: l.id,
                date: l.date,
                value: `${l.mood} · ${l.energy_level}/10`,
              }))}
            />
          </div>
        </TabsContent>

        {/* ---------------- Activity ---------------- */}
        <TabsContent value="activity">
          {activityLogs.length === 0 ? (
            <Card>
              <EmptyState
                tone="fresh"
                icon={Activity}
                title="No activity logged"
                description="This client hasn't recorded their daily activity level yet."
              />
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{formatDate(l.date)}</TableCell>
                    <TableCell className="capitalize">{l.activity_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BackLink() {
  return (
    <Link
      href="/app/admin/users"
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All clients
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LogPanel({
  title,
  icon,
  tone = "primary",
  rows,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  icon: typeof Droplet;
  tone?: "primary" | "accent" | "fresh" | "berry";
  rows: { id: string; date: string; value: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <EmptyState compact tone={tone} icon={icon} title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="max-h-72 divide-y divide-border/70 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{formatDate(row.date)}</span>
                <span className="font-semibold">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <Skeleton className="h-11 w-80 rounded-md" />
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
