"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { UserRole } from "@/lib/enums";
import { cn } from "@/lib/utils";

/**
 * The site frame. Auth routes deliberately render without it — signing in is
 * not a place to offer navigation away.
 *
 * Navigation is role-aware. Copy follows DESIGN.md §7: things are named the way
 * people say them — "Find a car", not "Browse listings"; "My trips", not
 * "Bookings".
 */

type NavItem = {
  href: string;
  label: string;
  /** Omit for links everyone sees, signed in or not. */
  roles?: UserRole[];
  requiresAuth?: boolean;
};

const NAV: NavItem[] = [
  { href: "/search", label: "Find a car" },
  { href: "/trips", label: "My trips", requiresAuth: true },
  { href: "/owner", label: "Owner", roles: [UserRole.Owner] },
  { href: "/admin/verifications", label: "Admin", roles: [UserRole.Admin, UserRole.Staff] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  // Filtered, not gated on `isLoading`. The server cannot know who is signed
  // in, so during SSR this yields exactly the public links — which is correct
  // for a signed-out visitor and for a client with JavaScript disabled. The
  // role-specific links appear when the store resolves, which happens before
  // React's first client render.
  const visible = NAV.filter((item) => {
    if (item.roles) return session !== null && item.roles.includes(session.role);
    if (item.requiresAuth) return session !== null;
    return true;
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-6 lg:px-12">
          <Link href="/" className="text-h2 shrink-0">
            CarRental
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {visible.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Under md the same links move to a second row rather than into a
            hamburger — there are at most four, and a visible row is faster. */}
        {visible.length > 0 && (
          <nav
            aria-label="Main"
            className="flex items-center gap-1 overflow-x-auto border-t px-6 py-2 md:hidden"
          >
            {visible.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-caption text-muted-foreground lg:px-12">
          <span>CarRental</span>
          <span className="ml-auto">Peer-to-peer car rental</span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  // `/owner` should stay active on `/owner/cars`, but `/` must not match
  // everything.
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-body whitespace-nowrap transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive ? "text-foreground font-medium" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}
