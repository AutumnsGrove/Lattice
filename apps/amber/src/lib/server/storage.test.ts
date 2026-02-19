import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	calculateQuotaStatus,
	canUpload,
	formatBytes,
	generateR2Key,
	parseR2Key,
	getMimeType,
	validateUpload,
	TIER_STORAGE,
	STORAGE_ADDONS,
	QUOTA_THRESHOLDS,
	StorageRepository,
} from "./storage";
import type { UserStorage, StorageFile } from "$types";

describe("Storage Service", () => {
	describe("calculateQuotaStatus", () => {
		it("should calculate correct quota status for 0% usage", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 0,
				used_bytes: 0,
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.tier_gb).toBe(20);
			expect(status.additional_gb).toBe(0);
			expect(status.total_gb).toBe(20);
			expect(status.used_bytes).toBe(0);
			expect(status.used_gb).toBe(0);
			expect(status.percentage).toBe(0);
			expect(status.warning_level).toBe("none");
		});

		it("should calculate correct quota status for 50% usage", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 0,
				used_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.used_gb).toBe(10);
			expect(status.percentage).toBe(50);
			expect(status.warning_level).toBe("none");
		});

		it("should return warning level at 80%", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 10,
				additional_gb: 0,
				used_bytes: 8 * 1024 * 1024 * 1024, // 8 GB
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.percentage).toBe(80);
			expect(status.warning_level).toBe("warning");
		});

		it("should return critical level at 95%", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 0,
				used_bytes: 19 * 1024 * 1024 * 1024, // 19 GB
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.percentage).toBe(95);
			expect(status.warning_level).toBe("critical");
		});

		it("should return full level at 100%", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 0,
				used_bytes: 20 * 1024 * 1024 * 1024, // 20 GB
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.percentage).toBe(100);
			expect(status.warning_level).toBe("full");
		});

		it("should include additional storage from add-ons", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 50,
				used_bytes: 35 * 1024 * 1024 * 1024, // 35 GB
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.total_gb).toBe(70);
			expect(status.percentage).toBe(50);
			expect(status.warning_level).toBe("none");
		});

		it("should handle zero total storage", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 0,
				additional_gb: 0,
				used_bytes: 0,
				updated_at: new Date().toISOString(),
			};

			const status = calculateQuotaStatus(storage);

			expect(status.total_gb).toBe(0);
			expect(status.percentage).toBe(0);
		});
	});

	describe("canUpload", () => {
		it("should allow upload when under quota", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 0,
				used_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
				updated_at: new Date().toISOString(),
			};

			expect(canUpload(storage, 1024 * 1024)).toBe(true); // 1 MB
			expect(canUpload(storage, 5 * 1024 * 1024 * 1024)).toBe(true); // 5 GB
		});

		it("should deny upload when over quota", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 1,
				additional_gb: 0,
				used_bytes: 1024 * 1024 * 1024, // 1 GB (full)
				updated_at: new Date().toISOString(),
			};

			expect(canUpload(storage, 1024)).toBe(false);
		});

		it("should deny upload when file would exceed quota", () => {
			const storage: UserStorage = {
				user_id: "user_123",
				tier_gb: 1,
				additional_gb: 0,
				used_bytes: 900 * 1024 * 1024, // 900 MB
				updated_at: new Date().toISOString(),
			};

			expect(canUpload(storage, 200 * 1024 * 1024)).toBe(false); // 200 MB would exceed
		});
	});

	describe("formatBytes", () => {
		it("should format 0 bytes", () => {
			expect(formatBytes(0)).toBe("0 B");
		});

		it("should format bytes", () => {
			expect(formatBytes(500)).toBe("500 B");
		});

		it("should format kilobytes", () => {
			expect(formatBytes(1024)).toBe("1 KB");
			expect(formatBytes(1536)).toBe("1.5 KB");
		});

		it("should format megabytes", () => {
			expect(formatBytes(1024 * 1024)).toBe("1 MB");
			expect(formatBytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
		});

		it("should format gigabytes", () => {
			expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
			expect(formatBytes(20.5 * 1024 * 1024 * 1024)).toBe("20.5 GB");
		});

		it("should format terabytes", () => {
			expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
		});
	});

	describe("generateR2Key", () => {
		it("should generate correct R2 key", () => {
			const key = generateR2Key("user_123", "blog", "images", "file_abc", "webp");
			expect(key).toBe("user_123/blog/images/file_abc.webp");
		});

		it("should handle missing extension", () => {
			const key = generateR2Key("user_123", "ivy", "attachments", "file_xyz");
			expect(key).toBe("user_123/ivy/attachments/file_xyz");
		});

		it("should work for all product types", () => {
			expect(generateR2Key("u1", "blog", "images", "f1", "png")).toBe("u1/blog/images/f1.png");
			expect(generateR2Key("u1", "ivy", "emails", "f1", "enc")).toBe("u1/ivy/emails/f1.enc");
			expect(generateR2Key("u1", "profile", "avatar", "f1", "webp")).toBe(
				"u1/profile/avatar/f1.webp",
			);
			expect(generateR2Key("u1", "themes", "assets", "f1", "css")).toBe("u1/themes/assets/f1.css");
		});
	});

	describe("parseR2Key", () => {
		it("should parse valid R2 key", () => {
			const result = parseR2Key("user_123/blog/images/photo.webp");

			expect(result).toEqual({
				userId: "user_123",
				product: "blog",
				category: "images",
				filename: "photo.webp",
			});
		});

		it("should handle nested paths", () => {
			const result = parseR2Key("user_123/themes/custom/css/style.css");

			expect(result).toEqual({
				userId: "user_123",
				product: "themes",
				category: "custom",
				filename: "css/style.css",
			});
		});

		it("should return null for invalid keys", () => {
			expect(parseR2Key("invalid")).toBeNull();
			expect(parseR2Key("a/b/c")).toBeNull();
		});
	});

	describe("getMimeType", () => {
		it("should return correct MIME types for images", () => {
			expect(getMimeType("photo.jpg")).toBe("image/jpeg");
			expect(getMimeType("photo.jpeg")).toBe("image/jpeg");
			expect(getMimeType("image.png")).toBe("image/png");
			expect(getMimeType("animation.gif")).toBe("image/gif");
			expect(getMimeType("optimized.webp")).toBe("image/webp");
			expect(getMimeType("icon.svg")).toBe("image/svg+xml");
		});

		it("should return correct MIME types for documents", () => {
			expect(getMimeType("document.pdf")).toBe("application/pdf");
			expect(getMimeType("file.txt")).toBe("text/plain");
			expect(getMimeType("readme.md")).toBe("text/markdown");
		});

		it("should return correct MIME types for fonts", () => {
			expect(getMimeType("font.woff")).toBe("font/woff");
			expect(getMimeType("font.woff2")).toBe("font/woff2");
			expect(getMimeType("font.ttf")).toBe("font/ttf");
		});

		it("should return octet-stream for unknown types", () => {
			expect(getMimeType("unknown.xyz")).toBe("application/octet-stream");
			expect(getMimeType("noextension")).toBe("application/octet-stream");
		});

		it("should be case-insensitive", () => {
			expect(getMimeType("photo.JPG")).toBe("image/jpeg");
			expect(getMimeType("video.MP4")).toBe("video/mp4");
		});
	});

	describe("validateUpload", () => {
		const validStorage: UserStorage = {
			user_id: "user_123",
			tier_gb: 20,
			additional_gb: 0,
			used_bytes: 0,
			updated_at: new Date().toISOString(),
		};

		it("should validate successful upload", () => {
			const result = validateUpload({ name: "photo.jpg", size: 1024 * 1024 }, validStorage);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject when over quota", () => {
			const fullStorage: UserStorage = {
				...validStorage,
				used_bytes: 20 * 1024 * 1024 * 1024,
			};

			const result = validateUpload({ name: "photo.jpg", size: 1024 }, fullStorage);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("quota exceeded");
		});

		it("should reject files exceeding max size", () => {
			const result = validateUpload({ name: "large.zip", size: 200 * 1024 * 1024 }, validStorage, {
				maxSizeBytes: 100 * 1024 * 1024, // 100 MB max
			});

			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds maximum limit");
		});

		it("should reject disallowed file types", () => {
			const result = validateUpload({ name: "script.exe", size: 1024 }, validStorage, {
				allowedTypes: ["image/jpeg", "image/png"],
			});

			expect(result.valid).toBe(false);
			expect(result.error).toContain("not allowed");
		});

		it("should allow specified file types", () => {
			const result = validateUpload(
				{ name: "photo.jpg", size: 1024, type: "image/jpeg" },
				validStorage,
				{ allowedTypes: ["image/jpeg", "image/png"] },
			);

			expect(result.valid).toBe(true);
		});
	});

	describe("Constants", () => {
		it("should have correct tier storage values", () => {
			expect(TIER_STORAGE.free).toBe(0);
			expect(TIER_STORAGE.seedling).toBe(1);
			expect(TIER_STORAGE.sapling).toBe(5);
			expect(TIER_STORAGE.oak).toBe(20);
			expect(TIER_STORAGE.evergreen).toBe(100);
		});

		it("should have correct addon configurations", () => {
			expect(STORAGE_ADDONS.storage_10gb).toEqual({ gb: 10, price_cents: 100 });
			expect(STORAGE_ADDONS.storage_50gb).toEqual({ gb: 50, price_cents: 400 });
			expect(STORAGE_ADDONS.storage_100gb).toEqual({ gb: 100, price_cents: 700 });
		});

		it("should have correct quota thresholds", () => {
			expect(QUOTA_THRESHOLDS.warning).toBe(0.8);
			expect(QUOTA_THRESHOLDS.critical).toBe(0.95);
			expect(QUOTA_THRESHOLDS.full).toBe(1.0);
		});
	});
});

