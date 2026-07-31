/**
 * Car photos and verification documents are absolute Cloudinary URLs — the API
 * stores and returns nothing else.
 *
 * Grid thumbnails ship the full-resolution original unless a transformation is
 * injected, so `cloudinaryThumb` rewrites the URL to ask Cloudinary for the
 * size actually being displayed.
 */

const UPLOAD_SEGMENT = "/upload/";

/**
 * Insert a resize transformation into a Cloudinary delivery URL.
 *
 * https://res.cloudinary.com/demo/image/upload/v123/car.jpg
 *   → https://res.cloudinary.com/demo/image/upload/c_fill,f_auto,q_auto,w_640/v123/car.jpg
 *
 * Anything that is not a recognisable Cloudinary upload URL is returned
 * unchanged, so a placeholder or a foreign host passes through safely rather
 * than being corrupted into a broken link.
 */
export function cloudinaryThumb(
  url: string,
  width: number,
  options: { height?: number; crop?: "fill" | "fit" | "limit" } = {},
): string {
  if (!url || !isCloudinaryUrl(url)) return url;

  const index = url.indexOf(UPLOAD_SEGMENT);
  if (index === -1) return url;

  const prefix = url.slice(0, index + UPLOAD_SEGMENT.length);
  const rest = url.slice(index + UPLOAD_SEGMENT.length);

  // Already transformed — a segment before the version carries transformation
  // parameters. Adding a second one would silently compound them.
  if (hasTransformation(rest)) return url;

  const { height, crop = "limit" } = options;
  const parts = [`c_${crop}`, "f_auto", "q_auto", `w_${width}`];
  if (height !== undefined) parts.push(`h_${height}`);

  return `${prefix}${parts.join(",")}/${rest}`;
}

export function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/**
 * The segment after `/upload/` is a transformation when it is not a version
 * (`v` + digits) and not the asset itself. Cloudinary transformation segments
 * are comma-separated `key_value` pairs.
 */
function hasTransformation(rest: string): boolean {
  const first = rest.split("/")[0];
  if (!first || /^v\d+$/.test(first)) return false;
  return first.split(",").every((p) => /^[a-z]{1,3}_/.test(p));
}

/**
 * Widths used across the app, so `sizes` attributes and requested widths stay
 * in step. Next's `images.qualities` defaults to `[75]` alone in v16 — do not
 * request another quality without adding it to next.config.ts.
 */
export const IMAGE_WIDTHS = {
  cardThumb: 640,
  galleryMain: 1280,
  galleryThumb: 160,
  avatar: 96,
} as const;
