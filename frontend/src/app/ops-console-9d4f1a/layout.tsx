import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UserRole } from "@/lib/enums";

/**
 * The directory name **is** the obscured path — see `lib/admin-routes.ts`, and
 * keep `ADMIN_BASE` in step with it.
 */
export const metadata: Metadata = {
  title: "Staff console",
  // Belt and braces for an unlisted path: no indexing, no snippets, no
  // following links out of it.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      {/* Both admin endpoints carry [Authorize(Roles = "Staff,Admin")], so
          unlike most guards in this app this one mirrors real server-side
          enforcement rather than standing in for it. */}
      <RoleGuard roles={[UserRole.Admin, UserRole.Staff]}>{children}</RoleGuard>
    </AdminShell>
  );
}
