"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Download, ArrowLeft, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/app/admin/export", label: "Export", icon: Download, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold leading-tight tracking-tight">
                Diet With Noor
              </p>
              <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Admin console
              </p>
            </div>
          </div>

          <Link
            href="/app/dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to app</span>
          </Link>
        </div>

        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none" aria-label="Admin sections">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
