import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Split screen, and **no site chrome** — DESIGN.md §4.7.
 *
 * Signing in is not a place to offer navigation away from signing in. The only
 * links out are the wordmark and the counterpart auth route.
 *
 * The right panel is decorative and hidden below `lg`, where the form should
 * have the full width.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-h2">
            CarRental
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-muted lg:block"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-primary/5" />
        <div className="relative flex h-full flex-col justify-end gap-3 p-12">
          <p className="text-display max-w-prose">
            Someone nearby has the car you need.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Find one free on your dates, or earn from the one sitting on your
            drive.
          </p>
        </div>
      </aside>
    </div>
  );
}
