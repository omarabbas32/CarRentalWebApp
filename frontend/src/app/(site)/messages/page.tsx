import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { ThreadInbox } from "./thread-inbox";

export const metadata: Metadata = {
  title: "Messages · CarRental",
};

export default function MessagesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-12">
      <h1 className="text-h1">Messages</h1>
      <p className="text-body text-muted-foreground mt-2 max-w-prose">
        Every conversation belongs to a trip. Request a car to start one.
      </p>
      <div className="mt-8">
        <RoleGuard>
          <ThreadInbox />
        </RoleGuard>
      </div>
    </div>
  );
}
