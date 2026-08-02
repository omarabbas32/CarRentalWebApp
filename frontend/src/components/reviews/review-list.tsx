import { Stars } from "@/components/reviews/stars";
import type { ReviewDto } from "@/types/api";

/**
 * Reviews as prose. No card chrome — a review is a person's sentence, and
 * boxing each one makes ten of them read as a table.
 */
export function ReviewList({ reviews }: { reviews: readonly ReviewDto[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-body text-muted-foreground max-w-prose">
        No reviews yet. The first one lands after a completed trip.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {reviews.map((review) => (
        <li key={review.id} className="py-5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-h3">
              {review.reviewerFirstName} {review.reviewerLastName.charAt(0)}.
            </span>
            <Stars rating={review.rating} />
            <time
              dateTime={review.createdAt}
              className="text-caption text-muted-foreground ml-auto tabular-nums"
            >
              {new Date(review.createdAt).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>

          {review.comment && (
            <p className="text-body mt-2 max-w-prose whitespace-pre-wrap">
              {review.comment}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
