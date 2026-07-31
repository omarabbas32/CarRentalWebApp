import type { Metadata } from "next";
import { BookingInbox } from "./booking-inbox";

export const metadata: Metadata = {
  title: "Bookings · Owner",
};

export default function OwnerBookingsPage() {
  return <BookingInbox />;
}
