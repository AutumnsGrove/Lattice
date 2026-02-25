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
		let stringValue: string;
		if (typeof value === "string") {
			stringValue = value;
		} else if (value instanceof ArrayBuffer) {
			stringValue = new TextDecoder().decode(value);
		} else {
			// Read the stream so mock behavior matches production KV
			const reader = value.getReader();
			const chunks: Uint8Array[] = [];
			for (;;) {
				const { done, value: chunk } = await reader.read();
				if (done) break;
				chunks.push(chunk as Uint8Array);
			}
			const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
			const merged = new Uint8Array(totalLength);
			let offset = 0;
			for (const chunk of chunks) {
				merged.set(chunk, offset);
				offset += chunk.length;
			}
			stringValue = new TextDecoder().decode(merged);
		}

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

		const allMatching = Array.from(this.store.entries())
			.filter(([key]) => key.startsWith(prefix))
			.sort(([a], [b]) => a.localeCompare(b));

		const listComplete = allMatching.length <= limit;
		const page = allMatching.slice(0, limit);

		const keys = page.map(([name, entry]) => ({
			name,
			expiration: entry.expiration,
			metadata: entry.metadata,
		}));

		return {
			keys,
			cursor: listComplete ? undefined : page[page.length - 1]?.[0],
			list_complete: listComplete,
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
