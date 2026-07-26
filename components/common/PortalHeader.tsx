"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Shield, User as UserIcon, Home, Leaf, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAppUser } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { clientIdLabel, initialsOf, cn } from "@/lib/utils";

/**
 * Top bar shared by the client portal and the admin console, so the account
 * menu (and sign out) is reachable from every screen rather than only from
 * the Profile tab.
 */
export function PortalHeader({
  variant = "client",
  children,
}: {
  variant?: "client" | "admin";
  /** Optional section nav rendered beneath the bar (admin console tabs). */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { user, status } = useAppUser();
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin = user?.role === "admin";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/app/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl">
      <div className={cn("mx-auto px-4", variant === "admin" ? "max-w-6xl sm:px-6" : "max-w-md")}>
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand */}
          <Link href={variant === "admin" ? "/app/admin" : "/app/dashboard"} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight tracking-tight">
                Diet With Noor
              </span>
              {variant === "admin" && (
                <span className="block text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Admin console
                </span>
              )}
            </span>
          </Link>

          {/* Account menu */}
          {status === "ready" && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                    {initialsOf(user.full_name)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60">
                <div className="border-b px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{user.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {clientIdLabel(user.user_number)}
                  </p>
                </div>

                <div className="py-1">
                  {variant === "admin" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/app/dashboard" className="gap-2.5">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        Back to app
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/app/profile" className="gap-2.5">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        Your profile
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && variant !== "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/app/admin" className="gap-2.5">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Admin console
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleSignOut();
                    }}
                    className="gap-2.5 text-destructive hover:bg-destructive/10"
                  >
                    {signingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {signingOut ? "Signing out..." : "Log out"}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="h-8 w-8 shrink-0 rounded-full bg-muted" aria-hidden="true" />
          )}
        </div>

        {children}
      </div>
    </header>
  );
}
