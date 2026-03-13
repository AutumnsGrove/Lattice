/**
 * Amber SDK — Test Suite
 *
 * Tests the unified storage management SDK:
 * utils, errors, quota, files, exports, addons, and client composition.
 *
 * @module @autumnsgrove/lattice/amber
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Utils ────────────────────────────────────────────────────────

import {
	generateR2Key,
	parseR2Key,
	getExtension,
	getMimeType,
	GB_IN_BYTES,
	R2_PREFIX,
} from "./utils.js";

// ─── Errors ───────────────────────────────────────────────────────

import { AMB_ERRORS, AmberError } from "./errors.js";

// ─── Managers ─────────────────────────────────────────────────────

import { QuotaManager } from "./quota.js";
import { FileManager } from "./files.js";
import { ExportManager } from "./exports.js";
import { AddonManager } from "./addons.js";
import { createAmberClient, AmberClient } from "./index.js";

// ─── Mock Modules ─────────────────────────────────────────────────

vi.mock("../errors/helpers.js", () => ({
	logGroveError: vi.fn(),
}));

vi.mock("../server/utils/typed-cache.js", () => ({
	safeJsonParse: vi.fn((json: string) => {
		try {
			return JSON.parse(json);
		} catch {
			return null;
		}
	}),
}));

// ─── Test Helpers ─────────────────────────────────────────────────

/** Create a chainable Drizzle mock that simulates query builder patterns */
function createMockDb(config?: {
	getResult?: unknown;
	allResult?: unknown[];
	runResult?: unknown;
}) {
	const getResult = config?.getResult;
	const allResult = config?.allResult ?? [];

	const chain: Record<string, unknown> = {};
	chain.select = vi.fn().mockReturnValue(chain);
	chain.from = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockReturnValue(chain);
	chain.groupBy = vi.fn().mockReturnValue(allResult);
	chain.orderBy = vi.fn().mockReturnValue(chain);
	chain.limit = vi.fn().mockReturnValue(chain);
	chain.offset = vi.fn().mockReturnValue(allResult);
	chain.get = vi.fn().mockResolvedValue(getResult);
	chain.insert = vi.fn().mockReturnValue(chain);
	chain.values = vi.fn().mockReturnValue(chain);
	chain.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
	chain.update = vi.fn().mockReturnValue(chain);
	chain.set = vi.fn().mockReturnValue(chain);
	chain.delete = vi.fn().mockReturnValue(chain);

	// Make where() also resolve for chained operations (insert/update/delete)
	// by default, get and offset return the configured results
	return chain as unknown as ReturnType<typeof createMockDb> &
		Record<string, ReturnType<typeof vi.fn>>;
}

/** Create a mock GroveStorage (R2) */
function createMockStorage() {
	return {
		put: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue({
			body: new ReadableStream(),
			contentType: "image/webp",
			size: 1024,
		}),
		delete: vi.fn().mockResolvedValue(undefined),
		presignedUrl: vi.fn().mockResolvedValue("https://r2.example.com/presigned?token=abc"),
		list: vi.fn().mockResolvedValue({ objects: [] }),
		head: vi.fn().mockResolvedValue(null),
	};
}

/** Create a mock GroveServiceBus */
function createMockServiceBus() {
	return {
		call: vi.fn().mockResolvedValue({ ok: true }),
	};
}

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

