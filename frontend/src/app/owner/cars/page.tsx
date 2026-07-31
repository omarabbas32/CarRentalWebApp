import type { Metadata } from "next";
import { OwnerListings } from "./owner-listings";

export const metadata: Metadata = {
  title: "My listings · Owner",
};

export default function OwnerCarsPage() {
  return <OwnerListings />;
}
