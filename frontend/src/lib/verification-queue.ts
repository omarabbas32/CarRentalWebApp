import { VerificationDocumentType, VerificationStatus } from "@/lib/enums";
import type { PendingVerificationDto } from "@/types/api";

/**
 * Turning `pending-verifications` into a list of decisions.
 *
 * Two things make this less obvious than it looks.
 *
 * **1. The endpoint returns phantom documents.** `VerificationStatus.Pending`
 * is `0`, which is also the default for a fresh `UserVerification`. A user who
 * uploads only a licence therefore has `GovernmentIdStatus = Pending` with
 * `governmentIdImageUrl = null` — and the query filters on status alone, so
 * they appear in the queue as having a government ID awaiting review that they
 * never sent. A reviewer would be shown an empty pane and no way to act.
 * Every item here requires an actual image.
 *
 * **2. There are two decisions per user, not three.** The backend stores one
 * `DriverLicenseStatus` covering both licence sides, and `ProcessVerification`
 * flips `DriverLicenseVerified` from either one. Front and back are therefore a
 * single decision reviewed together, and both images belong in one item.
 * Rendering them as two rows would promise granularity the server cannot
 * persist, and acting on one would silently resolve the other.
 */

export type ReviewItem = {
  /** Stable across refetches, so the cursor can be restored after a decision. */
  key: string;
  userId: string;
  fullName: string;
  email: string;
  title: string;
  /** What to send as `documentType`. Either licence side moves both. */
  documentType: VerificationDocumentType;
  /** One image for an ID; front and back for a licence. */
  images: { label: string; url: string }[];
  /** Government ID only — the licence has no equivalent field. */
  idTypeLabel?: string;
  expiryDate?: string | null;
};

export function buildReviewQueue(
  rows: PendingVerificationDto[],
  idTypeLabels: Record<number, string>,
): ReviewItem[] {
  const items: ReviewItem[] = [];

  for (const row of rows) {
    if (
      row.governmentIdStatus === VerificationStatus.Pending &&
      row.governmentIdImageUrl
    ) {
      items.push({
        key: `${row.userId}:id`,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        title: "Government ID",
        documentType: VerificationDocumentType.GovernmentId,
        images: [{ label: "Document", url: row.governmentIdImageUrl }],
        idTypeLabel:
          row.governmentIdType != null ? idTypeLabels[row.governmentIdType] : undefined,
      });
    }

    if (row.driverLicenseStatus === VerificationStatus.Pending) {
      const images = [
        row.driverLicenseFrontImageUrl && {
          label: "Front",
          url: row.driverLicenseFrontImageUrl,
        },
        row.driverLicenseBackImageUrl && {
          label: "Back",
          url: row.driverLicenseBackImageUrl,
        },
      ].filter((i): i is { label: string; url: string } => Boolean(i));

      // A licence with neither side uploaded is the same phantom as above.
      if (images.length > 0) {
        items.push({
          key: `${row.userId}:licence`,
          userId: row.userId,
          fullName: row.fullName,
          email: row.email,
          title: "Driving licence",
          // Either side flips the shared status; front is the conventional one.
          documentType: VerificationDocumentType.DriverLicenseFront,
          images,
          expiryDate: row.driverLicenseExpiryDate,
        });
      }
    }
  }

  return items;
}

/**
 * How many rows the endpoint returned that carry no reviewable document.
 *
 * Surfaced in the UI rather than silently dropped: a queue that quietly hides
 * entries is indistinguishable from a broken one, and this count is direct
 * evidence of the backend defect above.
 */
export function countPhantomRows(rows: PendingVerificationDto[]): number {
  let phantoms = 0;
  for (const row of rows) {
    if (row.governmentIdStatus === VerificationStatus.Pending && !row.governmentIdImageUrl) {
      phantoms++;
    }
    if (
      row.driverLicenseStatus === VerificationStatus.Pending &&
      !row.driverLicenseFrontImageUrl &&
      !row.driverLicenseBackImageUrl
    ) {
      phantoms++;
    }
  }
  return phantoms;
}
