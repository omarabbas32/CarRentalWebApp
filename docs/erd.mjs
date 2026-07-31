/**
 * Generates the ERD for the CarRental schema.
 *
 *   node docs/erd.mjs
 *
 * Writes docs/diagrams/erd.svg (that directory is git-ignored — the generator
 * is the source of truth, the image is a build artefact).
 *
 * The schema below was read from the live database, not from the entity
 * classes: `information_schema` is what actually exists after migrations.
 * Placeholder entities that EF mapped but no use case touches (Payment,
 * Message, Review, Notification) are named in the footer rather than drawn —
 * showing them as first-class tables would overstate what is built.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── canvas ──────────────────────────────────────────────────────────────────
const W = 1200;
const H = 630;
const M = 32;

// ── palette ─────────────────────────────────────────────────────────────────
// Lifted from docs/diagrams/clean-architecture-cqrs.svg so the two diagrams
// read as one set. Flat fills, no gradients, no shadows.
const C = {
  bg: "#F6F8FA",
  card: "#FFFFFF",
  cardAlt: "#F7F9FB",
  rule: "#DDE3EA",
  text: "#22303F",
  muted: "#6B7A8C",
  faint: "#8A97A6",
  edge: "#7C8CA0",
  group: {
    identity: "#3D5A80", // steel blue
    fleet: "#4C8577", // green-teal
    trips: "#5A6B7C", // slate
  },
};

const FONT =
  "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

// ── schema ──────────────────────────────────────────────────────────────────
const COL_W = 280;
const ROW_H = 16;
const HEAD_H = 26;
const PAD_B = 8;

const tables = [
  {
    name: "Users", group: "identity", col: 0, y: 104,
    fields: [
      ["id", "uuid", "PK"],
      ["email", "text", "UQ"],
      ["password_hash", "text"],
      ["role", "int"],
      ["status", "int"],
      ["identity_verified", "bool"],
      ["driver_license_verified", "bool"],
      ["created_at", "timestamptz"],
    ],
  },
  {
    name: "UserVerifications", group: "identity", col: 0, y: 286,
    fields: [
      ["id", "uuid", "PK"],
      ["user_id", "uuid", "FK"],
      ["government_id_image_url", "text"],
      ["government_id_status", "int"],
      ["driver_license_front_url", "text"],
      ["driver_license_back_url", "text"],
      ["driver_license_status", "int"],
    ],
  },
  {
    name: "RefreshTokens", group: "identity", col: 0, y: 452,
    fields: [
      ["id", "uuid", "PK"],
      ["user_id", "uuid", "FK"],
      ["token", "text"],
      ["expires", "timestamptz"],
      ["revoked", "timestamptz"],
    ],
  },
  {
    name: "Cars", group: "fleet", col: 1, y: 104,
    fields: [
      ["id", "uuid", "PK"],
      ["owner_id", "uuid", "FK"],
      ["make", "text"],
      ["model", "text"],
      ["vin", "text"],
      ["category", "int"],
      ["price_per_day", "numeric"],
      ["security_deposit", "numeric"],
      ["is_active", "bool"],
    ],
  },
  {
    name: "CarImages", group: "fleet", col: 1, y: 302,
    fields: [
      ["id", "uuid", "PK"],
      ["car_id", "uuid", "FK"],
      ["image_url", "text"],
      ["is_primary", "bool"],
      ["display_order", "int"],
    ],
  },
  {
    name: "CarAvailabilities", group: "fleet", col: 1, y: 436,
    fields: [
      ["id", "uuid", "PK"],
      ["car_id", "uuid", "FK"],
      ["start_date", "timestamptz"],
      ["end_date", "timestamptz"],
      ["is_available", "bool"],
    ],
  },
  {
    name: "Bookings", group: "trips", col: 2, y: 104,
    fields: [
      ["id", "uuid", "PK"],
      ["car_id", "uuid", "FK"],
      ["renter_id", "uuid", "FK"],
      ["owner_id", "uuid", "FK"],
      ["start_date", "timestamptz"],
      ["end_date", "timestamptz"],
      ["sub_total", "numeric"],
      ["service_fee", "numeric"],
      ["tax_amount", "numeric"],
      ["total_amount", "numeric"],
      ["status", "int"],
    ],
  },
  {
    name: "TripInspections", group: "trips", col: 2, y: 334,
    fields: [
      ["id", "uuid", "PK"],
      ["booking_id", "uuid", "FK"],
      ["type", "int"],
      ["fuel_level", "int"],
      ["cleanliness", "int"],
      ["has_damage", "bool"],
    ],
  },
  {
    name: "InspectionPhotos", group: "trips", col: 2, y: 484,
    fields: [
      ["id", "uuid", "PK"],
      ["trip_inspection_id", "uuid", "FK"],
      ["photo_url", "text"],
    ],
  },
];

const colX = [M, M + COL_W + 148, M + 2 * (COL_W + 148)];
const box = {};
for (const t of tables) {
  const x = colX[t.col];
  const h = HEAD_H + t.fields.length * ROW_H + PAD_B;
  box[t.name] = { x, y: t.y, w: COL_W, h, cx: x + COL_W / 2, cy: t.y + h / 2, r: x + COL_W, b: t.y + h };
}

// ── helpers ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const out = [];
const push = (s) => out.push(s);

function polyline(points, { markerStart, markerEnd } = {}) {
  const d = points.map(([x, y]) => `${x} ${y}`).join(" L ");
  push(
    `<path d="M ${d}" fill="none" stroke="${C.edge}" stroke-width="1.4" ` +
      `stroke-linejoin="round"${markerStart ? ` marker-start="url(#${markerStart})"` : ""}` +
      `${markerEnd ? ` marker-end="url(#${markerEnd})"` : ""}/>`,
  );
}

// ── document ────────────────────────────────────────────────────────────────
push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
    `font-family="${FONT}">`,
);
push(`<title>CarRental database schema — entity relationship diagram</title>`);

// Crow's-foot markers. userSpaceOnUse keeps them a fixed size regardless of
// stroke width; refX puts the prongs on the entity edge, apex back along the line.
push(`<defs>
  <marker id="many" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12"
          markerUnits="userSpaceOnUse" orient="auto">
    <path d="M0 6 L11 1 M0 6 L11 6 M0 6 L11 11" fill="none" stroke="${C.edge}" stroke-width="1.4"/>
  </marker>
  <marker id="one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="12" markerHeight="12"
          markerUnits="userSpaceOnUse" orient="auto">
    <path d="M6 1 L6 11" fill="none" stroke="${C.edge}" stroke-width="1.4"/>
  </marker>
</defs>`);

push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// ── header ──────────────────────────────────────────────────────────────────
// Centred title over a letter-spaced uppercase subtitle, matching the
// architecture diagram.
push(
  `<text x="${W / 2}" y="46" text-anchor="middle" font-size="25" font-weight="700" ` +
    `letter-spacing="0.2" fill="${C.text}">Database Schema</text>`,
);
push(
  `<text x="${W / 2}" y="70" text-anchor="middle" font-size="14" fill="${C.muted}" ` +
    `letter-spacing="1.6">CAR RENTAL SYSTEM</text>`,
);

// ── relationships (drawn under the tables) ──────────────────────────────────
const U = box.Users, C_ = box.Cars, B = box.Bookings;

// Users 1—* Cars
polyline([[U.r, 185], [C_.x, 185]], { markerStart: "one", markerEnd: "many" });

// Users 1—* Bookings, via a routing lane above the tables. One line carries both
// FKs: renter_id and owner_id both point at Users, which is worth showing.
polyline([[U.x + 218, U.y], [U.x + 218, 90], [B.x + 140, 90], [B.x + 140, B.y]], {
  markerStart: "one",
  markerEnd: "many",
});
push(
  `<text x="${B.x + 132}" y="86" font-size="10" text-anchor="end" fill="${C.faint}">` +
    `renter_id · owner_id</text>`,
);

// Users 1—1 UserVerifications
polyline([[U.x + 140, U.b], [U.x + 140, box.UserVerifications.y]], {
  markerStart: "one",
  markerEnd: "one",
});

// Users 1—* RefreshTokens, routed down the outside.
polyline(
  [[U.x, 240], [U.x - 16, 240], [U.x - 16, box.RefreshTokens.cy], [U.x, box.RefreshTokens.cy]],
  { markerStart: "one", markerEnd: "many" },
);

// Cars 1—* CarImages
polyline([[C_.x + 140, C_.b], [C_.x + 140, box.CarImages.y]], {
  markerStart: "one",
  markerEnd: "many",
});

// Cars 1—* CarAvailabilities, routed down the gutter.
polyline(
  [[C_.x, 250], [C_.x - 16, 250], [C_.x - 16, box.CarAvailabilities.cy], [C_.x, box.CarAvailabilities.cy]],
  { markerStart: "one", markerEnd: "many" },
);

// Cars 1—* Bookings
polyline([[C_.r, 210], [B.x, 210]], { markerStart: "one", markerEnd: "many" });

// Bookings 1—* TripInspections
polyline([[B.x + 140, B.b], [B.x + 140, box.TripInspections.y]], {
  markerStart: "one",
  markerEnd: "many",
});

// TripInspections 1—* InspectionPhotos
polyline([[B.x + 140, box.TripInspections.b], [B.x + 140, box.InspectionPhotos.y]], {
  markerStart: "one",
  markerEnd: "many",
});

// ── tables ──────────────────────────────────────────────────────────────────
for (const t of tables) {
  const b = box[t.name];
  const colour = C.group[t.group];

  push(`<g>`);
  push(
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" ` +
      `fill="${C.card}" stroke="${colour}" stroke-width="1.4"/>`,
  );
  // Header band: rounded at the top, square where it meets the field list.
  push(
    `<path d="M ${b.x} ${b.y + 8} a 8 8 0 0 1 8 -8 h ${b.w - 16} a 8 8 0 0 1 8 8 v ${HEAD_H - 8} h -${b.w} Z" fill="${colour}"/>`,
  );
  push(
    `<text x="${b.x + 12}" y="${b.y + 17.5}" font-size="12.5" font-weight="640" fill="#FFFFFF">` +
      `${esc(t.name)}</text>`,
  );

  t.fields.forEach(([name, type, badge], i) => {
    const rowY = b.y + HEAD_H + i * ROW_H;
    if (i % 2 === 1) {
      push(
        `<rect x="${b.x + 1}" y="${rowY}" width="${b.w - 2}" height="${ROW_H}" fill="${C.cardAlt}"/>`,
      );
    }
    const baseline = rowY + 11.5;
    const isKey = badge === "PK" || badge === "FK";
    push(
      `<text x="${b.x + 12}" y="${baseline}" font-size="11" ` +
        `${isKey ? `font-weight="600" ` : ""}fill="${isKey ? C.text : "#3F4E4C"}">${esc(name)}</text>`,
    );
    // Type and badge are separate elements at explicit positions. Keeping them
    // in one <text> and separating with whitespace does not work: a plain space
    // is collapsed by SVG whitespace handling and librsvg gives U+00A0 no
    // advance width either, so both render as "uuidPK".
    const badgeCol = b.x + b.w - 12;
    const typeRight = badge ? badgeCol - 21 : badgeCol;

    push(
      `<text x="${typeRight}" y="${baseline}" font-size="9.5" text-anchor="end" fill="${C.faint}">` +
        `${esc(type)}</text>`,
    );
    if (badge) {
      push(
        `<text x="${badgeCol}" y="${baseline}" font-size="9.5" font-weight="700" ` +
          `text-anchor="end" fill="${colour}">${badge}</text>`,
      );
    }
  });

  push(`</g>`);
}

// ── footer ──────────────────────────────────────────────────────────────────
push(`<line x1="${M}" y1="584" x2="${W - M}" y2="584" stroke="${C.rule}" stroke-width="1"/>`);

// Group key on the left of the first footer line.
let kx = M;
for (const [label, colour] of [
  ["Identity", C.group.identity],
  ["Fleet", C.group.fleet],
  ["Trips", C.group.trips],
]) {
  push(`<rect x="${kx}" y="597" width="9" height="9" rx="2" fill="${colour}"/>`);
  push(`<text x="${kx + 14}" y="605.5" font-size="11" fill="${C.muted}">${label}</text>`);
  kx += 14 + label.length * 6.2 + 18;
}

push(
  `<text x="${W - M}" y="605.5" font-size="11" text-anchor="end" fill="${C.muted}">` +
    `<tspan font-weight="700" fill="${C.text}">PK</tspan> primary key · ` +
    `<tspan font-weight="700" fill="${C.text}">FK</tspan> foreign key · ` +
    `<tspan font-weight="700" fill="${C.text}">UQ</tspan> unique · ` +
    `crow&#8217;s foot marks the many side</text>`,
);

push(
  `<text x="${M}" y="621" font-size="10.5" fill="${C.faint}">` +
    `Bookings snapshot their own pricing at creation · all timestamps are timestamptz</text>`,
);
push(
  `<text x="${W - M}" y="621" font-size="10.5" text-anchor="end" fill="${C.faint}">` +
    `Also modelled, awaiting use cases: Payment · Message · Review · Notification</text>`,
);

push(`</svg>`);

const target = join(HERE, "diagrams", "erd.svg");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out.join("\n"), "utf8");
console.log(`wrote ${target}`);
