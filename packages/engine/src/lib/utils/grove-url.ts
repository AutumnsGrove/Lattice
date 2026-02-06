/**
 * Grove URL Builder
 *
 * Centralized utility for building Grove subdomain URLs.
 * Use this instead of string concatenation to ensure consistency.
 */

/**
 * The base domain for all Grove sites
 */
export const GROVE_DOMAIN = "grove.place";

/**
 * Build a full URL to a user's grove
 *
 * @param username - The grove subdomain (e.g., "autumn" for autumn.grove.place)
 * @param path - Optional path within the grove (e.g., "/arbor", "/blog/hello")
 * @returns Full URL (e.g., "https://autumn.grove.place/arbor")
 *
 * @example
 * buildGroveUrl("autumn") // "https://autumn.grove.place"
 * buildGroveUrl("autumn", "/arbor") // "https://autumn.grove.place/arbor"
 * buildGroveUrl("autumn", "admin") // "https://autumn.grove.place/admin" (auto-adds leading slash)
 */
export function buildGroveUrl(username: string, path?: string): string {
  const base = `https://${username}.${GROVE_DOMAIN}`;

  if (!path) {
    return base;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Build the admin URL for a user's grove
 *
 * @param username - The grove subdomain
 * @returns Full admin URL (e.g., "https://autumn.grove.place/arbor")
 *
 * @example
 * buildGroveAdminUrl("autumn") // "https://autumn.grove.place/arbor"
 */
export function buildGroveAdminUrl(username: string): string {
  return buildGroveUrl(username, "/arbor");
}

/**
 * Extract the username from a grove URL
 *
 * @param url - A grove URL (e.g., "https://autumn.grove.place/admin")
 * @returns The username, or null if not a valid grove URL
 *
 * @example
 * parseGroveUrl("https://autumn.grove.place/admin") // "autumn"
 * parseGroveUrl("https://grove.place") // null (main site, not a grove)
 * parseGroveUrl("https://google.com") // null (not grove.place)
 */
export function parseGroveUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Check if it's a grove.place subdomain
    if (!hostname.endsWith(`.${GROVE_DOMAIN}`)) {
      return null;
    }

    // Extract subdomain (everything before .grove.place)
    const subdomain = hostname.slice(0, -(GROVE_DOMAIN.length + 1));

    // Validate it's a single-level subdomain (not empty, no dots)
    if (!subdomain || subdomain.includes(".")) {
      return null;
    }

    return subdomain;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a grove subdomain URL
 *
 * @param url - URL to check
 * @returns true if URL is a grove subdomain (e.g., autumn.grove.place)
 */
export function isGroveUrl(url: string): boolean {
  return parseGroveUrl(url) !== null;
}

/**
 * Sanitize a returnTo/redirect URL to prevent open redirect attacks.
 *
 * Only allows relative paths (e.g., "/arbor", "/blog/hello").
 * Rejects absolute URLs, protocol-relative URLs, and other bypass attempts.
 *
 * @param returnTo - The redirect URL to validate
 * @param fallback - Fallback path if validation fails (default: "/")
 * @returns A safe relative path
 *
 * @example
 * sanitizeReturnTo("/arbor")                    // "/arbor"
 * sanitizeReturnTo("/blog/hello?page=2")        // "/blog/hello?page=2"
 * sanitizeReturnTo("https://evil.com")          // "/"
 * sanitizeReturnTo("//evil.com")                // "/"
 * sanitizeReturnTo("\\/evil.com")               // "/"
 * sanitizeReturnTo(null)                        // "/"
 */
export function sanitizeReturnTo(
  returnTo: string | null | undefined,
  fallback = "/",
): string {
  if (!returnTo || typeof returnTo !== "string") {
    return fallback;
  }

  // Must start with / (relative path)
  if (!returnTo.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (//evil.com) and backslash variants (\/evil.com)
  if (returnTo.startsWith("//") || returnTo.startsWith("/\\")) {
    return fallback;
  }

  return returnTo;
}
