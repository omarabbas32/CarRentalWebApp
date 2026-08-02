import { Stars } from "@/components/reviews/stars";
import { formatRating, starDistribution } from "@/lib/reviews";
import type { ReviewDto } from "@/types/api";

/**
 * Average and distribution for a car.
 *
 * The average is computed from the reviews shown rather than read from
 * `car.averageRating`, so the headline always agrees with the list beneath it.
 * Two numbers from two sources on one page is how "these don't add up" bug
 * reports start.
 */
export function ReviewSummary({ reviews }: { reviews: readonly ReviewDto[] }) {
  const { counts, total, average } = starDistribution(reviews);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="shrink-0">
        <p className="text-display leading-none tabular-nums">
          {formatRating(average)}
        </p>
        <Stars rating={average} size="md" className="mt-2" />
        <p className="text-caption text-muted-foreground mt-1">
          {total} {total === 1 ? "review" : "reviews"}
        </p>
      </div>

      <ul className="min-w-0 flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = counts[star - 1];
          const percent = total === 0 ? 0 : (count / total) * 100;

          return (
            <li key={star} className="flex items-center gap-3">
              <span className="text-caption text-muted-foreground w-8 shrink-0 tabular-nums">
                {star}★
              </span>
              <span
                aria-hidden
                className="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-full"
              >
                <span
                  className="bg-status-pending block h-full rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-caption text-muted-foreground w-8 shrink-0 text-right tabular-nums">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
