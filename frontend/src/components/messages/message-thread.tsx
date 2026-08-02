"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api/errors";
import {
  getBookingMessages,
  markThreadRead,
  sendMessage,
} from "@/lib/api/messages";
import { canMessageOnBooking } from "@/lib/messages";
import { groupMessagesByDay } from "@/lib/messages";
import { onMessage, onReconnected } from "@/lib/realtime/connection";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { BookingDto, MessageDto } from "@/types/api";

/**
 * The conversation on a booking.
 *
 * History comes over REST; new messages arrive over SignalR. Both write into
 * one local list, de-duplicated by id — the sender appends its own message
 * from the POST response and would otherwise see it twice when the hub echoes
 * it back to the other side.
 */
export function MessageThread({ booking }: { booking: BookingDto }) {
  const session = useSession();
  const [live, setLive] = useState<MessageDto[]>([]);

  const state = useAsync(
    () => getBookingMessages(booking.id, { pageSize: 50 }),
    [booking.id],
  );

  // The server pages newest-first so page 1 is the bottom of the thread.
  // Reverse for display, then append anything that has arrived since.
  const history = state.status === "success" ? [...state.data.messages].reverse() : [];
  const messages = mergeById(history, live);

  const canPost = canMessageOnBooking(booking, session);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.bookingId !== booking.id) return;
      setLive((current) => mergeById(current, [message]));
      // Reading it as it arrives is what keeps the badge honest for someone
      // sitting on the thread.
      void markThreadRead(booking.id);
    });

    return unsubscribe;
  }, [booking.id]);

  useEffect(() => {
    // Messages sent while the socket was down were never pushed, and SignalR
    // does not replay. Re-reading the thread is the only way to catch up.
    const unsubscribe = onReconnected(() => state.reload());
    return unsubscribe;
  }, [state]);

  useEffect(() => {
    void markThreadRead(booking.id);
  }, [booking.id]);

  if (state.status === "loading") return <ThreadSkeleton />;

  if (state.status === "error") {
    return (
      <ErrorState
        title="We couldn't load this conversation"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />
    );
  }

  return (
    <section className="space-y-4" aria-label="Messages">
      <h2 className="text-h2">Messages</h2>

      {messages.length === 0 ? (
        <p className="text-body text-muted-foreground max-w-prose">
          No messages yet. Ask about pickup, parking, or anything else about
          this trip.
        </p>
      ) : (
        <ol className="space-y-6">
          {groupMessagesByDay(messages).map((group) => (
            <li key={group.day} className="space-y-3">
              <p className="text-label text-muted-foreground text-center uppercase">
                {formatDay(group.day)}
              </p>
              <ol className="space-y-2">
                {group.messages.map((message) => (
                  <Bubble
                    key={message.id}
                    message={message}
                    isMine={message.senderId === session?.userId}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {canPost ? (
        <Composer
          bookingId={booking.id}
          onSent={(message) => setLive((current) => mergeById(current, [message]))}
        />
      ) : (
        // Admin and Staff land here: `EnsureThreadParticipant` refuses them on
        // send even though `EnsureParticipant` let them read. Saying so beats
        // a composer that only ever produces a 403.
        <p className="text-caption text-muted-foreground border-t pt-4">
          You can read this conversation but not reply to it.
        </p>
      )}
    </section>
  );
}

function Bubble({ message, isMine }: { message: MessageDto; isMine: boolean }) {
  return (
    <li className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          isMine ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {!isMine && (
          <p className="text-caption mb-0.5 font-medium">
            {message.senderFirstName}
          </p>
        )}
        <p className="text-body whitespace-pre-wrap">{message.content}</p>
        <time
          dateTime={message.sentAt}
          className={cn(
            "text-caption mt-1 block tabular-nums",
            isMine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {new Date(message.sentAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </li>
  );
}

function Composer({
  bookingId,
  onSent,
}: {
  bookingId: string;
  onSent: (message: MessageDto) => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending || content.trim().length === 0) return;

    setSending(true);
    setError(null);

    try {
      const message = await sendMessage(bookingId, content.trim());
      onSent(message);
      setContent("");
      inputRef.current?.focus();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError({
              status: 0,
              operation: "sendMessage",
              message: "That message didn't send. Try again.",
            }),
      );
    } finally {
      setSending(false);
    }
  }

  const fieldErrors = error?.fieldErrors;

  return (
    <form onSubmit={handleSubmit} noValidate className="border-t pt-4">
      <Field data-invalid={fieldErrors?.content ? true : undefined}>
        <FieldLabel htmlFor="message-content" className="sr-only">
          Message
        </FieldLabel>
        <Textarea
          id="message-content"
          ref={inputRef}
          name="content"
          rows={3}
          maxLength={2000}
          placeholder="Write a message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={fieldErrors?.content ? true : undefined}
          aria-describedby={error && !fieldErrors ? "message-error" : undefined}
        />
        <FieldError
          errors={fieldErrors?.content?.map((message) => ({ message }))}
        />
      </Field>

      {error && !fieldErrors && (
        <p id="message-error" role="alert" className="text-destructive text-caption mt-2">
          {error.message}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        {/* Disabled only while in flight, never on invalid input — a disabled
            button gives no reason. */}
        <Button type="submit" disabled={sending}>
          <SendHorizonal className="size-4" aria-hidden />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Union by id, keeping chronological order.
 *
 * The sender has its own message from the POST response before the hub
 * delivers a copy; without this the thread would show it twice.
 */
function mergeById(
  base: readonly MessageDto[],
  incoming: readonly MessageDto[],
): MessageDto[] {
  const byId = new Map<string, MessageDto>();
  for (const message of [...base, ...incoming]) byId.set(message.id, message);

  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) return "Today";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function ThreadSkeleton() {
  return (
    <section className="space-y-4" aria-busy>
      <span className="sr-only">Loading messages</span>
      <Skeleton className="h-6 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-14 w-3/5" />
        <Skeleton className="ml-auto h-14 w-2/5" />
        <Skeleton className="h-14 w-1/2" />
      </div>
      <Skeleton className="h-20 w-full" />
    </section>
  );
}
