/**
 * Unavailable service proxies.
 *
 * When a binding is not provided to createCloudflareContext(), these
 * stand-ins fulfill the interface contract but throw a descriptive
 * SRV-00X error on any data operation. The `info()` method is the
 * sole exception — it returns `{ provider: "unavailable" }` without
 * throwing, so callers can check availability before attempting real
 * operations. All other methods throw immediately.
 *
 * This enables partial-context creation: a worker that only needs
 * `db` won't crash because `storage` wasn't wired up.
 */

import type { GroveDatabase, GroveStorage, GroveKV } from "../types.js";
import { SRV_ERRORS } from "../errors.js";

function unavailable(errorDef: { code: string; adminMessage: string }): never {
	throw new Error(`[${errorDef.code}] ${errorDef.adminMessage}`);
}

/** Database proxy that throws SRV-001 on any data operation. info() returns safely. */
export function createUnavailableDatabase(): GroveDatabase {
	const msg = SRV_ERRORS.DB_NOT_AVAILABLE;
	return {
		execute: () => unavailable(msg),
		batch: () => unavailable(msg),
		prepare: () => unavailable(msg),
		transaction: () => unavailable(msg),
		info: () => ({ provider: "unavailable", database: "none", readonly: true }),
	};
}

/** Storage proxy that throws SRV-002 on any data operation. info() returns safely. */
export function createUnavailableStorage(): GroveStorage {
	const msg = SRV_ERRORS.STORAGE_NOT_AVAILABLE;
	return {
		put: () => unavailable(msg),
		get: () => unavailable(msg),
		head: () => unavailable(msg),
		delete: () => unavailable(msg),
		deleteMany: () => unavailable(msg),
		list: () => unavailable(msg),
		presignedUrl: () => unavailable(msg),
		info: () => ({ provider: "unavailable", bucket: "none" }),
	};
}

/** KV proxy that throws SRV-003 on any data operation. info() returns safely. */
export function createUnavailableKV(): GroveKV {
	const msg = SRV_ERRORS.KV_NOT_AVAILABLE;
	return {
		get: () => unavailable(msg),
		put: () => unavailable(msg),
		delete: () => unavailable(msg),
		list: () => unavailable(msg),
		getWithMetadata: () => unavailable(msg),
		info: () => ({ provider: "unavailable", namespace: "none" }),
	};
}
