/**
 * Type Guards for SvelteKit Error Boundaries
 *
 * SvelteKit throws redirect/error objects that don't extend Error.
 * These type guards eliminate `(err as any)?.status` casts.
 *
 * @module server/utils/type-guards
 */

/**
 * Type guard for SvelteKit redirect exceptions.
 * SvelteKit's `redirect()` throws an object with `status` (3xx) and `location`.
 *
 * @example
 * ```typescript
 * try {
 *   // ... route logic
 * } catch (err) {
 *   if (isRedirect(err)) throw err; // Re-throw redirects
 *   // Handle actual errors
 * }
 * ```
 */
export function isRedirect(err: unknown): err is { status: number; location: string } {
	return (
		typeof err === "object" &&
		err !== null &&
		"status" in err &&
		"location" in err &&
		typeof (err as Record<string, unknown>).status === "number" &&
		typeof (err as Record<string, unknown>).location === "string"
	);
}

/**
 * Type guard for SvelteKit HttpError exceptions.
 * SvelteKit's `error()` throws an object with `status` and `body.message`.
 *
 * @example
 * ```typescript
 * try {
 *   // ... route logic
 * } catch (err) {
 *   if (isHttpError(err)) {
 *     return json({ error: err.body.message }, { status: err.status });
 *   }
 * }
 * ```
 */
export function isHttpError(err: unknown): err is { status: number; body: { message: string } } {
	if (
		typeof err !== "object" ||
		err === null ||
		!("status" in err) ||
		!("body" in err) ||
		typeof (err as Record<string, unknown>).status !== "number" ||
		typeof (err as Record<string, unknown>).body !== "object" ||
		(err as Record<string, unknown>).body === null
	) {
		return false;
	}
	const body = (err as Record<string, unknown>).body as Record<string, unknown>;
	return "message" in body && typeof body.message === "string";
}
