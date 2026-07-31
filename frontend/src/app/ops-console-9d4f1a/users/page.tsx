import type { Metadata } from "next";
import { UserLookup } from "./user-lookup";

export const metadata: Metadata = {
  title: "Users · Staff console",
  robots: { index: false, follow: false, nocache: true },
};

export default function UsersPage() {
  return <UserLookup />;
}
