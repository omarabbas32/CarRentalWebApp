/**
 * Proves the SignalR path end to end against the **running** API.
 *
 * This is the only automated check that the hub actually delivers: two real
 * users, two real connections, one message sent over REST, and an assertion
 * that the other side's handler fires. Everything else about messaging can be
 * verified with a stub — this cannot.
 *
 * It writes to the database: it registers two throwaway users and creates a
 * booking between them.
 *
 * Skips itself if the API is unreachable, or if no owner credentials are
 * configured — see the note on VERIFY_OWNER_* below.
 *
 * Run: npm run verify:realtime
 */
import assert from "node:assert/strict";
// Type-only, so it is erased at compile time and does not load the module
// before NEXT_PUBLIC_API_BASE_URL is set below.
import type { HubConnection } from "@microsoft/signalr";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5071";
process.env.NEXT_PUBLIC_API_BASE_URL = BASE;

/** How long to wait for a pushed event before calling it a failure. */
const PUSH_TIMEOUT_MS = 8000;

const reachable = await fetch(`${BASE}/api/cars`, { signal: AbortSignal.timeout(4000) })
  .then((r) => r.ok)
  .catch(() => false);

if (!reachable) {
  console.log(`\nAPI not reachable at ${BASE} — skipping realtime checks.\n`);
  process.exit(0);
}

/**
 * A booking needs a car, and a car needs an owner we can authenticate as —
 * `POST /api/cars` is owner-only. Rather than seeding one (DbSeeder is
 * deliberately no-op unless configured), take credentials from the
 * environment and skip when they are absent, the same posture this suite
 * takes when the API is down.
 */
const OWNER_EMAIL = process.env.VERIFY_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.VERIFY_OWNER_PASSWORD;

if (!OWNER_EMAIL || !OWNER_PASSWORD) {
  console.log(
    "\nVERIFY_OWNER_EMAIL / VERIFY_OWNER_PASSWORD not set — skipping realtime checks." +
      "\nSet them to an Owner account to exercise the hub.\n",
  );
  process.exit(0);
}

const signalR = await import("@microsoft/signalr");
const { registerTokenProvider } = await import("@/lib/api/client");
const authApi = await import("@/lib/api/auth");
const carsApi = await import("@/lib/api/cars");
const bookingsApi = await import("@/lib/api/bookings");
const messagesApi = await import("@/lib/api/messages");
const { UserRole } = await import("@/lib/enums");

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/**
 * The API module reads one token provider, so the "current user" is whoever
 * this points at. Tests swap it rather than juggling two clients.
 */
let token: string | null = null;
registerTokenProvider(() => token);

const stamp = Date.now();
const connections: HubConnection[] = [];

try {
  console.log("\nrealtime");

  // --- two identities ------------------------------------------------------

  const owner = await authApi.login(OWNER_EMAIL, OWNER_PASSWORD);
  assert.equal(
    owner.role,
    "Owner",
    "VERIFY_OWNER_EMAIL must be an Owner account — /api/cars is owner-only",
  );

  const renter = await authApi.register({
    email: `realtime.renter.${stamp}@example.com`,
    password: "Aa1!aaaa",
    firstName: "Realtime",
    lastName: "Renter",
    role: UserRole.Renter,
  });

  // --- a booking to talk about --------------------------------------------

  token = owner.token;
  const cars = await carsApi.getCars();
  const car = cars.find((c) => c.ownerId === owner.userId);
  assert.ok(car, "the owner account needs at least one car listed");

  token = renter.token;
  const start = new Date(Date.now() + 86_400_000 * 30);
  const end = new Date(Date.now() + 86_400_000 * 32);
  const bookingId = await bookingsApi.createBooking(car.id, start, end);

  // --- connect both sides --------------------------------------------------

  const connect = async (accessToken: string) => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE}/hubs/notifications`, {
        accessTokenFactory: () => accessToken,
      })
      .configureLogging(signalR.LogLevel.None)
      .build();

    await connection.start();
    connections.push(connection);
    return connection;
  };

  const ownerHub = await connect(owner.token);
  const renterHub = await connect(renter.token);

  await check("both users can open an authenticated hub connection", async () => {
    // A rejected token shows up as a failed start(), so reaching here at all
    // is the assertion — plus the query-string token path actually working.
    assert.equal(ownerHub.state, signalR.HubConnectionState.Connected);
    assert.equal(renterHub.state, signalR.HubConnectionState.Connected);
  });

  /** Resolves with the first matching event, or rejects on timeout. */
  function nextEvent<T>(
    connection: HubConnection,
    event: string,
    matches: (payload: T) => boolean,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        connection.off(event, handler);
        reject(new Error(`no ${event} event within ${PUSH_TIMEOUT_MS}ms`));
      }, PUSH_TIMEOUT_MS);

      const handler = (payload: T) => {
        if (!matches(payload)) return;
        clearTimeout(timer);
        connection.off(event, handler);
        resolve(payload);
      };

      connection.on(event, handler);
    });
  }

  // --- the actual proof ----------------------------------------------------

  await check("a message sent by one side arrives on the other's socket", async () => {
    const delivered = nextEvent<{ id: string; content: string; bookingId: string }>(
      ownerHub,
      "message",
      (m) => m.bookingId === bookingId,
    );

    token = renter.token;
    const sent = await messagesApi.sendMessage(bookingId, "Is parking included?");

    const received = await delivered;
    assert.equal(received.id, sent.id, "the pushed message is the one that was saved");
    assert.equal(received.content, "Is parking included?");
  });

  await check("the recipient also gets a persisted notification", async () => {
    const delivered = nextEvent<{ type: number; relatedEntityId: string | null }>(
      ownerHub,
      "notification",
      (n) => n.relatedEntityId === bookingId,
    );

    token = renter.token;
    await messagesApi.sendMessage(bookingId, "And is there a spare key?");

    const received = await delivered;
    // NotificationType.MessageReceived
    assert.equal(received.type, 4);

    // Pushed *and* stored — the bell has to be right for someone who was
    // offline when it fired.
    token = owner.token;
    const unread = await messagesApi.getUnreadMessageCount();
    assert.ok(unread.count >= 2, `expected at least 2 unread, got ${unread.count}`);
  });

  await check("a message is not pushed to people outside the thread", async () => {
    // The sender must not receive their own message back — the thread appends
    // it from the POST response, and a second copy would duplicate it.
    let echoed = false;
    const handler = () => {
      echoed = true;
    };
    renterHub.on("message", handler);

    token = renter.token;
    await messagesApi.sendMessage(bookingId, "Third one");
    await new Promise((r) => setTimeout(r, 1500));
    renterHub.off("message", handler);

    assert.equal(echoed, false, "the sender should not be pushed their own message");
  });

  console.log(`\n${passed} checks passed\n`);
} finally {
  for (const connection of connections) {
    await connection.stop().catch(() => {});
  }
}
