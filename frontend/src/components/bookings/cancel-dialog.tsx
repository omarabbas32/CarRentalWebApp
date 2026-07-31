"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelBooking } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";

/**
 * Cancelling needs a reason, which the server stores on the booking.
 *
 * **No refund figure appears anywhere here.** The backend never computes
 * `refundAmount`, so any number shown would be invented — and inventing a
 * number attached to money is worse than saying nothing.
 *
 * This component is only rendered for statuses the handler accepts. It refuses
 * a booking that is already `Cancelled` or is `Completed`, so a control in
 * those states could only ever produce a 500.
 */
export function CancelBookingDialog({
  bookingId,
  onCancelled,
}: {
  bookingId: string;
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // `cancelledByUserId` comes from the JWT — not sent.
      await cancelBooking(bookingId, reason.trim());
      setOpen(false);
      onCancelled();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cancel this trip</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this trip?</DialogTitle>
          <DialogDescription>
            The owner will be told you cancelled. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Why are you cancelling?</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Plans changed, found something closer, …"
            rows={3}
          />
          <p className="text-caption text-muted-foreground">
            Shared with the owner.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Keep the trip
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
            {submitting ? "Cancelling…" : "Cancel trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
