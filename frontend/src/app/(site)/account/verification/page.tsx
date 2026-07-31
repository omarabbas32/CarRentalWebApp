import type { Metadata } from "next";
import Link from "next/link";
import { RoleGuard } from "@/components/auth/role-guard";
import { VerificationPanel } from "./verification-panel";

export const metadata: Metadata = {
  title: "Verification · CarRental",
};

export default function VerificationPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-12">
      <div className="space-y-2">
        <Link
          href="/account"
          className="text-caption text-muted-foreground underline underline-offset-4"
        >
          Back to profile
        </Link>
        <h1 className="text-h1">Verification</h1>
        <p className="max-w-prose text-muted-foreground">
          Prove who you are once. Owners are more likely to accept a request from a
          verified renter.
        </p>
      </div>

      <div className="mt-8">
        {/* `POST /api/users/{id}/verification` has no server-side authorization —
            any caller can upload documents against any user id. This guard is a
            UI boundary only. See phases/README.md. */}
        <RoleGuard>
          <VerificationPanel />
        </RoleGuard>
      </div>
    </div>
  );
}
