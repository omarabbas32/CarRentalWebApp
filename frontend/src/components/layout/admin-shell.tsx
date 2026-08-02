"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { adminRoutes } from "@/lib/admin-routes";
import { cn } from "@/lib/utils";

/**
 * A workbench, not a storefront — denser than the site chrome, sidebar-led, and
 * optimised for working through a queue rather than browsing.
 *
 * Deliberately does not reuse `AppShell`: an admin mid-review should not be one
 * misclick from the marketing landing page.
 */
const NAV = [
  { href: adminRoutes.verifications, label: "Verifications", Icon: ShieldCheck },
  { href: adminRoutes.users, label: "Users", Icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Link href={adminRoutes.verifications} className="text-h3">
            CarRental
          </Link>
          <span className="rounded-full border px-2 py-0.5 text-label uppercase text-muted-foreground">
            Staff console
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Console"
          className="flex gap-1 overflow-x-auto border-b p-2 lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:p-3"
        >
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-body whitespace-nowrap transition-colors",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
