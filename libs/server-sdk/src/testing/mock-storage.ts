/**
 * In-memory GroveStorage mock for testing.
 *
 * Stores objects in a Map for assertion and retrieval.
 */

import type {
	GroveStorage,
	PutOptions,
	StorageObject,
	StorageObjectMeta,
	ListOptions,
	StorageListResult,
	PresignOptions,
	StorageInfo,
} from "../types.js";

interface StoredObject {
	data: string | ArrayBuffer;
	contentType: string;
	metadata: Record<string, string>;
	size: number;
	uploadedAt: Date;
}

export class MockStorage implements GroveStorage {
	private readonly store = new Map<string, StoredObject>();

	async put(
		key: string,
		data: ReadableStream | ArrayBuffer | string,
		options?: PutOptions,
	): Promise<StorageObject> {
		const stringData =
			typeof data === "string"
				? data
				: data instanceof ArrayBuffer
					? new TextDecoder().decode(data)
					: "";
		const stored: StoredObject = {
			data: stringData,
			contentType: options?.contentType ?? "application/octet-stream",
			metadata: options?.metadata ?? {},
			size: typeof stringData === "string" ? stringData.length : 0,
			uploadedAt: new Date(),
		};
		this.store.set(key, stored);

		return {
			key,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(
						new TextEncoder().encode(typeof stringData === "string" ? stringData : ""),
					);
					controller.close();
				},
			}),
			size: stored.size,
			etag: `"mock-${Date.now()}"`,
			contentType: stored.contentType,
			lastModified: stored.uploadedAt,
			metadata: stored.metadata,
		};
	}

	async get(key: string): Promise<StorageObject | null> {
		const stored = this.store.get(key);
		if (!stored) return null;

		const data = stored.data;
		return {
			key,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(typeof data === "string" ? data : ""));
					controller.close();
				},
			}),
			size: stored.size,
			etag: `"mock-etag"`,
			contentType: stored.contentType,
			lastModified: stored.uploadedAt,
			metadata: stored.metadata,
		};
	}

	async head(key: string): Promise<StorageObjectMeta | null> {
		const stored = this.store.get(key);
		if (!stored) return null;

		return {
			key,
			size: stored.size,
			etag: `"mock-etag"`,
			contentType: stored.contentType,
			lastModified: stored.uploadedAt,
			metadata: stored.metadata,
		};
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async deleteMany(keys: string[]): Promise<void> {
		for (const key of keys) {
			this.store.delete(key);
		}
	}

	async list(options?: ListOptions): Promise<StorageListResult> {
		const prefix = options?.prefix ?? "";
		const limit = options?.limit ?? 1000;

		const matching = Array.from(this.store.entries())
			.filter(([key]) => key.startsWith(prefix))
			.slice(0, limit)
			.map(([key, stored]) => ({
				key,
				size: stored.size,
				etag: `"mock-etag"`,
				contentType: stored.contentType,
				lastModified: stored.uploadedAt,
				metadata: stored.metadata,
			}));

		return {
			objects: matching,
			truncated: false,
		};
	}

	async presignedUrl(key: string, options: PresignOptions): Promise<string> {
		return `https://mock-storage.test/${key}?action=${options.action}&expires=${options.expiresIn}`;
	}

	info(): StorageInfo {
		return {
			provider: "mock",
			bucket: "test",
		};
	}

	/** Get the number of stored objects */
	get size(): number {
		return this.store.size;
	}

	/** Check if a key exists */
	has(key: string): boolean {
		return this.store.has(key);
	}

	/** Reset all stored objects */
	reset(): void {
		this.store.clear();
	}
}
