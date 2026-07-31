import { Check, XCircle } from "lucide-react";
import {
  BOOKING_TIMELINE,
  BookingStatus,
  bookingStatusClasses,
  bookingStatusLabel,
} from "@/lib/enums";
import { cn } from "@/lib/utils";

/**
 * The lifecycle, mirroring the real state machine:
 * `Pending → Confirmed → InProgress → Completed`.
 *
 * `Cancelled` and `Disputed` **replace** the track rather than sitting on it.
 * They are not a fifth step — showing them as one would imply a booking passes
 * through cancellation on its way somewhere, which it does not.
 *
 * Nothing here is clickable. No endpoint moves a booking between these states
 * from the renter's side except cancel, which has its own control.
 */
export function BookingTimeline({ status }: { status: BookingStatus }) {
  const isTerminal =
    status === BookingStatus.Cancelled || status === BookingStatus.Disputed;

  if (isTerminal) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3",
          bookingStatusClasses[status],
        )}
      >
        <XCircle className="size-5 shrink-0" aria-hidden />
        <div>
          <p className="text-h3">{bookingStatusLabel[status]}</p>
          <p className="text-caption opacity-80">
            {status === BookingStatus.Cancelled
              ? "This trip will not go ahead."
              : "This trip is under review."}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = BOOKING_TIMELINE.indexOf(
    status as (typeof BOOKING_TIMELINE)[number],
  );

  return (
    <ol className="flex items-start">
      {BOOKING_TIMELINE.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const last = index === BOOKING_TIMELINE.length - 1;

        return (
          <li key={step} className={cn("flex-1", !last && "flex items-start")}>
            <div className="flex flex-1 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-caption tabular-nums",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary text-primary",
                  !done && !current && "border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-caption",
                  current ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {bookingStatusLabel[step]}
              </span>
              {current && <span className="sr-only">(current stage)</span>}
            </div>

            {!last && (
              <span
                className={cn("mt-3.5 h-0.5 flex-1", done ? "bg-primary" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
