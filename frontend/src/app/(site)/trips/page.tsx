import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { TripsList } from "./trips-list";

export const metadata: Metadata = {
  title: "My trips · CarRental",
};

export default function TripsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-12">
      <h1 className="text-h1">My trips</h1>
      <div className="mt-8">
        <RoleGuard>
          <TripsList />
        </RoleGuard>
      </div>
    </div>
  );
}
