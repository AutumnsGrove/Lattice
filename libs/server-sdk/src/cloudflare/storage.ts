/**
 * Cloudflare R2 adapter for GroveStorage.
 *
 * Thin wrapper around R2Bucket. Maps R2's S3-compatible API
 * to the GroveStorage interface.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type {
	GroveStorage,
	PutOptions,
	StorageObject,
	StorageObjectMeta,
	ListOptions,
	StorageListResult,
	PresignOptions,
	StorageInfo,
	GroveObserver,
} from "../types.js";

export class CloudflareStorage implements GroveStorage {
	constructor(
		private readonly r2: R2Bucket,
		private readonly bucketName: string = "default",
		private readonly observer?: GroveObserver,
	) {}

	private validateKey(key: string, context: string): void {
		// Validate key is a non-empty string and doesn't contain path traversal patterns
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: `${context}: key is empty or invalid`,
			});
			throw new Error("Storage key cannot be empty");
		}
		if (key.includes("..") || key.startsWith("/")) {
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: `${context}: key contains path traversal pattern`,
			});
			throw new Error("Storage key contains invalid path pattern");
		}
	}

	async put(
		key: string,
		data: ReadableStream | ArrayBuffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<StorageObject> {
		// Input validation
		this.validateKey(key, "put");

		const start = performance.now();
		try {
			const obj = await this.r2.put(key, data, {
				httpMetadata: {
					contentType: options?.contentType,
					contentDisposition: options?.contentDisposition,
					cacheControl: options?.cacheControl,
				},
				customMetadata: options?.metadata,
			});

			if (!obj) {
				throw new Error("R2 put returned null");
			}

			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "put",
				durationMs,
				ok: true,
				detail: key,
			});

			// R2 put() returns R2Object (no body). Reconstruct a readable
			// stream from the original data so the returned StorageObject
			// has a usable body — callers can read what they just wrote.
			return this.toStorageObjectFromPut(obj, key, data);
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "put",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.STORAGE_UPLOAD_FAILED, {
				detail: key,
				cause: error,
			});
			throw error;
		}
	}

	async get(key: string): Promise<StorageObject | null> {
		// Input validation
		this.validateKey(key, "get");

		const start = performance.now();
		try {
			const obj = await this.r2.get(key);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "get",
				durationMs,
				ok: true,
				detail: key,
			});
			if (!obj) return null;
			return this.toStorageObjectWithBody(obj, key);
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "get",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.STORAGE_DOWNLOAD_FAILED, {
				detail: key,
				cause: error,
			});
			throw error;
		}
	}

	async head(key: string): Promise<StorageObjectMeta | null> {
		// Input validation
		this.validateKey(key, "head");

		const start = performance.now();
		try {
			const obj = await this.r2.head(key);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "head",
				durationMs,
				ok: true,
				detail: key,
			});
			if (!obj) return null;
			return this.toMeta(obj, key);
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "head",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.STORAGE_DOWNLOAD_FAILED, {
				detail: `head: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async delete(key: string): Promise<void> {
		// Input validation
		this.validateKey(key, "delete");

		const start = performance.now();
		try {
			await this.r2.delete(key);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "delete",
				durationMs,
				ok: true,
				detail: key,
			});
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "delete",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: `delete: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async deleteMany(keys: string[]): Promise<void> {
		// Input validation: keys array must not be empty and each key must be valid
		if (!Array.isArray(keys) || keys.length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: "deleteMany: keys array is empty or invalid",
			});
			throw new Error("Keys array cannot be empty");
		}
		for (const key of keys) {
			if (!key || typeof key !== "string" || key.trim().length === 0) {
				logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
					detail: "deleteMany: key is empty or invalid",
				});
				throw new Error("Storage key cannot be empty");
			}
			if (key.includes("..") || key.startsWith("/")) {
				logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
					detail: "deleteMany: key contains path traversal pattern",
				});
				throw new Error("Storage key contains invalid path pattern");
			}
		}

		const start = performance.now();
		try {
			await this.r2.delete(keys);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "deleteMany",
				durationMs,
				ok: true,
				detail: `${keys.length} keys`,
			});
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "deleteMany",
				durationMs,
				ok: false,
				detail: `${keys.length} keys`,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: `deleteMany: ${keys.length} keys`,
				cause: error,
			});
			throw error;
		}
	}

	async list(options?: ListOptions): Promise<StorageListResult> {
		// Input validation: limit must be positive if provided
		if (options?.limit !== undefined && typeof options.limit !== "number") {
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: "list: limit must be a number",
			});
			throw new Error("Limit must be a positive number");
		}
		if (options?.limit !== undefined && options.limit <= 0) {
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: "list: limit must be positive",
			});
			throw new Error("Limit must be a positive number");
		}

		const start = performance.now();
		try {
			const result = await this.r2.list({
				prefix: options?.prefix,
				cursor: options?.cursor,
				limit: options?.limit,
				delimiter: options?.delimiter,
			});

			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "list",
				durationMs,
				ok: true,
				detail: `prefix=${options?.prefix ?? ""}`,
			});

			return {
				objects: result.objects.map((obj) => this.toMeta(obj, obj.key)),
				cursor: result.truncated ? result.cursor : undefined,
				truncated: result.truncated,
			};
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "storage",
				operation: "list",
				durationMs,
				ok: false,
				detail: `prefix=${options?.prefix ?? ""}`,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.ADAPTER_ERROR, {
				detail: `list: prefix=${options?.prefix ?? ""}`,
				cause: error,
			});
			throw error;
		}
	}

	async presignedUrl(_key: string, _options: PresignOptions): Promise<string> {
		// R2 presigned URLs require the S3-compatible API with credentials.
		// This is not available through the Worker binding directly.
		logGroveError("ServerSDK", SRV_ERRORS.PRESIGNED_URL_FAILED, {
			detail:
				"R2 presigned URLs require S3-compatible API credentials, not available through Worker bindings.",
		});
		throw new Error(SRV_ERRORS.PRESIGNED_URL_FAILED.adminMessage);
	}

	info(): StorageInfo {
		return {
			provider: "cloudflare-r2",
			bucket: this.bucketName,
		};
	}

	private toStorageObjectFromPut(
		obj: R2Object,
		key: string,
		originalData: ReadableStream | ArrayBuffer | string,
	): StorageObject {
		// Reconstruct a body stream from the original input data since
		// R2 put() returns R2Object (no body), not R2ObjectBody.
		let body: ReadableStream;
		if (originalData instanceof ReadableStream) {
			// Stream was already consumed by R2 — return an empty stream.
			// Callers should re-fetch with get() if they need to re-read.
			body = new ReadableStream();
		} else {
			const bytes =
				typeof originalData === "string"
					? new TextEncoder().encode(originalData)
					: new Uint8Array(originalData);
			body = new ReadableStream({
				start(controller) {
					controller.enqueue(bytes);
					controller.close();
				},
			});
		}

		return {
			key,
			body,
			size: obj.size,
			etag: obj.etag,
			contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
			lastModified: obj.uploaded,
			metadata: obj.customMetadata ?? {},
		};
	}

	private toStorageObjectWithBody(obj: R2ObjectBody, key: string): StorageObject {
		return {
			key,
			body: obj.body,
			size: obj.size,
			etag: obj.etag,
			contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
			lastModified: obj.uploaded,
			metadata: obj.customMetadata ?? {},
		};
	}

	private toMeta(obj: R2Object, key: string): StorageObjectMeta {
		return {
			key,
			size: obj.size,
			etag: obj.etag,
			contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
			lastModified: obj.uploaded,
			metadata: obj.customMetadata ?? {},
		};
	}
}
