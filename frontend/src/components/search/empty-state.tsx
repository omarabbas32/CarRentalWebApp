import Link from "next/link";
import { CalendarRange, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchHref, withWiderDates, withoutFilters, activeFilterCount, type SearchState } from "@/lib/search-params";

/**
 * Two one-click repairs, not an apology.
 *
 * City matching is exact and lowercased server-side, so a typo returns zero
 * results with no near-miss fallback — the user needs a way out that does not
 * involve guessing what they got wrong.
 */
export function SearchEmptyState({ state }: { state: SearchState }) {
  const hasFilters = activeFilterCount(state) > 0;

  return (
    <div className="col-span-full flex flex-col items-center gap-5 rounded-xl border border-dashed px-6 py-16 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />

      <div className="space-y-2">
        <h2 className="text-h2">No cars free on those dates</h2>
        <p className="max-w-prose text-muted-foreground">
          {state.city
            ? `Nothing in ${state.city} matches. City names have to match exactly, so it is worth checking the spelling.`
            : "Nothing matches this search."}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={searchHref(withWiderDates(state))}>
            <CalendarRange className="size-4" aria-hidden />
            Widen the dates
          </Link>
        </Button>

        {hasFilters && (
          <Button variant="outline" asChild>
            <Link href={searchHref(withoutFilters(state))}>Clear filters</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
