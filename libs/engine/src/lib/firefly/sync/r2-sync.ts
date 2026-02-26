/**
 * Firefly SDK — R2 State Synchronizer
 *
 * Uses GroveStorage from @autumnsgrove/infra for state persistence.
 * Consumers configure their own R2 key hierarchy; this synchronizer
 * handles the hydrate/persist/conflict lifecycle.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { GroveStorage } from "@autumnsgrove/infra";
import type { StateSynchronizer, ConflictResult, ServerInstance } from "../types.js";

export interface R2SyncConfig {
	/** The GroveStorage instance (wraps an R2 bucket). */
	storage: GroveStorage;
	/** Optional key prefix for all state objects. */
	prefix?: string;
}

export class R2StateSynchronizer implements StateSynchronizer {
	private readonly storage: GroveStorage;
	private readonly prefix: string;

	constructor(config: R2SyncConfig) {
		this.storage = config.storage;
		this.prefix = config.prefix ?? "firefly-state";
	}

	async hydrate(instance: ServerInstance, stateKey: string): Promise<void> {
		const key = this.buildKey(stateKey);
		const obj = await this.storage.get(key);

		if (!obj) {
			// No prior state — fresh start
			return;
		}

		// Store the hydrated state reference on the instance metadata
		// Consumers use this to retrieve/apply the state
		const reader = obj.body.getReader();
		const chunks: Uint8Array[] = [];
		let done = false;

		while (!done) {
			const result = await reader.read();
			done = result.done;
			if (result.value) {
				chunks.push(result.value);
			}
		}

		const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const combined = new Uint8Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
			combined.set(chunk, offset);
			offset += chunk.length;
		}

		instance.metadata._hydratedState = new TextDecoder().decode(combined);
		instance.metadata._hydratedAt = Date.now();
		instance.metadata._hydratedVersion = obj.etag;
	}

	async persist(instance: ServerInstance, stateKey: string): Promise<void> {
		const key = this.buildKey(stateKey);
		const state = instance.metadata._pendingState as string | undefined;

		if (!state) {
			// Nothing to persist
			return;
		}

		await this.storage.put(key, state, {
			contentType: "application/json",
			metadata: {
				"firefly-id": instance.id,
				provider: instance.provider,
				"persisted-at": String(Date.now()),
			},
		});

		// Clear pending state after successful persist
		delete instance.metadata._pendingState;
	}

	async checkConflicts(stateKey: string, localVersion?: string): Promise<ConflictResult> {
		const key = this.buildKey(stateKey);
		const meta = await this.storage.head(key);

		if (!meta) {
			return { hasConflict: false };
		}

		// If the caller provides a local version (etag from last hydrate),
		// detect conflicts by comparing it against the current remote version.
		if (localVersion && meta.etag && localVersion !== meta.etag) {
			return {
				hasConflict: true,
				localVersion,
				remoteVersion: meta.etag,
				resolution: "use_remote",
			};
		}

		return {
			hasConflict: false,
			remoteVersion: meta.etag,
			resolution: "use_remote",
		};
	}

	private buildKey(stateKey: string): string {
		return `${this.prefix}/${stateKey}`;
	}
}
