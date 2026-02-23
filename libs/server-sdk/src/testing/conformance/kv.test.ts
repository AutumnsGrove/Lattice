/**
 * Conformance tests for GroveKV interface.
 *
 * Any implementation of GroveKV must pass these tests.
 * Currently validates the MockKV implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockKV } from "../mock-kv.js";

describe("GroveKV conformance", () => {
	let kv: MockKV;

	beforeEach(() => {
		kv = new MockKV();
	});

	describe("put and get", () => {
		it("should store and retrieve a value", async () => {
			await kv.put("test-key", "test-value");
			const result = await kv.get("test-key");
			expect(result).toBe("test-value");
		});

		it("should return null for missing keys", async () => {
			const result = await kv.get("missing");
			expect(result).toBeNull();
		});

		it("should handle JSON values", async () => {
			await kv.put("json-key", JSON.stringify({ name: "grove" }));
			const result = await kv.get("json-key", { type: "json" });
			expect(result).toEqual({ name: "grove" });
		});
	});

	describe("TTL", () => {
		it("should store with expiration TTL", async () => {
			await kv.put("ttl-key", "value", { expirationTtl: 3600 });
			const result = await kv.get("ttl-key");
			expect(result).toBe("value");
		});

		it("should store with metadata", async () => {
			await kv.put("meta-key", "value", {
				metadata: { source: "test" },
			});

			const result = await kv.getWithMetadata("meta-key");
			expect(result).not.toBeNull();
			expect(result!.metadata).toEqual({ source: "test" });
		});
	});

	describe("delete", () => {
		it("should remove a key", async () => {
			await kv.put("del-key", "value");
			expect(kv.has("del-key")).toBe(true);

			await kv.delete("del-key");
			expect(kv.has("del-key")).toBe(false);
		});
	});

	describe("list", () => {
		it("should list keys by prefix", async () => {
			await kv.put("cache:a", "1");
			await kv.put("cache:b", "2");
			await kv.put("other:c", "3");

			const result = await kv.list({ prefix: "cache:" });
			expect(result.keys).toHaveLength(2);
			expect(result.keys.map((k) => k.name).sort()).toEqual(["cache:a", "cache:b"]);
		});

		it("should list all keys when no prefix", async () => {
			await kv.put("a", "1");
			await kv.put("b", "2");

			const result = await kv.list();
			expect(result.keys).toHaveLength(2);
		});

		it("should respect limit", async () => {
			await kv.put("a", "1");
			await kv.put("b", "2");
			await kv.put("c", "3");

			const result = await kv.list({ limit: 2 });
			expect(result.keys).toHaveLength(2);
		});
	});

	describe("getWithMetadata", () => {
		it("should return value and metadata", async () => {
			await kv.put("wm-key", "value", {
				metadata: { version: "1" },
			});

			const result = await kv.getWithMetadata("wm-key");
			expect(result).not.toBeNull();
			expect(result!.value).toBe("value");
			expect(result!.metadata).toEqual({ version: "1" });
		});

		it("should return null for missing keys", async () => {
			const result = await kv.getWithMetadata("missing");
			expect(result).toBeNull();
		});
	});

	describe("info", () => {
		it("should return provider info", () => {
			const info = kv.info();
			expect(info.provider).toBe("mock");
			expect(info.namespace).toBe("test");
		});
	});

	describe("reset", () => {
		it("should clear all entries", async () => {
			await kv.put("a", "1");
			await kv.put("b", "2");
			expect(kv.size).toBe(2);

			kv.reset();
			expect(kv.size).toBe(0);
		});
	});
});
