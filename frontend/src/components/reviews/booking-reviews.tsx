"use client";

import { Stars } from "@/components/reviews/stars";
import { ReviewForm } from "@/components/reviews/review-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/providers/auth-provider";
import { getBookingReviews } from "@/lib/api/reviews";
import { BookingStatus, ReviewType } from "@/lib/enums";
import { canReviewBooking, ownReview, reviewDirectionFor } from "@/lib/reviews";
import { useAsync } from "@/lib/use-async";
import type { BookingDto } from "@/types/api";

/**
 * The review section on a booking.
 *
 * Three states: the form, the review already left, or an explanation of why
 * neither applies. The gating is all in `lib/reviews.ts` so it can be checked
 * by `npm run verify:logic` rather than only by eye.
 */
export function BookingReviews({ booking }: { booking: BookingDto }) {
  const session = useSession();
  const state = useAsync(() => getBookingReviews(booking.id), [booking.id]);

  if (state.status === "loading") {
    return (
      <section className="space-y-3" aria-busy>
        <span className="sr-only">Loading reviews</span>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-full max-w-md" />
      </section>
    );
  }

  // Deliberately not an ErrorState. This is a secondary section on a page
  // whose primary content loaded fine, and a red panel here would read as
  // though the booking itself were broken.
  if (state.status === "error") return null;

  const reviews = state.data;
  const direction = reviewDirectionFor(booking, session);

  // Admin and Staff reading someone else's booking. They cannot review it, and
  // there is nothing useful to say to them here.
  if (direction === null) return null;

  const mine = ownReview(booking, session, reviews);
  const theirs = reviews.find((r) => r.type !== direction) ?? null;
  const canReview = canReviewBooking(booking, session, reviews);

  return (
    <section className="space-y-6" aria-label="Reviews">
      <h2 className="text-h2">Reviews</h2>

      {mine ? (
        <div className="space-y-2">
          <p className="text-h3">Your review</p>
          <Stars rating={mine.rating} />
          {mine.comment && (
            <p className="text-body max-w-prose whitespace-pre-wrap">
              {mine.comment}
            </p>
          )}
          <p className="text-caption text-muted-foreground">
            Reviews can&rsquo;t be edited once posted.
          </p>
        </div>
      ) : canReview ? (
        <ReviewForm bookingId={booking.id} onCreated={state.reload} />
      ) : (
        <p className="text-body text-muted-foreground max-w-prose">
          {waitingCopy(booking.status)}
        </p>
      )}

      {theirs && (
        <div className="space-y-2 border-t pt-6">
          <p className="text-h3">
            {theirs.type === ReviewType.RenterToOwner
              ? "What the renter said"
              : "What the owner said"}
          </p>
          <Stars rating={theirs.rating} />
          {theirs.comment && (
            <p className="text-body max-w-prose whitespace-pre-wrap">
              {theirs.comment}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Why the form is not showing.
 *
 * Careful with the wording for an unfinished trip: only the owner can end one
 * (`POST /api/bookings/{id}/end` is owner-only), so promising the renter they
 * can review "after your trip" is a promise the product cannot keep on its
 * own. It says who has to act.
 */
function waitingCopy(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.Cancelled:
      return "This trip was cancelled, so there's nothing to review.";
    case BookingStatus.Pending:
    case BookingStatus.Confirmed:
      return "You'll be able to leave a review once the trip has been completed.";
    case BookingStatus.InProgress:
      return "You can leave a review once the owner records the return.";
    default:
      return "There's nothing to review yet.";
  }
}
