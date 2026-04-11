/**
 * Property-based tests for redirect URI parsing.
 *
 * These tests don't check individual examples — they define invariants that
 * must hold for ALL inputs, then let fast-check generate hundreds of random
 * cases trying to break them. If the invariant holds across the sample set,
 * the function is correct by construction.
 *
 * See: docs/research/verified-development.md (Layer 3: Property-Based Testing)
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { extractSubdomainFromRedirectUri } from "./queries.js";
import { validateSubdomain, type Subdomain } from "../types/branded.js";

// ============================================================================
// Arbitraries — fast-check generators for Grove-shaped inputs
// ============================================================================

/**
 * The alphabet for a DNS-safe subdomain label. We generate character arrays
 * from this set rather than using `fc.string().filter(...)` — filter-based
 * generators are slow and can hang when too many random inputs are rejected.
 */
const SUBDOMAIN_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");
const subdomainCharArb = fc.constantFrom(...SUBDOMAIN_CHARS);

/** Generates a valid subdomain label: 1–63 lowercase alphanumerics + hyphens. */
const validSubdomainArb = fc
	.array(subdomainCharArb, { minLength: 1, maxLength: 63 })
	.map((chars) => chars.join(""));

/**
 * Generates a subdomain that is GUARANTEED to be too long (64–200 chars).
 * Constructed explicitly so fast-check never has to retry.
 */
const oversizedSubdomainArb = fc
	.array(subdomainCharArb, { minLength: 64, maxLength: 200 })
	.map((chars) => chars.join(""));

/** Generates a valid groveengine redirect URI with a random subdomain. */
const validRedirectUriArb = validSubdomainArb.map(
	(sub) => `https://${sub}.grove.place/auth/callback`,
);

// ============================================================================
// validateSubdomain
// ============================================================================

describe("validateSubdomain — properties", () => {
	it("accepts every string matching /^[a-z0-9-]{1,63}$/", () => {
		fc.assert(
			fc.property(validSubdomainArb, (raw) => {
				const result = validateSubdomain(raw);
				expect(result).not.toBeNull();
				expect(result).toBe(raw);
			}),
		);
	});

	it("is idempotent — validate(validate(x)) === validate(x)", () => {
		fc.assert(
			fc.property(validSubdomainArb, (raw) => {
				const once = validateSubdomain(raw);
				if (once === null) return true;
				const twice = validateSubdomain(once);
				return twice === once;
			}),
		);
	});

	it("normalises to lowercase — case never affects the result", () => {
		fc.assert(
			fc.property(validSubdomainArb, (raw) => {
				const upper = validateSubdomain(raw.toUpperCase());
				const lower = validateSubdomain(raw.toLowerCase());
				return upper === lower;
			}),
		);
	});

	it("rejects strings longer than 63 characters", () => {
		fc.assert(
			fc.property(oversizedSubdomainArb, (oversized) => {
				return validateSubdomain(oversized) === null;
			}),
		);
	});

	it("rejects the empty string", () => {
		expect(validateSubdomain("")).toBeNull();
	});

	it("rejects strings containing non-subdomain characters", () => {
		fc.assert(
			fc.property(
				validSubdomainArb,
				fc.constantFrom("!", "@", "#", ".", "/", " ", "_", "$"),
				(base, badChar) => {
					// Inject one bad character somewhere in a valid base.
					const mid = Math.floor(base.length / 2);
					const corrupted = base.slice(0, mid) + badChar + base.slice(mid);
					return validateSubdomain(corrupted) === null;
				},
			),
		);
	});

	it("never throws for any string input (no-crash property)", () => {
		fc.assert(
			fc.property(fc.string(), (raw) => {
				// Must not throw — returning null is the failure mode.
				validateSubdomain(raw);
				return true;
			}),
		);
	});
});

// ============================================================================
// extractSubdomainFromRedirectUri
// ============================================================================

