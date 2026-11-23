/**
 * A `SecretsSlot` over a tenant's own encrypted secrets.
 *
 * The timeline already works this way: its GitHub token and its OpenRouter key
 * come from `tenant_secrets`, decrypted per tenant with the Grove KEK, not from
 * Warden and not from the worker's environment. A tool asks for a name, and this
 * answers with the value or with nothing.
 *
 * Two rules shape the file. The value never leaves the caller that asked for it —
 * nothing here logs, caches or returns a whole set. And a name is looked up, not
 * interpolated: a caller cannot reach a secret by naming `user_123/something`,
 * because the secrets manager is asked for that name and finds nothing.
 */

import type { SecretsSlot } from "@autumnsgrove/lyra";
import { createSecretsManager } from "@autumnsgrove/grove-crypto/secrets";

export interface TenantSecretsSlotConfig {
	/** The tenant database that holds `tenant_secrets`. */
	db: D1Database;
	/** The key encryption key, from the worker's secrets. */
	kek: string;
	/** Whose secrets these are. */
	tenantId: string;
	/**
	 * A prefix applied to every name a tool asks for, so one tenant's timeline
	 * tools cannot read a secret another feature owns. Optional: a caller that
	 * already names secrets in full does not need it.
	 */
	prefix?: string;
}

/** The names the timeline's own secrets are stored under, so they are spelled once. */
export const TIMELINE_SECRETS = {
	githubToken: "timeline_github_token",
	openRouterKey: "timeline_openrouter_key",
} as const;

/**
 * Build the slot.
 *
 * The manager is created once and reused: it is a cheap wrapper around the
 * database and the KEK, and rebuilding it per lookup would repeat the same work
 * for every tool call in a run.
 */
export function createTenantSecretsSlot(config: TenantSecretsSlotConfig): SecretsSlot {
	const manager = createSecretsManager({ DB: config.db, GROVE_KEK: config.kek });

	return {
		async get(name: string): Promise<string | undefined> {
			const key = config.prefix ? `${config.prefix}${name}` : name;
			const value = await (await manager).safeGetSecret(config.tenantId, key);
			// The manager answers `null` for "not held"; the slot's contract says
			// `undefined`, and a caller must not be able to tell a missing secret from
			// an empty one.
			return value === null || value === "" ? undefined : value;
		},
	};
}
