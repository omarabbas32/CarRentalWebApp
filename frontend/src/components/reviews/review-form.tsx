"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/errors";
import { createReview } from "@/lib/api/reviews";
import { cn } from "@/lib/utils";

/**
 * Leaving a review.
 *
 * The two refusals worth knowing arrive as a 409 carrying the server's own
 * wording — reviewing a trip that has not finished, and reviewing one already
 * rated — and the client passes that text straight through. It reads better
 * than anything derivable from a status code.
 */
export function ReviewForm({
  bookingId,
  onCreated,
}: {
  bookingId: string;
  onCreated: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [showLocalErrors, setShowLocalErrors] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowLocalErrors(true);

    if (rating < 1 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await createReview(bookingId, rating, comment.trim() || undefined);
      // The form disappears once this succeeds, so the confirmation has to
      // come from somewhere — this is one of the few places a toast earns its
      // place rather than duplicating something already on screen.
      toast.success("Thanks — your review is live");
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError({
              status: 0,
              operation: "createReview",
              message: "We couldn't save your review.",
            }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const serverRatingErrors = error?.fieldErrors?.rating;
  const ratingErrors =
    serverRatingErrors ??
    (showLocalErrors && rating < 1
      ? ["Choose a rating from 1 to 5 stars."]
      : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <fieldset>
        <legend className="text-h3">How was it?</legend>

        <div
          className="mt-2 flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= (hovered || rating);
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(0)}
                aria-pressed={rating === value}
                // Each star is its own button so the whole control is
                // keyboard-reachable and each option is individually labelled.
                aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                className="focus-visible:ring-ring rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none"
              >
                <Star
                  aria-hidden
                  className={cn(
                    "size-6 transition-colors",
                    filled
                      ? "fill-status-pending text-status-pending"
                      : "text-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}

          {rating > 0 && (
            <span className="text-body text-muted-foreground ml-2 tabular-nums">
              {rating} / 5
            </span>
          )}
        </div>

        {ratingErrors && (
          <p role="alert" className="text-destructive text-caption mt-2">
            {ratingErrors[0]}
          </p>
        )}
      </fieldset>

      <Field data-invalid={error?.fieldErrors?.comment ? true : undefined}>
        <FieldLabel htmlFor="review-comment">
          Anything worth mentioning? <span className="text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Textarea
          id="review-comment"
          name="comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-invalid={error?.fieldErrors?.comment ? true : undefined}
        />
        <FieldError
          errors={error?.fieldErrors?.comment?.map((message) => ({ message }))}
        />
      </Field>

      {error && !error.fieldErrors && (
        <p role="alert" className="text-destructive text-caption">
          {error.message}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}
