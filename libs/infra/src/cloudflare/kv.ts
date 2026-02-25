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
	GroveObserver,
} from "../types.js";

/** Runtime check that a value is a Record<string, string> (e.g. KV metadata). */
function isStringRecord(v: unknown): v is Record<string, string> {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	for (const val of Object.values(v)) {
		if (typeof val !== "string") return false;
	}
	return true;
}

export class CloudflareKV implements GroveKV {
	constructor(
		private readonly kv: KVNamespace,
		private readonly namespaceName: string = "default",
		private readonly observer?: GroveObserver,
	) {}

	async get<T = string>(key: string, options?: KVGetOptions): Promise<T | null> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "get: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		const start = performance.now();
		try {
			const type = options?.type ?? "text";
			let result: T | null;
			// Use separate overloads to satisfy CF's KVNamespace type.
			// Callers needing validated shapes should use Rootwork's
			// safeJsonParse() or createTypedCacheReader() on the result.
			if (type === "json") {
				result = (await this.kv.get(key, "json")) as T | null;
			} else if (type === "arrayBuffer") {
				result = (await this.kv.get(key, "arrayBuffer")) as T | null;
			} else if (type === "stream") {
				result = (await this.kv.get(key, "stream")) as T | null;
			} else {
				result = (await this.kv.get(key, "text")) as T | null;
			}
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "get",
				durationMs,
				ok: true,
				detail: key,
			});
			return result;
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "get",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
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
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "put: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}
		// Validate expirationTtl is positive if provided
		if (
			options?.expirationTtl !== undefined &&
			(typeof options.expirationTtl !== "number" || options.expirationTtl <= 0)
		) {
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "put: expirationTtl must be a positive number",
			});
			throw new Error("Expiration TTL must be a positive number");
		}

		const start = performance.now();
		try {
			await this.kv.put(key, value, {
				expirationTtl: options?.expirationTtl,
				expiration: options?.expiration,
				metadata: options?.metadata,
			});
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "put",
				durationMs,
				ok: true,
				detail: key,
			});
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "put",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `put: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async delete(key: string): Promise<void> {
		// Input validation: key must be a non-empty string
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "delete: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		const start = performance.now();
		try {
			await this.kv.delete(key);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "delete",
				durationMs,
				ok: true,
				detail: key,
			});
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "delete",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: `delete: ${key}`,
				cause: error,
			});
			throw error;
		}
	}

	async list(options?: KVListOptions): Promise<KVListResult> {
		const start = performance.now();
		try {
			const result = await this.kv.list({
				prefix: options?.prefix ?? undefined,
				cursor: options?.cursor ?? undefined,
				limit: options?.limit,
			});

			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "list",
				durationMs,
				ok: true,
				detail: `prefix=${options?.prefix ?? ""}`,
			});

			return {
				keys: result.keys.map((k) => ({
					name: k.name,
					expiration: k.expiration ?? undefined,
					metadata: isStringRecord(k.metadata) ? k.metadata : undefined,
				})),
				cursor: result.list_complete ? undefined : result.cursor,
				list_complete: result.list_complete,
			};
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "list",
				durationMs,
				ok: false,
				detail: `prefix=${options?.prefix ?? ""}`,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
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
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
				detail: "getWithMetadata: key is empty or invalid",
			});
			throw new Error("KV key cannot be empty");
		}

		const start = performance.now();
		try {
			const result = await this.kv.getWithMetadata<M>(key);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "getWithMetadata",
				durationMs,
				ok: true,
				detail: key,
			});
			if (result.value === null) return null;
			// KV returns string; callers needing parsed data should use
			// safeJsonParse() from Rootwork on the returned string value.
			const value: unknown = result.value;
			const metadata = isStringRecord(result.metadata) ? (result.metadata as M) : null;
			return { value: value as T, metadata };
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "kv",
				operation: "getWithMetadata",
				durationMs,
				ok: false,
				detail: key,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.KV_OPERATION_FAILED, {
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
