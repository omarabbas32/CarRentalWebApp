import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin-routes";

/** The console has one job on arrival: clear the queue. */
export default function AdminHome() {
  redirect(adminRoutes.verifications);
}
