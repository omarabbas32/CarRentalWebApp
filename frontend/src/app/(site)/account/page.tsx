import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccountForm } from "./account-form";

export const metadata: Metadata = {
  title: "Profile · CarRental",
};

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 lg:px-12">
      <h1 className="text-h1">Profile</h1>
      <div className="mt-8">
        {/* `PUT /api/users/{id}` has no server-side authorization — any caller
            can update any user by id. This guard scopes the UI to the signed-in
            user; it is not a control. See phases/README.md. */}
        <RoleGuard>
          <AccountForm />
        </RoleGuard>
      </div>
    </div>
  );
}
