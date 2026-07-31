import type { Metadata } from "next";
import { ReviewQueue } from "./review-queue";

export const metadata: Metadata = {
  title: "Verifications · Staff console",
  robots: { index: false, follow: false, nocache: true },
};

export default function VerificationsPage() {
  return <ReviewQueue />;
}
