/**
 * WCAG contrast over the actual design tokens, in both themes.
 *
 * `DESIGN.md` §2 says the status colour pairs were chosen to meet AA, and
 * phase 8 says to **verify rather than assume**. This does that, and does it by
 * parsing `globals.css` rather than restating the values — a copy would drift
 * the first time a token was tuned, and a contrast check that tests last
 * month's palette is worse than none.
 *
 * Thresholds, from WCAG 2.1:
 *   1.4.3 Contrast (Minimum)      — 4.5:1 for body text, 3:1 for large text
 *   1.4.11 Non-text Contrast      — 3:1 for UI boundaries and focus indicators
 *
 * Run: npm run verify:contrast
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "app", "globals.css"), "utf8");

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

/** The `:root { … }` and `.dark { … }` blocks, as name → raw value. */
function tokensIn(selector: string): Record<string, string> {
  // Non-greedy to the first closing brace at the start of a line, which is how
  // both blocks are formatted.
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  assert.ok(block, `no ${selector} block found in globals.css`);

  const out: Record<string, string> = {};
  for (const line of block[1].split("\n")) {
    const match = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i.exec(line);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const THEMES = {
  light: tokensIn(":root"),
  dark: { ...tokensIn(":root"), ...tokensIn("\\.dark") },
};

type Rgb = [number, number, number];

/** Resolves `var(--x)`, `#rrggbb` and `hsl(h s% l%)` to RGB. */
function toRgb(value: string, tokens: Record<string, string>, depth = 0): Rgb {
  assert.ok(depth < 10, `circular token reference at ${value}`);

  const variable = /^var\((--[a-z0-9-]+)\)$/i.exec(value.trim());
  if (variable) {
    const target = tokens[variable[1]];
    assert.ok(target, `unresolved ${variable[1]}`);
    return toRgb(target, tokens, depth + 1);
  }

  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const hsl = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i.exec(value.trim());
  assert.ok(hsl, `unrecognised colour: ${value}`);
  return hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/* ------------------------------------------------------------------ *
 * Contrast
 * ------------------------------------------------------------------ */

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ *
 * The pairs that have to hold
 * ------------------------------------------------------------------ */

type Pair = { name: string; fg: string; bg: string; min: number };

const AA_TEXT = 4.5;
/** 1.4.11 — a border, a focus ring, an icon carrying meaning. */
const AA_UI = 3;

const PAIRS: Pair[] = [
  { name: "body text", fg: "--foreground", bg: "--background", min: AA_TEXT },
  { name: "muted text on page", fg: "--muted-foreground", bg: "--background", min: AA_TEXT },
  { name: "muted text on muted surface", fg: "--muted-foreground", bg: "--muted", min: AA_TEXT },
  { name: "text on card", fg: "--card-foreground", bg: "--card", min: AA_TEXT },
  { name: "text on popover", fg: "--popover-foreground", bg: "--popover", min: AA_TEXT },
  { name: "text on accent (hover surface)", fg: "--accent-foreground", bg: "--accent", min: AA_TEXT },
  { name: "primary button label", fg: "--primary-foreground", bg: "--primary", min: AA_TEXT },
  { name: "destructive text", fg: "--destructive", bg: "--background", min: AA_TEXT },
  // Non-text: the ring is the focus indicator, and removing the outline
  // without a replacement that passes here is the classic a11y regression.
  { name: "focus ring", fg: "--ring", bg: "--background", min: AA_UI },
  { name: "primary as a UI mark", fg: "--primary", bg: "--background", min: AA_UI },
];

// Every booking status pill: text on its own background. Colour is never the
// only signal — the pill carries a dot and a label too — but the label still
// has to be readable.
for (const status of ["pending", "confirmed", "inprogress", "completed", "cancelled"]) {
  PAIRS.push({
    name: `status pill: ${status}`,
    fg: `--status-${status}`,
    bg: `--status-${status}-bg`,
    min: AA_TEXT,
  });
  // The pill also sits on the page, so its background must be distinguishable
  // from it — otherwise the pill has no visible extent at all.
  PAIRS.push({
    name: `status pill edge: ${status}`,
    fg: `--status-${status}-bg`,
    bg: "--background",
    min: 1.1,
  });
}

let failures = 0;
let checked = 0;

for (const [theme, tokens] of Object.entries(THEMES)) {
  console.log(`\n${theme}`);
  for (const pair of PAIRS) {
    const ratio = contrast(toRgb(tokens[pair.fg], tokens), toRgb(tokens[pair.bg], tokens));
    const ok = ratio >= pair.min;
    checked++;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${pair.name.padEnd(32)} ${ratio.toFixed(2)}:1 (needs ${pair.min}:1)`,
    );
  }
}

console.log(
  `\n${checked - failures}/${checked} pairs pass${failures ? ` — ${failures} FAILING` : ""}\n`,
);

if (failures > 0) process.exit(1);
