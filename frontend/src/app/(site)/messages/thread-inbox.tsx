"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getThreads } from "@/lib/api/messages";
import { bookingStatusClasses, bookingStatusLabel } from "@/lib/enums";
import { onMessage } from "@/lib/realtime/connection";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { ThreadSummaryDto } from "@/types/api";

/**
 * The conversation list.
 *
 * Bookings nobody has written on do not appear — the server groups messages
 * rather than starting from bookings, so a silent trip is not a thread.
 */
export function ThreadInbox() {
  const state = useAsync(() => getThreads({ pageSize: 50 }), []);

  useEffect(() => {
    // A message on any thread changes this list's order and its unread counts,
    // and it is cheaper to re-read than to patch the summary in place.
    const unsubscribe = onMessage(() => state.reload());
    return unsubscribe;
  }, [state]);

  if (state.status === "loading") return <InboxSkeleton />;

  if (state.status === "error") {
    return (
      <ErrorState
        title="We couldn't load your messages"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />
    );
  }

  const threads = state.data.threads;

  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-16 text-center">
        <p className="text-h3">No conversations yet</p>
        <p className="text-body text-muted-foreground mx-auto mt-2 max-w-prose">
          Conversations open once you request a car — that is who you would be
          talking to.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/search">Find a car</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {threads.map((thread) => (
        <ThreadRow key={thread.bookingId} thread={thread} />
      ))}
    </ul>
  );
}

function ThreadRow({ thread }: { thread: ThreadSummaryDto }) {
  const hasUnread = thread.unreadCount > 0;

  return (
    <li>
      <Link
        href={`/bookings/${thread.bookingId}`}
        className="hover:bg-accent flex items-start gap-4 px-4 py-4 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-body truncate", hasUnread && "font-medium")}>
              {thread.counterpartyFirstName} {thread.counterpartyLastName}
            </span>
            <span
              className={cn(
                "text-label rounded-full px-2 py-0.5 uppercase",
                bookingStatusClasses[thread.bookingStatus],
              )}
            >
              {bookingStatusLabel[thread.bookingStatus]}
            </span>
            <time
              dateTime={thread.lastMessageAt}
              className="text-caption text-muted-foreground ml-auto shrink-0 tabular-nums"
            >
              {new Date(thread.lastMessageAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </time>
          </div>

          <p className="text-caption text-muted-foreground truncate">
            {thread.carYear} {thread.carMake} {thread.carModel}
          </p>

          <p
            className={cn(
              "text-caption truncate",
              hasUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {thread.lastMessagePreview}
          </p>
        </div>

        {hasUnread && (
          <span className="bg-primary text-primary-foreground text-label mt-1 flex size-5 shrink-0 items-center justify-center rounded-full tabular-nums">
            {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
            <span className="sr-only"> unread</span>
          </span>
        )}
      </Link>
    </li>
  );
}

function InboxSkeleton() {
  return (
    <div className="divide-y rounded-lg border" aria-busy>
      <span className="sr-only">Loading conversations</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 px-4 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
      ))}
    </div>
  );
}
