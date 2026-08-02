import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { NotificationDto } from "@/types/api";
import { onNotification, onReconnected } from "./connection";

/**
 * What the bell shows.
 *
 * Seeded over REST, then kept current by hub events. A module store rather
 * than React state so the header, the dropdown and the notifications page all
 * read one source — and so the seed happens once per session rather than once
 * per component that mounts.
 */

/** How many the dropdown holds. The full list lives at /notifications. */
const RECENT_LIMIT = 10;

export type NotificationState = {
  unreadCount: number;
  recent: NotificationDto[];
  /** True until the first REST seed lands. */
  isLoading: boolean;
};

const EMPTY: NotificationState = { unreadCount: 0, recent: [], isLoading: true };
const SERVER_STATE: NotificationState = EMPTY;

let state: NotificationState = EMPTY;
let subscribedToHub = false;
let seedInFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit(next: NotificationState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotificationState {
  return state;
}

export function getServerSnapshot(): NotificationState {
  return SERVER_STATE;
}

/**
 * Loads the bell and starts listening. Idempotent — concurrent calls share one
 * request, and the hub subscription is only ever made once.
 */
export function init(): Promise<void> {
  if (!subscribedToHub) {
    subscribedToHub = true;

    onNotification((notification) => {
      emit({
        // A pushed notification is unread by definition — it was created
        // moments ago by the event that pushed it.
        unreadCount: state.unreadCount + 1,
        recent: [notification, ...state.recent].slice(0, RECENT_LIMIT),
        isLoading: false,
      });
    });

    // Anything that arrived while the socket was down was never delivered, so
    // the only way back to a correct count is to ask.
    onReconnected(() => {
      void refresh();
    });
  }

  return refresh();
}

/** Re-reads the bell from the API. */
export function refresh(): Promise<void> {
  if (seedInFlight) return seedInFlight;

  seedInFlight = Promise.all([
    getUnreadNotificationCount(),
    getNotifications({ pageSize: RECENT_LIMIT }),
  ])
    .then(([count, page]) => {
      emit({
        unreadCount: count.count,
        recent: page.notifications,
        isLoading: false,
      });
    })
    .catch(() => {
      // The bell is not worth an error state. Leaving the last known values
      // and dropping the loading flag degrades to "possibly stale" rather than
      // putting a failure banner in the header of every page.
      emit({ ...state, isLoading: false });
    })
    .finally(() => {
      seedInFlight = null;
    });

  return seedInFlight;
}

/** Clears everything. Called on sign-out so the next user starts empty. */
export function reset() {
  emit(EMPTY);
}

/**
 * Marks one read, updating locally first so the badge responds immediately.
 * A failed call is re-read rather than guessed at.
 */
export async function markRead(id: string): Promise<void> {
  const target = state.recent.find((n) => n.id === id);
  if (target && target.readAt !== null) return;

  const optimistic = new Date().toISOString();
  emit({
    ...state,
    unreadCount: Math.max(0, state.unreadCount - 1),
    recent: state.recent.map((n) =>
      n.id === id ? { ...n, readAt: optimistic } : n,
    ),
  });

  try {
    await markNotificationRead(id);
  } catch {
    await refresh();
  }
}

export async function markAllRead(): Promise<void> {
  const now = new Date().toISOString();
  emit({
    ...state,
    unreadCount: 0,
    recent: state.recent.map((n) => (n.readAt ? n : { ...n, readAt: now })),
  });

  try {
    await markAllNotificationsRead();
  } catch {
    await refresh();
  }
}
