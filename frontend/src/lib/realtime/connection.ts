import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { apiUrl, currentAuthToken } from "@/lib/api/client";
import type { MessageDto, NotificationDto } from "@/types/api";

/**
 * The SignalR connection.
 *
 * A plain module store, for the same reasons as `lib/auth/session-store.ts`:
 * it can be read with `useSyncExternalStore` without a setState-in-effect, and
 * exactly one connection is shared by every component that cares.
 *
 * The socket is an *optimisation*. Every notification is a database row before
 * it is an event, and every screen here can be populated over REST. If this
 * never connects the app still works — it just stops updating on its own.
 */

export type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected";

/** Backoff between reconnect attempts. Exhausting it stops the attempts. */
const RECONNECT_DELAYS_MS = [0, 2000, 10_000, 30_000];

type NotificationHandler = (notification: NotificationDto) => void;
type MessageHandler = (message: MessageDto) => void;
type ReconnectHandler = () => void;

const notificationHandlers = new Set<NotificationHandler>();
const messageHandlers = new Set<MessageHandler>();
const reconnectHandlers = new Set<ReconnectHandler>();
const listeners = new Set<() => void>();

let connection: HubConnection | null = null;
/**
 * Guards against a double `start()` — React strict mode mounts effects twice,
 * and two sockets would double every event.
 */
let startInFlight: Promise<void> | null = null;
let status: RealtimeStatus = "idle";

/** Cached so `getSnapshot` is referentially stable. */
let snapshot: { status: RealtimeStatus } = { status: "idle" };

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  snapshot = { status: next };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot;
}

/** The server never renders a live connection. */
export function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

const SERVER_SNAPSHOT = { status: "idle" as RealtimeStatus };

/**
 * Opens the connection. Safe to call repeatedly — concurrent calls share one
 * attempt, and an already-open connection is left alone.
 */
export function start(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (connection?.state === HubConnectionState.Connected) return Promise.resolve();
  if (startInFlight) return startInFlight;

  // Without a token the negotiate request goes out as `Authorization: Bearer `
  // and the hub answers 401 — "Failed to complete negotiation with the
  // server". Connecting anyway would turn an ordinary signed-out state, or a
  // session that lapsed while the tab was closed, into a console error. The
  // provider re-runs `start()` when a session appears.
  if (!currentAuthToken()) {
    setStatus("idle");
    return Promise.resolve();
  }

  const hub = new HubConnectionBuilder()
    .withUrl(apiUrl("/hubs/notifications"), {
      // Called on every connect *and* every reconnect, so a token rotated by
      // the session store's proactive refresh is picked up automatically.
      // Capturing the token once would hand SignalR a value that dies after an
      // hour and cannot be replaced without tearing the connection down.
      accessTokenFactory: () => currentAuthToken() ?? "",
    })
    // Backoff for dropped connections. Note this does *not* cover the initial
    // connect — that failure is handled below.
    //
    // A policy rather than a delay array so it can give up when the session
    // has gone: reconnecting without a token just repeats the 401 four times
    // and logs a negotiation failure for each. Signing in starts a fresh
    // connection through the provider.
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (context) => {
        if (!currentAuthToken()) return null;
        return RECONNECT_DELAYS_MS[context.previousRetryCount] ?? null;
      },
    })
    .configureLogging(LogLevel.Warning)
    .build();

  hub.on("notification", (notification: NotificationDto) => {
    for (const handler of notificationHandlers) handler(notification);
  });

  hub.on("message", (message: MessageDto) => {
    for (const handler of messageHandlers) handler(message);
  });

  hub.onreconnecting(() => setStatus("connecting"));

  hub.onreconnected(() => {
    setStatus("connected");
    // SignalR does not replay what was missed while the socket was down, so
    // anything that was live has to re-read itself over REST.
    for (const handler of reconnectHandlers) handler();
  });

  hub.onclose(() => setStatus("disconnected"));

  connection = hub;
  setStatus("connecting");

  startInFlight = hub
    .start()
    .then(() => {
      setStatus("connected");
    })
    .catch(() => {
      // No retry loop. An initial connect fails because the API is down or the
      // token was rejected, and hammering it fixes neither. The next sign-in
      // or page load tries again; until then the REST paths carry the feature.
      setStatus("disconnected");
      connection = null;
    })
    .finally(() => {
      startInFlight = null;
    });

  return startInFlight;
}

/** Closes the connection. Called on sign-out. */
export async function stop(): Promise<void> {
  const hub = connection;
  connection = null;
  startInFlight = null;

  if (!hub) {
    setStatus("idle");
    return;
  }

  try {
    await hub.stop();
  } catch {
    // Already dead. Nothing to do, and nothing worth telling the user.
  }

  setStatus("idle");
}

export function onNotification(handler: NotificationHandler): () => void {
  notificationHandlers.add(handler);
  return () => notificationHandlers.delete(handler);
}

export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

/**
 * Fires after a dropped connection is re-established — the cue to refetch
 * whatever was being kept live.
 */
export function onReconnected(handler: ReconnectHandler): () => void {
  reconnectHandlers.add(handler);
  return () => reconnectHandlers.delete(handler);
}
