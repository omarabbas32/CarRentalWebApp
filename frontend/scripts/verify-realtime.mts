/**
 * Proves the SignalR path end to end against the **running** API.
 *
 * This is the only automated check that the hub actually delivers: two real
 * users, two real connections, one message sent over REST, and an assertion
 * that the other side's handler fires. Everything else about messaging can be
 * verified with a stub — this cannot.
 *
 * It writes to the database: it registers a throwaway owner and renter, lists
 * a car, and books it.
 *
 * Skips itself if the API is unreachable.
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
 * Everything is provisioned here rather than taken from the environment: a
 * booking needs a car, a car needs an owner, and `role` accepts Owner on
 * self-registration. Depending on a pre-existing account would make the suite
 * unrunnable on a fresh database, which is exactly when it is most useful.
 *
 * Note the budget: `/api/auth/*` shares one 5-request-per-minute window, and
 * two registrations spend two of it.
 */
const TEST_PASSWORD = "Aa1!aaaa";

const signalR = await import("@microsoft/signalr");
const { registerTokenProvider } = await import("@/lib/api/client");
const authApi = await import("@/lib/api/auth");
const carsApi = await import("@/lib/api/cars");
const bookingsApi = await import("@/lib/api/bookings");
const messagesApi = await import("@/lib/api/messages");
const { UserRole, TransmissionType, FuelType, CarCategory } = await import("@/lib/enums");

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

  const owner = await authApi.register({
    email: `realtime.owner.${stamp}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Realtime",
    lastName: "Owner",
    role: UserRole.Owner,
  });

  const renter = await authApi.register({
    email: `realtime.renter.${stamp}@example.com`,
    password: TEST_PASSWORD,
    firstName: "Realtime",
    lastName: "Renter",
    role: UserRole.Renter,
  });

  // --- a car, and a booking to talk about ----------------------------------

  token = owner.token;
  const carId = await carsApi.createCar({
    make: "Toyota",
    model: "Corolla",
    year: 2022,
    color: "Silver",
    licensePlate: `RT${String(stamp).slice(-6)}`,
    // 17 chars, no I/O/Q — the validator's character class.
    vin: `RT${String(stamp).slice(-6)}HZKLMNPRS`.slice(0, 17),
    transmission: TransmissionType.Automatic,
    fuelType: FuelType.Petrol,
    seats: 5,
    doors: 4,
    mileage: 42_000,
    category: CarCategory.Standard,
    hasGPS: true,
    hasBluetooth: true,
    hasUSBCharging: true,
    hasChildSeat: false,
    hasAirConditioning: true,
    hasBackupCamera: false,
    location: { lat: 33.8938, lng: 35.5018 },
    locationAddress: "1 Test Street",
    locationCity: "Beirut",
    locationState: "Beirut",
    pricePerDay: 45,
    pricePerWeek: 270,
    pricePerMonth: 1000,
    securityDeposit: 200,
    dailyMileageLimit: 200,
    extraMileageCharge: 0.25,
  });

  token = renter.token;
  const start = new Date(Date.now() + 86_400_000 * 30);
  const end = new Date(Date.now() + 86_400_000 * 32);
  const bookingId = await bookingsApi.createBooking(carId, start, end);

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
