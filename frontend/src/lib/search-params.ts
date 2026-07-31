import { CarCategory, parseCategoryName, carCategoryName, type CarFeatureKey, CAR_FEATURES } from "@/lib/enums";
import { defaultSearchRange, fromDateInputValue, toDateInputValue } from "@/lib/dates";

/**
 * Search state lives in the URL, not in React state.
 *
 * Result sets are shareable, a refresh is lossless, and the back button moves
 * through filter changes instead of leaving the page. This module is the only
 * place that knows how that state is spelled.
 *
 * Dates are held as `YYYY-MM-DD` local dates rather than ISO instants: a link
 * shared between timezones should mean the same *days*, and the conversion to
 * UTC happens once, at the API boundary.
 */

export type SearchState = {
  city: string;
  start: Date;
  end: Date;
  minPrice?: number;
  maxPrice?: number;
  category?: CarCategory;
  features: CarFeatureKey[];
  minRating?: number;
  page: number;
};

/** What Next hands a server component. Repeated keys arrive as an array. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

const FEATURE_KEYS = new Set<string>(CAR_FEATURES.map((f) => f.key));

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function many(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Never throws. A malformed URL — hand-edited, or from an old link — falls back
 * to sensible defaults rather than erroring the page, because the query string
 * is user-editable input like any other.
 */
export function parseSearchParams(raw: RawSearchParams): SearchState {
  const fallback = defaultSearchRange();

  const start = fromDateInputValue(one(raw.from) ?? "") ?? fallback.start;
  const end = fromDateInputValue(one(raw.to) ?? "") ?? fallback.end;

  const categoryName = one(raw.category);
  const page = num(one(raw.page));
  const minRating = num(one(raw.minRating));

  return {
    city: (one(raw.city) ?? "").trim(),
    // An inverted or zero-length range would 400. Correct it silently rather
    // than showing the user an error they did not cause.
    start: start < end ? start : fallback.start,
    end: start < end ? end : fallback.end,
    minPrice: num(one(raw.minPrice)),
    maxPrice: num(one(raw.maxPrice)),
    category: categoryName ? parseCategoryName(categoryName) : undefined,
    features: many(raw.features).filter((f): f is CarFeatureKey => FEATURE_KEYS.has(f)),
    minRating: minRating !== undefined && minRating >= 0 && minRating <= 5 ? minRating : undefined,
    page: page !== undefined && page >= 1 ? Math.floor(page) : 1,
  };
}

/** The inverse. Omits anything at its default so shared URLs stay readable. */
export function toSearchQuery(state: Partial<SearchState>): string {
  const params = new URLSearchParams();

  if (state.city) params.set("city", state.city);
  if (state.start) params.set("from", toDateInputValue(state.start));
  if (state.end) params.set("to", toDateInputValue(state.end));
  if (state.minPrice !== undefined) params.set("minPrice", String(state.minPrice));
  if (state.maxPrice !== undefined) params.set("maxPrice", String(state.maxPrice));
  if (state.category !== undefined) params.set("category", carCategoryName[state.category]);
  for (const f of state.features ?? []) params.append("features", f);
  if (state.minRating !== undefined) params.set("minRating", String(state.minRating));
  if (state.page !== undefined && state.page > 1) params.set("page", String(state.page));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function searchHref(state: Partial<SearchState>): string {
  return `/search${toSearchQuery(state)}`;
}

/**
 * How many filters are active, for the mobile sheet's trigger badge. Dates and
 * city are not filters — they are the query itself, and always set.
 */
export function activeFilterCount(state: SearchState): number {
  return (
    (state.minPrice !== undefined ? 1 : 0) +
    (state.maxPrice !== undefined ? 1 : 0) +
    (state.category !== undefined ? 1 : 0) +
    (state.minRating !== undefined ? 1 : 0) +
    state.features.length
  );
}

/** Everything except the query itself — the "clear filters" repair. */
export function withoutFilters(state: SearchState): Partial<SearchState> {
  return { city: state.city, start: state.start, end: state.end, features: [], page: 1 };
}

/** The "widen the dates" repair: same filters, a fortnight either side. */
export function withWiderDates(state: SearchState): Partial<SearchState> {
  const start = new Date(state.start);
  const end = new Date(state.end);
  start.setDate(start.getDate() - 14);
  end.setDate(end.getDate() + 14);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return { ...state, start: start < today ? today : start, end, page: 1 };
}
