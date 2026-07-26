"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, PencilLine, ArrowLeft, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { searchFoods } from "@/lib/db";
import { formatNumber, round1 } from "@/lib/utils";
import type { DraftMealItem, Food } from "@/types/index";

type Mode = "search" | "custom";

/**
 * Two ways in: a debounced `ilike` search over the shared `foods` table that
 * prefills macros, or a free-text custom item. Selecting a food opens a
 * quantity step where the macros scale live with the multiplier.
 */
export function FoodPicker({
  onAdd,
  onCancel,
}: {
  onAdd: (item: DraftMealItem) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);

  const requestId = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    const id = ++requestId.current;
    setSearching(true);
    setError(null);
    try {
      const data = await searchFoods(term);
      if (id !== requestId.current) return; // a newer keystroke already won
      setResults(data);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Couldn't search foods");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }, []);

  // Debounce keystrokes so we aren't firing a query per character.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  if (selected) {
    return <QuantityStep food={selected} onBack={() => setSelected(null)} onAdd={onAdd} />;
  }

  return (
    <div>
      <Segmented
        size="sm"
        ariaLabel="How to add an item"
        options={[
          { value: "search", label: "Search foods" },
          { value: "custom", label: "Custom item" },
        ]}
        value={mode}
        onChange={(m) => setMode(m as Mode)}
      />

      {mode === "search" ? (
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'roti', 'chicken', 'daal'..."
              className="pl-11 pr-11"
              aria-label="Search foods"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 max-h-[46vh] overflow-y-auto">
            {error ? (
              <InlineError message={error} onRetry={() => runSearch(query)} />
            ) : searching ? (
              <div className="space-y-2 pt-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                compact
                tone="accent"
                icon={Search}
                title="No matches"
                description={`We don't have "${query}" in the food list yet — add it as a custom item instead.`}
                action={
                  <Button size="sm" variant="outline" onClick={() => setMode("custom")}>
                    <PencilLine className="h-4 w-4" />
                    Add custom item
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {results.map((food) => (
                  <li key={food.id}>
                    <button
                      onClick={() => setSelected(food)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{food.name}</span>
                        {food.serving_desc && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {food.serving_desc}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tnum">
                          {formatNumber(food.calories)}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          kcal
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <CustomItemForm onAdd={onAdd} />
      )}

      <Button variant="ghost" className="mt-4 w-full" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuantityStep({
  food,
  onBack,
  onAdd,
}: {
  food: Food;
  onBack: () => void;
  onAdd: (item: DraftMealItem) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  const scale = (value: number | null) => (value == null ? null : round1(value * quantity));

  const totals = {
    calories: scale(food.calories),
    protein_g: scale(food.protein_g),
    carbs_g: scale(food.carbs_g),
    fat_g: scale(food.fat_g),
  };

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <button
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </button>

      <div className="mt-4">
        <h3 className="text-lg font-semibold leading-tight">{food.name}</h3>
        {food.serving_desc && <p className="mt-0.5 text-sm text-muted-foreground">{food.serving_desc}</p>}
      </div>

      <div className="mt-5">
        <Label>Servings</Label>
        <div className="mt-1.5 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Decrease servings"
            onClick={() => setQuantity((q) => Math.max(0.25, round1(q - 0.5)))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0.25"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
            className="h-12 flex-1 text-center text-xl font-semibold tabular-nums sm:text-xl"
            aria-label="Number of servings"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Increase servings"
            onClick={() => setQuantity((q) => round1(q + 0.5))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-muted/60 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-semibold tnum">
            {formatNumber(totals.calories)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">kcal</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MacroChip label="Protein" value={totals.protein_g} />
          <MacroChip label="Carbs" value={totals.carbs_g} />
          <MacroChip label="Fat" value={totals.fat_g} />
        </div>
      </div>

      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={() =>
          onAdd({
            food_name: food.name,
            quantity,
            unit: food.serving_desc,
            calories: totals.calories,
            protein_g: totals.protein_g,
            carbs_g: totals.carbs_g,
            fat_g: totals.fat_g,
          })
        }
      >
        Add to meal
      </Button>
    </motion.div>
  );
}

function MacroChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-sm bg-card px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum">{value == null ? "--" : `${formatNumber(value, 1)}g`}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CustomItemForm({ onAdd }: { onAdd: (item: DraftMealItem) => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const num = (v: string) => {
    const parsed = parseFloat(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      food_name: name.trim(),
      quantity: num(quantity) ?? 1,
      unit: unit.trim() || null,
      calories: num(calories),
      protein_g: num(protein),
      carbs_g: num(carbs),
      fat_g: num(fat),
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="customName">Food name</Label>
        <Input
          id="customName"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aunty's chicken pulao"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="customQty">Quantity</Label>
          <Input
            id="customQty"
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0.25"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="customUnit">Unit</Label>
          <Input
            id="customUnit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="bowl, plate..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customCalories">
          Calories <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="customCalories"
          type="number"
          inputMode="numeric"
          min="0"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="350"
        />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="customProtein" className="text-xs">
            Protein (g)
          </Label>
          <Input
            id="customProtein"
            type="number"
            inputMode="decimal"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customCarbs" className="text-xs">
            Carbs (g)
          </Label>
          <Input
            id="customCarbs"
            type="number"
            inputMode="decimal"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customFat" className="text-xs">
            Fat (g)
          </Label>
          <Input
            id="customFat"
            type="number"
            inputMode="decimal"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!name.trim()}>
        Add to meal
      </Button>
    </form>
  );
}

