import type { Metadata } from "next";
import { EditCarForm } from "./edit-car-form";

export const metadata: Metadata = {
  title: "Edit listing · Owner",
};

/** `params` is a Promise in Next 16 — see frontend/AGENTS.md. */
export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditCarForm carId={id} />;
}
