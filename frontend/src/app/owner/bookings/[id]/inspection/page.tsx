import type { Metadata } from "next";
import { InspectionForm } from "./inspection-form";

export const metadata: Metadata = {
  title: "Inspection · Owner",
};

/** `params` is a Promise in Next 16 — see frontend/AGENTS.md. */
export default async function InspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InspectionForm bookingId={id} />;
}
