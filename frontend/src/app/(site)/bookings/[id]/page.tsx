import type { Metadata } from "next";
import { RoleGuard } from "@/components/auth/role-guard";
import { BookingDetail } from "./booking-detail";

export const metadata: Metadata = {
  title: "Your trip · CarRental",
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-12">
      {/* Any signed-in user may hold a booking — the participant check happens
          inside, against the booking itself. */}
      <RoleGuard>
        <BookingDetail bookingId={id} />
      </RoleGuard>
    </div>
  );
}
