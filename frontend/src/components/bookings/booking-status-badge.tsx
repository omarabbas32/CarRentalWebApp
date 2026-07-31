import { BookingStatus, bookingStatusClasses, bookingStatusLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";

/**
 * Dot + label + background, always all three.
 *
 * Colour is never the only signal — the pill reads in greyscale and for
 * colour-blind users because the label carries the meaning on its own.
 *
 * `Disputed` shares `Cancelled`'s colours by design (DESIGN.md §2); the labels
 * still distinguish them.
 */
export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium",
        bookingStatusClasses[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {bookingStatusLabel[status]}
    </span>
  );
}
