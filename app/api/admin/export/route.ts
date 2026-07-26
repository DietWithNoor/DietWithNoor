import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/export
 * Body: { userIds: string[] | "all", format: "csv" | "json" }
 *
 * Auth: verifies the caller is an authenticated admin via the regular (cookie-scoped)
 * client, then uses the service-role client to pull data across all requested users
 * (bypassing RLS is required here since a single export can span many users).
 *
 * The point of this export is to be fed into analysis tools, so it carries the
 * actual logged records — not just per-client counts.
 *  - json: one nested object per client (profile + every log).
 *  - csv:  long format, one row per record, so it pivots cleanly in a spreadsheet.
 */

interface UserRow {
  id: string;
  user_number: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  created_at: string;
  role: string;
}

/** RFC-4180 style escaping — quote everything, double any inner quotes. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: appUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (appUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { userIds, format = "csv" } = body as {
    userIds: string[] | "all";
    format: "csv" | "json";
  };

  if (userIds !== "all" && (!Array.isArray(userIds) || userIds.length === 0)) {
    return NextResponse.json({ error: "Select at least one client to export." }, { status: 400 });
  }

  const admin = createAdminClient();

  let usersQuery = admin.from("users").select("*").order("user_number");
  if (userIds !== "all") usersQuery = usersQuery.in("id", userIds);
  const { data: users, error } = await usersQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (users ?? []).map((u: UserRow) => u.id);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No matching clients." }, { status: 404 });
  }

  const inIds = <T,>(table: string, column = "user_id") =>
    admin.from(table).select("*").in(column, ids) as unknown as Promise<{ data: T[] | null }>;

  const [profiles, weights, water, sleep, mood, activity, meals] = await Promise.all([
    inIds<Record<string, unknown>>("profiles"),
    inIds<Record<string, unknown>>("weight_logs"),
    inIds<Record<string, unknown>>("water_logs"),
    inIds<Record<string, unknown>>("sleep_logs"),
    inIds<Record<string, unknown>>("mood_logs"),
    inIds<Record<string, unknown>>("activity_logs"),
    admin.from("meal_logs").select("*, meal_items(*)").in("user_id", ids),
  ]);

  const forUser = (rows: Record<string, unknown>[] | null | undefined, id: string) =>
    (rows ?? []).filter((r) => r.user_id === id);

  if (format === "json") {
    const payload = (users ?? []).map((u: UserRow) => ({
      client_id: u.user_number,
      full_name: u.full_name,
      email: u.email,
      phone_number: u.phone_number,
      joined_at: u.created_at,
      profile: forUser(profiles.data, u.id)[0] ?? null,
      weight_logs: forUser(weights.data, u.id),
      water_logs: forUser(water.data, u.id),
      sleep_logs: forUser(sleep.data, u.id),
      mood_logs: forUser(mood.data, u.id),
      activity_logs: forUser(activity.data, u.id),
      meals: forUser(meals.data as Record<string, unknown>[], u.id),
    }));

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dietwithnoor-export-${Date.now()}.json"`,
      },
    });
  }

  // ---- CSV: long format, one row per record ----
  const header = [
    "client_id",
    "full_name",
    "email",
    "record_type",
    "recorded_at",
    "value",
    "unit",
    "detail",
  ];

  const lines: string[] = [header.join(",")];

  for (const u of (users ?? []) as UserRow[]) {
    const base = [csvCell(u.user_number), csvCell(u.full_name), csvCell(u.email)];
    const push = (type: string, at: unknown, value: unknown, unit: unknown, detail: unknown) =>
      lines.push([...base, csvCell(type), csvCell(at), csvCell(value), csvCell(unit), csvCell(detail)].join(","));

    const p = forUser(profiles.data, u.id)[0];
    if (p) {
      push("profile", u.created_at, p.current_weight, p.weight_unit,
        `dob=${p.date_of_birth ?? ""}; height_cm=${p.height_cm ?? ""}; start=${p.starting_weight ?? ""}; goal=${p.goal_weight ?? ""}; target=${p.goal_target_date ?? ""}`);
    }

    for (const w of forUser(weights.data, u.id)) push("weight", w.logged_at, w.weight, w.unit, "");
    for (const w of forUser(water.data, u.id)) push("water", w.date, w.glasses, "glasses", "");
    for (const s of forUser(sleep.data, u.id)) push("sleep", s.date, s.hours, "hours", "");
    for (const m of forUser(mood.data, u.id)) push("mood", m.date, m.energy_level, "energy_1_10", `mood=${m.mood ?? ""}`);
    for (const a of forUser(activity.data, u.id)) push("activity", a.date, a.activity_level, "", "");

    for (const meal of forUser(meals.data as Record<string, unknown>[], u.id)) {
      const items = (meal.meal_items as Record<string, unknown>[] | null) ?? [];
      // meal_items.calories is already the serving-multiplied total (matching
      // sumMacros in lib/db.ts) — do not multiply by quantity again.
      const kcal = items.reduce((sum, i) => sum + Number(i.calories ?? 0), 0);
      const names = items.map((i) => `${i.food_name} x${i.quantity}`).join("; ");
      push("meal", meal.logged_at, Math.round(kcal), "kcal", `${meal.meal_type}: ${names}`);
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dietwithnoor-export-${Date.now()}.csv"`,
    },
  });
}
