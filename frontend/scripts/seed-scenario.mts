/**
 * Builds a complete, ready-to-click scenario against the **running** API.
 *
 * Testing these features by hand is tedious: you need an owner and a renter,
 * a listed car, a booking, and then the owner has to start *and* end the trip
 * before a review is even possible — all while switching accounts. This does
 * all of it in one command and prints the credentials and links at the end.
 *
 * It leaves three bookings behind, one in each state worth looking at:
 *
 *   Pending      — a fresh request, cancellable, thread open, not reviewable
 *   InProgress   — trip under way, pickup inspection recorded
 *   Completed    — finished, and the only one that can be reviewed
 *
 * Everything is throwaway and email addresses are timestamped, so it can be
 * run repeatedly. It writes real rows to whichever database the API is
 * pointed at — do not run it against anything but a dev database.
 *
 * Run: npm run seed:scenario
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5071";
process.env.NEXT_PUBLIC_API_BASE_URL = BASE;

const APP = process.env.SEED_APP_BASE_URL ?? "http://localhost:3000";

const reachable = await fetch(`${BASE}/api/cars`, { signal: AbortSignal.timeout(4000) })
  .then((r) => r.ok)
  .catch(() => false);

if (!reachable) {
  console.error(`\nAPI not reachable at ${BASE}. Start it and try again.\n`);
  process.exit(1);
}

/**
 * A throwaway dev password, the same one the verify scripts already use. It
 * satisfies every rule in RegisterCommandValidator: length, upper, lower,
 * digit, special.
 */
const PASSWORD = "Aa1!aaaa";

const { registerTokenProvider } = await import("@/lib/api/client");
const authApi = await import("@/lib/api/auth");
const carsApi = await import("@/lib/api/cars");
const bookingsApi = await import("@/lib/api/bookings");
const messagesApi = await import("@/lib/api/messages");
const { UserRole, TransmissionType, FuelType, CarCategory, CarImageType } =
  await import("@/lib/enums");

let token: string | null = null;
registerTokenProvider(() => token);

const stamp = Date.now();
const ownerEmail = `owner.${stamp}@example.com`;
const renterEmail = `renter.${stamp}@example.com`;

const step = (message: string) => console.log(`  · ${message}`);

console.log(`\nSeeding a scenario against ${BASE}\n`);

// --- accounts --------------------------------------------------------------
// Two of the five-per-minute /api/auth budget. Everything after this is on
// other controllers and unthrottled.

const owner = await authApi.register({
  email: ownerEmail,
  password: PASSWORD,
  firstName: "Olivia",
  lastName: "Owner",
  role: UserRole.Owner,
});
step(`owner   ${ownerEmail}`);

const renter = await authApi.register({
  email: renterEmail,
  password: PASSWORD,
  firstName: "Rami",
  lastName: "Renter",
  role: UserRole.Renter,
});
step(`renter  ${renterEmail}`);

// --- three cars ------------------------------------------------------------

type CarSpec = {
  make: string;
  model: string;
  category: number;
  pricePerDay: number;
  /** Searched on Wikimedia Commons — see `fetchPhotos`. */
  exteriorQuery: string;
  interiorQuery: string;
};

const CARS: CarSpec[] = [
  {
    make: "Toyota",
    model: "Corolla",
    category: CarCategory.Standard,
    pricePerDay: 45,
    exteriorQuery: "Toyota Corolla sedan",
    interiorQuery: "Toyota Corolla interior dashboard",
  },
  {
    make: "Jeep",
    model: "Wrangler",
    category: CarCategory.SUV,
    pricePerDay: 90,
    exteriorQuery: "Jeep Wrangler JL",
    interiorQuery: "Jeep Wrangler interior dashboard",
  },
  {
    make: "BMW",
    model: "3 Series",
    category: CarCategory.Luxury,
    pricePerDay: 130,
    exteriorQuery: "BMW 3 Series sedan",
    interiorQuery: "BMW 3 Series interior dashboard",
  },
];

/** Two outside shots and one inside, per car. */
const EXTERIOR_PHOTOS = 2;
const INTERIOR_PHOTOS = 1;

