/**
 * Drives the renter loop against the **running** .NET API, through the same
 * client functions the UI calls.
 *
 * Unlike verify-client.mts (which uses a stub), this proves the contract: real
 * property names, real status codes, real pricing. It writes to the database —
 * it registers a throwaway renter and creates a booking, then cancels it.
 *
 * Skips itself if the API is not reachable.
 *
 * Run: npm run verify:live
 */
import assert from "node:assert/strict";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5071";
process.env.NEXT_PUBLIC_API_BASE_URL = BASE;

const reachable = await fetch(`${BASE}/api/cars`, { signal: AbortSignal.timeout(4000) })
  .then((r) => r.ok)
  .catch(() => false);

if (!reachable) {
  console.log(`\nAPI not reachable at ${BASE} — skipping live checks.\n`);
  process.exit(0);
}

const { registerTokenProvider } = await import("@/lib/api/client");
const authApi = await import("@/lib/api/auth");
const carsApi = await import("@/lib/api/cars");
const bookingsApi = await import("@/lib/api/bookings");
const { priceBreakdown, breakdownFromBooking } = await import("@/lib/pricing");
const { BookingStatus, UserRole } = await import("@/lib/enums");
const { canCancelBooking } = await import("@/lib/bookings");
const { ApiError } = await import("@/lib/api/errors");

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

let token: string | null = null;
registerTokenProvider(() => token);

// A far-future window, so repeated runs do not collide with earlier ones.
const stamp = Number(process.env.RUN_STAMP ?? "0") || 1;
const start = new Date(Date.UTC(2027, 0, (stamp % 20) + 1));
const end = new Date(start.getTime() + 4 * 86_400_000);

console.log(`\nlive renter loop  (${BASE})`);

const cars = await carsApi.getCars();
assert.ok(cars.length > 0, "no cars in the database to test against");
const car = cars[0];

const session = await authApi.register({
  email: `verify.${Date.now()}@example.com`,
  password: "Passw0rd!",
  firstName: "Verify",
  lastName: "Renter",
  role: UserRole.Renter,
});
token = session.token;

await check("register returns a usable session", async () => {
  assert.ok(session.token.length > 0);
  assert.ok(session.refreshToken.length > 0);
  assert.equal(session.role, "Renter", "role is a string, not an int");
  assert.ok(new Date(session.expiry).getTime() > Date.now());
});

let bookingId: string;

await check("createBooking sends only the car and dates, and succeeds", async () => {
  bookingId = await bookingsApi.createBooking(car.id, start, end);
  assert.match(bookingId, /^[0-9a-f-]{36}$/i);
});

await check("the client quote matches the server's price to the cent", async () => {
  const booking = await bookingsApi.getBooking(bookingId);
  const quoted = priceBreakdown(car.pricePerDay, car.securityDeposit, start, end);
  const charged = breakdownFromBooking(booking);

  assert.equal(quoted.totalDays, charged.totalDays);
  assert.equal(quoted.subtotal, charged.subtotal);
  assert.equal(quoted.serviceFee, charged.serviceFee);
  assert.equal(quoted.taxAmount, charged.taxAmount);
  assert.equal(quoted.securityDeposit, charged.securityDeposit);
  assert.equal(quoted.total, charged.total, "the quote must equal the charge");
});

await check("a new booking lands in Pending, not Confirmed", async () => {
  const booking = await bookingsApi.getBooking(bookingId);
  assert.equal(booking.status, BookingStatus.Pending);
  // Which is why the button says "Request this car".
  assert.equal(canCancelBooking(booking.status), true);
});

await check("mileageLimit is null — the known dead-code defect", async () => {
  const booking = await bookingsApi.getBooking(bookingId);
  assert.equal(booking.mileageLimit, null);
  assert.ok(
    booking.extraMileageCharge == null || booking.extraMileageCharge === 0,
    "the overage branch cannot fire while mileageLimit is unset",
  );
});

await check("the booking appears under the renter's own trips", async () => {
  const result = await bookingsApi.getBookings({ renterId: session.userId, pageSize: 100 });
  assert.ok(result.bookings.some((b) => b.id === bookingId));
  assert.equal(typeof result.totalCount, "number");
});

await check("double-booking the same dates is refused as a generic 500", async () => {
  const other = await authApi.register({
    email: `verify.dupe.${Date.now()}@example.com`,
    password: "Passw0rd!",
    firstName: "Second",
    lastName: "Renter",
    role: UserRole.Renter,
  });
  const previous = token;
  token = other.token;
  try {
    await bookingsApi.createBooking(car.id, start, end);
    assert.fail("expected the second booking to be refused");
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 500, "business failures throw plain Exception");
    assert.equal(e.message, "Those dates were just taken. Try different dates.");
  } finally {
    token = previous;
  }
});

