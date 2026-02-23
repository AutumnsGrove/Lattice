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
} from "../types.js";

export class CloudflareStorage implements GroveStorage {
	constructor(private readonly r2: R2Bucket) {}

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
		data: ReadableStream | ArrayBuffer | string,
		options?: PutOptions,
	): Promise<StorageObject> {
		// Input validation
		this.validateKey(key, "put");

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

			return this.toStorageObject(obj, key);
		} catch (error) {
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

		try {
			const obj = await this.r2.get(key);
			if (!obj) return null;
			return this.toStorageObjectWithBody(obj, key);
		} catch (error) {
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

		try {
			const obj = await this.r2.head(key);
			if (!obj) return null;
			return this.toMeta(obj, key);
		} catch (error) {
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

		try {
			await this.r2.delete(key);
		} catch (error) {
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

		try {
			await this.r2.delete(keys);
		} catch (error) {
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

		try {
			const result = await this.r2.list({
				prefix: options?.prefix,
				cursor: options?.cursor,
				limit: options?.limit,
				delimiter: options?.delimiter,
			});

			return {
				objects: result.objects.map((obj) => this.toMeta(obj, obj.key)),
				cursor: result.truncated ? result.cursor : undefined,
				truncated: result.truncated,
			};
		} catch (error) {
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
			bucket: "grove",
		};
	}

	private toStorageObject(obj: R2Object, key: string): StorageObject {
		return {
			key,
			body: new ReadableStream(),
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
