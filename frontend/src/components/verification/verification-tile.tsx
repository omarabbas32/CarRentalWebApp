"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { BadgeCheck, Clock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export type TileState =
  /** The boolean on `UserDto` is true. */
  | { kind: "verified" }
  /** Uploaded during this browser's history, but not yet approved. */
  | { kind: "submitted"; at: string }
  | { kind: "empty" };

/**
 * One document tile: drag-drop, preview, its own progress bar and status.
 *
 * Upload uses `XMLHttpRequest` rather than `fetch` because `fetch` reports no
 * upload progress — and on a phone photo over a slow connection, a bar that
 * moves is the difference between waiting and refreshing.
 */
export function VerificationTile({
  title,
  description,
  state,
  onUpload,
}: {
  title: string;
  description: string;
  state: TileState;
  /** Resolves when the server has stored the document. */
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = progress !== null;

  async function handleFile(file: File) {
    // The only validation there is — the server has none, and an oversized or
    // non-image file comes back as a generic 500.
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setProgress(0);

    try {
      await onUpload(file, setProgress);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That didn't upload. Try again.");
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        dragging && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3">{title}</h3>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
        <StatusPill state={state} />
      </div>

      <div className="relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted">
        {preview ? (
          <Image src={preview} alt="" fill unoptimized className="object-contain" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
            <Upload className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-caption text-muted-foreground">
              Drag a photo here, or choose one
            </span>
          </div>
        )}
      </div>

      {busy && (
        <div className="space-y-1">
          <Progress value={progress ?? 0} />
          <p className="text-caption tabular-nums text-muted-foreground" aria-live="polite">
            Uploading… {Math.round(progress ?? 0)}%
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-caption text-destructive">
          <X className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Allow re-selecting the same file after a failure.
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {state.kind === "empty" ? "Choose a photo" : "Replace photo"}
      </Button>
    </div>
  );
}

function StatusPill({ state }: { state: TileState }) {
  if (state.kind === "verified") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-confirmed-bg px-2.5 py-1 text-caption font-medium text-status-confirmed">
        <BadgeCheck className="size-3.5" aria-hidden />
        Verified
      </span>
    );
  }

  if (state.kind === "submitted") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-pending-bg px-2.5 py-1 text-caption font-medium text-status-pending">
        <Clock className="size-3.5" aria-hidden />
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-caption font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      Not sent
    </span>
  );
}
