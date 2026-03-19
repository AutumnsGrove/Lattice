/**
 * Preference Sync — writes preference changes to Heartwood via /api/preferences.
 * Fire-and-forget: localStorage is the instant write, this is the durable backup.
 * Only runs in the browser. Errors are silently logged (non-critical).
 */

import { browser } from "$app/environment";
import { api } from "$lib/utils/api";

/** Pending preference updates, batched by key */
const pending = new Map<string, unknown>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Queue a preference update. Batches multiple changes within 300ms
 * into a single PUT request to avoid hammering the server.
 */
export function syncPreference(key: string, value: unknown): void {
	if (!browser) return;

	pending.set(key, value);

	if (flushTimer) clearTimeout(flushTimer);
	flushTimer = setTimeout(flush, 300);
}

async function flush(): Promise<void> {
	if (pending.size === 0) return;

	const body = Object.fromEntries(pending);
	pending.clear();
	flushTimer = null;

	try {
		await api.put("/api/preferences", body);
	} catch {
		// Non-critical: localStorage has the value, it'll sync next time
	}
}
