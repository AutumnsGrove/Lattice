/**
 * Redirect Validation — Billing Hub
 *
 * Validates redirect URLs to prevent open redirect attacks.
 * Only *.grove.place origins (HTTPS) and localhost (dev) are allowed.
 */

/** Match HTTPS *.grove.place origins (single or multi-level subdomains) */
const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*grove\.place$/;

/** Match localhost origins for local development */
const LOCAL_RE = /^http:\/\/localhost(:\d+)?$/;

/**
 * Check if a URL is a valid redirect target.
 * Must be a full URL with an allowed origin.
 */
export function isValidRedirect(url: string): boolean {
	try {
		const parsed = new URL(url);
		return ALLOWED_ORIGIN_RE.test(parsed.origin) || LOCAL_RE.test(parsed.origin);
	} catch {
		return false;
	}
}

/**
 * Get a safe redirect URL, falling back to the default if invalid.
 */
export function getSafeRedirect(url: string | null, fallback = "https://grove.place"): string {
	if (url && isValidRedirect(url)) return url;
	return fallback;
}
