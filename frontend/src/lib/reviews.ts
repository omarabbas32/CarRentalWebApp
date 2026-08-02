import { BookingStatus, ReviewType, UserRole } from "@/lib/enums";
import type { BookingDto, ReviewDto } from "@/types/api";

/**
 * Review rules that decide what the UI offers.
 *
 * Same reasoning as `lib/bookings.ts`: these mirror guards in
 * `CreateReviewCommandHandler`, they live here so `npm run verify:logic` can
 * exercise them, and getting one wrong means rendering a form whose only
 * outcome is a 409.
 */

type Participant = { userId: string; role: UserRole } | null;

/**
 * Which direction this person's review would be, or `null` if they have no
 * side in the trip.
 *
 * Admin and Staff get `null` deliberately. `BookingAccess.EnsureThreadParticipant`
 * — which reviews use, unlike the read paths — does **not** exempt them: a
 * review has a reviewer and a reviewee, and a third party is neither. Support
 * can read reviews; it cannot leave them.
 */
export function reviewDirectionFor(
  booking: Pick<BookingDto, "renterId" | "ownerId">,
  session: Participant,
): ReviewType | null {
  if (!session) return null;
  if (session.userId === booking.renterId) return ReviewType.RenterToOwner;
  if (session.userId === booking.ownerId) return ReviewType.OwnerToRenter;
  return null;
}

/**
 * Whether to show the review form.
 *
 * Three conditions, all server-enforced:
 *   - the caller is one of the two participants;
 *   - the trip is `Completed` — the only status that means a trip happened,
 *     and reachable only through the owner calling `/end`;
 *   - they have not already reviewed in their direction.
 */
export function canReviewBooking(
  booking: Pick<BookingDto, "renterId" | "ownerId" | "status">,
  session: Participant,
  existingReviews: readonly Pick<ReviewDto, "type">[],
): boolean {
  const direction = reviewDirectionFor(booking, session);
  if (direction === null) return false;
  if (booking.status !== BookingStatus.Completed) return false;
  return !existingReviews.some((r) => r.type === direction);
}

/**
 * The review this person already left, if any — what the booking page shows in
 * place of the form.
 */
export function ownReview(
  booking: Pick<BookingDto, "renterId" | "ownerId">,
  session: Participant,
  reviews: readonly ReviewDto[],
): ReviewDto | null {
  const direction = reviewDirectionFor(booking, session);
  if (direction === null) return null;
  return reviews.find((r) => r.type === direction) ?? null;
}

export type StarDistribution = {
  /** Index 0 is one star, index 4 is five. */
  counts: [number, number, number, number, number];
  total: number;
  average: number;
};

/**
 * The bar chart on a car page.
 *
 * `average` is computed here rather than read from `car.averageRating` so the
 * summary always agrees with the reviews rendered beside it — a page showing
 * one page of reviews and a lifetime average from another source invites the
 * "these don't add up" bug report.
 */
export function starDistribution(
  reviews: readonly Pick<ReviewDto, "rating">[],
): StarDistribution {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const review of reviews) {
    // Ratings outside 1–5 cannot come from the validator, but a hand-edited
    // row should not corrupt the chart or land in a nonexistent bucket.
    const rating = Math.round(review.rating);
    if (rating < 1 || rating > 5) continue;
    counts[rating - 1] += 1;
    sum += rating;
  }

  const total = counts.reduce((a, b) => a + b, 0);
  return {
    counts,
    total,
    average: total === 0 ? 0 : sum / total,
  };
}

/**
 * One decimal place, and never "4.0" where "4" reads better.
 */
export function formatRating(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
