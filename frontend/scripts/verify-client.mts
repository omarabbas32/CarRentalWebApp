/**
 * Exercises the API client against a stub HTTP server that imitates the real
 * backend's response shapes.
 *
 * This does not verify the *contract* — only a running .NET API can confirm
 * property names and status codes. What it does verify is that the client
 * layer behaves correctly given those shapes: query building, enum
 * serialisation, bearer injection, 204 and bare-scalar bodies, 400 field-error
 * mapping, and the business-rule 500 → human sentence path.
 *
 * Run: npm run verify:client
 */
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";

let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

// --- stub API --------------------------------------------------------------

type Recorded = { method: string; url: string; auth?: string; body: string };
const seen: Recorded[] = [];

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    seen.push({
      method: req.method ?? "",
      url: req.url ?? "",
      auth: req.headers.authorization,
      body,
    });
    const url = new URL(req.url ?? "/", "http://x");
    const json = (status: number, payload: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    switch (true) {
      case url.pathname === "/api/auth/login":
        return json(200, {
          token: "jwt-token", refreshToken: "refresh-token",
          expiry: new Date(Date.now() + 3_600_000).toISOString(),
          userId: "u1", email: "nour@example.com",
          firstName: "Nour", lastName: "Haddad", role: "Owner",
        });

      // A credential failure: plain Exception -> generic 500.
      case url.pathname === "/api/auth/login-bad":
        return json(500, { error: "An internal server error occurred." });

      case url.pathname === "/api/auth/logout":
        res.writeHead(204); return res.end();

      case url.pathname === "/api/cars/search":
        return json(200, {
          cars: [{ id: "c1", make: "Toyota", imageUrls: ["https://res.cloudinary.com/d/image/upload/v1/a.jpg"] }],
          totalCount: 1, pageNumber: 1, pageSize: 20, totalPages: 1,
        });

      // Create returns a bare JSON string, not an object.
      case url.pathname === "/api/bookings" && req.method === "POST":
        return json(200, "b7f1c0de-0000-4000-8000-000000000001");

      case url.pathname === "/api/cars" && req.method === "POST":
        return json(400, {
          errors: {
            PricePerDay: ["Price per day must be greater than 0."],
            VIN: ["VIN must be exactly 17 characters."],
          },
        });

      // GetCarById throws NotFoundException now, so this is a real 404.
      case url.pathname === "/api/cars/missing":
        return json(404, { error: "Entity \"Car\" (missing) was not found." });

      // ConflictException — the one status whose message is written for the
      // user and is passed through rather than replaced.
      case url.pathname === "/api/cars/booked" && req.method === "DELETE":
        return json(409, {
          error:
            "This car has 3 bookings against it and cannot be deleted. Set IsActive to false to take it out of search instead — that keeps its booking history.",
        });

      case url.pathname === "/api/cars/conflict-empty" && req.method === "DELETE":
        return json(409, {});

      case url.pathname === "/api/bookings/nope":
        return json(404, { error: "Booking not found." });

      case url.pathname === "/api/users/pending-verifications":
        return json(403, { error: "You do not have permission to perform this action." });

      case url.pathname === "/api/auth/register":
        // ASP.NET's fixed-window limiter rejects with 503 by default.
        return json(503, {});

      case url.pathname === "/api/needs-auth":
        return json(401, { error: "Authentication is required." });

      case url.pathname === "/api/users/u1":
        return json(200, { id: "u1", email: "nour@example.com", role: 1 });

      // --- messages -------------------------------------------------------

      // SendMessage returns the whole DTO, not a bare id: the sender needs the
      // server's SentAt to order its optimistic append.
      case url.pathname === "/api/messages" && req.method === "POST":
        return json(200, {
          id: "m1", bookingId: "b1", senderId: "u1", senderFirstName: "Nour",
          receiverId: "u2", content: "On my way", sentAt: "2026-05-10T09:00:00Z",
          readAt: null,
        });

      // EnsureThreadParticipant refuses Admin and Staff on send, unlike the
      // read path.
      case url.pathname === "/api/messages/forbidden" && req.method === "POST":
        return json(403, { error: "You do not have permission to perform this action." });

      case url.pathname === "/api/messages/booking/b1":
        return json(200, {
          messages: [{
            id: "m1", bookingId: "b1", senderId: "u1", senderFirstName: "Nour",
            receiverId: "u2", content: "Newest first on the wire",
            sentAt: "2026-05-10T09:00:00Z", readAt: null,
          }],
          totalCount: 1, pageNumber: 2, pageSize: 25, totalPages: 1,
        });

      case url.pathname === "/api/messages/booking/b1/read" && req.method === "POST":
        res.writeHead(204); return res.end();

      case url.pathname === "/api/messages/unread-count":
        return json(200, { count: 3 });

      // --- reviews --------------------------------------------------------

      case url.pathname === "/api/reviews" && req.method === "POST":
        return json(200, "r7f1c0de-0000-4000-8000-000000000001");

      // Both review refusals are ConflictExceptions whose text is written for
      // the user and must reach them unaltered.
      case url.pathname === "/api/reviews/duplicate" && req.method === "POST":
        return json(409, { error: "You've already reviewed this trip." });

      case url.pathname === "/api/reviews/car/c1":
        return json(200, {
          reviews: [{
            id: "r1", bookingId: "b1", carId: "c1", reviewerId: "u1",
            reviewerFirstName: "Nour", reviewerLastName: "Haddad",
            revieweeId: "u2", type: 0, rating: 5, comment: "Spotless",
            createdAt: "2026-05-10T09:00:00Z",
          }],
          totalCount: 1, pageNumber: 1, pageSize: 20, totalPages: 1,
        });

      // --- notifications --------------------------------------------------

      case url.pathname === "/api/notifications":
        return json(200, {
          notifications: [{
            id: "n1", type: 4, title: "Message from Nour", body: "On my way",
            relatedEntityId: "b1", readAt: null, createdAt: "2026-05-10T09:00:00Z",
          }],
          totalCount: 1, pageNumber: 1, pageSize: 10, totalPages: 1,
        });

      case url.pathname === "/api/notifications/unread-count":
        return json(200, { count: 7 });

      case url.pathname === "/api/notifications/n1/read" && req.method === "POST":
        res.writeHead(204); return res.end();

      case url.pathname === "/api/notifications/read-all" && req.method === "POST":
        res.writeHead(204); return res.end();

      default:
        return json(404, { error: "not found" });
    }
  });
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as AddressInfo).port;
process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;

