"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { InlineError } from "@/components/ui/error-state";
import { FoodPicker } from "@/components/meals/FoodPicker";
import {
  createMeal,
  updateMeal,
  addMealItems,
  updateMealItem,
  deleteMealItem,
  sumMacros,
} from "@/lib/db";
import { formatNumber, toLocalDateTimeInput, round1 } from "@/lib/utils";
import type { DraftMealItem, MealType, MealWithItems } from "@/types/index";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

/** An item in the editor: `id` present means it already exists in the DB. */
interface EditableItem extends DraftMealItem {
  id?: string;
  /** Stable key for React while the row is unsaved. */
  key: string;
}

export function MealFormDialog({
  userId,
  trigger,
  onSaved,
  /** Pre-selects the meal type when adding from a specific section. */
  defaultMealType = "breakfast",
  /** The local day being viewed (YYYY-MM-DD) — new meals default to this date. */
  defaultDate,
  /** Present = edit mode. */
  meal,
  open: controlledOpen,
  onOpenChange,
}: {
  userId: string;
  trigger?: React.ReactNode;
  onSaved: () => void;
  defaultMealType?: MealType;
  defaultDate?: string;
  meal?: MealWithItems;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(meal);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [loggedAt, setLoggedAt] = useState(() => defaultLoggedAt(defaultDate));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Re)seed the form whenever it opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setPicking(false);
    setRemovedIds([]);

    if (meal) {
      setMealType(meal.meal_type);
      setLoggedAt(toLocalDateTimeInput(new Date(meal.logged_at)));
      setNotes(meal.notes ?? "");
      setItems(
        (meal.meal_items ?? []).map((i) => ({
          id: i.id,
          key: i.id,
          food_name: i.food_name,
          quantity: i.quantity,
          unit: i.unit,
          calories: i.calories,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
        }))
      );
    } else {
      setMealType(defaultMealType);
      setLoggedAt(defaultLoggedAt(defaultDate));
      setNotes("");
      setItems([]);
    }
  }, [open, meal, defaultMealType, defaultDate]);

  const totals = useMemo(() => sumMacros(items), [items]);

  function addItem(item: DraftMealItem) {
    setItems((prev) => [...prev, { ...item, key: `${Date.now()}-${prev.length}` }]);
    setPicking(false);
  }

  function removeItem(target: EditableItem) {
    if (target.id) setRemovedIds((ids) => [...ids, target.id!]);
    setItems((prev) => prev.filter((i) => i.key !== target.key));
  }

  async function handleSave() {
    if (items.length === 0) {
      setError("Add at least one food item to this meal.");
      return;
    }
    setSaving(true);
    setError(null);

    const isoLoggedAt = new Date(loggedAt).toISOString();
    const toDraft = (i: EditableItem): DraftMealItem => ({
      food_name: i.food_name,
      quantity: i.quantity,
      unit: i.unit,
      calories: i.calories,
      protein_g: i.protein_g,
      carbs_g: i.carbs_g,
      fat_g: i.fat_g,
    });

    try {
      if (meal) {
        await updateMeal(meal.id, { mealType, loggedAt: isoLoggedAt, notes: notes || null });
        // Diff rather than delete-all-and-reinsert, so untouched rows keep their ids.
        await Promise.all(removedIds.map((id) => deleteMealItem(id)));
        await Promise.all(items.filter((i) => i.id).map((i) => updateMealItem(i.id!, toDraft(i))));
        await addMealItems(meal.id, items.filter((i) => !i.id).map(toDraft));
      } else {
        await createMeal({
          userId,
          mealType,
          loggedAt: isoLoggedAt,
          notes: notes || null,
          items: items.map(toDraft),
        });
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this meal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {picking ? "Add a food item" : isEdit ? "Edit meal" : "Log a meal"}
          </DialogTitle>
          <DialogDescription>
            {picking
              ? "Search our food list or enter your own."
              : "Set when you ate, then add everything that was on the plate."}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed render, not AnimatePresence mode="wait" — the latter deadlocks
            under React StrictMode and strands the outgoing panel. */}
        <>
          {picking ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FoodPicker onAdd={addItem} onCancel={() => setPicking(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {error && <InlineError message={error} />}

              <div className="space-y-1.5">
                <Label>Meal</Label>
                <Segmented
                  size="sm"
                  ariaLabel="Meal type"
                  options={MEAL_TYPES}
                  value={mealType}
                  onChange={setMealType}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mealLoggedAt">Date &amp; time</Label>
                <Input
                  id="mealLoggedAt"
                  type="datetime-local"
                  value={loggedAt}
                  onChange={(e) => setLoggedAt(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Items ({items.length})</Label>
                  {items.length > 0 && (
                    <span className="text-sm font-semibold tnum">
                      {formatNumber(totals.calories)} kcal
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <button
                    onClick={() => setPicking(true)}
                    className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-7 text-center transition-colors hover:border-primary/40 hover:bg-muted"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
                      <UtensilsCrossed className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span className="text-sm font-semibold">Nothing added yet</span>
                    <span className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                      Add the foods that made up this meal to see its calories and macros.
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <Plus className="h-4 w-4" />
                      Add food
                    </span>
                  </button>
                ) : (
                  <>
                    <ul className="mt-2 divide-y divide-border/70 rounded-md border">
                      {items.map((item) => (
                        <li key={item.key} className="flex items-center gap-3 px-3.5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.food_name}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {round1(item.quantity)}
                              {item.unit ? ` × ${item.unit}` : " serving"}
                              {item.calories != null && ` · ${formatNumber(item.calories)} kcal`}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item)}
                            aria-label={`Remove ${item.food_name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>

                    <Button variant="outline" className="mt-2.5 w-full" onClick={() => setPicking(true)}>
                      <Plus className="h-4 w-4" />
                      Add another item
                    </Button>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <TotalChip label="Protein" value={totals.protein_g} />
                      <TotalChip label="Carbs" value={totals.carbs_g} />
                      <TotalChip label="Fat" value={totals.fat_g} />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mealNotes">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="mealNotes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ate out, felt very full afterwards..."
                />
              </div>

              <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : isEdit ? "Save changes" : "Save meal"}
              </Button>
            </motion.div>
          )}
        </>
      </DialogContent>
    </Dialog>
  );
}

function TotalChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum">{formatNumber(value, 1)}g</p>
    </div>
  );
}

/**
 * New meals default to *now*, but if the user is looking at a past day we keep
 * that day and just use the current clock time.
 */
function defaultLoggedAt(day?: string) {
  const now = new Date();
  if (!day) return toLocalDateTimeInput(now);
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(now);
  target.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  return toLocalDateTimeInput(target);
}
