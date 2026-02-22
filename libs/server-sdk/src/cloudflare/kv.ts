/**
 * Cloudflare Workers KV adapter for GroveKV.
 *
 * Thin wrapper around KVNamespace. Zero overhead —
 * delegates directly to KV's native API.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type {
	GroveKV,
	KVGetOptions,
	KVPutOptions,
	KVListOptions,
	KVListResult,
	KVValueMeta,
	KVInfo,
} from "../types.js";

export class CloudflareKV implements GroveKV {
	constructor(
		private readonly kv: KVNamespace,
		private readonly namespaceName: string = "default",
	) {}

	async get<T = string>(key: string, options?: KVGetOptions): Promise<T | null> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "get: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		try {
			const type = options?.type ?? "text";
			// Use separate overloads to satisfy CF's KVNamespace type
			if (type === "json") {
				return (await this.kv.get(key, "json")) as T | null;
			}
			if (type === "arrayBuffer") {
				return (await this.kv.get(key, "arrayBuffer")) as T | null;
			}
			if (type === "stream") {
				return (await this.kv.get(key, "stream")) as T | null;
			}
			return (await this.kv.get(key, "text")) as T | null;
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `get: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: KVPutOptions,
	): Promise<void> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "put: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}
		// Validate expirationTtl is positive if provided
		if (
			options?.expirationTtl !== undefined &&
			(typeof options.expirationTtl !== "number" || options.expirationTtl <= 0)
		) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "put: expirationTtl must be a positive number",
			});
			throw new Error("Expiration TTL must be a positive number");
		}

		try {
			await this.kv.put(key, value, {
				expirationTtl: options?.expirationTtl,
				expiration: options?.expiration,
				metadata: options?.metadata,
			});
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `put: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async delete(key: string): Promise<void> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "delete: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		try {
			await this.kv.delete(key);
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `delete: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async list(options?: KVListOptions): Promise<KVListResult> {
		try {
			const result = await this.kv.list({
				prefix: options?.prefix ?? undefined,
				cursor: options?.cursor ?? undefined,
				limit: options?.limit,
			});

			return {
				keys: result.keys.map((k) => ({
					name: k.name,
					expiration: k.expiration ?? undefined,
					metadata: k.metadata as Record<string, string> | undefined,
				})),
				cursor: result.list_complete ? undefined : result.cursor,
				list_complete: result.list_complete,
			};
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `list: prefix=${options?.prefix ?? ""}`,
				cause: error,
			});
			throw error;
		}
	}

	async getWithMetadata<T = string, M = Record<string, string>>(
		key: string,
	): Promise<KVValueMeta<T, M> | null> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "getWithMetadata: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		try {
			const result = await this.kv.getWithMetadata<M>(key);
			if (result.value === null) return null;
			return {
				value: result.value as unknown as T,
				metadata: result.metadata,
			};
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `getWithMetadata: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	info(): KVInfo {
		return {
			provider: "cloudflare-kv",
			namespace: this.namespaceName,
		};
	}
}
