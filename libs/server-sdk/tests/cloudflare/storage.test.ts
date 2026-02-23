/**
 * Unit tests for CloudflareStorage adapter.
 *
 * Validates R2 delegation, key validation, error handling,
 * and info() metadata.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareStorage } from "../../src/cloudflare/storage.js";
import { createMockR2, createMockR2Object, type MockR2Bucket } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareStorage", () => {
	let mockR2: MockR2Bucket;
	let storage: CloudflareStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		mockR2 = createMockR2();
		storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket");
	});

	// =========================================================================
	// Key Validation (shared across methods)
	// =========================================================================

	describe("key validation", () => {
		it("should reject empty keys", async () => {
			await expect(storage.get("")).rejects.toThrow("Storage key cannot be empty");
			await expect(storage.put("", "data")).rejects.toThrow("Storage key cannot be empty");
			await expect(storage.head("")).rejects.toThrow("Storage key cannot be empty");
			await expect(storage.delete("")).rejects.toThrow("Storage key cannot be empty");
		});

		it("should reject keys with path traversal", async () => {
			await expect(storage.get("../etc/passwd")).rejects.toThrow(
				"Storage key contains invalid path pattern",
			);
			await expect(storage.get("/absolute/path")).rejects.toThrow(
				"Storage key contains invalid path pattern",
			);
		});

		it("should accept valid keys", async () => {
			mockR2.get.mockResolvedValue(null);
			await expect(storage.get("tenant/avatar.webp")).resolves.toBeNull();
		});
	});

	// =========================================================================
	// put()
	// =========================================================================

	describe("put", () => {
		it("should delegate to R2 put with options", async () => {
			const r2Obj = createMockR2Object({ key: "images/photo.jpg", size: 5000 });
			mockR2.put.mockResolvedValue(r2Obj);

			const result = await storage.put("images/photo.jpg", "binary-data", {
				contentType: "image/jpeg",
				metadata: { author: "autumn" },
			});

			expect(mockR2.put).toHaveBeenCalledWith("images/photo.jpg", "binary-data", {
				httpMetadata: {
					contentType: "image/jpeg",
					contentDisposition: undefined,
					cacheControl: undefined,
				},
				customMetadata: { author: "autumn" },
			});
			expect(result.key).toBe("images/photo.jpg");
			expect(result.size).toBe(5000);
		});

		it("should throw when R2 put returns null", async () => {
			mockR2.put.mockResolvedValue(null);

			await expect(storage.put("key", "data")).rejects.toThrow("R2 put returned null");
		});

		it("should reconstruct body from string data", async () => {
			const r2Obj = createMockR2Object({ size: 5 });
			mockR2.put.mockResolvedValue(r2Obj);

			const result = await storage.put("key", "hello");
			expect(result.body).toBeInstanceOf(ReadableStream);
		});

		it("should reconstruct body from ArrayBuffer data", async () => {
			const r2Obj = createMockR2Object({ size: 5 });
			mockR2.put.mockResolvedValue(r2Obj);
			const buf = new TextEncoder().encode("hello").buffer;

			const result = await storage.put("key", buf);
			expect(result.body).toBeInstanceOf(ReadableStream);
		});

		it("should propagate R2 errors", async () => {
			mockR2.put.mockRejectedValue(new Error("R2_UPLOAD_FAIL"));

			await expect(storage.put("key", "data")).rejects.toThrow("R2_UPLOAD_FAIL");
		});
	});

	// =========================================================================
	// get()
	// =========================================================================

	describe("get", () => {
		it("should return null when object doesn't exist", async () => {
			mockR2.get.mockResolvedValue(null);

			const result = await storage.get("missing-key");
			expect(result).toBeNull();
		});

		it("should return StorageObject with body when found", async () => {
			const body = new ReadableStream();
			const r2Obj = {
				...createMockR2Object({ key: "test.txt", size: 42 }),
				body,
			};
			mockR2.get.mockResolvedValue(r2Obj);

			const result = await storage.get("test.txt");

			expect(result).not.toBeNull();
			expect(result!.key).toBe("test.txt");
			expect(result!.size).toBe(42);
			expect(result!.body).toBe(body);
		});

		it("should default contentType to application/octet-stream", async () => {
			const r2Obj = {
				...createMockR2Object({ httpMetadata: undefined }),
				body: new ReadableStream(),
			};
			mockR2.get.mockResolvedValue(r2Obj);

			const result = await storage.get("binary-file");
			expect(result!.contentType).toBe("application/octet-stream");
		});

		it("should propagate R2 errors", async () => {
			mockR2.get.mockRejectedValue(new Error("R2_GET_FAIL"));

			await expect(storage.get("key")).rejects.toThrow("R2_GET_FAIL");
		});
	});

	// =========================================================================
	// head()
	// =========================================================================

	describe("head", () => {
		it("should return null when object doesn't exist", async () => {
			mockR2.head.mockResolvedValue(null);

			expect(await storage.head("missing")).toBeNull();
		});

		it("should return metadata without body", async () => {
			mockR2.head.mockResolvedValue(createMockR2Object({ key: "doc.pdf", size: 1024 }));

			const meta = await storage.head("doc.pdf");
			expect(meta).not.toBeNull();
			expect(meta!.key).toBe("doc.pdf");
			expect(meta!.size).toBe(1024);
			expect((meta as Record<string, unknown>).body).toBeUndefined();
		});
	});

	// =========================================================================
	// delete() / deleteMany()
	// =========================================================================

	describe("delete", () => {
		it("should delegate to R2 delete", async () => {
			await storage.delete("old-file.txt");
			expect(mockR2.delete).toHaveBeenCalledWith("old-file.txt");
		});
	});

	describe("deleteMany", () => {
		it("should delegate array to R2 delete", async () => {
			await storage.deleteMany(["a.txt", "b.txt"]);
			expect(mockR2.delete).toHaveBeenCalledWith(["a.txt", "b.txt"]);
		});

		it("should throw on empty array", async () => {
			await expect(storage.deleteMany([])).rejects.toThrow("Keys array cannot be empty");
		});

		it("should validate each key in the array", async () => {
			await expect(storage.deleteMany(["valid", ""])).rejects.toThrow(
				"Storage key cannot be empty",
			);
			await expect(storage.deleteMany(["valid", "../bad"])).rejects.toThrow(
				"Storage key contains invalid path pattern",
			);
		});
	});

	// =========================================================================
	// list()
	// =========================================================================

	describe("list", () => {
		it("should delegate to R2 list with options", async () => {
			mockR2.list.mockResolvedValue({
				objects: [createMockR2Object({ key: "a.txt" }), createMockR2Object({ key: "b.txt" })],
				truncated: false,
				cursor: "",
			});

			const result = await storage.list({ prefix: "images/", limit: 10 });

			expect(mockR2.list).toHaveBeenCalledWith({
				prefix: "images/",
				cursor: undefined,
				limit: 10,
				delimiter: undefined,
			});
			expect(result.objects).toHaveLength(2);
			expect(result.truncated).toBe(false);
		});

		it("should return cursor when truncated", async () => {
			mockR2.list.mockResolvedValue({
				objects: [createMockR2Object()],
				truncated: true,
				cursor: "next-page-cursor",
			});

			const result = await storage.list();
			expect(result.cursor).toBe("next-page-cursor");
			expect(result.truncated).toBe(true);
		});

		it("should throw on invalid limit", async () => {
			await expect(storage.list({ limit: -1 })).rejects.toThrow("Limit must be a positive number");
			await expect(storage.list({ limit: 0 })).rejects.toThrow("Limit must be a positive number");
		});
	});

	// =========================================================================
	// presignedUrl()
	// =========================================================================

	describe("presignedUrl", () => {
		it("should throw because R2 worker bindings don't support presigned URLs", async () => {
			await expect(
				storage.presignedUrl("key", { action: "get", expiresIn: 3600 }),
			).rejects.toThrow();
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider and bucket name", () => {
			const info = storage.info();
			expect(info.provider).toBe("cloudflare-r2");
			expect(info.bucket).toBe("test-bucket");
		});

		it("should default bucket name to 'default'", () => {
			const defaultStorage = new CloudflareStorage(mockR2 as unknown as R2Bucket);
			expect(defaultStorage.info().bucket).toBe("default");
		});
	});
});