/**
 * Real photographs of the actual model, from Wikimedia Commons.
 *
 * Commons is used rather than a general image search because everything on it
 * carries a licence that permits reuse. Scraping arbitrary search results
 * would mean republishing other people's copyrighted photographs.
 *
 * Returns JPEGs capped at 1200px — big enough to look right in the gallery,
 * small enough that uploading three per car is quick. Failures are non-fatal:
 * a car with no photos is worse-looking, not broken.
 */
async function fetchPhotos(query: string, count: number): Promise<File[]> {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime" +
    // Ask for well more than needed: some results are diagrams, badges or
    // oversized originals that get filtered out below.
    `&iiurlwidth=1200&gsrlimit=${count * 4 + 4}` +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}`;

  const response = await fetch(api, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; mime?: string }[] }>;
    };
  };

  const candidates = Object.values(payload.query?.pages ?? {})
    .map((page) => ({
      title: page.title,
      url: page.imageinfo?.[0]?.thumburl,
      mime: page.imageinfo?.[0]?.mime,
    }))
    .filter((c): c is { title: string; url: string; mime: string | undefined } =>
      Boolean(c.url),
    );

  const files: File[] = [];
  for (const candidate of candidates) {
    if (files.length >= count) break;

    const bytes = await downloadWithRetry(candidate.url);
    if (!bytes) continue;

    // Skip anything implausible so a stray icon or diagram does not become a
    // car photo. There is no server-side size or MIME check to fall back on.
    if (bytes.byteLength < 20_000 || bytes.byteLength > 8_000_000) continue;

    const name = candidate.title.replace(/^File:/, "").replace(/\s+/g, "-");
    files.push(new File([bytes], name, { type: "image/jpeg" }));
  }

  return files;
}

/**
 * Wikimedia rate-limits bursts of downloads with a 429, which is what made an
 * earlier version give the first car three photos and the last one none. Space
 * the requests out and back off when told to.
 */
async function downloadWithRetry(url: string): Promise<ArrayBuffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1));
        continue;
      }

      if (!response.ok) return null;

      const bytes = await response.arrayBuffer();
      // Courtesy gap before the next one, so a run of cars does not look like
      // a scraper.
      await sleep(400);
      return bytes;
    } catch {
      await sleep(1000);
    }
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wikimedia's policy asks for a descriptive User-Agent and throttles requests
 * that do not identify themselves.
 */
const HEADERS = {
  "User-Agent": "carrental-dev-seed/1.0 (local development scenario seeder)",
};

token = owner.token;

const carIds: string[] = [];
for (const [index, spec] of CARS.entries()) {
  const suffix = `${String(stamp).slice(-5)}${index}`;
  const id = await carsApi.createCar({
    make: spec.make,
    model: spec.model,
    year: 2022,
    color: ["Silver", "Black", "White"][index],
    licensePlate: `SC${suffix}`,
    // 17 chars from [A-HJ-NPR-Z0-9] — the validator excludes I, O and Q.
    vin: `SC${suffix}HZKLMNPRST`.slice(0, 17),
    transmission: TransmissionType.Automatic,
    fuelType: FuelType.Petrol,
    seats: 5,
    doors: 4,
    mileage: 30_000 + index * 12_000,
    category: spec.category,
    hasGPS: true,
    hasBluetooth: true,
    hasUSBCharging: true,
    hasChildSeat: index === 1,
    hasAirConditioning: true,
    hasBackupCamera: index !== 0,
    location: { lat: 33.8938, lng: 35.5018 },
    locationAddress: `${index + 1} Hamra Street`,
    locationCity: "Beirut",
    locationState: "Beirut",
    pricePerDay: spec.pricePerDay,
    pricePerWeek: spec.pricePerDay * 6,
    pricePerMonth: spec.pricePerDay * 22,
    securityDeposit: 200,
    dailyMileageLimit: 200,
    extraMileageCharge: 0.25,
  });
  carIds.push(id);

  // Uploaded through the real endpoint rather than written as rows, so the
  // files genuinely land in Cloudinary and the multipart path gets exercised —
  // nothing else in the suite covers it.
  // Sequential, not Promise.all: running both concurrently doubles the request
  // rate against Wikimedia and is what trips the 429 in the first place.
  const exteriors = await fetchPhotos(spec.exteriorQuery, EXTERIOR_PHOTOS);
  const interiors = await fetchPhotos(spec.interiorQuery, INTERIOR_PHOTOS);

  let uploaded = 0;
  for (const [photoIndex, file] of exteriors.entries()) {
    try {
      // The first photo on a car becomes its cover server-side regardless, but
      // saying so explicitly keeps the intent readable.
      await carsApi.uploadCarImage(id, file, CarImageType.Exterior, photoIndex === 0);
      uploaded++;
    } catch {
      // A missing photo is cosmetic; keep going.
    }
  }
  for (const file of interiors) {
    try {
      await carsApi.uploadCarImage(id, file, CarImageType.Interior, false);
      uploaded++;
    } catch {
      // As above.
    }
  }

  step(
    `car     ${spec.make} ${spec.model} — ${uploaded} photo${uploaded === 1 ? "" : "s"}` +
      ` (${exteriors.length} exterior, ${interiors.length} interior)`,
  );
}

// --- three bookings, one per state ----------------------------------------

const day = 86_400_000;
const at = (offsetDays: number) => new Date(Date.now() + offsetDays * day);

token = renter.token;

// All three start in the future: `CreateBookingCommandValidator` refuses a
// start date in the past, so a "finished last week" trip cannot be created
// directly. The status transitions below do not look at the dates, so driving
// a near-future booking through start and end produces a genuinely Completed
// trip — which is what the review flow needs.
const pendingId = await bookingsApi.createBooking(carIds[0], at(30), at(33));
const inProgressId = await bookingsApi.createBooking(carIds[1], at(1), at(4));
const completedId = await bookingsApi.createBooking(carIds[2], at(5), at(8));

step("booking Pending (Corolla)");

// Start and end are owner-only, and Completed is the only state a review can
// attach to — which is exactly why doing this by hand is such a slog.
token = owner.token;

// `POST /api/bookings/{id}/start` currently fails with a generic 500 on this
// backend — no booking in the database has ever left Pending and no
// TripInspection row has ever been written. Until that is fixed the trip
// states cannot be reached, so the failure is reported and the rest of the
// scenario is still built: everything except the review flow works without it.
let tripsAdvanced = false;
try {
  await bookingsApi.startTrip(inProgressId, {
    actualPickupDateTime: new Date(),
    startMileage: 42_000,
    fuelLevel: 100,
    cleanliness: 5,
    hasDamage: false,
  });
  step("booking InProgress (Wrangler) — pickup inspection recorded");

  await bookingsApi.startTrip(completedId, {
    actualPickupDateTime: new Date(),
    startMileage: 54_000,
    fuelLevel: 100,
    cleanliness: 5,
    hasDamage: false,
  });
  await bookingsApi.endTrip(completedId, {
    actualReturnDateTime: new Date(),
    endMileage: 54_380,
    fuelLevel: 75,
    cleanliness: 4,
    hasDamage: true,
    damageDescription: "Small scuff on the rear bumper.",
  });
  step("booking Completed (3 Series) — reviewable by both sides");
  tripsAdvanced = true;
} catch (cause) {
  const detail = cause instanceof Error ? cause.message : String(cause);
  step(`could not advance the trips — ${detail}`);
  step("all three bookings stay Pending; reviews are unreachable until /start works");
}

// --- a conversation --------------------------------------------------------

token = renter.token;
await messagesApi.sendMessage(pendingId, "Hi! Is airport pickup possible?");
token = owner.token;
await messagesApi.sendMessage(pendingId, "Yes, no extra charge. Just send me your flight number.");
token = renter.token;
await messagesApi.sendMessage(completedId, "Thanks again — car was spotless.");
step("messages on two threads (one unread for the owner)");

// --- photos and verified identities ---------------------------------------

seedExtras();

/**
 * Car photos and verified identities are written straight to the database.
 *
 * Neither is reachable through the API without real infrastructure: a photo
 * means a multipart upload to Cloudinary, and verifying someone means an Admin
 * token plus an uploaded document. Standing both up just to click through the
 * app is not worth it, so a SQL script does it — see the header of
 * `backend/Infrastructure/Data/Scripts/seed-demo-extras.sql`.
 *
 * Best-effort. If psql is not installed the scenario is still perfectly
 * usable, just with grey placeholders and unverified badges, so this prints
 * the command and carries on rather than failing the whole seed.
 */
function seedExtras() {
  const sqlPath = new URL(
    "../../backend/Infrastructure/Data/Scripts/seed-demo-extras.sql",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");

  const psql = findPsql();
  const connection = readConnectionString();

  if (!psql || !connection) {
    console.log("  · skipped photos and verification — psql not found");
    console.log(`    run it yourself:  psql -d <db> -f ${sqlPath}`);
    return;
  }

  try {
    execFileSync(
      psql,
      [
        "-h", connection.host,
        "-p", connection.port,
        "-U", connection.username,
        "-d", connection.database,
        "-v", "ON_ERROR_STOP=1",
        "-q",
        "-f", sqlPath,
      ],
      {
        // The password goes to the child process only; it is never logged.
        env: { ...process.env, PGPASSWORD: connection.password },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    console.log("  · photos attached and both accounts marked verified");
  } catch {
    console.log("  · could not seed photos/verification (see the SQL script)");
  }
}

function findPsql(): string | null {
  if (process.env.PSQL && existsSync(process.env.PSQL)) return process.env.PSQL;

  for (const version of ["18", "17", "16", "15"]) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\psql.exe`;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/** Reads the API's own connection string so this cannot drift from it. */
