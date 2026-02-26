/**
 * Firefly Orchestrator Factory
 *
 * Creates a pre-configured Firefly instance for Loft,
 * wired with FlyProvider (via Warden), D1 store, and R2 sync.
 */

import {
	Firefly,
	D1FireflyStore,
	LOFT_DEFAULTS,
	createWardenProvider,
} from "@autumnsgrove/lattice/firefly";
import { createWardenClient } from "@autumnsgrove/lattice/warden";
import type { Env } from "../types";

export function createLoftFirefly(env: Env): Firefly {
	// Create Warden client for credential resolution
	const warden = createWardenClient({
		WARDEN: env.WARDEN,
		WARDEN_API_KEY: env.WARDEN_API_KEY,
	});

	// Create Fly provider via Warden token resolution
	const provider = createWardenProvider("fly", warden, {
		org: "autumns-grove",
		app: "grove-loft",
		defaultRegion: LOFT_DEFAULTS.defaultRegion,
		defaultSize: LOFT_DEFAULTS.defaultSize,
	});

	// Create D1 state store
	const store = new D1FireflyStore(env.DB);

	return new Firefly({
		provider,
		store,
		idle: LOFT_DEFAULTS.idle,
		maxLifetime: LOFT_DEFAULTS.maxLifetime,
		tags: LOFT_DEFAULTS.tags,
		consumer: LOFT_DEFAULTS.name,
		onEvent: (event: { type: string; instanceId?: string; durationMs?: number }) => {
			console.log(
				`[Firefly] ${event.type}${event.instanceId ? ` (${event.instanceId.slice(0, 8)})` : ""}` +
					`${event.durationMs ? ` ${event.durationMs}ms` : ""}`,
			);
		},
	});
}