describe("amber/utils", () => {
	describe("generateR2Key", () => {
		it("should produce the expected key pattern", () => {
			const key = generateR2Key("usr_01", "blog", "images", "fil_01", "webp");
			expect(key).toBe("grove-storage/usr_01/blog/images/fil_01.webp");
		});

		it("should omit extension dot when extension is empty", () => {
			const key = generateR2Key("usr_01", "blog", "images", "fil_01");
			expect(key).toBe("grove-storage/usr_01/blog/images/fil_01");
		});

		it("should handle all product types", () => {
			for (const product of ["blog", "ivy", "profile", "themes"] as const) {
				const key = generateR2Key("u", product, "c", "f", "png");
				expect(key).toContain(`/${product}/`);
			}
		});
	});

	describe("parseR2Key", () => {
		it("should round-trip with generateR2Key", () => {
			const key = generateR2Key("usr_01", "blog", "images", "fil_01", "webp");
			const parsed = parseR2Key(key);
			expect(parsed).toEqual({
				userId: "usr_01",
				product: "blog",
				category: "images",
				filename: "fil_01.webp",
			});
		});

		it("should return null for keys without the grove-storage prefix", () => {
			expect(parseR2Key("other-prefix/usr/blog/img/f.png")).toBeNull();
		});

		it("should return null for keys with too few segments", () => {
			expect(parseR2Key("grove-storage/usr/blog")).toBeNull();
		});

		it("should handle nested filenames with slashes", () => {
			const parsed = parseR2Key("grove-storage/usr/blog/images/sub/dir/f.png");
			expect(parsed?.filename).toBe("sub/dir/f.png");
		});
	});

	describe("getExtension", () => {
		it("should extract lowercase extension", () => {
			expect(getExtension("photo.JPEG")).toBe("jpeg");
			expect(getExtension("doc.PDF")).toBe("pdf");
		});

		it("should return empty string for no extension", () => {
			expect(getExtension("README")).toBe("");
		});

		it("should return empty string for trailing dot", () => {
			expect(getExtension("file.")).toBe("");
		});

		it("should extract last extension from multi-dot filenames", () => {
			expect(getExtension("archive.tar.gz")).toBe("gz");
		});
	});

	describe("getMimeType", () => {
		it("should detect common image types", () => {
			expect(getMimeType("photo.jpg")).toBe("image/jpeg");
			expect(getMimeType("photo.jpeg")).toBe("image/jpeg");
			expect(getMimeType("photo.png")).toBe("image/png");
			expect(getMimeType("photo.webp")).toBe("image/webp");
			expect(getMimeType("photo.gif")).toBe("image/gif");
			expect(getMimeType("photo.avif")).toBe("image/avif");
		});

		it("should detect document types", () => {
			expect(getMimeType("doc.pdf")).toBe("application/pdf");
			expect(getMimeType("data.json")).toBe("application/json");
		});

		it("should detect font types", () => {
			expect(getMimeType("font.woff2")).toBe("font/woff2");
			expect(getMimeType("font.ttf")).toBe("font/ttf");
		});

		it("should fall back to octet-stream for unknown types", () => {
			expect(getMimeType("file.xyz")).toBe("application/octet-stream");
			expect(getMimeType("README")).toBe("application/octet-stream");
		});
	});

	describe("constants", () => {
		it("should define GB_IN_BYTES as 1 GiB", () => {
			expect(GB_IN_BYTES).toBe(1024 * 1024 * 1024);
		});

		it("should define R2_PREFIX", () => {
			expect(R2_PREFIX).toBe("grove-storage");
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════

describe("amber/errors", () => {
	describe("AmberError", () => {
		it("should set code, category, and userMessage from error def", () => {
			const err = new AmberError(AMB_ERRORS.QUOTA_EXCEEDED);
			expect(err.code).toBe("AMB-041");
			expect(err.category).toBe("user");
			expect(err.userMessage).toContain("storage limit");
			expect(err.message).toBe(AMB_ERRORS.QUOTA_EXCEEDED.adminMessage);
			expect(err.name).toBe("AmberError");
		});

		it("should be an instance of Error", () => {
			const err = new AmberError(AMB_ERRORS.FILE_NOT_FOUND);
			expect(err).toBeInstanceOf(Error);
		});
	});

	describe("AMB_ERRORS catalog", () => {
		it("should have unique codes across all errors", () => {
			const codes = Object.values(AMB_ERRORS).map((e) => e.code);
			expect(new Set(codes).size).toBe(codes.length);
		});

		it("should have AMB prefix on all codes", () => {
			for (const err of Object.values(AMB_ERRORS)) {
				expect(err.code).toMatch(/^AMB-\d{3}$/);
			}
		});

		it("should have valid categories", () => {
			const validCategories = ["user", "admin", "bug"];
			for (const err of Object.values(AMB_ERRORS)) {
				expect(validCategories).toContain(err.category);
			}
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// QUOTA MANAGER
// ═══════════════════════════════════════════════════════════════════

describe("amber/QuotaManager", () => {
	let db: ReturnType<typeof createMockDb>;
	let quota: QuotaManager;

	beforeEach(() => {
		vi.clearAllMocks();
		db = createMockDb();
		quota = new QuotaManager(db as any);
	});

	describe("status", () => {
		it("should return zeroed quota when user has no storage record", async () => {
			db.get.mockResolvedValue(undefined);

			const result = await quota.status("user-1");

			expect(result).toEqual({
				tierGb: 0,
				additionalGb: 0,
				totalGb: 0,
				totalBytes: 0,
				usedBytes: 0,
				availableBytes: 0,
				percentage: 0,
				warningLevel: "none",
			});
		});

		it("should calculate quota from user storage row", async () => {
			db.get.mockResolvedValue({
				tierGb: 5,
				additionalGb: 10,
				usedBytes: GB_IN_BYTES, // 1 GB used
			});

			const result = await quota.status("user-1");

			expect(result.totalGb).toBe(15);
			expect(result.totalBytes).toBe(15 * GB_IN_BYTES);
			expect(result.usedBytes).toBe(GB_IN_BYTES);
			expect(result.availableBytes).toBe(14 * GB_IN_BYTES);
		});

		it("should set warningLevel to 'none' below 80%", async () => {
			db.get.mockResolvedValue({ tierGb: 10, additionalGb: 0, usedBytes: 7 * GB_IN_BYTES });

			const result = await quota.status("user-1");
			expect(result.warningLevel).toBe("none");
		});

		it("should set warningLevel to 'warning' at 80%", async () => {
			db.get.mockResolvedValue({ tierGb: 10, additionalGb: 0, usedBytes: 8 * GB_IN_BYTES });

			const result = await quota.status("user-1");
			expect(result.warningLevel).toBe("warning");
		});

		it("should set warningLevel to 'critical' at 95%", async () => {
			db.get.mockResolvedValue({
				tierGb: 10,
				additionalGb: 0,
				usedBytes: Math.floor(9.5 * GB_IN_BYTES),
			});

			const result = await quota.status("user-1");
			expect(result.warningLevel).toBe("critical");
		});

		it("should set warningLevel to 'full' at 100%", async () => {
			db.get.mockResolvedValue({ tierGb: 5, additionalGb: 0, usedBytes: 5 * GB_IN_BYTES });

			const result = await quota.status("user-1");
			expect(result.warningLevel).toBe("full");
		});

		it("should cap percentage at 100 when over quota", async () => {
			db.get.mockResolvedValue({ tierGb: 1, additionalGb: 0, usedBytes: 2 * GB_IN_BYTES });

			const result = await quota.status("user-1");
			expect(result.percentage).toBe(100);
			expect(result.availableBytes).toBe(0);
		});

		it("should handle zero totalBytes without division by zero", async () => {
			db.get.mockResolvedValue({ tierGb: 0, additionalGb: 0, usedBytes: 0 });

			const result = await quota.status("user-1");
			expect(result.percentage).toBe(0);
			expect(result.warningLevel).toBe("none");
		});
	});

	describe("canUpload", () => {
		it("should throw AMB-051 when user has no storage record", async () => {
			db.get.mockResolvedValue(undefined);

			await expect(quota.canUpload("user-1", 1024)).rejects.toThrow(AmberError);
			try {
				await quota.canUpload("user-1", 1024);
			} catch (e: any) {
				expect(e.code).toBe("AMB-051");
			}
		});

		it("should return true when file fits within available quota", async () => {
			db.get.mockResolvedValue({ tierGb: 5, additionalGb: 0, usedBytes: 0 });

			const result = await quota.canUpload("user-1", 1024);
			expect(result).toBe(true);
		});

		it("should return false when file exceeds available quota", async () => {
			db.get.mockResolvedValue({ tierGb: 1, additionalGb: 0, usedBytes: GB_IN_BYTES - 100 });

			const result = await quota.canUpload("user-1", 200);
			expect(result).toBe(false);
		});

		it("should return true when file exactly fills remaining quota", async () => {
			db.get.mockResolvedValue({ tierGb: 1, additionalGb: 0, usedBytes: GB_IN_BYTES - 1024 });

			const result = await quota.canUpload("user-1", 1024);
			expect(result).toBe(true);
		});
	});

	describe("breakdown", () => {
		it("should return aggregated usage by product and category", async () => {
			const mockResults = [
				{ product: "blog", category: "images", bytes: 5000, fileCount: 3 },
				{ product: "ivy", category: "pages", bytes: 2000, fileCount: 1 },
			];
			// groupBy returns the array directly
			db.groupBy.mockReturnValue(mockResults);

			const result = await quota.breakdown("user-1");

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ product: "blog", category: "images", bytes: 5000, fileCount: 3 });
			expect(result[1]).toEqual({ product: "ivy", category: "pages", bytes: 2000, fileCount: 1 });
		});

		it("should return empty array when no files exist", async () => {
			db.groupBy.mockReturnValue([]);
			const result = await quota.breakdown("user-1");
			expect(result).toEqual([]);
		});
	});

	describe("getOrCreateStorage", () => {
		it("should return existing quota when user already has storage", async () => {
			db.get.mockResolvedValue({ tierGb: 5, additionalGb: 0, usedBytes: 1000 });

			const result = await quota.getOrCreateStorage("user-1", 5);

			expect(result.tierGb).toBe(5);
			expect(db.insert).not.toHaveBeenCalled();
		});

		it("should create a new record when user has no storage", async () => {
			// First call (check existing) returns undefined, second call (re-read) returns created
			db.get
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce({ tierGb: 3, additionalGb: 0, usedBytes: 0 });

			const result = await quota.getOrCreateStorage("user-1", 3);

			expect(result.tierGb).toBe(3);
			expect(db.insert).toHaveBeenCalled();
		});

		it("should use onConflictDoNothing for concurrent insert safety", async () => {
			db.get
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce({ tierGb: 5, additionalGb: 0, usedBytes: 0 });

			await quota.getOrCreateStorage("user-1", 5);

			expect(db.onConflictDoNothing).toHaveBeenCalled();
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// FILE MANAGER
// ═══════════════════════════════════════════════════════════════════

describe("amber/FileManager", () => {
	let db: ReturnType<typeof createMockDb>;
	let storage: ReturnType<typeof createMockStorage>;
	let quotaManager: QuotaManager;
	let files: FileManager;

	beforeEach(() => {
		vi.clearAllMocks();
		db = createMockDb();
		storage = createMockStorage();
		quotaManager = new QuotaManager(db as any);
		files = new FileManager(db as any, storage as any, quotaManager);
	});

	describe("upload", () => {
		const validRequest = {
			userId: "user-1",
			product: "blog" as const,
			category: "images",
			filename: "hero.webp",
			data: new Uint8Array([1, 2, 3, 4]),
			contentType: "image/webp",
		};

		it("should reject upload with missing filename", async () => {
			await expect(files.upload({ ...validRequest, filename: "" })).rejects.toThrow(AmberError);
		});

		it("should reject upload with missing contentType", async () => {
			await expect(files.upload({ ...validRequest, contentType: "" })).rejects.toThrow(AmberError);
		});

		it("should reject upload with missing product", async () => {
			await expect(files.upload({ ...validRequest, product: "" as any })).rejects.toThrow(
				AmberError,
			);
		});

		it("should reject ReadableStream without explicit sizeBytes", async () => {
			const stream = new ReadableStream();
			await expect(files.upload({ ...validRequest, data: stream })).rejects.toThrow(AmberError);

			try {
				await files.upload({ ...validRequest, data: stream });
			} catch (e: any) {
				expect(e.code).toBe("AMB-040");
			}
		});

		it("should accept ReadableStream with explicit sizeBytes", async () => {
			// Mock quota check to allow upload
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);

			const stream = new ReadableStream();
			const result = await files.upload({
				...validRequest,
				data: stream,
				sizeBytes: 1024,
			});

			expect(result.sizeBytes).toBe(1024);
		});

		it("should check quota before uploading to R2", async () => {
			const canUploadSpy = vi.spyOn(quotaManager, "canUpload").mockResolvedValue(false);

			await expect(files.upload(validRequest)).rejects.toThrow(AmberError);

			try {
				await files.upload(validRequest);
			} catch (e: any) {
				expect(e.code).toBe("AMB-041");
			}

			// R2 put should NOT have been called
			expect(storage.put).not.toHaveBeenCalled();
		});

		it("should upload to R2 with correct key pattern and metadata", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);

			await files.upload(validRequest);

			expect(storage.put).toHaveBeenCalledTimes(1);
			const [key, data, opts] = storage.put.mock.calls[0];
			expect(key).toMatch(/^grove-storage\/user-1\/blog\/images\/.*\.webp$/);
			expect(opts.contentType).toBe("image/webp");
			expect(opts.metadata.originalFilename).toBe("hero.webp");
		});

		it("should throw AMB-042 when R2 upload fails", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);
			storage.put.mockRejectedValue(new Error("R2 network error"));

			try {
				await files.upload(validRequest);
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-042");
			}
		});

		it("should clean up R2 orphan when D1 insert fails", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);
			db.values.mockRejectedValue(new Error("D1 constraint error"));

			try {
				await files.upload(validRequest);
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-080");
			}

			// R2 delete should have been called for orphan cleanup
			expect(storage.delete).toHaveBeenCalledTimes(1);
		});

		it("should still throw AMB-080 even when orphan cleanup itself fails", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);
			db.values.mockRejectedValue(new Error("D1 error"));
			storage.delete.mockRejectedValue(new Error("R2 delete also failed"));

			try {
				await files.upload(validRequest);
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-080");
			}
		});

		it("should return AmberFile with correct fields on success", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);

			const result = await files.upload(validRequest);

			expect(result.userId).toBe("user-1");
			expect(result.product).toBe("blog");
			expect(result.category).toBe("images");
			expect(result.filename).toBe("hero.webp");
			expect(result.mimeType).toBe("image/webp");
			expect(result.sizeBytes).toBe(4); // Uint8Array byteLength
			expect(result.id).toBeTruthy();
			expect(result.r2Key).toContain("grove-storage/user-1/blog/images/");
			expect(result.createdAt).toBeTruthy();
		});

		it("should calculate size from ArrayBuffer data", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);

			const buffer = new ArrayBuffer(256);
			const result = await files.upload({ ...validRequest, data: buffer });

			expect(result.sizeBytes).toBe(256);
		});

		it("should include metadata when provided", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);

			const metadata = { width: 800, height: 600 };
			const result = await files.upload({ ...validRequest, metadata });

			expect(result.metadata).toEqual(metadata);
		});

		it("should log but not throw when quota tracking update fails", async () => {
			vi.spyOn(quotaManager, "canUpload").mockResolvedValue(true);
			// Make the update().set().where() chain throw
			db.where.mockRejectedValueOnce(new Error("quota sync fail"));
			// But only after the insert succeeds — we need the first where() call to work
			// This is tricky with a shared mock, so let's use a different approach:
			// The quota update is a separate db.update call, happening after insert

			const result = await files.upload(validRequest);

			// Upload should still succeed
			expect(result.id).toBeTruthy();
		});
	});

	describe("get", () => {
		it("should return file when found with matching userId", async () => {
			db.get.mockResolvedValue({
				id: "fil-1",
				userId: "user-1",
				r2Key: "grove-storage/user-1/blog/images/fil-1.webp",
				filename: "hero.webp",
				mimeType: "image/webp",
				sizeBytes: 1024,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01T00:00:00Z",
				deletedAt: null,
			});

			const result = await files.get("fil-1", "user-1");

			expect(result.id).toBe("fil-1");
			expect(result.filename).toBe("hero.webp");
		});

		it("should throw FILE_NOT_FOUND when file does not exist (IDOR mitigation)", async () => {
			db.get.mockResolvedValue(undefined);

			try {
				await files.get("fil-1", "wrong-user");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-043");
			}
		});

		it("should parse JSON metadata from row", async () => {
			db.get.mockResolvedValue({
				id: "fil-1",
				userId: "user-1",
				r2Key: "key",
				filename: "f.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: '{"width":800}',
				createdAt: "2026-01-01T00:00:00Z",
				deletedAt: null,
			});

			const result = await files.get("fil-1", "user-1");
			expect(result.metadata).toEqual({ width: 800 });
		});
	});

	describe("list", () => {
		it("should return files with total count", async () => {
			db.get.mockResolvedValue({ count: 2 });
			db.offset.mockReturnValue([
				{
					id: "f1",
					userId: "user-1",
					r2Key: "k1",
					filename: "a.png",
					mimeType: "image/png",
					sizeBytes: 100,
					product: "blog",
					category: "images",
					parentId: null,
					metadata: null,
					createdAt: "2026-01-01",
					deletedAt: null,
				},
				{
					id: "f2",
					userId: "user-1",
					r2Key: "k2",
					filename: "b.png",
					mimeType: "image/png",
					sizeBytes: 200,
					product: "blog",
					category: "images",
					parentId: null,
					metadata: null,
					createdAt: "2026-01-02",
					deletedAt: null,
				},
			]);

			const result = await files.list({ userId: "user-1" });

			expect(result.files).toHaveLength(2);
			expect(result.total).toBe(2);
		});

		it("should default to limit 50 and offset 0", async () => {
			db.get.mockResolvedValue({ count: 0 });
			db.offset.mockReturnValue([]);

			await files.list({ userId: "user-1" });

			expect(db.limit).toHaveBeenCalledWith(50);
			expect(db.offset).toHaveBeenCalledWith(0);
		});

		it("should apply custom limit and offset", async () => {
			db.get.mockResolvedValue({ count: 0 });
			db.offset.mockReturnValue([]);

			await files.list({ userId: "user-1", limit: 10, offset: 20 });

			expect(db.limit).toHaveBeenCalledWith(10);
			expect(db.offset).toHaveBeenCalledWith(20);
		});
	});

	describe("trash", () => {
		it("should soft-delete a file", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "k1",
				filename: "a.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: null,
			});

			const result = await files.trash("f1", "user-1");

			expect(result.deletedAt).toBeTruthy();
			expect(db.update).toHaveBeenCalled();
		});

		it("should throw FILE_ALREADY_TRASHED when file is already deleted", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "k1",
				filename: "a.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: "2026-01-02",
			});

			try {
				await files.trash("f1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-048");
			}
		});
	});

	describe("restore", () => {
		it("should clear deletedAt on a trashed file", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "k1",
				filename: "a.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: "2026-01-02",
			});

			const result = await files.restore("f1", "user-1");

			expect(result.deletedAt).toBeUndefined();
			expect(db.update).toHaveBeenCalled();
		});

		it("should throw FILE_NOT_TRASHED when file is not in trash", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "k1",
				filename: "a.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: null,
			});

			try {
				await files.restore("f1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-049");
			}
		});
	});

	describe("delete", () => {
		const existingFile = {
			id: "f1",
			userId: "user-1",
			r2Key: "grove-storage/user-1/blog/images/f1.webp",
			filename: "hero.webp",
			mimeType: "image/webp",
			sizeBytes: 4096,
			product: "blog",
			category: "images",
			parentId: null,
			metadata: null,
			createdAt: "2026-01-01",
			deletedAt: null,
		};

		it("should delete from R2 and D1, and return the deleted file", async () => {
			db.get.mockResolvedValue(existingFile);

			const result = await files.delete("f1", "user-1");

			expect(storage.delete).toHaveBeenCalledWith(existingFile.r2Key);
			expect(db.delete).toHaveBeenCalled();
			expect(result.id).toBe("f1");
		});

		it("should proceed with D1 delete even if R2 delete fails", async () => {
			db.get.mockResolvedValue(existingFile);
			storage.delete.mockRejectedValue(new Error("R2 error"));

			const result = await files.delete("f1", "user-1");

			expect(db.delete).toHaveBeenCalled();
			expect(result.id).toBe("f1");
		});

		it("should throw FILE_NOT_FOUND for nonexistent file", async () => {
			db.get.mockResolvedValue(undefined);

			try {
				await files.delete("nonexistent", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-043");
			}
		});
	});

	describe("download", () => {
		it("should return stream, contentType, and size from R2", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "grove-storage/user-1/blog/images/f1.webp",
				filename: "hero.webp",
				mimeType: "image/webp",
				sizeBytes: 1024,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: null,
			});

			const result = await files.download("f1", "user-1");

			expect(result.body).toBeInstanceOf(ReadableStream);
			expect(result.contentType).toBe("image/webp");
			expect(result.size).toBe(1024);
		});

		it("should throw DOWNLOAD_FAILED when R2 returns null", async () => {
			db.get.mockResolvedValue({
				id: "f1",
				userId: "user-1",
				r2Key: "key",
				filename: "f.png",
				mimeType: "image/png",
				sizeBytes: 100,
				product: "blog",
				category: "images",
				parentId: null,
				metadata: null,
				createdAt: "2026-01-01",
				deletedAt: null,
			});
			storage.get.mockResolvedValue(null);

			try {
				await files.download("f1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-050");
			}
		});

		it("should throw FILE_NOT_FOUND for wrong user", async () => {
			db.get.mockResolvedValue(undefined);

			try {
				await files.download("f1", "wrong-user");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-043");
			}
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT MANAGER
// ═══════════════════════════════════════════════════════════════════

describe("amber/ExportManager", () => {
	let db: ReturnType<typeof createMockDb>;
	let storage: ReturnType<typeof createMockStorage>;
	let services: ReturnType<typeof createMockServiceBus>;
	let exports: ExportManager;

	beforeEach(() => {
		vi.clearAllMocks();
		db = createMockDb();
		storage = createMockStorage();
		services = createMockServiceBus();
		exports = new ExportManager(db as any, storage as any, services as any);
	});

	describe("create", () => {
		it("should insert a pending export record and trigger DO", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "pending",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			const result = await exports.create({ userId: "user-1", type: "full" });

			expect(db.insert).toHaveBeenCalled();
			expect(services.call).toHaveBeenCalledWith(
				"amber-exports",
				expect.objectContaining({
					method: "POST",
					path: "/start",
				}),
			);
			expect(result.status).toBe("pending");
		});

		it("should serialize filter params as JSON", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "pending",
				exportType: "category",
				filterParams: '{"category":"images"}',
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			await exports.create({
				userId: "user-1",
				type: "category",
				filter: { category: "images" },
			});

			expect(db.insert).toHaveBeenCalled();
		});

		it("should log but not throw when service bus fails", async () => {
			services.call.mockRejectedValue(new Error("DO unavailable"));
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "pending",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			const result = await exports.create({ userId: "user-1", type: "full" });

			// Should still succeed — DO trigger is non-fatal
			expect(result.status).toBe("pending");
		});

		it("should work without service bus at all", async () => {
			const exportsNoServices = new ExportManager(db as any, storage as any);
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "pending",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			const result = await exportsNoServices.create({ userId: "user-1", type: "full" });

			expect(result.status).toBe("pending");
			expect(services.call).not.toHaveBeenCalled();
		});
	});

	describe("status", () => {
		it("should return export when found with matching userId", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: "exports/exp-1.zip",
				sizeBytes: 5000,
				fileCount: 10,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: "2026-01-01T01:00:00Z",
				expiresAt: "2026-01-08T00:00:00Z",
				errorMessage: null,
			});

			const result = await exports.status("exp-1", "user-1");

			expect(result.id).toBe("exp-1");
			expect(result.status).toBe("completed");
			expect(result.sizeBytes).toBe(5000);
			expect(result.fileCount).toBe(10);
		});

		it("should throw EXPORT_NOT_FOUND for wrong userId (IDOR mitigation)", async () => {
			db.get.mockResolvedValue(undefined);

			try {
				await exports.status("exp-1", "wrong-user");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-047");
			}
		});
	});

	describe("poll", () => {
		it("should delegate to status", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "processing",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			const result = await exports.poll("exp-1", "user-1");
			expect(result.status).toBe("processing");
		});
	});

	describe("downloadUrl", () => {
		it("should return presigned URL for completed export", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: "exports/exp-1.zip",
				sizeBytes: 5000,
				fileCount: 10,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: "2026-01-01T01:00:00Z",
				expiresAt: "2099-01-01T00:00:00Z", // Far future — not expired
				errorMessage: null,
			});

			const url = await exports.downloadUrl("exp-1", "user-1");

			expect(url).toContain("presigned");
			expect(storage.presignedUrl).toHaveBeenCalledWith("exports/exp-1.zip", {
				action: "get",
				expiresIn: 3600,
			});
		});

		it("should throw EXPORT_NOT_READY when status is not completed", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "processing",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01",
				completedAt: null,
				expiresAt: null,
				errorMessage: null,
			});

			try {
				await exports.downloadUrl("exp-1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-044");
			}
		});

		it("should throw EXPORT_FAILED when r2Key is missing", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: null,
				sizeBytes: null,
				fileCount: null,
				createdAt: "2026-01-01",
				completedAt: "2026-01-01",
				expiresAt: null,
				errorMessage: null,
			});

			try {
				await exports.downloadUrl("exp-1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-046");
			}
		});

		it("should throw EXPORT_EXPIRED when export has passed its expiry", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: "exports/exp-1.zip",
				sizeBytes: 5000,
				fileCount: 10,
				createdAt: "2020-01-01T00:00:00Z",
				completedAt: "2020-01-01T01:00:00Z",
				expiresAt: "2020-01-08T00:00:00Z", // Past date
				errorMessage: null,
			});

			try {
				await exports.downloadUrl("exp-1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-045");
			}
		});

		it("should throw DOWNLOAD_FAILED when presignedUrl generation fails", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: "exports/exp-1.zip",
				sizeBytes: 5000,
				fileCount: 10,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: "2026-01-01T01:00:00Z",
				expiresAt: "2099-01-01T00:00:00Z",
				errorMessage: null,
			});
			storage.presignedUrl.mockRejectedValue(new Error("R2 error"));

			try {
				await exports.downloadUrl("exp-1", "user-1");
				expect.unreachable("should have thrown");
			} catch (e: any) {
				expect(e.code).toBe("AMB-050");
			}
		});

		it("should allow download when expiresAt is null (no expiry set)", async () => {
			db.get.mockResolvedValue({
				id: "exp-1",
				userId: "user-1",
				status: "completed",
				exportType: "full",
				filterParams: null,
				r2Key: "exports/exp-1.zip",
				sizeBytes: 5000,
				fileCount: 10,
				createdAt: "2026-01-01T00:00:00Z",
				completedAt: "2026-01-01T01:00:00Z",
				expiresAt: null, // No expiry
				errorMessage: null,
			});

			const url = await exports.downloadUrl("exp-1", "user-1");
			expect(url).toContain("presigned");
		});
	});

	describe("list", () => {
		it("should return all exports for a user ordered by creation date", async () => {
			const mockRows = [
				{
					id: "exp-2",
					userId: "user-1",
					status: "completed",
					exportType: "full",
					filterParams: null,
					r2Key: "k2",
					sizeBytes: 2000,
					fileCount: 5,
					createdAt: "2026-01-02",
					completedAt: "2026-01-02",
					expiresAt: null,
					errorMessage: null,
				},
				{
					id: "exp-1",
					userId: "user-1",
					status: "completed",
					exportType: "blog",
					filterParams: null,
					r2Key: "k1",
					sizeBytes: 1000,
					fileCount: 3,
					createdAt: "2026-01-01",
					completedAt: "2026-01-01",
					expiresAt: null,
					errorMessage: null,
				},
			];
			// orderBy returns the chain, and the result should come from somewhere
			// In our mock, the final call in the chain determines the result
			// list() calls .select().from().where().orderBy() — orderBy returns the mock rows
			db.orderBy.mockReturnValue(mockRows);

			const result = await exports.list("user-1");

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("exp-2");
			expect(result[1].id).toBe("exp-1");
		});

		it("should return empty array when no exports exist", async () => {
			db.orderBy.mockReturnValue([]);

			const result = await exports.list("user-1");
			expect(result).toEqual([]);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// ADDON MANAGER
// ═══════════════════════════════════════════════════════════════════

describe("amber/AddonManager", () => {
	let db: ReturnType<typeof createMockDb>;
	let addons: AddonManager;

	beforeEach(() => {
		vi.clearAllMocks();
		db = createMockDb();
		addons = new AddonManager(db as any);
	});

	describe("available", () => {
		it("should return all three addon tiers", () => {
			const catalog = addons.available();

			expect(catalog).toHaveLength(3);
			expect(catalog.map((c) => c.type)).toEqual(["storage_10gb", "storage_50gb", "storage_100gb"]);
		});

		it("should include correct GB amounts", () => {
			const catalog = addons.available();

			const gbMap = Object.fromEntries(catalog.map((c) => [c.type, c.gb]));
			expect(gbMap.storage_10gb).toBe(10);
			expect(gbMap.storage_50gb).toBe(50);
			expect(gbMap.storage_100gb).toBe(100);
		});

		it("should include pricing in cents", () => {
			const catalog = addons.available();

			for (const entry of catalog) {
				expect(entry.priceCents).toBeGreaterThan(0);
				expect(typeof entry.priceCents).toBe("number");
			}
		});

		it("should return same results each call (no DB, sync)", () => {
			const a = addons.available();
			const b = addons.available();
			expect(a).toEqual(b);
		});
	});

	describe("list", () => {
		it("should return active addons for a user", async () => {
			// The final method in the chain that returns results
			// list() calls .select().from().where() — where returns the allResult
			db.where.mockReturnValue([
				{
					id: "addon-1",
					userId: "user-1",
					addonType: "storage_10gb",
					gbAmount: 10,
					active: 1,
					createdAt: "2026-01-01",
					cancelledAt: null,
				},
			]);

			const result = await addons.list("user-1");

			expect(result).toHaveLength(1);
			expect(result[0].addonType).toBe("storage_10gb");
			expect(result[0].active).toBe(true);
		});

		it("should return empty array when user has no addons", async () => {
			db.where.mockReturnValue([]);

			const result = await addons.list("user-1");
			expect(result).toEqual([]);
		});
	});

	describe("totalStorage", () => {
		it("should sum tier and additional GB", async () => {
			db.get.mockResolvedValue({ tierGb: 5, additionalGb: 10 });

			const result = await addons.totalStorage("user-1");
			expect(result).toBe(15);
		});

		it("should return 0 when user has no storage record", async () => {
			db.get.mockResolvedValue(undefined);

			const result = await addons.totalStorage("user-1");
			expect(result).toBe(0);
		});
	});

	describe("totalStorageBytes", () => {
		it("should convert GB to bytes", async () => {
			db.get.mockResolvedValue({ tierGb: 1, additionalGb: 0 });

			const result = await addons.totalStorageBytes("user-1");
			expect(result).toBe(GB_IN_BYTES);
		});

		it("should return 0 when user has no storage", async () => {
			db.get.mockResolvedValue(undefined);

			const result = await addons.totalStorageBytes("user-1");
			expect(result).toBe(0);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// CLIENT & FACTORY
// ═══════════════════════════════════════════════════════════════════

describe("amber/AmberClient", () => {
	it("should wire up all four managers via factory function", () => {
		const db = createMockDb();
		const storage = createMockStorage();
		const services = createMockServiceBus();

		const client = createAmberClient({
			db: db as any,
			storage: storage as any,
			services: services as any,
		});

		expect(client).toBeInstanceOf(AmberClient);
		expect(client.quota).toBeInstanceOf(QuotaManager);
		expect(client.files).toBeInstanceOf(FileManager);
		expect(client.exports).toBeInstanceOf(ExportManager);
		expect(client.addons).toBeInstanceOf(AddonManager);
	});

	it("should work without service bus (optional dependency)", () => {
		const db = createMockDb();
		const storage = createMockStorage();

		const client = createAmberClient({
			db: db as any,
			storage: storage as any,
		});

		expect(client.exports).toBeInstanceOf(ExportManager);
	});
});
