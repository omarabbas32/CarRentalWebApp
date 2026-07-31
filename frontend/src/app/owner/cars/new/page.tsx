import type { Metadata } from "next";
import { AddCarWizard } from "./add-car-wizard";

export const metadata: Metadata = {
  title: "List a car · Owner",
};

export default function NewCarPage() {
  return <AddCarWizard />;
}
