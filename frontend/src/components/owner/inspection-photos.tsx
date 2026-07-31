"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import {
  deleteInspectionPhoto,
  getBookingInspections,
  uploadInspectionPhoto,
} from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { cloudinaryThumb, IMAGE_WIDTHS } from "@/lib/cloudinary";
import { InspectionType } from "@/lib/enums";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile } from "@/lib/uploads";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { InspectionPhotoDto } from "@/types/api";

/**
 * Photographs of a hand-over.
 *
 * `TripInspection.Photos` and the `InspectionPhotos` table existed from the
 * start and nothing ever wrote to either — neither trip request carried a
 * file. An owner documenting a scratch had a description field and nowhere to
 * put the evidence.
 *
 * The photos attach **after** the trip is started or ended, because the
 * inspection row is what they hang off and `/start` and `/end` are what create
 * it. Uploading before that is refused with a 409 saying so, rather than an
 * empty inspection being conjured for the purpose.
 *
 * Routing these through the car image endpoint was the obvious shortcut and
 * would have been wrong: `/api/cars/search` returns every one of a car's
 * images, so damage photos would have appeared in the public listing.
 */
export function InspectionPhotos({
  bookingId,
  type,
}: {
  bookingId: string;
  type: InspectionType;
}) {
  const state = useAsync(() => getBookingInspections(bookingId), [bookingId]);

  if (state.status === "loading") return <Skeleton className="h-40 w-full" />;

  if (state.status === "error") {
    return (
      <ErrorState
        title="We couldn't load the inspection"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />
    );
  }

  const inspection = state.data.find((i) => i.type === type);

  if (!inspection) {
    // Only reachable if the start/end call succeeded and the record then went
    // missing — worth saying plainly rather than showing an upload box that
    // would 409 on every file.
    return (
      <p className="text-caption text-muted-foreground">
        No inspection record was found for this trip, so photos can&apos;t be attached.
      </p>
    );
  }

  return (
    <PhotoStrip
      bookingId={bookingId}
      type={type}
      photos={inspection.photos}
      onChanged={state.reload}
    />
  );
}

function PhotoStrip({
  bookingId,
  type,
  photos,
  onChanged,
}: {
  bookingId: string;
  type: InspectionType;
  photos: InspectionPhotoDto[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || progress) return;

    const chosen = Array.from(files);

    // The only validation there is — the server hands the stream straight to
    // Cloudinary and an oversized file or a PDF comes back as a bare 500.
    for (const file of chosen) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        return;
      }
    }

    let uploaded = 0;
    for (const [index, file] of chosen.entries()) {
      setProgress({ done: index, total: chosen.length });
      try {
        await uploadInspectionPhoto(bookingId, type, file);
        uploaded++;
      } catch (cause) {
        toast.error(
          cause instanceof ApiError ? cause.message : "That photo didn't upload.",
        );
        break;
      }
    }

    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) onChanged();
  }

  async function handleDelete(photo: InspectionPhotoDto) {
    if (busyId) return;
    setBusyId(photo.id);
    try {
      await deleteInspectionPhoto(photo.id);
      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "We couldn't remove that photo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors hover:bg-accent"
        aria-busy={progress !== null}
      >
        <Camera className="size-6 text-muted-foreground" aria-hidden />
        <span className="text-body font-medium">Add photos</span>
        <span className="text-caption text-muted-foreground">
          Damage, the odometer, the fuel gauge — whatever you&apos;d want on hand
          later.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          disabled={progress !== null}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {progress && (
        <div className="space-y-1.5">
          <Progress value={((progress.done + 1) / progress.total) * 100} />
          <p className="text-caption tabular-nums text-muted-foreground">
            Uploading {progress.done + 1} of {progress.total}…
          </p>
        </div>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <div
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted transition-opacity",
                  busyId === photo.id && "opacity-50",
                )}
              >
                <Image
                  src={cloudinaryThumb(photo.photoUrl, IMAGE_WIDTHS.cardThumb)}
                  // A description when there is one, a position when there
                  // isn't — each photo has its own Remove button, so they have
                  // to be distinguishable without sight.
                  alt={photo.description ?? `Inspection photo ${index + 1} of ${photos.length}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  disabled={busyId !== null}
                  aria-label={`Remove inspection photo ${index + 1}`}
                  className="absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full bg-background/90 transition-colors hover:bg-background"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
              {photo.description && (
                <p className="mt-1.5 text-caption text-muted-foreground">
                  {photo.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
