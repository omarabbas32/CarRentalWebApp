import type { GetNotificationsResult, UnreadCountResult } from "@/types/api";
import { apiRequest } from "./client";

/**
 * The REST half of notifications.
 *
 * SignalR pushes new ones to open connections; these endpoints populate the
 * bell on page load and keep the feature working when the socket is down. The
 * push is an optimisation, not the source of truth — every notification is a
 * row before it is an event.
 *
 * None of these take a user id. The server reads it off the JWT, so there is
 * nothing to tamper with.
 */

/** `GET /api/notifications` — paged, newest first. */
export function getNotifications(
  input: { unreadOnly?: boolean; pageNumber?: number; pageSize?: number } = {},
) {
  return apiRequest<GetNotificationsResult>(
    "getNotifications",
    "/api/notifications",
    {
      query: {
        unreadOnly: input.unreadOnly,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
      },
    },
  );
}

/** `GET /api/notifications/unread-count` — the number on the bell. */
export function getUnreadNotificationCount() {
  return apiRequest<UnreadCountResult>(
    "getUnreadNotificationCount",
    "/api/notifications/unread-count",
  );
}

/**
 * `POST /api/notifications/{id}/read` — idempotent; re-marking keeps the first
 * timestamp, so two tabs doing it at once is normal rather than a conflict.
 */
export function markNotificationRead(id: string) {
  return apiRequest<void>(
    "markNotificationRead",
    `/api/notifications/${id}/read`,
    { method: "POST" },
  );
}

/** `POST /api/notifications/read-all`. */
export function markAllNotificationsRead() {
  return apiRequest<void>(
    "markAllNotificationsRead",
    "/api/notifications/read-all",
    { method: "POST" },
  );
}
