"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppUser } from "@/types/index";

export default function AdminExportPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("users").select("*").order("full_name");
      setUsers(data ?? []);
    })();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExport(format: "csv" | "json", scope: "selected" | "all") {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: scope === "all" ? "all" : Array.from(selected), format }),
      });
      if (format === "json") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `dietwithnoor-export-${Date.now()}.json`);
      } else {
        const blob = await res.blob();
        downloadBlob(blob, `dietwithnoor-export-${Date.now()}.csv`);
      }
    } finally {
      setLoading(false);
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
      <h2 className="text-lg font-semibold">Export Data</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export All Users</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          <Button disabled={loading} onClick={() => handleExport("csv", "all")}>
            Export CSV / Excel
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => handleExport("json", "all")}>
            Export JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Selected Users ({selected.size})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex gap-2">
            <Button disabled={loading || selected.size === 0} onClick={() => handleExport("csv", "selected")}>
              Export CSV
            </Button>
            <Button variant="outline" disabled={loading || selected.size === 0} onClick={() => handleExport("json", "selected")}>
              Export JSON
            </Button>
          </div>
          <div className="max-h-80 space-y-1 overflow-auto rounded-lg border p-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                <span className="text-sm">
                  {u.full_name} <span className="text-muted-foreground">({u.email})</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