await check("cancelling moves it to Cancelled and stores the reason", async () => {
  await bookingsApi.cancelBooking(bookingId, "Automated verification");
  const booking = await bookingsApi.getBooking(bookingId);
  assert.equal(booking.status, BookingStatus.Cancelled);
  assert.equal(booking.cancellationReason, "Automated verification");
  assert.ok(booking.cancelledAt);
  // The control must disappear now — cancelling again would 500.
  assert.equal(canCancelBooking(booking.status), false);
});

await check("cancelling twice is refused, as the UI assumes", async () => {
  try {
    await bookingsApi.cancelBooking(bookingId, "again");
    assert.fail("expected the second cancel to be refused");
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.message, "This booking can no longer be cancelled.");
  }
});

/* ------------------------------------------------------------------ *
 * Privilege escalation — the reason registration takes a role at all
 * ------------------------------------------------------------------ */

await check("registration refuses a privileged role", async () => {
  // `RegisterCommandValidator` used to validate the role with `IsInEnum()`
  // alone, which passes for Admin = 2 on a public endpoint. Anyone could mint
  // themselves an admin token and read every user's identity documents.
  //
  // Only Admin is attempted, not Admin *and* Staff: one `.Must()` covers both,
  // and every extra call here spends the auth budget described below.
  try {
    await authApi.register({
      email: `esc.${Date.now()}@example.com`,
      password: "Passw0rd!",
      firstName: "Esc",
      lastName: "Check",
      role: UserRole.Admin,
    });
    assert.fail("expected Admin to be refused");
  } catch (e) {
    assert.ok(e instanceof ApiError, "should be an ApiError");
    assert.equal(e.status, 400, "a refused role is a validation error");
    assert.ok(e.fieldErrors?.role?.length, "and it binds to the role field");
  }
});

await check("provisioning a user needs an Admin token", async () => {
  // `POST /api/users` was the quieter second route to the same escalation:
  // public, any role, and no password rule at all.
  const response = await fetch(`${BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `esc.users.${Date.now()}@example.com`,
      password: "a",
      phoneNumber: "+962791234567",
      firstName: "Esc",
      lastName: "Check",
      role: UserRole.Admin,
    }),
  });
  assert.equal(response.status, 401, "unauthenticated provisioning must be refused");
});

/* ------------------------------------------------------------------ *
 * The rest of the token lifecycle
 * ------------------------------------------------------------------ */

// `/api/auth/*` shares **one** fixed window of 5 requests per minute across
// login, register, refresh and logout, with `QueueLimit = 0`. By this point the
// run has spent three of them on registrations, so refresh and logout would be
// rejected with the limiter's 503 rather than tested.
//
// Waiting the window out is the honest way to check them. It is also the only
// place in the suite that proves the limiter is real: an earlier version of
// this file failed here, which is how the budget got documented at all.
const WINDOW_MS = 61_000;
console.log(`  …  waiting ${WINDOW_MS / 1000}s for the /api/auth rate-limit window`);
await new Promise((resolve) => setTimeout(resolve, WINDOW_MS));

await check("login exchanges the same credentials for a fresh session", async () => {
  // The suite registers rather than logs in everywhere else, so without this
  // the one endpoint every returning user hits would go unexercised.
  const again = await authApi.login(session.email, "Passw0rd!");
  assert.equal(again.userId, session.userId);
  assert.equal(again.role, "Renter", "role is a string, not an int");
  assert.ok(again.token.length > 0);
  assert.notEqual(again.refreshToken, session.refreshToken, "a fresh refresh token");
  token = again.token;
  session.refreshToken = again.refreshToken;
});

await check("refresh rotates the token and the old one still identifies the user", async () => {
  const refreshed = await authApi.refresh(token!, session.refreshToken);
  assert.ok(refreshed.token.length > 0);
  assert.notEqual(refreshed.refreshToken, session.refreshToken, "refresh tokens rotate");
  assert.equal(refreshed.userId, session.userId);
  assert.ok(new Date(refreshed.expiry).getTime() > Date.now());
  // Use the new one from here, as the store would.
  token = refreshed.token;
  session.refreshToken = refreshed.refreshToken;
});

await check("a token-bearing call still works after the rotation", async () => {
  const trips = await bookingsApi.getBookings({ renterId: session.userId, pageSize: 10 });
  assert.ok(trips.bookings.some((b) => b.id === bookingId));
});

await check("logout revokes the refresh token", async () => {
  await authApi.logout(session.refreshToken);
  try {
    await authApi.refresh(token!, session.refreshToken);
    assert.fail("expected a revoked refresh token to be refused");
  } catch (e) {
    assert.ok(e instanceof ApiError);
    // "Invalid token." is a plain Exception server-side, so it arrives as a
    // 500 — which is why the client supplies its own wording.
    assert.ok(e.status >= 400, `unexpected status ${e.status}`);
  }
});

console.log(`\n${passed} live checks passed\n`);
