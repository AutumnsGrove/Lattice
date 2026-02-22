/**
 * Schedule a callback during browser idle time.
 *
 * Uses `requestIdleCallback` where available, falling back to `setTimeout(cb, 0)`
 * for Safari and SSR environments. Returns the handle so callers can cancel.
 */
export function scheduleIdle(cb: (deadline?: IdleDeadline) => void): number {
	if (typeof requestIdleCallback !== "undefined") {
		return requestIdleCallback(cb);
	}
	return setTimeout(cb, 0) as unknown as number;
}

/** Cancel a handle returned by {@link scheduleIdle}. */
export function cancelIdle(handle: number): void {
	if (typeof cancelIdleCallback !== "undefined") {
		cancelIdleCallback(handle);
	} else {
		clearTimeout(handle);
	}
}
