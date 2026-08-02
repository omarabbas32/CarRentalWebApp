"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  Bell,
  BadgeAlert,
  BadgeCheck,
  CalendarPlus,
  CalendarX,
  Car,
  Flag,
  MessageSquare,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/components/providers/auth-provider";
import { NotificationType } from "@/lib/enums";
import { notificationHref } from "@/lib/notifications";
import {
  getServerSnapshot,
  getSnapshot,
  markAllRead,
  markRead,
  subscribe,
} from "@/lib/realtime/notification-store";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@/types/api";

/**
 * The bell.
 *
 * Reads the module store rather than fetching: the header renders on every
 * page, and one shared store means one seed per session instead of one per
 * navigation. New notifications arrive over SignalR and mutate that store, so
 * this component has no fetching logic at all.
 */
export function NotificationBell() {
  const session = useSession();
  const { unreadCount, recent } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Filtered, not gated on loading — the same rule the rest of the shell
  // follows. There is nothing to show a signed-out visitor.
  if (!session) return null;

  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            hasUnread
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="size-4" aria-hidden />
          {hasUnread && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] leading-none font-semibold text-primary-foreground tabular-nums"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-88">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {hasUnread && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-caption text-muted-foreground hover:text-foreground rounded-sm underline-offset-2 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {recent.length === 0 ? (
          <p className="text-caption text-muted-foreground px-2 py-6 text-center">
            Nothing yet. Booking updates and messages land here.
          </p>
        ) : (
          recent.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-caption">
            See all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ notification }: { notification: NotificationDto }) {
  const Icon = ICONS[notification.type];
  const isUnread = notification.readAt === null;

  return (
    <DropdownMenuItem asChild>
      <Link
        href={notificationHref(notification)}
        onClick={() => void markRead(notification.id)}
        className="flex items-start gap-3 py-2"
      >
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isUnread ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "text-body truncate",
              isUnread ? "font-medium" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </span>
          <span className="text-caption text-muted-foreground line-clamp-2">
            {notification.body}
          </span>
        </span>
        {/* Unread is marked by weight, colour *and* this dot — never colour
            alone, per DESIGN.md §2. */}
        {isUnread && (
          <span
            aria-label="Unread"
            className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
          />
        )}
      </Link>
    </DropdownMenuItem>
  );
}

/**
 * Mirrors `notificationIcon` in lib/notifications.ts, which returns names
 * rather than components so that module stays importable by the verify script.
 */
const ICONS: Record<NotificationType, typeof Bell> = {
  [NotificationType.BookingRequested]: CalendarPlus,
  [NotificationType.BookingCancelled]: CalendarX,
  [NotificationType.TripStarted]: Car,
  [NotificationType.TripEnded]: Flag,
  [NotificationType.MessageReceived]: MessageSquare,
  [NotificationType.ReviewReceived]: Star,
  [NotificationType.VerificationApproved]: BadgeCheck,
  [NotificationType.VerificationRejected]: BadgeAlert,
};
