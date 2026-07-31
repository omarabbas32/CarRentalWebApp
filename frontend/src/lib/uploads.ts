/**
 * Client-side file validation.
 *
 * **This is the only validation there is.** The API performs no size or MIME
 * check: `UploadVerificationDocumentCommandHandler` hands the stream straight
 * to Cloudinary, and anything Cloudinary rejects comes back as a generic 500
 * with no indication of what was wrong. A user would see "That document didn't
 * upload" and have nothing to act on.
 *
 * `CloudinaryService.UploadImageAsync` uses `ImageUploadParams`, so the file
 * must genuinely be an image — a PDF scan of a licence will fail. It also
 * limits the stored image to 1000×1000, so there is no value in uploading
 * anything larger.
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** The `accept` attribute for a file input. */
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/**
 * 10MB. Kestrel's multipart limit is far higher, so this is a courtesy to the
 * user rather than a server constraint — a phone photo is comfortably under it,
 * and the image is downscaled to 1000px on arrival anyway.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Returns a message saying **what to do**, or null when the file is fine.
 * Never returns "invalid file".
 */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    // PDFs are the common case here — people scan documents rather than
    // photograph them — so name it explicitly.
    return file.type === "application/pdf"
      ? "PDFs aren't supported. Take a photo of the document instead, or export the page as a JPEG or PNG."
      : "Use a JPEG, PNG or WebP image.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatBytes(file.size)}. Use one under ${formatBytes(MAX_UPLOAD_BYTES)} — a photo from your phone is usually fine.`;
  }

  if (file.size === 0) {
    // `UploadImageAsync` returns an empty string for a zero-length file, which
    // the handler turns into "Document upload failed." — a 500 with no detail.
    return "That file is empty. Choose a different one.";
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
