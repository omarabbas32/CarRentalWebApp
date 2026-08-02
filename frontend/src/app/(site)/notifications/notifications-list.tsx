"use client";

import Link from "next/link";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotifications } from "@/lib/api/notifications";
import { notificationHref } from "@/lib/notifications";
import { markAllRead, markRead, refresh } from "@/lib/realtime/notification-store";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@/types/api";

/**
 * The full notification history.
 *
 * Unlike the bell, this fetches its own page rather than reading the module
 * store — the store only keeps the ten most recent, and this is where someone
 * goes to find the one from last week.
 */
export function NotificationsList() {
  const state = useAsync(() => getNotifications({ pageSize: 50 }), []);

  if (state.status === "loading") return <ListSkeleton />;

  if (state.status === "error") {
    return (
      <ErrorState
        title="We couldn't load your notifications"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />
    );
  }

  const notifications = state.data.notifications;

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-16 text-center">
        <p className="text-h3">Nothing here yet</p>
        <p className="text-body text-muted-foreground mx-auto mt-2 max-w-prose">
          Booking requests, trip updates and messages will show up here.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/search">Find a car</Link>
        </Button>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => n.readAt === null);

  async function handleMarkAll() {
    await markAllRead();
    // The bell is updated by the store; this list holds its own copy, so it
    // has to re-read to agree with it.
    state.reload();
  }

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => void handleMarkAll()}>
            Mark all read
          </Button>
        </div>
      )}

      <ul className="divide-y rounded-lg border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={state.reload}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationDto;
  onRead: () => void;
}) {
  const isUnread = notification.readAt === null;

  async function handleClick() {
    if (!isUnread) return;
    await markRead(notification.id);
    // Keeps the bell and this list in step. Navigation happens regardless —
    // this is a Link, and a failed mark-read must not block it.
    onRead();
    void refresh();
  }

  return (
    <li>
      <Link
        href={notificationHref(notification)}
        onClick={() => void handleClick()}
        className="hover:bg-accent flex items-start gap-3 px-4 py-4 transition-colors"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            isUnread ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("text-body", isUnread && "font-medium")}>
              {notification.title}
            </span>
            {isUnread && <span className="sr-only">Unread</span>}
            <time
              dateTime={notification.createdAt}
              className="text-caption text-muted-foreground ml-auto shrink-0 tabular-nums"
            >
              {formatWhen(notification.createdAt)}
            </time>
          </span>
          <span className="text-caption text-muted-foreground max-w-prose">
            {notification.body}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Relative for the first day, then a date. "3 days ago" stops being useful
 * quickly, and an exact date is what someone scanning history wants.
 */
function formatWhen(iso: string): string {
  const then = new Date(iso);
  const elapsedMinutes = Math.floor((Date.now() - then.getTime()) / 60_000);

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 60 * 24) return `${Math.floor(elapsedMinutes / 60)}h ago`;

  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ListSkeleton() {
  return (
    <div className="divide-y rounded-lg border" aria-busy>
      <span className="sr-only">Loading notifications</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4">
          <Skeleton className="mt-1.5 size-2 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
