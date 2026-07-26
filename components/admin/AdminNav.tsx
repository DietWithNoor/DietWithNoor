"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Download } from "lucide-react";
import { PortalHeader } from "@/components/common/PortalHeader";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/app/admin/export", label: "Export", icon: Download, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <PortalHeader variant="admin">
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
    </PortalHeader>
  );
}
