"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/errors";

/**
 * Minimal client-side fetching for the authenticated pages.
 *
 * The token lives in client storage, so these calls cannot be made from a
 * server component — unlike the public search and car pages in Phase 3, which
 * are server-rendered.
 *
 * Deliberately not a cache. There is no react-query here, and adding one for
 * three screens would be more machinery than the problem needs. What it does
 * provide is the part that is easy to get wrong: no state updates after
 * unmount, and no synchronous setState inside an effect (the React Compiler
 * lint rules reject that, and it causes cascading renders).
 */

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiError };

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    // No setState before the await: the first render already starts in
    // "loading", and a re-fetch keeps the previous data on screen until the
    // new one lands rather than flashing a skeleton.
    fetcher().then(
      (data) => {
        if (!cancelled) setState({ status: "success", data });
      },
      (cause) => {
        if (cancelled) return;
        setState({
          status: "error",
          error:
            cause instanceof ApiError
              ? cause
              : new ApiError({
                  status: 0,
                  operation: "getBookings",
                  message: "Something went wrong. Try again.",
                }),
        });
      },
    );

    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally not a dependency — callers pass an inline
    // closure, which would be a new reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}
