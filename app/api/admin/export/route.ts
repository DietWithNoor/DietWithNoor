import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/export
 * Body: { userIds: string[] | "all", format: "csv" | "json" }
 *
 * Auth: verifies the caller is an authenticated admin via the regular (cookie-scoped)
 * client, then uses the service-role client to pull data across all requested users
 * (bypassing RLS is required here since a single export can span many users).
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: appUser } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (appUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userIds, format = "csv" } = body as { userIds: string[] | "all"; format: "csv" | "json" | "xlsx" };

  const admin = createAdminClient();

  let usersQuery = admin.from("users").select("*");
  if (userIds !== "all") usersQuery = usersQuery.in("id", userIds);
  const { data: users, error } = await usersQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (users ?? []).map((u: { id: string }) => u.id);
  const { data: weightLogs } = await admin.from("weight_logs").select("*").in("user_id", ids);

  const rows = (users ?? []).map((u: Record<string, unknown>) => {
    const logs = (weightLogs ?? []).filter((w: { user_id: string }) => w.user_id === u.id);
    return {
      client_id: u.user_number,
      full_name: u.full_name,
      email: u.email,
      phone_number: u.phone_number,
      created_at: u.created_at,
      weight_entries: logs.length,
    };
  });

  if (format === "json") {
    return NextResponse.json(rows);
  }

  // CSV (also used as a stand-in for xlsx — open in Excel directly)
  const header = Object.keys(rows[0] ?? { client_id: "", full_name: "", email: "", phone_number: "", created_at: "", weight_entries: "" });
  const csv = [header.join(","), ...rows.map((r) => header.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dietwithnoor-export-${Date.now()}.csv"`,
    },
  });
}
