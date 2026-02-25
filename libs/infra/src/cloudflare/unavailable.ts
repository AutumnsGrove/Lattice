/**
 * Unavailable service proxies.
 *
 * When a binding is not provided to createCloudflareContext(), these
 * stand-ins fulfill the interface contract but reject with a descriptive
 * SRV-00X error on any data operation. The `info()` method is the
 * sole exception — it returns `{ provider: "unavailable" }` without
 * throwing, so callers can check availability before attempting real
 * operations.
 *
 * Async methods return `Promise.reject()` (not sync throws) so that
 * both `await fn()` and `fn().catch()` catch the error consistently.
 * Sync methods (like `prepare()`) throw synchronously.
 *
 * This enables partial-context creation: a worker that only needs
 * `db` won't crash because `storage` wasn't wired up.
 */

import type { GroveDatabase, GroveStorage, GroveKV } from "../types.js";
import { SRV_ERRORS } from "../errors.js";

function rejected(errorDef: { code: string; adminMessage: string }): Promise<never> {
	return Promise.reject(new Error(`[${errorDef.code}] ${errorDef.adminMessage}`));
}

function thrown(errorDef: { code: string; adminMessage: string }): never {
	throw new Error(`[${errorDef.code}] ${errorDef.adminMessage}`);
}

/** Database proxy that rejects SRV-001 on any data operation. info() returns safely. */
export function createUnavailableDatabase(): GroveDatabase {
	const msg = SRV_ERRORS.DB_NOT_AVAILABLE;
	return {
		execute: () => rejected(msg),
		batch: () => rejected(msg),
		prepare: () => thrown(msg),
		transaction: () => rejected(msg),
		info: () => ({ provider: "unavailable", database: "none", readonly: true }),
	};
}

/** Storage proxy that rejects SRV-002 on any data operation. info() returns safely. */
export function createUnavailableStorage(): GroveStorage {
	const msg = SRV_ERRORS.STORAGE_NOT_AVAILABLE;
	return {
		put: () => rejected(msg),
		get: () => rejected(msg),
		head: () => rejected(msg),
		delete: () => rejected(msg),
		deleteMany: () => rejected(msg),
		list: () => rejected(msg),
		presignedUrl: () => rejected(msg),
		info: () => ({ provider: "unavailable", bucket: "none" }),
	};
}

/** KV proxy that rejects SRV-003 on any data operation. info() returns safely. */
export function createUnavailableKV(): GroveKV {
	const msg = SRV_ERRORS.KV_NOT_AVAILABLE;
	return {
		get: () => rejected(msg),
		put: () => rejected(msg),
		delete: () => rejected(msg),
		list: () => rejected(msg),
		getWithMetadata: () => rejected(msg),
		info: () => ({ provider: "unavailable", namespace: "none" }),
	};
}