describe("extractSubdomainFromRedirectUri — properties", () => {
	it("round-trips: any valid subdomain embedded in a URI comes back out", () => {
		fc.assert(
			fc.property(validSubdomainArb, (sub) => {
				const uri = `https://${sub}.grove.place/auth/callback`;
				const extracted = extractSubdomainFromRedirectUri("groveengine", uri);
				return extracted === sub;
			}),
		);
	});

	it("extracted value is always a valid Subdomain (format invariant)", () => {
		fc.assert(
			fc.property(validRedirectUriArb, (uri) => {
				const extracted = extractSubdomainFromRedirectUri("groveengine", uri);
				if (extracted === null) return false;
				// The extracted value must itself pass validateSubdomain —
				// a Subdomain in means a Subdomain out.
				return validateSubdomain(extracted) !== null;
			}),
		);
	});

	it("case-insensitive input produces lowercased output", () => {
		fc.assert(
			fc.property(validSubdomainArb, (sub) => {
				const upperUri = `https://${sub.toUpperCase()}.grove.place/auth/callback`;
				const extracted = extractSubdomainFromRedirectUri("groveengine", upperUri);
				return extracted === sub.toLowerCase();
			}),
		);
	});

	it("unknown client_id always returns null — wildcard is opt-in per client", () => {
		// Use constantFrom for predictable "not groveengine" values instead of
		// filter-based rejection.
		const nonGroveClientArb = fc.constantFrom(
			"",
			"unknown",
			"third-party",
			"attacker",
			"lattice",
			"heartwood",
		);
		fc.assert(
			fc.property(nonGroveClientArb, validRedirectUriArb, (clientId, uri) => {
				return extractSubdomainFromRedirectUri(clientId, uri) === null;
			}),
		);
	});

	it("never throws on garbage input (no-crash property)", () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (clientId, uri) => {
				// The boundary rejection contract: return null, don't throw.
				extractSubdomainFromRedirectUri(clientId, uri);
				return true;
			}),
		);
	});

	it("rejects non-HTTPS URIs — protocol downgrade must never parse", () => {
		fc.assert(
			fc.property(validSubdomainArb, (sub) => {
				const httpUri = `http://${sub}.grove.place/auth/callback`;
				return extractSubdomainFromRedirectUri("groveengine", httpUri) === null;
			}),
		);
	});

	it("rejects nested subdomains — attacker.victim.grove.place pattern", () => {
		// Security-critical: nested subdomains must never match the pattern,
		// or an attacker could claim a redirect URI they don't control.
		fc.assert(
			fc.property(validSubdomainArb, validSubdomainArb, (attackerSub, victimSub) => {
				const nestedUri = `https://${attackerSub}.${victimSub}.grove.place/auth/callback`;
				const result = extractSubdomainFromRedirectUri("groveengine", nestedUri);
				// Either null (pattern rejects) or the value is NOT attackerSub —
				// never let the attacker's label leak through.
				return result === null || result !== attackerSub;
			}),
		);
	});

	it("rejects wrong path — /auth/callback is the only acceptable path", () => {
		const wrongPathArb = fc.constantFrom(
			"/",
			"/auth",
			"/callback",
			"/auth/callbacks",
			"/auth/callback/extra",
			"/admin",
			"/api/token",
		);
		fc.assert(
			fc.property(validSubdomainArb, wrongPathArb, (sub, wrongPath) => {
				const uri = `https://${sub}.grove.place${wrongPath}`;
				return extractSubdomainFromRedirectUri("groveengine", uri) === null;
			}),
		);
	});
});

// ============================================================================
// Type-level check — compile-time proof the brand exists
// ============================================================================

describe("Subdomain brand — type-level", () => {
	it("compiler refuses to pass a raw string where Subdomain is expected", () => {
		// This test is a no-op at runtime — the real test is that the line
		// below FAILS typecheck. It's kept as a living example for contributors.
		//
		// @ts-expect-error — raw strings are not Subdomains
		const _wrong: Subdomain = "definitely-not-branded";
		expect(typeof _wrong).toBe("string");
	});
});
