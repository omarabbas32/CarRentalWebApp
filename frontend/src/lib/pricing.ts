import { daysBetween } from "@/lib/dates";

/**
 * The single source of the pricing arithmetic.
 *
 * The client never sends money — amounts are computed and snapshotted
 * server-side in `CreateBookingCommandHandler`. This module exists so the quote
 * shown before submit matches the booking that comes back, and it mirrors that
 * handler exactly:
 *
 *   subtotal    = totalDays * car.PricePerDay
 *   serviceFee  = subtotal * 0.10
 *   taxAmount   = subtotal * 0.05
 *   totalAmount = subtotal + serviceFee + taxAmount + car.SecurityDeposit
 *
 * Nothing else in the app may compute a price. Two implementations of this
 * formula is one implementation too many — they will drift, and the user will
 * be quoted one number and charged another.
 *
 * After a booking returns, re-render from the returned `BookingDto`. The server
 * is the authority; this only removes the surprise.
 */

export const SERVICE_FEE_RATE = 0.1;
export const TAX_RATE = 0.05;

export type PriceBreakdown = {
  totalDays: number;
  pricePerDay: number;
  subtotal: number;
  serviceFee: number;
  taxAmount: number;
  securityDeposit: number;
  /** Includes the deposit, matching `BookingDto.totalAmount`. */
  total: number;
};

export function priceBreakdown(
  pricePerDay: number,
  securityDeposit: number,
  start: Date,
  end: Date,
): PriceBreakdown {
  const totalDays = daysBetween(start, end);
  const subtotal = totalDays * pricePerDay;
  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const taxAmount = subtotal * TAX_RATE;

  return {
    totalDays,
    pricePerDay,
    subtotal,
    serviceFee,
    taxAmount,
    securityDeposit,
    total: subtotal + serviceFee + taxAmount + securityDeposit,
  };
}

/**
 * The same breakdown, read back off a booking the server has already priced.
 * Prefer this over recomputing once a booking exists.
 */
export function breakdownFromBooking(booking: {
  totalDays: number;
  pricePerDay: number;
  subTotal: number;
  serviceFee: number;
  taxAmount: number;
  securityDeposit: number;
  totalAmount: number;
}): PriceBreakdown {
  return {
    totalDays: booking.totalDays,
    pricePerDay: booking.pricePerDay,
    subtotal: booking.subTotal,
    serviceFee: booking.serviceFee,
    taxAmount: booking.taxAmount,
    securityDeposit: booking.securityDeposit,
    total: booking.totalAmount,
  };
}

/**
 * The API returns bare numbers with no currency field, and the backend never
 * records one. Formatting is therefore a presentation choice, kept in one place
 * so it can be changed once when a currency does arrive.
 */
export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}
