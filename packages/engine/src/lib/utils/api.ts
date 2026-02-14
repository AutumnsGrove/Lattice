/**
 * Client-side API utility with automatic CSRF token injection
 * Provides fetch wrapper with security headers and error handling
 */

/**
 * Get CSRF token from cookie or meta tag
 */
export function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null; // SSR safety

  // Try cookie first
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="))
    ?.split("=")[1];

  if (cookieToken) return cookieToken;

  // Fallback to meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute("content") || null;
}

/**
 * Fetch wrapper with automatic CSRF token injection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T | null> {
  const csrfToken = getCSRFToken();
  const method = options.method?.toUpperCase() || "GET";
  const isStateMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  // Debug logging
  if (
    typeof console !== "undefined" &&
    import.meta.env?.MODE !== "production"
  ) {
    console.debug("[apiRequest]", {
      url,
      method,
      csrfToken: csrfToken ? "present" : "missing",
      isStateMutating,
    });
  }

  // Build headers - don't set Content-Type for FormData (browser sets it with boundary)
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only add Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add CSRF token for state-changing requests
  if (isStateMutating && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
    headers["csrf-token"] = csrfToken; // fallback header
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });

  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const error = (await response.json()) as {
        message?: string;
        error_description?: string;
      };
      errorMessage = error.message || error.error_description || errorMessage;
    } catch {
      errorMessage = `${response.status} ${response.statusText}`;
    }
    // Include CSRF debug info
    if (response.status === 403 && errorMessage.includes("CSRF")) {
      console.error("[apiRequest] CSRF token validation failed", {
        csrfToken: csrfToken ? "present" : "missing",
        url,
      });
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Convenience methods for common HTTP verbs
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const api = {
  /** GET request */
  get: <T = any>(url: string, options: RequestInit = {}) =>
    apiRequest<T>(url, { ...options, method: "GET" }),

  /** POST request */
  post: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
    apiRequest<T>(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** PUT request */
  put: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
    apiRequest<T>(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /** DELETE request */
  delete: <T = any>(url: string, options: RequestInit = {}) =>
    apiRequest<T>(url, { ...options, method: "DELETE" }),

  /** PATCH request */
  patch: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
    apiRequest<T>(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
/* eslint-enable @typescript-eslint/no-explicit-any */