// Imported after the base URL is set — the client reads it at module load.
const { apiRequest, registerTokenProvider, registerUnauthorizedHandler } = await import(
  "@/lib/api/client"
);
const { ApiError } = await import("@/lib/api/errors");
const carsApi = await import("@/lib/api/cars");
const bookingsApi = await import("@/lib/api/bookings");
const authApi = await import("@/lib/api/auth");
const { CarCategory } = await import("@/lib/enums");
const messagesApi = await import("@/lib/api/messages");
const reviewsApi = await import("@/lib/api/reviews");
const notificationsApi = await import("@/lib/api/notifications");

try {
  console.log("\nrequests");

  await check("GET with query: dates are UTC, category is the enum name", async () => {
    seen.length = 0;
    await carsApi.searchCars({
      city: "Amman",
      start: new Date("2026-08-01T00:00:00Z"),
      end: new Date("2026-08-05T00:00:00Z"),
      category: CarCategory.FullSize,
      features: ["gps", "ac"],
      pageSize: 20,
    });
    const q = new URL(seen[0].url, "http://x").searchParams;
    assert.equal(q.get("city"), "Amman");
    assert.equal(q.get("startDate"), "2026-08-01T00:00:00.000Z");
    assert.equal(q.get("category"), "FullSize", "name, not int, not label");
    assert.deepEqual(q.getAll("features"), ["gps", "ac"], "repeated key for List<T>");
  });

  await check("empty and undefined query values are dropped", async () => {
    seen.length = 0;
    await carsApi.searchCars({
      start: new Date("2026-08-01T00:00:00Z"),
      end: new Date("2026-08-05T00:00:00Z"),
    });
    const q = new URL(seen[0].url, "http://x").searchParams;
    assert.equal(q.has("city"), false);
    assert.equal(q.has("minPrice"), false);
    assert.equal(q.has("category"), false);
  });

  await check("bearer token is attached, and withheld from auth routes", async () => {
    registerTokenProvider(() => "jwt-token");
    seen.length = 0;
    await apiRequest("getUser", "/api/users/u1");
    assert.equal(seen[0].auth, "Bearer jwt-token");

    seen.length = 0;
    await authApi.login("nour@example.com", "pw");
    assert.equal(seen[0].auth, undefined, "login must not send a stale token");
  });

  await check("createBooking sends only carId and dates — no renterId", async () => {
    seen.length = 0;
    const id = await bookingsApi.createBooking(
      "c1",
      new Date("2026-08-01T00:00:00Z"),
      new Date("2026-08-05T00:00:00Z"),
    );
    const body = JSON.parse(seen[0].body);
    assert.deepEqual(Object.keys(body).sort(), ["carId", "endDate", "startDate"]);
    assert.equal("renterId" in body, false, "renterId comes from the JWT");
    // A bare JSON string body still parses to the id.
    assert.equal(id, "b7f1c0de-0000-4000-8000-000000000001");
  });

  await check("204 resolves to undefined rather than throwing", async () => {
    assert.equal(await authApi.logout("refresh-token"), undefined);
  });

  await check("paged result keeps the resource-named array", async () => {
    const result = await carsApi.searchCars({
      start: new Date("2026-08-01T00:00:00Z"),
      end: new Date("2026-08-05T00:00:00Z"),
    });
    assert.equal(result.cars.length, 1);
    assert.equal(result.totalCount, 1);
  });

  console.log("\nerrors");

  await check("400 becomes camelCase field errors", async () => {
    const err = await capture(() =>
      apiRequest("createCar", "/api/cars", { method: "POST", body: {} }),
    );
    assert.equal(err.status, 400);
    assert.ok(err.isValidation);
    assert.deepEqual(err.fieldErrors, {
      pricePerDay: ["Price per day must be greater than 0."],
      vin: ["VIN must be exactly 17 characters."],
    });
  });

  await check("business-rule 500 never leaks the server's text", async () => {
    const err = await capture(() =>
      apiRequest("login", "/api/auth/login-bad", { method: "POST", body: {}, auth: false }),
    );
    assert.equal(err.status, 500);
    assert.equal(err.message, "Email or password is incorrect.");
    assert.ok(!err.message.includes("internal server error"));
  });

  await check("a missing car is a real 404 now, not a 500", async () => {
    // GetCarById used to throw a plain Exception, so "no such car" and "server
    // broke" were the same response. It throws NotFoundException now.
    const err = await capture(() => apiRequest("getCar", "/api/cars/missing"));
    assert.ok(err.isNotFound);
    assert.match(err.message, /couldn't find this car/);
    assert.ok(!err.message.includes("was not found"), "server wording never reaches a user");
  });

  await check("a 409 shows the server's own message", async () => {
    // The one status whose text is written for the person reading it: no
    // amount of operation context could reconstruct "3 bookings".
    const err = await capture(() =>
      apiRequest("deleteCar", "/api/cars/booked", { method: "DELETE" }),
    );
    assert.ok(err.isConflict);
    assert.match(err.message, /3 bookings against it/);
    assert.match(err.message, /IsActive/, "and names the reversible alternative");
  });

  await check("a 409 with no usable body falls back to operation wording", async () => {
    const err = await capture(() =>
      apiRequest("deleteCar", "/api/cars/conflict-empty", { method: "DELETE" }),
    );
    assert.ok(err.isConflict);
    assert.match(err.message, /Turn off Listed/);
  });

  await check("404 and 403 carry operation-specific wording", async () => {
    const notFound = await capture(() => apiRequest("getBooking", "/api/bookings/nope"));
    assert.ok(notFound.isNotFound);
    assert.equal(notFound.message, "We couldn't find this booking.");

    const forbidden = await capture(() =>
      apiRequest("getPendingVerifications", "/api/users/pending-verifications"),
    );
    assert.ok(forbidden.isForbidden);
    assert.equal(forbidden.message, "You don't have access to the review queue.");
  });

  await check("503 from the rate limiter is recognised as rate limiting", async () => {
    const err = await capture(() =>
      apiRequest("register", "/api/auth/register", { method: "POST", body: {}, auth: false }),
    );
    assert.ok(err.isRateLimited, "ASP.NET's default rejection code");
    assert.match(err.message, /Too many attempts/);
  });

  await check("an unreachable server is distinguished from a server error", async () => {
    const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:1";
    try {
      const err = await capture(() => apiRequest("getCars", "/api/cars"));
      assert.ok(err.isNetworkError);
      assert.equal(err.status, 0);
      assert.match(err.message, /Can't reach the server/);
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = saved;
    }
  });

  await check("the 401 backstop fires for guarded calls only", async () => {
    let fired = 0;
    registerUnauthorizedHandler(() => fired++);

    await capture(() => apiRequest("getUser", "/api/needs-auth", { auth: true }));
    assert.equal(fired, 1, "a guarded call triggers the backstop");

    await capture(() => apiRequest("refresh", "/api/needs-auth", { auth: false }));
    assert.equal(fired, 1, "auth routes must not trigger it — that would loop");
  });

  await check("sendMessage returns the whole message, not just an id", async () => {
    // The sender needs SentAt to order its optimistic append, and the id to
    // recognise its own message when the hub echoes it back.
    const message = await messagesApi.sendMessage("b1", "On my way");
    assert.equal(message.id, "m1");
    assert.equal(message.sentAt, "2026-05-10T09:00:00Z");
    assert.equal(message.senderFirstName, "Nour");
  });

  await check("a 403 on send is explained in terms of bookings", async () => {
    const error = await capture(() =>
      apiRequest("sendMessage", "/api/messages/forbidden", { method: "POST" }),
    );
    assert.equal(error.status, 403);
    assert.match(error.message, /booking/i);
  });

  await check("thread paging serialises into the query string", async () => {
    const page = await messagesApi.getBookingMessages("b1", {
      pageNumber: 2,
      pageSize: 25,
    });
    assert.equal(page.pageNumber, 2);
    assert.equal(page.pageSize, 25);
    // Named after the resource, like every other paged wrapper.
    assert.ok(Array.isArray(page.messages));
  });

  await check("marking a thread read is a 204 with no body", async () => {
    const result = await messagesApi.markThreadRead("b1");
    assert.equal(result, undefined);
  });

  await check("unread counts come back as a number", async () => {
    assert.equal((await messagesApi.getUnreadMessageCount()).count, 3);
    assert.equal((await notificationsApi.getUnreadNotificationCount()).count, 7);
  });

  await check("createReview returns a bare id string", async () => {
    const id = await reviewsApi.createReview("b1", 5, "Spotless");
    assert.equal(typeof id, "string");
  });

  await check("a duplicate review keeps the server's own sentence", async () => {
    // ConflictException text is written for the user. Replacing it with our
    // own wording would lose the only thing that explains the refusal.
    const error = await capture(() =>
      apiRequest("createReview", "/api/reviews/duplicate", { method: "POST" }),
    );
    assert.equal(error.status, 409);
    assert.equal(error.isConflict, true);
    assert.equal(error.message, "You've already reviewed this trip.");
  });

  await check("car reviews are public and sent without a bearer token", async () => {
    // The car page renders these server-side, where there is no session at
    // all. Sending a token would work, but requiring one would break the page.
    registerTokenProvider(() => "should-not-be-sent");
    const page = await reviewsApi.getCarReviews("c1");
    registerTokenProvider(() => null);

    assert.equal(page.reviews.length, 1);
    assert.equal(page.reviews[0].rating, 5);

    const request = seen.findLast((r) => r.url.startsWith("/api/reviews/car/c1"));
    assert.ok(request, "the request should have reached the stub");
    assert.equal(
      request.auth,
      undefined,
      "a public endpoint must not send Authorization",
    );
  });

  await check("notifications page comes back resource-named", async () => {
    const page = await notificationsApi.getNotifications({ pageSize: 10 });
    assert.ok(Array.isArray(page.notifications));
    assert.equal(page.notifications[0].relatedEntityId, "b1");
  });

  await check("marking notifications read returns nothing", async () => {
    assert.equal(await notificationsApi.markNotificationRead("n1"), undefined);
    assert.equal(await notificationsApi.markAllNotificationsRead(), undefined);
  });

  console.log(`\n${passed} checks passed\n`);
} finally {
  server.close();
}

async function capture(fn: () => Promise<unknown>): Promise<InstanceType<typeof ApiError>> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error("expected the call to throw an ApiError");
}
