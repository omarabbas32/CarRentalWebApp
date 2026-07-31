"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { getPendingVerifications, processVerification } from "@/lib/api/users";
import { ApiError } from "@/lib/api/errors";
import { governmentIdTypeLabel, VerificationStatus } from "@/lib/enums";
import { buildReviewQueue, countPhantomRows, type ReviewItem } from "@/lib/verification-queue";
import { useAsync } from "@/lib/use-async";

/**
 * A work queue, not a browser.
 *
 * The design optimises for the tenth item, not the first: one item fills the
 * screen, a decision advances automatically, and the controls stay in the same
 * place so a reviewer's hands never move.
 */
export function ReviewQueue() {
  const state = useAsync(() => getPendingVerifications(), []);
  const [cursor, setCursor] = useState(0);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rows = state.status === "success" ? state.data : [];
  const items = buildReviewQueue(rows, governmentIdTypeLabel);
  const phantoms = countPhantomRows(rows);
  // Clamped during render rather than corrected in an effect. The queue shrinks
  // under the cursor after every decision — often by two items, since a licence
  // decision resolves both sides — and syncing that back into state would mean
  // a setState inside an effect, which cascades an extra render and is exactly
  // what the React Compiler lint rules reject.
  const position = Math.min(cursor, Math.max(0, items.length - 1));
  const current: ReviewItem | undefined = items[position];

  async function decide(status: VerificationStatus) {
    if (!current || submitting) return;

    if (status === VerificationStatus.Rejected && reason.trim() === "") {
      setRejecting(true);
      return;
    }

    setSubmitting(true);
    try {
      await processVerification(current.userId, {
        documentType: current.documentType,
        status,
        // Accepted and never stored — see the note in the panel below.
        reason: reason.trim() || undefined,
      });

      toast.success(
        status === VerificationStatus.Verified
          ? `${current.title} approved`
          : `${current.title} rejected`,
      );

      setReason("");
      setRejecting(false);
      // Refetch rather than splice: a licence decision resolves both sides, so
      // the queue can shrink by more than the one item just acted on.
      state.reload();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "We couldn't record that decision.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Keyboard shortcuts keep a reviewer off the mouse. Skipped while typing a
  // rejection reason, or A and R would land in the textarea.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "a" || event.key === "A") void decide(VerificationStatus.Verified);
      if (event.key === "r" || event.key === "R") setRejecting(true);
      if (event.key === "ArrowRight") setCursor(Math.min(position + 1, items.length - 1));
      if (event.key === "ArrowLeft") setCursor(Math.max(position - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (state.status === "loading") return <QueueSkeleton />;

  if (state.status === "error") {
    return <ErrorState
        title="We couldn't load the queue"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />;
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1">Verifications</h1>
          <p className="text-caption tabular-nums text-muted-foreground">
            {items.length === 0
              ? "Nothing waiting"
              : `${position + 1} of ${items.length} to review`}
          </p>
        </div>
        {items.length > 0 && (
          <p className="text-caption text-muted-foreground">
            <kbd className="rounded border px-1.5 py-0.5">A</kbd> approve ·{" "}
            <kbd className="rounded border px-1.5 py-0.5">R</kbd> reject ·{" "}
            <kbd className="rounded border px-1.5 py-0.5">←</kbd>
            <kbd className="rounded border px-1.5 py-0.5">→</kbd> move
          </p>
        )}
      </header>

      {phantoms > 0 && (
        <Alert>
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {phantoms} entr{phantoms === 1 ? "y" : "ies"} from the API had no document
            attached and {phantoms === 1 ? "is" : "are"} not shown.{" "}
            <span className="text-muted-foreground">
              `VerificationStatus.Pending` is `0`, the default for a new record, so a user
              who sent only one document looks like they are waiting on both.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {!current ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="text-h2">Queue clear</h2>
          <p className="text-muted-foreground">Nothing is waiting for review.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-3">
            {current.images.map((image) => (
              <figure key={image.url} className="space-y-1.5">
                <figcaption className="text-label uppercase text-muted-foreground">
                  {image.label}
                </figcaption>
                {/* Documents must be legible: full width, natural aspect, and
                    a link out for anything needing closer inspection. */}
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="relative block aspect-[16/10] overflow-hidden rounded-xl border bg-muted"
                >
                  <Image
                    src={image.url}
                    alt={`${current.title} — ${image.label}`}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-contain"
                    unoptimized
                  />
                </a>
              </figure>
            ))}
            <p className="text-caption text-muted-foreground">
              Open an image in a new tab to zoom.
            </p>
          </section>

          <aside className="space-y-5 self-start rounded-xl border p-5">
            <div className="space-y-1">
              <h2 className="text-h2">{current.title}</h2>
              {current.idTypeLabel && (
                <p className="text-caption text-muted-foreground">{current.idTypeLabel}</p>
              )}
            </div>

            <Separator />

            <dl className="space-y-3">
              <Detail label="Applicant" value={current.fullName} />
              <Detail label="Email" value={current.email} />
              {current.expiryDate && (
                <Detail
                  label="Expires"
                  value={new Date(current.expiryDate).toLocaleDateString()}
                />
              )}
            </dl>

            <Separator />

            {current.documentType !== undefined && current.title === "Driving licence" && (
              <p className="text-caption text-muted-foreground">
                Front and back are approved together — the backend stores one licence
                status.
              </p>
            )}

            {rejecting && (
              <div className="space-y-2">
                <Label htmlFor="reason">Why are you rejecting it?</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Blurry, expired, name doesn't match…"
                  autoFocus
                />
                <p className="text-caption text-muted-foreground">
                  {/* The endpoint accepts `reason` and discards it — there is no
                      column for it, confirmed against the live payload. */}
                  Recorded for the reviewer only. The applicant won&apos;t see this yet.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => decide(VerificationStatus.Verified)}
                disabled={submitting}
              >
                <Check className="size-4" aria-hidden />
                Approve
              </Button>

              <Button
                variant="outline"
                onClick={() => decide(VerificationStatus.Rejected)}
                disabled={submitting || (rejecting && reason.trim() === "")}
              >
                <X className="size-4" aria-hidden />
                {rejecting ? "Confirm rejection" : "Reject"}
              </Button>

              {rejecting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRejecting(false);
                    setReason("");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            {items.length > 1 && (
              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCursor(Math.max(position - 1, 0))}
                  disabled={position === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCursor(Math.min(position + 1, items.length - 1))}
                  disabled={position >= items.length - 1}
                >
                  Skip
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body break-words">{value}</dd>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <span className="sr-only">Loading the review queue</span>
    </div>
  );
}