describe("StorageRepository", () => {
	let mockDb: any;
	let repo: StorageRepository;

	beforeEach(() => {
		mockDb = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({ results: [] }),
			}),
		};
		repo = new StorageRepository(mockDb);
	});

	describe("getOrCreateUserStorage", () => {
		it("should return existing storage if found", async () => {
			const existing: UserStorage = {
				user_id: "user_123",
				tier_gb: 20,
				additional_gb: 10,
				used_bytes: 5 * 1024 * 1024 * 1024,
				updated_at: "2025-01-01T00:00:00Z",
			};

			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValue(existing),
			});

			const result = await repo.getOrCreateUserStorage("user_123", 20);

			expect(result).toEqual(existing);
		});

		it("should create new storage if not found", async () => {
			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValue(null),
				run: vi.fn().mockResolvedValue({ success: true }),
			});

			const result = await repo.getOrCreateUserStorage("user_new", 5);

			expect(result.user_id).toBe("user_new");
			expect(result.tier_gb).toBe(5);
			expect(result.additional_gb).toBe(0);
			expect(result.used_bytes).toBe(0);
		});
	});

	describe("trackUpload", () => {
		it("should update used_bytes on upload", async () => {
			const bindMock = vi.fn().mockReturnThis();
			const runMock = vi.fn().mockResolvedValue({ success: true });

			mockDb.prepare.mockReturnValue({
				bind: bindMock,
				run: runMock,
			});

			await repo.trackUpload("user_123", 1024 * 1024);

			expect(bindMock).toHaveBeenCalledWith(1024 * 1024, "user_123");
			expect(runMock).toHaveBeenCalled();
		});
	});

	describe("trackDelete", () => {
		it("should decrease used_bytes on delete", async () => {
			const bindMock = vi.fn().mockReturnThis();
			const runMock = vi.fn().mockResolvedValue({ success: true });

			mockDb.prepare.mockReturnValue({
				bind: bindMock,
				run: runMock,
			});

			await repo.trackDelete("user_123", 1024 * 1024);

			expect(bindMock).toHaveBeenCalledWith(1024 * 1024, "user_123");
			expect(runMock).toHaveBeenCalled();
		});
	});

	describe("getUsageBreakdown", () => {
		it("should return grouped usage data", async () => {
			const mockBreakdown = [
				{ product: "blog", category: "images", bytes: 5000000, file_count: 10 },
				{ product: "ivy", category: "attachments", bytes: 3000000, file_count: 5 },
			];

			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockBreakdown }),
			});

			const result = await repo.getUsageBreakdown("user_123");

			expect(result).toEqual(mockBreakdown);
		});
	});

	describe("softDeleteFile", () => {
		it("should set deleted_at timestamp", async () => {
			const runMock = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: runMock,
			});

			const result = await repo.softDeleteFile("file_123");

			expect(result).toBe(true);
		});

		it("should return false if no file found", async () => {
			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
			});

			const result = await repo.softDeleteFile("nonexistent");

			expect(result).toBe(false);
		});
	});

	describe("restoreFile", () => {
		it("should clear deleted_at timestamp", async () => {
			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
			});

			const result = await repo.restoreFile("file_123");

			expect(result).toBe(true);
		});
	});

	describe("getExpiredTrashFiles", () => {
		it("should return files deleted more than 30 days ago", async () => {
			const expiredFiles = [
				{
					id: "file_1",
					user_id: "user_123",
					r2_key: "user_123/blog/images/old.jpg",
					filename: "old.jpg",
					mime_type: "image/jpeg",
					size_bytes: 1024,
					product: "blog",
					category: "images",
					created_at: "2024-01-01T00:00:00Z",
					deleted_at: "2024-11-01T00:00:00Z",
				},
			];

			mockDb.prepare.mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: expiredFiles }),
			});

			const result = await repo.getExpiredTrashFiles(100);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("file_1");
		});
	});
});
