"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CAR_FEATURES, CarCategory, carCategoryLabel, enumValues } from "@/lib/enums";
import {
  activeFilterCount,
  searchHref,
  type SearchState,
} from "@/lib/search-params";

/**
 * Filters offered here are exactly the ones `SearchCarsQueryHandler` acts on:
 * price range, category, the six feature flags, and minimum rating.
 *
 * **Transmission, fuel and seats are deliberately absent.** `DESIGN.md` §4.2
 * lists them, but `SearchCarsRequest` has no such parameters and the handler
 * ignores them — a control that appears to filter and does nothing is worse
 * than no control. They belong in the rail only once the API supports them.
 */
export function FilterControls({
  state,
  onNavigate,
}: {
  state: SearchState;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  // Price is a text input, so it is held locally and applied on commit rather
  // than pushing a new URL on every keystroke.
  const [minPrice, setMinPrice] = useState(state.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(state.maxPrice?.toString() ?? "");

  function go(next: Partial<SearchState>) {
    router.push(searchHref({ ...state, ...next, page: 1 }));
    onNavigate?.();
  }

  function applyPrice() {
    const min = minPrice.trim() === "" ? undefined : Number(minPrice);
    const max = maxPrice.trim() === "" ? undefined : Number(maxPrice);
    // The server 400s when min exceeds max; swap rather than surfacing an
    // error for something obviously meant the other way round.
    const [lo, hi] =
      min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
    go({ minPrice: Number.isFinite(lo!) ? lo : undefined, maxPrice: Number.isFinite(hi!) ? hi : undefined });
  }

  function toggleFeature(key: (typeof CAR_FEATURES)[number]["key"]) {
    const has = state.features.includes(key);
    go({
      features: has ? state.features.filter((f) => f !== key) : [...state.features, key],
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-label uppercase text-muted-foreground">Price per day</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="minPrice" className="text-caption">
              Min
            </Label>
            <Input
              id="minPrice"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={applyPrice}
              placeholder="Any"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="maxPrice" className="text-caption">
              Max
            </Label>
            <Input
              id="maxPrice"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={applyPrice}
              placeholder="Any"
            />
          </div>
          <Button type="button" variant="outline" onClick={applyPrice}>
            Apply
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-label uppercase text-muted-foreground">Category</h3>
        <div className="flex flex-wrap gap-2">
          {enumValues(CarCategory).map((value) => {
            const category = value as CarCategory;
            const selected = state.category === category;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => go({ category: selected ? undefined : category })}
                className={
                  selected
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-caption text-foreground"
                    : "rounded-full border px-3 py-1 text-caption text-muted-foreground hover:bg-accent"
                }
              >
                {carCategoryLabel[category]}
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-label uppercase text-muted-foreground">Features</h3>
        <ul className="space-y-2.5">
          {CAR_FEATURES.map((feature) => (
            <li key={feature.key} className="flex items-center gap-2.5">
              <Checkbox
                id={`feature-${feature.key}`}
                checked={state.features.includes(feature.key)}
                onCheckedChange={() => toggleFeature(feature.key)}
              />
              <Label htmlFor={`feature-${feature.key}`} className="font-normal">
                {feature.label}
              </Label>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-label uppercase text-muted-foreground">Rating</h3>
        <div className="flex flex-wrap gap-2">
          {[3, 4, 4.5].map((rating) => {
            const selected = state.minRating === rating;
            return (
              <button
                key={rating}
                type="button"
                aria-pressed={selected}
                onClick={() => go({ minRating: selected ? undefined : rating })}
                className={
                  selected
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-caption tabular-nums"
                    : "rounded-full border px-3 py-1 text-caption tabular-nums text-muted-foreground hover:bg-accent"
                }
              >
                {rating}+
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Desktop: a persistent rail. */
export function FilterRail({ state }: { state: SearchState }) {
  return (
    <aside aria-label="Filters" className="hidden w-64 shrink-0 lg:block">
      <FilterControls state={state} />
    </aside>
  );
}

/** Under 1024px: a sheet, with the active-filter count on the trigger. */
export function FilterSheet({ state }: { state: SearchState }) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(state);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {count > 0 && (
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">
          <FilterControls state={state} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
