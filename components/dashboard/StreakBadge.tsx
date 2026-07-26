import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StreakBadge({ streak }: { streak: number }) {
  const lit = streak > 0;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            lit ? "bg-accent-soft text-accent" : "bg-muted text-muted-foreground"
          )}
        >
          <Flame className="h-5 w-5" strokeWidth={lit ? 2.2 : 1.8} />
        </div>
        <div className="mt-3">
          <p className="font-display text-2xl font-semibold leading-none tnum">{streak}</p>
          <p className="mt-1.5 text-xs leading-tight text-muted-foreground">
            day{streak === 1 ? "" : "s"} tracking streak
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
