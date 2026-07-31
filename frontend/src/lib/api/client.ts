import { ApiError, mapApiError, toFieldErrors, type ApiOperation } from "./errors";

/**
 * The one place an HTTP request is made.
 *
 * Responsibilities, none of which belong in a component:
 *  - prefix the base URL
 *  - attach the bearer token
 *  - serialise enums as ints in bodies, and as names or ints in query strings
 *  - convert every non-2xx into a typed `ApiError` carrying a human message
 */

/**
 * Read per call rather than captured at module load. Next inlines
 * `process.env.NEXT_PUBLIC_*` at build time wherever it appears, so this is
 * identical in the browser bundle — and it lets the verification scripts point
 * the client at a stub server.
 */
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

if (!baseUrl() && process.env.NODE_ENV !== "production") {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not set. Copy frontend/.env.example to .env.local.",
  );
}

/**
 * The auth store registers a getter here rather than being imported directly:
 * the store needs the client to call `/api/auth/refresh`, and the client needs
 * the store's token. A registration hook breaks the cycle.
 */
type TokenProvider = () => string | null;
let getToken: TokenProvider = () => null;

export function registerTokenProvider(provider: TokenProvider) {
  getToken = provider;
}

/** For the XHR upload path, which cannot go through `apiRequest`. */
export function currentAuthToken(): string | null {
  return getToken();
}

/** Exposed for the same reason — see `lib/api/upload.ts`. */
export function apiUrl(path: string): string {
  return `${baseUrl()}${path}`;
}

/**
 * Backstop for a 401. Refresh is proactive — scheduled off `expiry` — so this
 * should rarely fire; it exists because `UnauthorizedAccessException` does map
 * to 401 and a clock skew or a suspended laptop can still outrun the timer.
 *
 * It must not retry the failed request: that risks a loop against a shared
 * 5-request-per-minute budget.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

/** Values a query string can carry. `undefined` and `null` are dropped. */
export type QueryValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Array<string | number>;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body. Enums must already be ints. */
  body?: unknown;
  /** `multipart/form-data` body. Sent as-is; the browser sets the boundary. */
  formData?: FormData;
  query?: Record<string, QueryValue>;
  /** Attach the bearer token. Default true; the four auth routes opt out. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Next.js fetch cache options, for server components. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function apiRequest<T>(
  operation: ApiOperation,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    query,
    auth = true,
    signal,
    cache,
    next,
  } = options;

  const url = `${baseUrl()}${path}${buildQuery(query)}`;
  const headers: Record<string, string> = {};

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type is set only for JSON. For FormData the browser must set it
  // itself so the multipart boundary is included.
  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
      cache,
      next,
    });
  } catch (cause) {
    // An aborted request is the caller's own doing, not a failure to report.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError({
      status: 0,
      operation,
      message: mapApiError(operation, 0, { isNetworkError: true }),
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    // The four auth routes are excluded: a 401 from /api/auth/refresh means the
    // refresh itself failed, and asking the store to refresh again would loop.
    if (response.status === 401 && auth) onUnauthorized();
    throw await toApiError(operation, response);
  }

  return (await parseBody(response)) as T;
}

async function toApiError(
  operation: ApiOperation,
  response: Response,
): Promise<ApiError> {
  let fieldErrors: ReturnType<typeof toFieldErrors>;

  // A 400 carries `{ errors: { PropertyName: [...] } }`. Every other status
  // carries `{ error: "..." }`, which is generic by design and deliberately
  // not surfaced — mapApiError supplies the wording instead.
  if (response.status === 400) {
    const payload = await readJson(response);
    if (payload && typeof payload === "object" && "errors" in payload) {
      fieldErrors = toFieldErrors((payload as { errors: unknown }).errors);
    }
  }

  return new ApiError({
    status: response.status,
    operation,
    message: mapApiError(operation, response.status),
    fieldErrors,
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Several endpoints return 204, and a few return a bare JSON scalar — a `Guid`
 * from create, for instance. Both need handling before `.json()`.
 */
async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (text.length === 0) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    // A bare unquoted string is not valid JSON but is a valid response body.
    return text;
  }
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      // ASP.NET binds a repeated key to List<T> — `?features=gps&features=ac`.
      for (const item of value) params.append(key, String(item));
    } else if (value instanceof Date) {
      params.append(key, value.toISOString());
    } else {
      params.append(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
