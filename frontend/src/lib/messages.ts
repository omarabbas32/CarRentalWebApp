import { UserRole } from "@/lib/enums";
import type { BookingDto, MessageDto } from "@/types/api";

/**
 * Thread rules, mirroring `BookingAccess.EnsureThreadParticipant`.
 */

type Participant = { userId: string; role: UserRole } | null;

/**
 * The other person in the thread, or `null` if the viewer has no side in it.
 *
 * Admin and Staff get `null` even though they can *read* the thread. That
 * asymmetry is the server's: `EnsureParticipant` (read) exempts them,
 * `EnsureThreadParticipant` (write) does not, because a message needs a
 * recipient and support staff have no counterparty. Rendering a composer for
 * them would produce a 403 on send.
 */
export function counterpartyOf(
  booking: Pick<BookingDto, "renterId" | "ownerId">,
  session: Participant,
): string | null {
  if (!session) return null;
  if (session.userId === booking.renterId) return booking.ownerId;
  if (session.userId === booking.ownerId) return booking.renterId;
  return null;
}

/**
 * Whether to render the composer.
 *
 * Note what is *not* checked: booking status. A thread stays open on a
 * cancelled or completed trip, because those are exactly the conversations
 * that matter most — a damage dispute, a deposit query, a jacket left on the
 * back seat. `SendMessageCommandHandler` has no status guard either.
 */
export function canMessageOnBooking(
  booking: Pick<BookingDto, "renterId" | "ownerId">,
  session: Participant,
): boolean {
  return counterpartyOf(booking, session) !== null;
}

export type MessageDay = {
  /** `YYYY-MM-DD` in the viewer's local time. */
  day: string;
  messages: MessageDto[];
};

/**
 * Groups a thread into day buckets for the date separators.
 *
 * Input is expected oldest-first — reverse the server's page before calling
 * this, since `GET /api/messages/booking/{id}` returns newest first.
 *
 * Days are the viewer's local days, not UTC ones. A message sent at 00:30 in
 * London is "today" to a reader in London even though UTC agrees; one sent at
 * 23:30 UTC is "tomorrow" to a reader in Sydney, and labelling it "yesterday"
 * because the server said so would be wrong for the person actually reading.
 */
export function groupMessagesByDay(
  messages: readonly MessageDto[],
): MessageDay[] {
  const groups: MessageDay[] = [];

  for (const message of messages) {
    const day = localDayKey(message.sentAt);
    const last = groups[groups.length - 1];

    if (last && last.day === day) {
      last.messages.push(message);
    } else {
      groups.push({ day, messages: [message] });
    }
  }

  return groups;
}

/**
 * Local calendar day, built from the date parts rather than
 * `toISOString().slice(0, 10)` — that converts to UTC first and would put
 * evening messages on the wrong day for anyone west of Greenwich.
 */
function localDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
