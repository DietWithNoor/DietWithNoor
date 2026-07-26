"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Users, Search, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { clientIdLabel } from "@/lib/utils";
import type { AppUser } from "@/types/index";

type LoadState = "loading" | "error" | "ready";
type ExportKey = "csv-all" | "json-all" | "csv-selected" | "json-selected";

export default function AdminExportPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ExportKey | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.from("users").select("*").order("full_name");
      if (err) throw err;
      setUsers(data ?? []);
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
    if (!search) return users;
    const term = search.toLowerCase();
    return users.filter(
      (u) => u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    );
  }, [users, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const allSelected = filtered.every((u) => selected.has(u.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of filtered) {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  async function handleExport(format: "csv" | "json", scope: "selected" | "all") {
    const key = `${format}-${scope}` as ExportKey;
    setBusy(key);
    setExportError(null);
    try {
      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: scope === "all" ? "all" : Array.from(selected), format }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }

      if (format === "json") {
        const data = await res.json();
        downloadBlob(
          new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
          `dietwithnoor-export-${Date.now()}.json`
        );
      } else {
        downloadBlob(await res.blob(), `dietwithnoor-export-${Date.now()}.csv`);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Export data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download client records as CSV (opens in Excel) or JSON.
        </p>
      </div>

      {exportError && <InlineError message={exportError} />}

      <Card>
        <CardHeader>
          <CardTitle>Everyone</CardTitle>
          <CardDescription>Export every client currently in the portal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5 pt-0">
          <Button disabled={busy !== null} onClick={() => handleExport("csv", "all")}>
            {busy === "csv-all" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Button variant="outline" disabled={busy !== null} onClick={() => handleExport("json", "all")}>
            {busy === "json-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            Export JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected clients</CardTitle>
          <CardDescription>
            {selected.size === 0
              ? "Pick the clients you want to include."
              : `${selected.size} client${selected.size === 1 ? "" : "s"} selected.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5 pt-0">
          <div className="flex flex-wrap gap-2.5">
            <Button
              disabled={busy !== null || selected.size === 0}
              onClick={() => handleExport("csv", "selected")}
            >
              {busy === "csv-selected" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null || selected.size === 0}
              onClick={() => handleExport("json", "selected")}
            >
              {busy === "json-selected" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              Export JSON
            </Button>
            {selected.size > 0 && (
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            )}
          </div>

          {state === "error" ? (
            <ErrorState compact message={error} onRetry={load} />
          ) : state === "loading" ? (
            <div className="space-y-2 rounded-md border p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients to export"
              description="Once people sign up for the portal you'll be able to export their data here."
            />
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter clients"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-11 pr-11"
                    aria-label="Filter clients"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear filter"
                      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button variant="outline" onClick={toggleAllVisible} disabled={filtered.length === 0}>
                  {filtered.every((u) => selected.has(u.id)) ? "Deselect all" : "Select all"}
                </Button>
              </div>

              <div className="max-h-96 overflow-auto rounded-md border">
                {filtered.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Search}
                    title="No matches"
                    description="No client name or email matches that filter."
                  />
                ) : (
                  <ul className="divide-y divide-border/70">
                    {filtered.map((u) => (
                      <li key={u.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/60">
                          <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{u.full_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            {clientIdLabel(u.user_number)}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
