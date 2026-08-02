import type {
  GetCarReviewsResult,
  GetUserReviewsResult,
  ReviewDto,
} from "@/types/api";
import { apiRequest } from "./client";

/**
 * Two-sided reviews on finished trips.
 *
 * The renter rates the owner and, through them, the car; the owner rates the
 * renter. One review per trip per direction, enforced by a unique index.
 *
 * A trip can only be reviewed once it is `Completed`, and **only the owner can
 * complete a trip** (`POST /api/bookings/{id}/end` is owner-only). If an owner
 * never ends a trip, the renter can never review it — do not write copy that
 * promises otherwise.
 */

/**
 * `POST /api/reviews` — rate the other party.
 *
 * Sends no reviewee and no direction: both are derived from which side of the
 * booking you are on. Returns the new review's id.
 *
 * Two refusals arrive as a **409 carrying the server's own wording**, which
 * the client passes through verbatim: reviewing a trip that has not finished,
 * and reviewing one you already rated.
 */
export function createReview(bookingId: string, rating: number, comment?: string) {
  return apiRequest<string>("createReview", "/api/reviews", {
    method: "POST",
    body: { bookingId, rating, comment: comment ?? null },
  });
}

/**
 * `GET /api/reviews/car/{carId}` — public, and renders on the car page.
 *
 * Being public is what lets the car page fetch this server-side, so reviews
 * are in the initial HTML and are indexable.
 *
 * Renter-to-owner reviews only; an owner's rating of a renter is not public
 * information about the car.
 */
export function getCarReviews(
  carId: string,
  input: { pageNumber?: number; pageSize?: number } = {},
) {
  return apiRequest<GetCarReviewsResult>(
    "getCarReviews",
    `/api/reviews/car/${carId}`,
    {
      query: { pageNumber: input.pageNumber, pageSize: input.pageSize },
      auth: false,
    },
  );
}

/**
 * `GET /api/reviews/user/{userId}` — a person's reputation, both directions.
 * Public, for the same reason as the car listing.
 */
export function getUserReviews(
  userId: string,
  input: { pageNumber?: number; pageSize?: number } = {},
) {
  return apiRequest<GetUserReviewsResult>(
    "getUserReviews",
    `/api/reviews/user/${userId}`,
    {
      query: { pageNumber: input.pageNumber, pageSize: input.pageSize },
      auth: false,
    },
  );
}

/**
 * `GET /api/reviews/booking/{bookingId}` — at most two rows, one per
 * direction. This is what tells the booking page whether to show the review
 * form or the rating already left.
 */
export function getBookingReviews(bookingId: string) {
  return apiRequest<ReviewDto[]>(
    "getBookingReviews",
    `/api/reviews/booking/${bookingId}`,
  );
}

/**
 * `DELETE /api/reviews/{id}` — moderation only, Admin and Staff.
 *
 * There is deliberately no path for a reviewee to delete a review about
 * themselves. Recomputes the car's rating afterwards.
 */
export function deleteReview(reviewId: string) {
  return apiRequest<void>("deleteReview", `/api/reviews/${reviewId}`, {
    method: "DELETE",
  });
}
