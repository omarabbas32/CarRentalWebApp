import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { formatMoney } from "@/lib/pricing";
import type { BookingDto } from "@/types/api";

/**
 * `BookingDto` denormalises the car's make, model, year, colour and city, so a
 * list of bookings needs no per-row car fetch.
 *
 * It carries **no car image and no renter name** — only ids. Rather than firing
 * an N+1 to dress up a list row, the row shows what the payload actually has.
 * Adding `renterName` and a thumbnail to the DTO is on the backend fix list.
 */
export function BookingRow({ booking }: { booking: BookingDto }) {
  return (
    <li>
      <Link
        href={`/bookings/${booking.id}`}
        className="flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-md focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="text-h3">
              {booking.carMake} {booking.carModel}
            </h3>
            <BookingStatusBadge status={booking.status} />
          </div>

          <p className="text-caption tabular-nums text-muted-foreground">
            {formatDate(booking.startDate)} – {formatDate(booking.endDate)} ·{" "}
            {booking.carLocationCity}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-h3 tabular-nums">{formatMoney(booking.totalAmount)}</p>
          <p className="text-caption tabular-nums text-muted-foreground">
            {booking.totalDays} day{booking.totalDays === 1 ? "" : "s"}
          </p>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}
