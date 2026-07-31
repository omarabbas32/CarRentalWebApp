import { apiUrl, currentAuthToken } from "./client";
import { ApiError, mapApiError, type ApiOperation } from "./errors";

/**
 * Multipart upload with progress.
 *
 * `fetch` cannot report upload progress — there are no events for the request
 * body — so this uses `XMLHttpRequest`. Everything else matches `apiRequest`:
 * the same bearer token, the same `ApiError`, the same operation-derived
 * wording.
 *
 * Progress matters here specifically: these are phone photos of documents,
 * often on a phone connection. A spinner that never moves reads as a hang, and
 * a user who refreshes mid-upload loses the whole thing.
 */
export function uploadWithProgress<T>(
  operation: ApiOperation,
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));

    const token = currentAuthToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Content-Type is deliberately not set: the browser must add the multipart
    // boundary itself.

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parse(xhr.responseText) as T);
        return;
      }
      reject(
        new ApiError({
          status: xhr.status,
          operation,
          message: mapApiError(operation, xhr.status),
        }),
      );
    });

    xhr.addEventListener("error", () =>
      reject(
        new ApiError({
          status: 0,
          operation,
          message: mapApiError(operation, 0, { isNetworkError: true }),
          isNetworkError: true,
        }),
      ),
    );

    xhr.addEventListener("abort", () =>
      reject(
        new ApiError({
          status: 0,
          operation,
          message: "That upload was cancelled.",
          isNetworkError: true,
        }),
      ),
    );

    xhr.send(formData);
  });
}

function parse(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
