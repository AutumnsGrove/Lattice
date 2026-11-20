/**
 * Branded types for Heartwood — compile-time invariants at trust boundaries.
 *
 * A branded type is a normal primitive (string, number) tagged with a phantom
 * field that only exists in the type system. The runtime value is identical
 * to the underlying primitive — zero cost — but TypeScript refuses to let you
 * pass an unbranded value where a branded one is required.
 *
 * This is the closest TypeScript gets to Lean-style type-level guarantees:
 * the ONLY way to obtain a `Subdomain` is through a validator, so any code
 * that accepts `Subdomain` is statically guaranteed to have seen validated
 * input. No more "I promise this string is safe" comments.
 *
 * See: docs/research/verified-development.md
 */

declare const __brand: unique symbol;

/**
 * Generic brand helper. Prefer the named aliases below for most call sites.
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ============================================================================
// Subdomain
// ============================================================================

/**
 * A tenant subdomain that has been validated against DNS-label rules:
 *   - lowercase alphanumeric with hyphens only
 *   - 1–63 characters (RFC 1035 label limit)
 *
 * A `Subdomain` has NOT necessarily been confirmed to exist in the tenants
 * table — that check is `isActiveTenant()`. This brand asserts *format*
 * validity only, which is the cheap check that prevents injection attacks
 * and malformed DNS lookups.
 *
 * The only way to obtain a `Subdomain` is via `validateSubdomain()` or a
 * function that returns one (e.g. `extractSubdomainFromRedirectUri`).
 */
export type Subdomain = Brand<string, "Subdomain">;

/** Maximum length of a single DNS label (RFC 1035). */
const SUBDOMAIN_MAX_LENGTH = 63;

/** Valid characters for a subdomain: lowercase alphanumeric + hyphens. */
const SUBDOMAIN_PATTERN = /^[a-z0-9-]+$/;

/**
 * Validate a raw string as a `Subdomain`. Returns `null` for any input that
 * fails the format check. Normalises to lowercase before validation.
 *
 * This is the authoritative format check — all other functions that produce
 * a `Subdomain` should go through this helper so the invariant holds.
 */
export function validateSubdomain(raw: string): Subdomain | null {
	if (!raw) return null;
	const normalized = raw.toLowerCase();
	if (normalized.length > SUBDOMAIN_MAX_LENGTH) return null;
	if (!SUBDOMAIN_PATTERN.test(normalized)) return null;
	return normalized as Subdomain;
}
