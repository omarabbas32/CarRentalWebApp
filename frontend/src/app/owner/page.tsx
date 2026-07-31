import type { Metadata } from "next";
import { OwnerDashboard } from "./owner-dashboard";

export const metadata: Metadata = {
  title: "Dashboard · Owner",
};

export default function OwnerDashboardPage() {
  return <OwnerDashboard />;
}
