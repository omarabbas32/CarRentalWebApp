"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteCarImage, setPrimaryCarImage } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import { uploadWithProgress } from "@/lib/api/upload";
import { cloudinaryThumb, IMAGE_WIDTHS } from "@/lib/cloudinary";
import { CarImageType } from "@/lib/enums";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { CarImageDto } from "@/types/api";

/**
 * Photos for one car: upload, set the cover, delete.
 *
 * All three used to be partly impossible. `CarDto` carried no images and the
 * search DTO carried only URLs, so a photo's id existed for exactly as long as
 * the response to the upload that created it — after a reload nothing on the
 * page could be deleted, and `IsPrimary` could only be set by an upload, never
 * changed. `CarImageDto` and `PUT /api/cars/images/{id}/primary` fixed both.
 *
 * The endpoints are also authorized now, and the handlers check that the car
 * belongs to the caller.
 */

const IMAGE_TYPE_LABEL: Record<CarImageType, string> = {
  [CarImageType.Exterior]: "Exterior",
  [CarImageType.Interior]: "Interior",
  [CarImageType.Engine]: "Engine",
  [CarImageType.Document]: "Document",
};

export function PhotoManager({
  carId,
  images,
  onChanged,
}: {
  carId: string;
  /** Primary first, then display order — as the API returns them. */
  images: CarImageDto[];
  /** Refetch the car. Every mutation here changes what the server holds. */
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<CarImageType>(CarImageType.Exterior);
  const [makeCover, setMakeCover] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    percent: number;
  } | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || progress) return;

    const chosen = Array.from(files);

    // Validated before anything is sent. There is still no size or MIME check
    // on the server — an oversized file or a PDF comes back as a bare 500.
    for (const file of chosen) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        return;
      }
    }

    let uploaded = 0;

    for (const [index, file] of chosen.entries()) {
      setProgress({ done: index, total: chosen.length, percent: 0 });

      // Only the first of a batch carries the flag — marking every one primary
      // would just leave the last upload as the cover, which is not what
      // ticking a box once means. The server also promotes the first photo on
      // a car with none, so a listing always has a cover.
      const isPrimary = makeCover && index === 0;

      try {
        const formData = new FormData();
        formData.append("File", file);
        formData.append("Type", String(type));
        formData.append("IsPrimary", String(isPrimary));

        await uploadWithProgress<string>(
          "uploadCarImage",
          `/api/cars/${carId}/images`,
          formData,
          (percent) => setProgress({ done: index, total: chosen.length, percent }),
        );
        uploaded++;
      } catch (cause) {
        toast.error(
          cause instanceof ApiError ? cause.message : "That photo didn't upload.",
        );
        break;
      }
    }

    setProgress(null);
    setMakeCover(false);
    if (inputRef.current) inputRef.current.value = "";

    // Refetched rather than appended locally: the server decides display order
    // and which photo ends up primary, and guessing at either would put the
    // grid out of step with the listing renters see.
    if (uploaded > 0) onChanged();
  }

  async function handleSetCover(image: CarImageDto) {
    if (busyId || image.isPrimary) return;
    setBusyId(image.id);
    try {
      await setPrimaryCarImage(image.id);
      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "We couldn't set that cover.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(image: CarImageDto) {
    if (busyId) return;
    setBusyId(image.id);
    try {
      await deleteCarImage(image.id);
      // Deleting the cover promotes the next photo server-side, which is
      // another reason to refetch rather than splice.
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="photo-type">What do these show?</Label>
          <Select value={String(type)} onValueChange={(v) => setType(Number(v))}>
            <SelectTrigger id="photo-type" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                CarImageType.Exterior,
                CarImageType.Interior,
                CarImageType.Engine,
                CarImageType.Document,
              ].map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {IMAGE_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2.5 pb-2">
          <Checkbox
            id="make-cover"
            checked={makeCover}
            onCheckedChange={(checked) => setMakeCover(checked === true)}
            // Pointless on an empty car: the first photo becomes the cover
            // regardless.
            disabled={images.length === 0}
          />
          <Label htmlFor="make-cover" className="font-normal">
            Use as the cover photo
          </Label>
        </div>
      </div>

      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-accent"
        aria-busy={progress !== null}
      >
        <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
        <span className="text-body font-medium">Add photos</span>
        <span className="text-caption text-muted-foreground">
          JPEG, PNG or WebP, up to 10 MB each. Pick several at once.
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
          <Progress value={progress.percent} />
          <p className="text-caption tabular-nums text-muted-foreground">
            Uploading {progress.done + 1} of {progress.total}…
          </p>
        </div>
      )}

      {images.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <li key={image.id} className="space-y-1.5">
                <div
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted transition-opacity",
                    busyId === image.id && "opacity-50",
                  )}
                >
                  {/* Not `alt=""`. Every photo here has its own Make cover and
                      Remove buttons, so a screen reader user needs to be able
                      to tell one from the next — decorative alt text would
                      leave them choosing between identical controls. */}
                  <Image
                    src={cloudinaryThumb(image.url, IMAGE_WIDTHS.cardThumb)}
                    alt={`${IMAGE_TYPE_LABEL[image.type]} photo ${index + 1} of ${images.length}${
                      image.isPrimary ? ", the cover" : ""
                    }`}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />

                  {image.isPrimary ? (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-caption font-medium">
                      <Star className="size-3 fill-current text-primary" aria-hidden />
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCover(image)}
                      disabled={busyId !== null}
                      aria-label={`Make photo ${index + 1} the cover`}
                      className="absolute bottom-1.5 left-1.5 flex min-h-11 items-center rounded-full bg-background/90 px-3 text-caption transition-colors hover:bg-background"
                    >
                      Make cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(image)}
                    disabled={busyId !== null}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full bg-background/90 transition-colors hover:bg-background"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                <p className="text-caption text-muted-foreground">
                  {IMAGE_TYPE_LABEL[image.type]}
                </p>
              </li>
            ))}
          </ul>

          <p className="text-caption text-muted-foreground">
            The cover is the photo renters see in search results.
          </p>
        </>
      )}
    </div>
  );
}
