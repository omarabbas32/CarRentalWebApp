import { NotificationType } from "@/lib/enums";
import type { NotificationDto } from "@/types/api";

/**
 * Turning a notification into somewhere to go.
 *
 * `relatedEntityId` means nothing on its own — the server sends a bare id and
 * leaves the interpretation to whoever knows what the routes are. This module
 * is the only place that mapping lives.
 *
 * `notificationHref` is checked **exhaustively** by `npm run verify:logic`:
 * adding a member to `NotificationType` without giving it a destination fails
 * the build. A notification you cannot click is worse than one never sent.
 */
export function notificationHref(
  notification: Pick<NotificationDto, "type" | "relatedEntityId">,
): string {
  const id = notification.relatedEntityId;

  switch (notification.type) {
    // All five of these carry a booking id. The booking page is where the
    // trip, its thread and its reviews all live, so they share a destination.
    case NotificationType.BookingRequested:
    case NotificationType.BookingCancelled:
    case NotificationType.TripStarted:
    case NotificationType.TripEnded:
    case NotificationType.MessageReceived:
    case NotificationType.ReviewReceived:
      return id ? `/bookings/${id}` : "/trips";

    // Verification outcomes carry no id — there is only one verification per
    // person and it is on their own account page.
    case NotificationType.VerificationApproved:
    case NotificationType.VerificationRejected:
      return "/account/verification";
  }
}

/**
 * A lucide icon name per type, resolved by the bell.
 *
 * Kept as strings rather than components so this module stays pure and can be
 * imported by the verify script, which has no React runtime.
 */
export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.BookingRequested:
      return "calendar-plus";
    case NotificationType.BookingCancelled:
      return "calendar-x";
    case NotificationType.TripStarted:
      return "car";
    case NotificationType.TripEnded:
      return "flag";
    case NotificationType.MessageReceived:
      return "message-square";
    case NotificationType.ReviewReceived:
      return "star";
    case NotificationType.VerificationApproved:
      return "badge-check";
    case NotificationType.VerificationRejected:
      return "badge-alert";
  }
}

/** Unread is the absence of a read timestamp, not a boolean flag. */
export function isUnread(notification: Pick<NotificationDto, "readAt">): boolean {
  return notification.readAt === null;
}
