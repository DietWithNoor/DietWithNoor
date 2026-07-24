"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate, clientIdLabel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { AppUser } from "@/types/index";

type RangeFilter = "today" | "7d" | "30d" | "all";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");
  const [lastActiveByUser, setLastActiveByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userRows } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      setUsers(userRows ?? []);

      const { data: logs } = await supabase
        .from("weight_logs")
        .select("user_id, logged_at")
        .order("logged_at", { ascending: false });

      const map: Record<string, string> = {};
      for (const log of logs ?? []) {
        if (!map[log.user_id]) map[log.user_id] = log.logged_at;
      }
      setLastActiveByUser(map);
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const rangeMs: Record<RangeFilter, number> = { today: 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000, all: Infinity };
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        String(u.user_number).includes(search);
      const createdAt = new Date(u.created_at).getTime();
      const matchesRange = range === "all" || now - createdAt <= rangeMs[range];
      return matchesSearch && matchesRange;
    });
  }, [users, search, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Users ({filtered.length})</h2>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search name, email, ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          {(["today", "7d", "30d", "all"] as RangeFilter[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => {
            const lastActive = lastActiveByUser[u.id];
            const isActive = lastActive && Date.now() - new Date(lastActive).getTime() < 7 * 86400000;
            return (
              <TableRow key={u.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/app/admin/users/${u.id}`} className="font-medium text-primary">
                    {clientIdLabel(u.user_number)}
                  </Link>
                </TableCell>
                <TableCell>{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{formatDate(u.created_at)}</TableCell>
                <TableCell>{lastActive ? formatDate(lastActive) : "Never"}</TableCell>
                <TableCell>
                  <Badge variant={isActive ? "success" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
