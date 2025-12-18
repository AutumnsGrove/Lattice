/**
 * Client-side API utility with automatic CSRF token injection
 * Provides fetch wrapper with security headers and error handling
 */

/**
 * Get CSRF token from cookie or meta tag
 * @returns {string|null} CSRF token or null if not found
 */
export function getCSRFToken() {
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
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response JSON
 * @throws {Error} If request fails
 */
export async function apiRequest(url, options = {}) {
  const csrfToken = getCSRFToken();
  const method = options.method?.toUpperCase() || "GET";
  const isStateMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  // Debug logging
  if (typeof console !== "undefined" && process.env.NODE_ENV !== "production") {
    console.debug("[apiRequest]", {
      url,
      method,
      csrfToken: csrfToken ? "present" : "missing",
      isStateMutating,
    });
  }

  // Build headers - don't set Content-Type for FormData (browser sets it with boundary)
  /** @type {Record<string, string>} */
  const headers = {
    ...(/** @type {Record<string, string>} */ (options.headers || {})),
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
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      errorMessage = `${response.status} ${response.statusText}`;
    }
    // Include CSRF debug info
    if (response.status === 403 && errorMessage.includes("CSRF")) {
      console.error("[apiRequest] CSRF token validation failed", {
        csrfToken,
        headers: Object.fromEntries(response.headers.entries()),
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
export const api = {
  /**
   * GET request
   * @param {string} url - API endpoint
   * @param {RequestInit} options - Additional fetch options
   */
  get: (url, options = {}) => apiRequest(url, { ...options, method: "GET" }),

  /**
   * POST request
   * @param {string} url - API endpoint
   * @param {any} body - Request body (will be JSON stringified)
   * @param {RequestInit} options - Additional fetch options
   */
  post: (url, body, options = {}) =>
    apiRequest(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * PUT request
   * @param {string} url - API endpoint
   * @param {any} body - Request body (will be JSON stringified)
   * @param {RequestInit} options - Additional fetch options
   */
  put: (url, body, options = {}) =>
    apiRequest(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /**
   * DELETE request
   * @param {string} url - API endpoint
   * @param {RequestInit} options - Additional fetch options
   */
  delete: (url, options = {}) =>
    apiRequest(url, { ...options, method: "DELETE" }),

  /**
   * PATCH request
   * @param {string} url - API endpoint
   * @param {any} body - Request body (will be JSON stringified)
   * @param {RequestInit} options - Additional fetch options
   */
  patch: (url, body, options = {}) =>
    apiRequest(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
