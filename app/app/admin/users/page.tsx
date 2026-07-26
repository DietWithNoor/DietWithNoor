"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, clientIdLabel, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { AppUser } from "@/types/index";

type RangeFilter = "today" | "7d" | "30d" | "all";
type LoadState = "loading" | "error" | "ready";

const RANGE_LABELS: Record<RangeFilter, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  all: "All time",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");
  const [lastActiveByUser, setLastActiveByUser] = useState<Record<string, string>>({});
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const supabase = createClient();
      const [usersRes, logsRes] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("weight_logs").select("user_id, logged_at").order("logged_at", { ascending: false }),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (logsRes.error) throw logsRes.error;

      setUsers(usersRes.data ?? []);

      const map: Record<string, string> = {};
      for (const log of logsRes.data ?? []) {
        if (!map[log.user_id]) map[log.user_id] = log.logged_at;
      }
      setLastActiveByUser(map);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load clients");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const rangeMs: Record<RangeFilter, number> = {
      today: 86400000,
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
      all: Infinity,
    };
    return users.filter((u) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !search ||
        u.full_name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        String(u.user_number).includes(search);
      const createdAt = new Date(u.created_at).getTime();
      const matchesRange = range === "all" || now - createdAt <= rangeMs[range];
      return matchesSearch && matchesRange;
    });
  }, [users, search, range]);

  const hasFilters = Boolean(search) || range !== "all";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {state === "ready"
            ? `${filtered.length} of ${users.length} client${users.length === 1 ? "" : "s"}`
            : "Loading your client list..."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-11"
            aria-label="Search clients"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none" role="group" aria-label="Registered within">
          {(Object.keys(RANGE_LABELS) as RangeFilter[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
              className="shrink-0"
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
      </div>

      {state === "error" ? (
        <ErrorState message={error} onRetry={load} />
      ) : state === "loading" ? (
        <UsersSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={hasFilters ? "No clients match those filters" : "No clients yet"}
            description={
              hasFilters
                ? "Try a different search term or widen the date range."
                : "Once people sign up through the portal they'll appear here."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setRange("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile: cards. Desktop: table. */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((u) => {
              const lastActive = lastActiveByUser[u.id];
              const isActive = lastActive && Date.now() - new Date(lastActive).getTime() < 7 * 86400000;
              return (
                <Card key={u.id}>
                  <Link href={`/app/admin/users/${u.id}`} className="block rounded-lg hover:bg-muted/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{u.full_name}</p>
                          <Badge variant={isActive ? "success" : "outline"} className="shrink-0">
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {clientIdLabel(u.user_number)} · joined {formatDate(u.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const lastActive = lastActiveByUser[u.id];
                  const isActive = lastActive && Date.now() - new Date(lastActive).getTime() < 7 * 86400000;
                  return (
                    <TableRow key={u.id} className="group">
                      <TableCell>
                        <Link
                          href={`/app/admin/users/${u.id}`}
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          {clientIdLabel(u.user_number)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                      <TableCell className={cn(!lastActive && "text-muted-foreground")}>
                        {lastActive ? formatDate(lastActive) : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "success" : "outline"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/app/admin/users/${u.id}`}
                          aria-label={`Open ${u.full_name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
