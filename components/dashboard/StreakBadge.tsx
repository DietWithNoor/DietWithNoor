import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{streak} day{streak === 1 ? "" : "s"}</p>
          <p className="text-xs text-muted-foreground">Tracking streak</p>
        </div>
      </CardContent>
    </Card>
  );
}
