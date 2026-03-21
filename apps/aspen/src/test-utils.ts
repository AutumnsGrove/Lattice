/**
 * Test Utilities for Aspen
 *
 * TypeScript assertion functions for narrowing SvelteKit's complex
 * load() and action() return types in test contexts.
 */

/**
 * Narrow a SvelteKit load() result that may include void in its union type.
 *
 * SvelteKit types load() returns as `T | void` because the function can
 * throw (redirect, error) without returning. In tests, we expect data —
 * this assertion narrows the type and gives a clear error if it's ever wrong.
 *
 * @example
 * ```ts
 * const result = await load(event);
 * assertLoaded(result);
 * // result is now narrowed — properties accessible without casts
 * expect(result.someProperty).toBe(true);
 * ```
 */
export function assertLoaded<T>(result: T | void): asserts result is T {
	if (result === undefined || result === null) {
		throw new Error(
			"Expected load() to return data, got void/null. " +
				"Did the load function throw a redirect or error?",
		);
	}
}

/**
 * Narrow a SvelteKit action() result for tests.
 *
 * Actions return a union that includes void (for redirects/errors).
 * This narrows to the data branch so test assertions can access properties.
 *
 * @example
 * ```ts
 * const result = await actions.updateProfile(event);
 * assertActionResult(result);
 * expect(result.status).toBe(200);
 * ```
 */
export function assertActionResult<T extends Record<string, unknown> = Record<string, unknown>>(
	result: T | void,
): asserts result is T {
	if (result === undefined || result === null) {
		throw new Error(
			"Expected action to return data, got void/null. " +
				"Did the action throw a redirect or error?",
		);
	}
}
