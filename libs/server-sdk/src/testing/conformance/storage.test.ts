/**
 * Conformance tests for GroveStorage interface.
 *
 * Any implementation of GroveStorage must pass these tests.
 * Currently validates the MockStorage implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockStorage } from "../mock-storage.js";

/** Helper to read a ReadableStream to text */
async function streamToText(stream: ReadableStream): Promise<string> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return new TextDecoder().decode(
		chunks.reduce((acc, chunk) => {
			const merged = new Uint8Array(acc.length + chunk.length);
			merged.set(acc);
			merged.set(chunk, acc.length);
			return merged;
		}, new Uint8Array()),
	);
}

describe("GroveStorage conformance", () => {
	let storage: MockStorage;

	beforeEach(() => {
		storage = new MockStorage();
	});

	describe("put and get", () => {
		it("should store and retrieve an object", async () => {
			await storage.put("test/file.txt", "hello world", {
				contentType: "text/plain",
			});

			const obj = await storage.get("test/file.txt");
			expect(obj).not.toBeNull();
			expect(obj!.key).toBe("test/file.txt");
			expect(obj!.contentType).toBe("text/plain");

			const text = await streamToText(obj!.body);
			expect(text).toBe("hello world");
		});

		it("should store with metadata", async () => {
			await storage.put("test/meta.txt", "data", {
				metadata: { author: "grove" },
			});

			const obj = await storage.get("test/meta.txt");
			expect(obj!.metadata).toEqual({ author: "grove" });
		});
	});

	describe("get", () => {
		it("should return null for missing objects", async () => {
			const obj = await storage.get("does-not-exist");
			expect(obj).toBeNull();
		});
	});

	describe("head", () => {
		it("should return metadata without body", async () => {
			await storage.put("test/head.txt", "content");

			const meta = await storage.head("test/head.txt");
			expect(meta).not.toBeNull();
			expect(meta!.key).toBe("test/head.txt");
			expect(meta!.size).toBeGreaterThan(0);
		});

		it("should return null for missing objects", async () => {
			const meta = await storage.head("nope");
			expect(meta).toBeNull();
		});
	});

	describe("delete", () => {
		it("should remove an object", async () => {
			await storage.put("test/delete.txt", "bye");
			expect(storage.has("test/delete.txt")).toBe(true);

			await storage.delete("test/delete.txt");
			expect(storage.has("test/delete.txt")).toBe(false);
		});
	});

	describe("deleteMany", () => {
		it("should remove multiple objects", async () => {
			await storage.put("a.txt", "a");
			await storage.put("b.txt", "b");
			await storage.put("c.txt", "c");

			await storage.deleteMany(["a.txt", "b.txt"]);
			expect(storage.size).toBe(1);
			expect(storage.has("c.txt")).toBe(true);
		});
	});

	describe("list", () => {
		it("should list objects by prefix", async () => {
			await storage.put("prefix/a.txt", "a");
			await storage.put("prefix/b.txt", "b");
			await storage.put("other/c.txt", "c");

			const result = await storage.list({ prefix: "prefix/" });
			expect(result.objects).toHaveLength(2);
			expect(result.objects.map((o) => o.key).sort()).toEqual(["prefix/a.txt", "prefix/b.txt"]);
		});

		it("should return all objects when no prefix", async () => {
			await storage.put("a.txt", "a");
			await storage.put("b.txt", "b");

			const result = await storage.list();
			expect(result.objects).toHaveLength(2);
		});

		it("should respect limit", async () => {
			await storage.put("a.txt", "a");
			await storage.put("b.txt", "b");
			await storage.put("c.txt", "c");

			const result = await storage.list({ limit: 2 });
			expect(result.objects).toHaveLength(2);
		});
	});

	describe("presignedUrl", () => {
		it("should generate a mock presigned URL", async () => {
			const url = await storage.presignedUrl("test/file.txt", {
				action: "get",
				expiresIn: 3600,
			});
			expect(url).toContain("test/file.txt");
			expect(url).toContain("action=get");
		});
	});

	describe("info", () => {
		it("should return provider info", () => {
			const info = storage.info();
			expect(info.provider).toBe("mock");
			expect(info.bucket).toBe("test");
		});
	});

	describe("reset", () => {
		it("should clear all objects", async () => {
			await storage.put("a.txt", "a");
			expect(storage.size).toBe(1);

			storage.reset();
			expect(storage.size).toBe(0);
		});
	});
});
