import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = {
  title: "Notifications · CarRental",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-12">
      <h1 className="text-h1">Notifications</h1>
      <div className="mt-8">
        <RoleGuard>
          <NotificationsList />
        </RoleGuard>
      </div>
    </div>
  );
}
