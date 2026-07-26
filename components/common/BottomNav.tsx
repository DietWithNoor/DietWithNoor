"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, TrendingUp, UtensilsCrossed, HeartPulse, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Five items is the maximum for a bottom bar. At 375px each slot is ~75px,
 * which still clears the 44px tap-target minimum with room for the label.
 */
const items = [
  { href: "/app/dashboard", label: "Home", icon: Home },
  { href: "/app/progress", label: "Progress", icon: TrendingUp },
  { href: "/app/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/app/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-1 px-0.5 pb-2 pt-2.5 transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-3 top-0 h-[3px] rounded-full bg-primary"
                />
              )}
              <span
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-lg transition-colors duration-200",
                  active && "bg-primary/[0.08]"
                )}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span
                className={cn(
                  "text-[10.5px] leading-none tracking-tight",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
