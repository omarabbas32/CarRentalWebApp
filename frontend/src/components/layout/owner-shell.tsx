"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarCheck, Car, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

/**
 * A workbench, not a storefront.
 *
 * Same reasoning as `AdminShell`: denser than the site chrome, sidebar-led, and
 * optimised for repetition. It deliberately does not reuse `AppShell` — an
 * owner working through pick-ups should not be one misclick from the landing
 * page — but it does keep a way back to the site, because an owner is also a
 * person who rents cars.
 */
const NAV = [
  { href: "/owner", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/owner/cars", label: "My listings", Icon: Car, exact: false },
  { href: "/owner/bookings", label: "Bookings", Icon: CalendarCheck, exact: false },
];

export function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Link href="/owner" className="text-h3">
            CarRental
          </Link>
          <span className="rounded-full border px-2 py-0.5 text-label uppercase text-muted-foreground">
            Owner
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/search">Back to the site</Link>
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Owner"
          className="flex gap-1 overflow-x-auto border-b p-2 lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:p-3"
        >
          {NAV.map(({ href, label, Icon, exact }) => {
            // `/owner` would otherwise stay lit on every page under it.
            const active = exact ? pathname === href : pathname.startsWith(href);
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

          <Button size="sm" asChild className="lg:mt-3 lg:w-full">
            <Link href="/owner/cars/new">
              <Plus className="size-4" aria-hidden />
              List a car
            </Link>
          </Button>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
