import type {
  GetBookingMessagesResult,
  GetThreadsResult,
  MessageDto,
  UnreadCountResult,
} from "@/types/api";
import { apiRequest } from "./client";

/**
 * Booking-scoped messaging.
 *
 * A thread belongs to one booking and has exactly two sides — its renter and
 * its owner. There is no way to open a conversation with someone you have no
 * booking with, which is the whole reason this needs no blocking or spam
 * controls.
 *
 * The consequence worth knowing: **a renter cannot contact an owner before
 * requesting the car.** Do not add a "Message the owner" button to the car
 * page; there is no endpoint behind it. Requesting the car opens the thread.
 */

/**
 * `GET /api/messages/threads` — every booking you have messages on, most
 * recent first. Bookings nobody has written on do not appear.
 */
export function getThreads(input: { pageNumber?: number; pageSize?: number } = {}) {
  return apiRequest<GetThreadsResult>("getThreads", "/api/messages/threads", {
    query: {
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
    },
  });
}

/**
 * `GET /api/messages/booking/{bookingId}` — one thread, **newest first**.
 *
 * The server pages backwards through history, so page 1 is the bottom of the
 * conversation. Reverse each page before rendering. This is the one endpoint
 * whose wire order deliberately differs from its render order.
 *
 * Admin and Staff can read a thread for support; only the two participants can
 * post into one.
 */
export function getBookingMessages(
  bookingId: string,
  input: { pageNumber?: number; pageSize?: number } = {},
) {
  return apiRequest<GetBookingMessagesResult>(
    "getBookingMessages",
    `/api/messages/booking/${bookingId}`,
    {
      query: {
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
      },
    },
  );
}

/**
 * `POST /api/messages` — post into a thread.
 *
 * Takes no recipient: the server derives it from the booking. Returns the
 * whole message, not an id, because the caller needs the server's `sentAt` to
 * place it correctly and the id to recognise its own message when the SignalR
 * hub echoes it back.
 */
export function sendMessage(bookingId: string, content: string) {
  return apiRequest<MessageDto>("sendMessage", "/api/messages", {
    method: "POST",
    body: { bookingId, content },
  });
}

/**
 * `POST /api/messages/booking/{bookingId}/read` — marks messages addressed to
 * you as read. An admin reading a thread marks nothing, so opening one for
 * support does not clear the participant's badge.
 */
export function markThreadRead(bookingId: string) {
  return apiRequest<void>(
    "markThreadRead",
    `/api/messages/booking/${bookingId}/read`,
    { method: "POST" },
  );
}

/** `GET /api/messages/unread-count` — the pip on the Messages nav item. */
export function getUnreadMessageCount() {
  return apiRequest<UnreadCountResult>(
    "getUnreadMessageCount",
    "/api/messages/unread-count",
  );
}
