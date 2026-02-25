/**
 * API Key Authentication
 *
 * For service binding callers (internal Workers) and admin endpoints.
 * Checks X-API-Key header against registered agent secrets.
 */

import type { GroveDatabase } from "@autumnsgrove/infra";
import type { WardenAgent } from "../types";

/** Look up an agent by API key (the raw key, compared against stored hash) */
export async function authenticateByApiKey(
	db: GroveDatabase,
	apiKey: string,
): Promise<WardenAgent | null> {
	// Hash the provided key to compare against stored hash
	const hash = await hashApiKey(apiKey);

	const agent = await db
		.prepare("SELECT * FROM warden_agents WHERE secret_hash = ? AND enabled = 1")
		.bind(hash)
		.first<WardenAgent>();

	return agent;
}

/** Hash an API key using SHA-256 for storage/comparison */
export async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
