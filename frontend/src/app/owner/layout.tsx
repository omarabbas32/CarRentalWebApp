import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OwnerShell } from "@/components/layout/owner-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UserRole } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Owner",
};

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerShell>
      {/*
        Owner, Admin and Staff — the same three roles `CreateCar`, `UpdateCar`,
        `StartTrip` and `EndTrip` carry on their `[Authorize]` attributes. The
        guard mirrors the server here rather than standing in for it, though
        the image endpoints under it are unauthenticated and cannot be.
      */}
      <RoleGuard roles={[UserRole.Owner, UserRole.Admin, UserRole.Staff]}>
        {children}
      </RoleGuard>
    </OwnerShell>
  );
}
