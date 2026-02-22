/**
 * In-memory GroveKV mock for testing.
 *
 * Stores key-value pairs in a Map with optional TTL tracking.
 */

import type {
	GroveKV,
	KVGetOptions,
	KVPutOptions,
	KVListOptions,
	KVListResult,
	KVValueMeta,
	KVInfo,
} from "../types.js";

interface StoredKVEntry {
	value: string | ArrayBuffer;
	metadata?: Record<string, string>;
	expiration?: number;
}

export class MockKV implements GroveKV {
	private readonly store = new Map<string, StoredKVEntry>();

	async get<T = string>(key: string, options?: KVGetOptions): Promise<T | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		// Check expiration
		if (entry.expiration && Date.now() / 1000 > entry.expiration) {
			this.store.delete(key);
			return null;
		}

		const type = options?.type ?? "text";
		if (type === "json" && typeof entry.value === "string") {
			return JSON.parse(entry.value) as T;
		}

		return entry.value as T;
	}

	async put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: KVPutOptions,
	): Promise<void> {
		const stringValue =
			typeof value === "string"
				? value
				: value instanceof ArrayBuffer
					? new TextDecoder().decode(value)
					: "";

		let expiration = options?.expiration;
		if (!expiration && options?.expirationTtl) {
			expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
		}

		this.store.set(key, {
			value: stringValue,
			metadata: options?.metadata,
			expiration,
		});
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async list(options?: KVListOptions): Promise<KVListResult> {
		const prefix = options?.prefix ?? "";
		const limit = options?.limit ?? 1000;

		const keys = Array.from(this.store.entries())
			.filter(([key]) => key.startsWith(prefix))
			.slice(0, limit)
			.map(([name, entry]) => ({
				name,
				expiration: entry.expiration,
				metadata: entry.metadata,
			}));

		return {
			keys,
			list_complete: true,
		};
	}

	async getWithMetadata<T = string, M = Record<string, string>>(
		key: string,
	): Promise<KVValueMeta<T, M> | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		// Check expiration
		if (entry.expiration && Date.now() / 1000 > entry.expiration) {
			this.store.delete(key);
			return null;
		}

		return {
			value: entry.value as unknown as T,
			metadata: (entry.metadata as unknown as M) ?? null,
		};
	}

	info(): KVInfo {
		return {
			provider: "mock",
			namespace: "test",
		};
	}

	/** Get the number of stored entries */
	get size(): number {
		return this.store.size;
	}

	/** Check if a key exists (ignoring expiration) */
	has(key: string): boolean {
		return this.store.has(key);
	}

	/** Reset all stored entries */
	reset(): void {
		this.store.clear();
	}
}
