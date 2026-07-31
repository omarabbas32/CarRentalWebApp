import type { BookingDto, GetBookingsResult } from "@/types/api";
import type { BookingStatus } from "@/lib/enums";
import { toUtcIso } from "@/lib/dates";
import { apiRequest } from "./client";

/**
 * `POST /api/bookings` — takes the car and the dates, and nothing else.
 *
 * `renterId` is read from the JWT server-side (`ICurrentUserService.UserId`),
 * as of commit 48f94d7. Do not send it; `CreateBookingCommand` has no such
 * field. The same goes for pricing — amounts are computed and snapshotted
 * server-side. The client never sends money.
 *
 * Requires the Renter, Admin or Staff role. Returns the new booking's id; the
 * booking lands in `Pending`, which is why the button says "Request this car".
 */
export function createBooking(carId: string, start: Date, end: Date) {
  return apiRequest<string>("createBooking", "/api/bookings", {
    method: "POST",
    body: {
      carId,
      startDate: toUtcIso(start),
      endDate: toUtcIso(end),
    },
  });
}

export type GetBookingsInput = {
  /** Filters, not identity — unlike on create, these are legitimately sent. */
  renterId?: string;
  ownerId?: string;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
  pageNumber?: number;
  pageSize?: number;
};

/**
 * `GET /api/bookings` — paged, ordered by newest first.
 *
 * `status` is a typed enum server-side and binds either a name or an int; the
 * int is sent here for consistency with request bodies.
 *
 * This endpoint has **no authorization** — any caller can read any booking by
 * passing a renter or owner id. Guard client-side and do not treat the filter
 * as a security boundary.
 */
export function getBookings(input: GetBookingsInput = {}) {
  return apiRequest<GetBookingsResult>("getBookings", "/api/bookings", {
    query: {
      renterId: input.renterId,
      ownerId: input.ownerId,
      status: input.status,
      startDate: input.startDate ? toUtcIso(input.startDate) : undefined,
      endDate: input.endDate ? toUtcIso(input.endDate) : undefined,
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
    },
  });
}

/** Also unauthenticated — returns any booking by id. Guard client-side. */
export function getBooking(id: string) {
  return apiRequest<BookingDto>("getBooking", `/api/bookings/${id}`);
}

/**
 * `cancelledByUserId` comes from the JWT — do not send it.
 *
 * The handler refuses a booking that is already `Cancelled` or is `Completed`,
 * so do not render a cancel control in those states: the only outcome is a 500.
 * No refund is computed anywhere, so none may be promised.
 */
export function cancelBooking(id: string, cancellationReason: string) {
  return apiRequest<void>("cancelBooking", `/api/bookings/${id}/cancel`, {
    method: "POST",
    body: { cancellationReason },
  });
}

/**
 * The pickup and return inspections post the same shape to different routes.
 * Only the mileage field name differs, which is why one component drives both.
 *
 * **Nothing here is validated server-side.** Fuel 0–100 and cleanliness 1–5 are
 * documented but unenforced; the client is the only guard.
 */
export type InspectionInput = {
  /** 0–100. */
  fuelLevel: number;
  /** 1–5. */
  cleanliness: number;
  hasDamage: boolean;
  damageDescription?: string;
};

/** Requires Owner, Admin or Staff. Accepts a `Pending` or `Confirmed` booking. */
export function startTrip(
  id: string,
  input: InspectionInput & { actualPickupDateTime: Date; startMileage: number },
) {
  return apiRequest<void>("startTrip", `/api/bookings/${id}/start`, {
    method: "POST",
    body: {
      actualPickupDateTime: toUtcIso(input.actualPickupDateTime),
      startMileage: input.startMileage,
      fuelLevel: input.fuelLevel,
      cleanliness: input.cleanliness,
      hasDamage: input.hasDamage,
      damageDescription: input.damageDescription ?? null,
    },
  });
}

/** Requires Owner, Admin or Staff. Only valid while the booking is InProgress. */
export function endTrip(
  id: string,
  input: InspectionInput & { actualReturnDateTime: Date; endMileage: number },
) {
  return apiRequest<void>("endTrip", `/api/bookings/${id}/end`, {
    method: "POST",
    body: {
      actualReturnDateTime: toUtcIso(input.actualReturnDateTime),
      endMileage: input.endMileage,
      fuelLevel: input.fuelLevel,
      cleanliness: input.cleanliness,
      hasDamage: input.hasDamage,
      damageDescription: input.damageDescription ?? null,
    },
  });
}
