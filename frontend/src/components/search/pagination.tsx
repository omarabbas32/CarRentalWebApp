import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchHref, type SearchState } from "@/lib/search-params";

/**
 * Server-side pagination — `pageNumber` is in the URL, so a refresh or a shared
 * link lands on the same page.
 *
 * Rendered as links rather than buttons so middle-click and open-in-new-tab
 * behave, and so it works without JavaScript.
 */
export function SearchPagination({
  state,
  totalPages,
  totalCount,
}: {
  state: SearchState;
  totalPages: number;
  totalCount: number;
}) {
  if (totalPages <= 1) return null;

  const page = Math.min(state.page, totalPages);

  return (
    <nav
      aria-label="Search results pages"
      className="flex items-center justify-between gap-4 border-t pt-6"
    >
      <Button variant="outline" size="sm" asChild disabled={page <= 1}>
        {page > 1 ? (
          <Link href={searchHref({ ...state, page: page - 1 })} rel="prev">
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Link>
        ) : (
          <span aria-disabled className="pointer-events-none opacity-50">
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </span>
        )}
      </Button>

      <p className="text-caption tabular-nums text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} car{totalCount === 1 ? "" : "s"}
      </p>

      <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
        {page < totalPages ? (
          <Link href={searchHref({ ...state, page: page + 1 })} rel="next">
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span aria-disabled className="pointer-events-none opacity-50">
            Next
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </Button>
    </nav>
  );
}
