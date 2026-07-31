import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Everything except the auth routes renders inside the site frame.
 *
 * `(site)` is a route group — it shapes the layout tree without appearing in
 * any URL, so `/` stays `/`.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
