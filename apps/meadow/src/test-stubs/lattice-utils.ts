/**
 * Test stub for @autumnsgrove/lattice/utils
 *
 * Provides safeParseJson without pulling in the full engine dependency chain.
 */

/** Safely parse a JSON string, returning a fallback on failure */
export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
	if (value == null || value === "") return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/** Constant-time string comparison */
export function timingSafeEqual(a: string, b: string): boolean {
	const maxLength = Math.max(a.length, b.length);
	let result = a.length ^ b.length;
	for (let i = 0; i < maxLength; i++) {
		result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return result === 0;
}
