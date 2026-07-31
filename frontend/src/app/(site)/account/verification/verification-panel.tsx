"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { VerificationTile, type TileState } from "@/components/verification/verification-tile";
import { useAuth } from "@/components/providers/auth-provider";
import { getUser } from "@/lib/api/users";
import { uploadWithProgress } from "@/lib/api/upload";
import { GovernmentIdType, VerificationDocumentType, governmentIdTypeLabel } from "@/lib/enums";
import { useAsync } from "@/lib/use-async";
import type { UserDto } from "@/types/api";

/**
 * Remembers which documents this user has sent.
 *
 * **This exists because the API cannot tell them.** `UserDto` exposes only
 * `identityVerified` and `driverLicenseVerified` — two booleans. The underlying
 * `VerificationStatus` (Pending / Verified / Rejected) lives on
 * `UserVerification` and is returned *only* by the Staff-and-Admin
 * `pending-verifications` endpoint.
 *
 * So a renter who uploads a licence and reloads the page would see "Not sent"
 * on a document they definitely sent. Recording the submission locally is a
 * fact about what the user did, not a claim about the review outcome — and the
 * copy on screen is careful to say exactly that.
 *
 * Delete this the moment `UserDto` carries the two statuses.
 */
const SENT_KEY = "carrental.verification.sent";

type SentMap = Partial<Record<VerificationDocumentType, string>>;

function readSent(userId: string): SentMap {
  try {
    const raw = window.localStorage.getItem(`${SENT_KEY}.${userId}`);
    return raw ? (JSON.parse(raw) as SentMap) : {};
  } catch {
    return {};
  }
}

function writeSent(userId: string, map: SentMap) {
  try {
    window.localStorage.setItem(`${SENT_KEY}.${userId}`, JSON.stringify(map));
  } catch {
    // Private browsing. The tile simply falls back to "Not sent" next visit.
  }
}

export function VerificationPanel() {
  const { session } = useAuth();
  const userId = session?.userId;
  const state = useAsync(() => getUser(userId!), [userId]);

  if (!userId || state.status === "loading") return <PanelSkeleton />;

  if (state.status === "error") {
    return <ErrorState
        title="We couldn't load your documents"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />;
  }

  return <Tiles user={state.data} onUploaded={state.reload} />;
}

function Tiles({ user, onUploaded }: { user: UserDto; onUploaded: () => void }) {
  const [sent, setSent] = useState<SentMap>(() => readSent(user.id));
  const [idType, setIdType] = useState<GovernmentIdType>(GovernmentIdType.Passport);

  async function upload(
    type: VerificationDocumentType,
    file: File,
    onProgress: (percent: number) => void,
  ) {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("Type", String(type));
    // `IdType` applies only to the government ID; the two licence sides omit it.
    if (type === VerificationDocumentType.GovernmentId) {
      formData.append("IdType", String(idType));
    }

    await uploadWithProgress<{ url: string }>(
      "uploadVerificationDocument",
      `/api/users/${user.id}/verification`,
      formData,
      onProgress,
    );

    const next = { ...sent, [type]: new Date().toISOString() };
    setSent(next);
    writeSent(user.id, next);
    toast.success("Document sent for review");
    onUploaded();
  }

  /**
   * The backend collapses licence front and back into a **single**
   * `DriverLicenseStatus`, and `ProcessVerification` flips
   * `DriverLicenseVerified` from either side. So approving one approves both,
   * and the two tiles must move together — the UI mirrors the data model
   * rather than inventing granularity it cannot persist.
   */
  function tileState(type: VerificationDocumentType): TileState {
    const verified =
      type === VerificationDocumentType.GovernmentId
        ? user.identityVerified
        : user.driverLicenseVerified;

    if (verified) return { kind: "verified" };

    const at = sent[type];
    return at ? { kind: "submitted", at } : { kind: "empty" };
  }

  const done =
    (user.identityVerified ? 1 : 0) + (user.driverLicenseVerified ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-caption text-muted-foreground">Verification progress</p>
          <p className="text-caption tabular-nums text-muted-foreground">{done} of 2</p>
        </div>
        <Progress value={(done / 2) * 100} />
      </div>

      <Alert>
        <Info className="size-4" aria-hidden />
        <AlertDescription>
          Documents are checked by a person, so this can take a little while. You&apos;ll
          see &ldquo;Verified&rdquo; here once it&apos;s done — we can&apos;t show progress
          before then.
          {/* Truthful about the limitation rather than implying live tracking:
              the renter-facing DTO has no status field at all. */}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="idType">Which ID are you sending?</Label>
        <Select
          value={String(idType)}
          onValueChange={(v) => setIdType(Number(v) as GovernmentIdType)}
        >
          <SelectTrigger id="idType" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              GovernmentIdType.Passport,
              GovernmentIdType.NationalId,
              GovernmentIdType.DriversLicense,
            ].map((t) => (
              <SelectItem key={t} value={String(t)}>
                {governmentIdTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VerificationTile
          title="Government ID"
          description="Passport, national ID or licence"
          state={tileState(VerificationDocumentType.GovernmentId)}
          onUpload={(file, onProgress) =>
            upload(VerificationDocumentType.GovernmentId, file, onProgress)
          }
        />
        <VerificationTile
          title="Licence — front"
          description="The side with your photo"
          state={tileState(VerificationDocumentType.DriverLicenseFront)}
          onUpload={(file, onProgress) =>
            upload(VerificationDocumentType.DriverLicenseFront, file, onProgress)
          }
        />
        <VerificationTile
          title="Licence — back"
          description="The side with the barcode"
          state={tileState(VerificationDocumentType.DriverLicenseBack)}
          onUpload={(file, onProgress) =>
            upload(VerificationDocumentType.DriverLicenseBack, file, onProgress)
          }
        />
      </div>

      <p className="text-caption text-muted-foreground">
        Both sides of your licence are reviewed together, so they&apos;re approved as
        one.
      </p>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading your documents</span>
    </div>
  );
}
