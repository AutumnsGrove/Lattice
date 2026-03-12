/**
 * Test stub for @autumnsgrove/lattice/utils
 *
 * Provides the timingSafeEqual function without pulling in the full
 * engine dependency chain (which requires svelte-kit sync).
 * This is a faithful reimplementation of the original.
 */

/** Constant-time string comparison — no early exit on mismatch */
export function timingSafeEqual(a: string, b: string): boolean {
	const maxLength = Math.max(a.length, b.length);
	let result = a.length ^ b.length;
	for (let i = 0; i < maxLength; i++) {
		result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return result === 0;
}