function readConnectionString() {
  const settings = new URL(
    "../../backend/API/appsettings.Development.json",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");

  if (!existsSync(settings)) return null;

  const raw = JSON.parse(readFileSync(settings, "utf8")) as {
    ConnectionStrings?: { DefaultConnection?: string };
  };
  const connectionString = raw.ConnectionStrings?.DefaultConnection;
  if (!connectionString) return null;

  const parts = new Map<string, string>();
  for (const pair of connectionString.split(";")) {
    const at = pair.indexOf("=");
    if (at > 0) {
      parts.set(pair.slice(0, at).trim().toLowerCase(), pair.slice(at + 1).trim());
    }
  }

  const host = parts.get("host") ?? "localhost";
  const port = parts.get("port") ?? "5432";
  const database = parts.get("database") ?? parts.get("dbname");
  const username = parts.get("username") ?? parts.get("user id");
  const password = parts.get("password");

  if (!database || !username || !password) return null;
  return { host, port, database, username, password };
}

// --- what to do with it ----------------------------------------------------

const line = "─".repeat(64);

console.log(`\n${line}`);
console.log("Sign in at " + `${APP}/login`);
console.log(line);
console.log(`  Owner    ${ownerEmail}`);
console.log(`  Renter   ${renterEmail}`);
console.log(`  Password ${PASSWORD}   (both)`);
console.log(line);
if (!tripsAdvanced) {
  console.log("\n⚠  The trips could not be advanced past Pending, so the review");
  console.log("   flow is not reachable in this scenario. Everything else is.");
}

console.log("\nAs the RENTER:");
console.log(`  ${APP}/bookings/${completedId}`);
console.log(
  tripsAdvanced
    ? "      → leave a review, and read the thread"
    : "      → read the thread (review needs a Completed trip)",
);
console.log(`  ${APP}/bookings/${pendingId}`);
console.log("      → cancel, or reply to the owner");
console.log(`  ${APP}/messages        → both threads`);
console.log(`  ${APP}/cars/${carIds[2]}`);
console.log("      → the review appears here once you leave it");
console.log("\nAs the OWNER:");
console.log(`  ${APP}/owner/bookings  → all three, one per state`);
console.log(`  ${APP}/bookings/${inProgressId}`);
console.log("      → end the trip, which makes it reviewable");
console.log(`  ${APP}/bookings/${completedId}`);
console.log("      → review the renter");
console.log("\nTo watch SignalR work: sign in as each side in two different");
console.log("browser profiles, open the same booking, and send a message.");
console.log("The bell and the thread both update with no refresh.\n");

assert.ok(carIds.length === 3);
