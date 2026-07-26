import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "accent" | "fresh" | "berry";
  loading?: boolean;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent-soft text-accent-foreground",
    fresh: "bg-fresh-soft text-fresh",
    berry: "bg-berry-soft text-berry",
  } as const;

  return (
    <Card>
      <CardContent className="p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>

        {loading ? (
          <Skeleton className="mt-3.5 h-8 w-16" />
        ) : (
          <p className="mt-3.5 font-display text-3xl font-semibold leading-none tracking-tight tnum">{value}</p>
        )}

        <p className="mt-2 text-[13px] font-medium leading-tight text-muted-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
      </CardContent>
    </Card>
  );
}
