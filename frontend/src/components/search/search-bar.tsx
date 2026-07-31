"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromDateInputValue, toDateInputValue, isValidSearchRange, MAX_SEARCH_RANGE_DAYS } from "@/lib/dates";
import { searchHref, type SearchState } from "@/lib/search-params";
import { cn } from "@/lib/utils";

/**
 * Where · From · Until · Search.
 *
 * Dates are **pre-filled** and cannot be cleared: `/api/cars/search` requires
 * both, so there is no date-less browse to fall back to. An empty date field
 * would produce an empty result set, which reads as a broken site rather than
 * as a prompt.
 */
export function SearchBar({
  initial,
  className,
}: {
  initial: Pick<SearchState, "city" | "start" | "end"> & Partial<SearchState>;
  className?: string;
}) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [from, setFrom] = useState(toDateInputValue(initial.start));
  const [to, setTo] = useState(toDateInputValue(initial.end));

  const start = fromDateInputValue(from);
  const end = fromDateInputValue(to);
  const rangeValid = start !== null && end !== null && isValidSearchRange(start, end);

  const rangeMessage =
    start && end && start >= end
      ? "The return date must be after the pick-up date."
      : start && end && !rangeValid
        ? `Searches cover at most ${MAX_SEARCH_RANGE_DAYS} days.`
        : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rangeValid) return;
    router.push(
      searchHref({
        ...initial,
        city: city.trim(),
        start,
        end,
        page: 1,
      }),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border bg-background p-3 shadow-sm",
        "grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end",
        className,
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="where" className="text-label uppercase text-muted-foreground">
          Where
        </Label>
        <Input
          id="where"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Any city"
          autoComplete="address-level2"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="from" className="text-label uppercase text-muted-foreground">
          From
        </Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to" className="text-label uppercase text-muted-foreground">
          Until
        </Label>
        <Input
          id="to"
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={!rangeValid} className="sm:mb-0">
        <Search className="size-4" aria-hidden />
        Search
      </Button>

      {rangeMessage && (
        <p role="alert" className="text-caption text-destructive sm:col-span-4">
          {rangeMessage}
        </p>
      )}
    </form>
  );
}
