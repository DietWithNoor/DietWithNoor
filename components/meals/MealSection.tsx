"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/error-state";
import { MealFormDialog } from "@/components/meals/MealFormDialog";
import { deleteMeal, sumMacros } from "@/lib/db";
import { cn, formatNumber, formatTime, round1 } from "@/lib/utils";
import type { MealType, MealWithItems } from "@/types/index";

/**
 * One Breakfast / Lunch / Dinner / Snacks block. Empty sections keep their own
 * inline empty state with an add CTA rather than disappearing.
 */
export function MealSection({
  mealType,
  label,
  icon: Icon,
  meals,
  userId,
  day,
  onChanged,
}: {
  mealType: MealType;
  label: string;
  icon: LucideIcon;
  meals: MealWithItems[];
  userId: string;
  day: string;
  onChanged: () => void;
}) {
  const totals = sumMacros(meals.flatMap((m) => m.meal_items ?? []));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
          {meals.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground tnum">
              {formatNumber(totals.calories)} kcal
            </span>
          )}
        </div>

        <MealFormDialog
          userId={userId}
          defaultMealType={mealType}
          defaultDate={day}
          onSaved={onChanged}
          trigger={
            <button
              aria-label={`Add ${label.toLowerCase()}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </button>
          }
        />
      </div>

      {meals.length === 0 ? (
        <MealFormDialog
          userId={userId}
          defaultMealType={mealType}
          defaultDate={day}
          onSaved={onChanged}
          trigger={
            <button className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Plus className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Add {label.toLowerCase()}</span>
                <span className="block text-xs text-muted-foreground">Nothing logged yet</span>
              </span>
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} userId={userId} day={day} onChanged={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function MealCard({
  meal,
  userId,
  day,
  onChanged,
}: {
  meal: MealWithItems;
  userId: string;
  day: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = sumMacros(meal.meal_items ?? []);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteMeal(meal.id);
      setConfirmingDelete(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this meal");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{formatTime(meal.logged_at)}</p>
                <ul className="mt-1.5 space-y-1">
                  {(meal.meal_items ?? []).map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{item.food_name}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ×{round1(item.quantity)}
                        </span>
                      </span>
                      {item.calories != null && (
                        <span className="shrink-0 text-xs font-medium text-muted-foreground tnum">
                          {formatNumber(item.calories)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {meal.notes && (
                  <p className="mt-2 rounded-sm bg-muted/60 px-2.5 py-1.5 text-xs italic leading-relaxed text-muted-foreground">
                    {meal.notes}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-base font-semibold leading-none tnum">
                  {formatNumber(totals.calories)}
                  <span className="ml-0.5 text-[10px] font-medium uppercase text-muted-foreground">kcal</span>
                </span>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setEditing(true)}
                    aria-label="Edit meal"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    aria-label="Delete meal"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {(totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0) && (
              <div className="mt-3 flex gap-3 border-t border-border/60 pt-2.5 text-[11px] font-medium text-muted-foreground">
                <MacroInline label="P" value={totals.protein_g} className="text-fresh" />
                <MacroInline label="C" value={totals.carbs_g} className="text-accent" />
                <MacroInline label="F" value={totals.fat_g} className="text-berry" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <MealFormDialog
        userId={userId}
        meal={meal}
        defaultDate={day}
        open={editing}
        onOpenChange={setEditing}
        onSaved={onChanged}
      />

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this meal?</DialogTitle>
            <DialogDescription>
              This removes the meal and all {(meal.meal_items ?? []).length} of its items. It can&rsquo;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          {error && <InlineError message={error} />}
          <div className="mt-2 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MacroInline({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <span className="tnum">
      <span className={cn("font-bold", className)}>{label}</span> {formatNumber(value, 1)}g
    </span>
  );
}
