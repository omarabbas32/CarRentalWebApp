"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { userRoleLabel } from "@/lib/enums";

export function UserMenu() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // No `isLoading` branch. The server cannot know whether anyone is signed in,
  // so it renders the signed-out links — which are real anchors that work with
  // JavaScript disabled. Rendering a blank placeholder instead would mean a
  // no-JS visitor could never reach the sign-in page at all.
  //
  // A signed-in user sees those links for the moment before hydration. The
  // store rehydrates at module scope, before React's first client render, so
  // the swap lands in the same tick as hydration.
  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Register</Link>
        </Button>
      </div>
    );
  }

  const initials =
    `${session.firstName.charAt(0)}${session.lastName.charAt(0)}`.toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    // signOut never throws — it clears the local session even if the revoke
    // call fails, so the user is never stranded in a signed-in UI.
    await signOut();
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-9 rounded-full p-0"
          aria-label="Account menu"
        >
          <Avatar className="size-9">
            <AvatarFallback className="text-caption font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-h3">
              {session.firstName} {session.lastName}
            </span>
            <span className="text-caption text-muted-foreground">{session.email}</span>
            <span className="text-label uppercase text-muted-foreground">
              {userRoleLabel[session.role]}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon className="size-4" aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
