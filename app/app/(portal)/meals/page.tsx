"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sunrise, Sun, Moon, Cookie, UtensilsCrossed, Plus } from "lucide-react";
import { useAppUser } from "@/lib/auth-context";
import { getMealsForDate, sumMealMacros } from "@/lib/db";
import { todayISO, friendlyDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { StickyAction } from "@/components/common/StickyAction";
import { DateNav } from "@/components/meals/DateNav";
import { DayTotals } from "@/components/meals/DayTotals";
import { MealSection } from "@/components/meals/MealSection";
import { MealFormDialog } from "@/components/meals/MealFormDialog";
import type { MealType, MealWithItems } from "@/types/index";

const SECTIONS: { type: MealType; label: string; icon: typeof Sunrise }[] = [
  { type: "breakfast", label: "Breakfast", icon: Sunrise },
  { type: "lunch", label: "Lunch", icon: Sun },
  { type: "dinner", label: "Dinner", icon: Moon },
  { type: "snack", label: "Snacks", icon: Cookie },
];

type LoadState = "loading" | "error" | "ready";

export default function MealsPage() {
  const { user, status: authStatus } = useAppUser();
  const [day, setDay] = useState(() => todayISO());
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setError(null);
    try {
      setMeals(await getMealsForDate(user.id, day));
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your meals");
      setState("error");
    }
  }, [user, day]);

  useEffect(() => {
    if (authStatus === "ready") load();
  }, [authStatus, load]);

  const totals = useMemo(() => sumMealMacros(meals), [meals]);
  const byType = useMemo(() => {
    const map: Record<MealType, MealWithItems[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const meal of meals) map[meal.meal_type]?.push(meal);
    return map;
  }, [meals]);

  if (authStatus === "loading") return <MealsSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeader title="Meals" description="What you ate, and what it added up to." />

      <DateNav date={day} onChange={setDay} />

      {state === "error" ? (
        <ErrorState message={error} onRetry={load} />
      ) : state === "loading" ? (
        <MealsBodySkeleton />
      ) : meals.length === 0 ? (
        <Card>
          <EmptyState
            tone="accent"
            icon={UtensilsCrossed}
            title={`Nothing logged ${friendlyDate(day).toLowerCase() === "today" ? "yet today" : `on ${friendlyDate(day)}`}`}
            description="Log what you ate to track calories and macros. Search our food list or add your own."
            action={
              user ? (
                <MealFormDialog
                  userId={user.id}
                  defaultDate={day}
                  onSaved={load}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4" />
                      Log your first meal
                    </Button>
                  }
                />
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <DayTotals totals={totals} mealCount={meals.length} />
          <div className="space-y-5 pt-1">
            {SECTIONS.map(({ type, label, icon }) => (
              <MealSection
                key={type}
                mealType={type}
                label={label}
                icon={icon}
                meals={byType[type]}
                userId={user!.id}
                day={day}
                onChanged={load}
              />
            ))}
          </div>
        </>
      )}

      {user && state === "ready" && meals.length > 0 && (
        <MealFormDialog
          userId={user.id}
          defaultDate={day}
          onSaved={load}
          trigger={<StickyAction label="Add Meal" />}
        />
      )}
    </div>
  );
}

function MealsBodySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-11 w-40" />
        <Skeleton className="mt-4 h-2 w-full" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-[62px] w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function MealsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-11 w-full rounded-md" />
      <MealsBodySkeleton />
    </div>
  );
}
