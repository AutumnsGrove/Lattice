/**
 * Unit tests for CloudflareKV adapter.
 *
 * Validates KVNamespace delegation, input validation,
 * error handling, and info() metadata.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareKV } from "../../src/cloudflare/kv.js";
import { createMockKVNamespace, type MockKVNamespace } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareKV", () => {
	let mockKV: MockKVNamespace;
	let kv: CloudflareKV;

	beforeEach(() => {
		vi.clearAllMocks();
		mockKV = createMockKVNamespace();
		kv = new CloudflareKV(mockKV as unknown as KVNamespace, "CACHE_KV");
	});

	// =========================================================================
	// get()
	// =========================================================================

	describe("get", () => {
		it("should return null when key doesn't exist", async () => {
			mockKV.get.mockResolvedValue(null);

			const result = await kv.get("missing-key");
			expect(result).toBeNull();
		});

		it("should delegate to KV with text type by default", async () => {
			mockKV.get.mockResolvedValue("hello");

			const result = await kv.get("greeting");

			expect(mockKV.get).toHaveBeenCalledWith("greeting", "text");
			expect(result).toBe("hello");
		});

		it("should use json type when specified", async () => {
			mockKV.get.mockResolvedValue({ name: "Autumn" });

			const result = await kv.get("user", { type: "json" });

			expect(mockKV.get).toHaveBeenCalledWith("user", "json");
			expect(result).toEqual({ name: "Autumn" });
		});

		it("should use arrayBuffer type when specified", async () => {
			const buf = new ArrayBuffer(8);
			mockKV.get.mockResolvedValue(buf);

			const result = await kv.get("binary", { type: "arrayBuffer" });

			expect(mockKV.get).toHaveBeenCalledWith("binary", "arrayBuffer");
			expect(result).toBe(buf);
		});

		it("should use stream type when specified", async () => {
			const stream = new ReadableStream();
			mockKV.get.mockResolvedValue(stream);

			const result = await kv.get("streamed", { type: "stream" });

			expect(mockKV.get).toHaveBeenCalledWith("streamed", "stream");
			expect(result).toBe(stream);
		});

		it("should throw on empty key", async () => {
			await expect(kv.get("")).rejects.toThrow("KV key cannot be empty");
		});

		it("should throw on whitespace-only key", async () => {
			await expect(kv.get("   ")).rejects.toThrow("KV key cannot be empty");
		});

		it("should propagate KV errors", async () => {
			mockKV.get.mockRejectedValue(new Error("KV_READ_FAIL"));

			await expect(kv.get("key")).rejects.toThrow("KV_READ_FAIL");
		});
	});

	// =========================================================================
	// put()
	// =========================================================================

	describe("put", () => {
		it("should delegate to KV put", async () => {
			await kv.put("greeting", "hello");

			expect(mockKV.put).toHaveBeenCalledWith("greeting", "hello", {
				expirationTtl: undefined,
				expiration: undefined,
				metadata: undefined,
			});
		});

		it("should pass TTL and metadata options", async () => {
			await kv.put("session", "token", {
				expirationTtl: 3600,
				metadata: { role: "admin" },
			});

			expect(mockKV.put).toHaveBeenCalledWith("session", "token", {
				expirationTtl: 3600,
				expiration: undefined,
				metadata: { role: "admin" },
			});
		});

		it("should throw on empty key", async () => {
			await expect(kv.put("", "value")).rejects.toThrow("KV key cannot be empty");
		});

		it("should throw on negative TTL", async () => {
			await expect(kv.put("key", "value", { expirationTtl: -1 })).rejects.toThrow(
				"Expiration TTL must be a positive number",
			);
		});

		it("should throw on zero TTL", async () => {
			await expect(kv.put("key", "value", { expirationTtl: 0 })).rejects.toThrow(
				"Expiration TTL must be a positive number",
			);
		});

		it("should propagate KV errors", async () => {
			mockKV.put.mockRejectedValue(new Error("KV_WRITE_FAIL"));

			await expect(kv.put("key", "value")).rejects.toThrow("KV_WRITE_FAIL");
		});
	});

	// =========================================================================
	// delete()
	// =========================================================================

	describe("delete", () => {
		it("should delegate to KV delete", async () => {
			await kv.delete("old-key");
			expect(mockKV.delete).toHaveBeenCalledWith("old-key");
		});

		it("should throw on empty key", async () => {
			await expect(kv.delete("")).rejects.toThrow("KV key cannot be empty");
		});
	});

	// =========================================================================
	// list()
	// =========================================================================

	describe("list", () => {
		it("should delegate to KV list with options", async () => {
			mockKV.list.mockResolvedValue({
				keys: [{ name: "cache:a", expiration: 1700000000 }, { name: "cache:b" }],
				cursor: "",
				list_complete: true,
			});

			const result = await kv.list({ prefix: "cache:" });

			expect(mockKV.list).toHaveBeenCalledWith({
				prefix: "cache:",
				cursor: undefined,
				limit: undefined,
			});
			expect(result.keys).toHaveLength(2);
			expect(result.list_complete).toBe(true);
		});

		it("should return cursor when not complete", async () => {
			mockKV.list.mockResolvedValue({
				keys: [{ name: "a" }],
				cursor: "next-cursor",
				list_complete: false,
			});

			const result = await kv.list();
			expect(result.cursor).toBe("next-cursor");
			expect(result.list_complete).toBe(false);
		});

		it("should clear cursor when list is complete", async () => {
			mockKV.list.mockResolvedValue({
				keys: [],
				cursor: "stale",
				list_complete: true,
			});

			const result = await kv.list();
			expect(result.cursor).toBeUndefined();
		});
	});

	// =========================================================================
	// getWithMetadata()
	// =========================================================================

	describe("getWithMetadata", () => {
		it("should return null when key doesn't exist", async () => {
			mockKV.getWithMetadata.mockResolvedValue({ value: null, metadata: null });

			const result = await kv.getWithMetadata("missing");
			expect(result).toBeNull();
		});

		it("should return value and metadata", async () => {
			mockKV.getWithMetadata.mockResolvedValue({
				value: "hello",
				metadata: { created: "2026-01-01" },
			});

			const result = await kv.getWithMetadata("greeting");
			expect(result).not.toBeNull();
			expect(result!.value).toBe("hello");
			expect(result!.metadata).toEqual({ created: "2026-01-01" });
		});

		it("should throw on empty key", async () => {
			await expect(kv.getWithMetadata("")).rejects.toThrow("KV key cannot be empty");
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider and namespace", () => {
			const info = kv.info();
			expect(info.provider).toBe("cloudflare-kv");
			expect(info.namespace).toBe("CACHE_KV");
		});

		it("should default namespace to 'default'", () => {
			const defaultKV = new CloudflareKV(mockKV as unknown as KVNamespace);
			expect(defaultKV.info().namespace).toBe("default");
		});
	});
});
