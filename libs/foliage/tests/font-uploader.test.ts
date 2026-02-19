// tests/font-uploader.test.ts
// Integration tests for font-uploader server functions

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	uploadFont,
	deleteFont,
	listFonts,
	getFont,
	countFonts,
} from "../src/lib/server/font-uploader.js";
import type { CustomFont } from "../src/lib/types.js";

// Mock types matching Cloudflare interfaces
interface MockR2Bucket {
	put: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	list: ReturnType<typeof vi.fn>;
}

interface MockD1Result {
	success: boolean;
	results?: unknown[];
	meta?: unknown;
}

interface MockD1Statement {
	bind: ReturnType<typeof vi.fn>;
}

interface MockD1Database {
	prepare: ReturnType<typeof vi.fn>;
}

// Helper to create mock R2 bucket
function createMockR2(): MockR2Bucket {
	return {
		put: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		list: vi.fn().mockResolvedValue({ objects: [] }),
	};
}

// Helper to create mock D1 database with chainable methods
function createMockDb(
	options: {
		runSuccess?: boolean;
		firstResult?: unknown;
		allResults?: unknown[];
	} = {},
): MockD1Database {
	const { runSuccess = true, firstResult = null, allResults = [] } = options;

	const mockBind = vi.fn(() => ({
		run: vi.fn().mockResolvedValue({ success: runSuccess } as MockD1Result),
		first: vi.fn().mockResolvedValue(firstResult),
		all: vi.fn().mockResolvedValue({ results: allResults }),
	})) as unknown as MockD1Statement["bind"];

	return {
		prepare: vi.fn(() => ({
			bind: mockBind,
		})),
	} as MockD1Database;
}

// Helper to create sample font metadata
function createFontMetadata() {
	return {
		name: "Test Font",
		family: "Test Family",
		category: "sans-serif" as const,
	};
}

// Helper to create sample ArrayBuffer
function createFileBuffer(size = 1024): ArrayBuffer {
	return new ArrayBuffer(size);
}

describe("Font Uploader", () => {
	describe("uploadFont", () => {
		it("should successfully upload a font with valid WOFF2 data", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true });
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer(2048);
			const metadata = createFontMetadata();

			const result = await uploadFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				tenantId,
				fileBuffer,
				metadata,
			);

			expect(result).toBeDefined();
			expect(result.tenantId).toBe(tenantId);
			expect(result.name).toBe(metadata.name);
			expect(result.family).toBe(metadata.family);
			expect(result.category).toBe(metadata.category);
			expect(result.fileSize).toBe(2048);
			expect(mockR2.put).toHaveBeenCalled();
		});

		it("should generate a correct UUID for fontId", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true });
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer();
			const metadata = createFontMetadata();

			const result = await uploadFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				tenantId,
				fileBuffer,
				metadata,
			);

			expect(result.id).toBeDefined();
			expect(typeof result.id).toBe("string");
			expect(result.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it("should generate correct R2 path with tenantId and fontId", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true });
			const tenantId = "tenant-456";
			const fileBuffer = createFileBuffer();
			const metadata = createFontMetadata();

			const result = await uploadFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				tenantId,
				fileBuffer,
				metadata,
			);

			expect(result.woff2Path).toBe(`fonts/${tenantId}/${result.id}.woff2`);
			expect(mockR2.put).toHaveBeenCalledWith(`fonts/${tenantId}/${result.id}.woff2`, fileBuffer);
		});

		it("should rollback (delete from R2) on DB insert failure", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: false });
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer();
			const metadata = createFontMetadata();

			await expect(
				uploadFont(
					mockR2 as unknown as R2Bucket,
					mockDb as unknown as D1Database,
					tenantId,
					fileBuffer,
					metadata,
				),
			).rejects.toThrow("Failed to save font metadata to database");

			expect(mockR2.put).toHaveBeenCalled();
			expect(mockR2.delete).toHaveBeenCalled();
		});

		it("should store correct file size from ArrayBuffer", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true });
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer(4096);
			const metadata = createFontMetadata();

			const result = await uploadFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				tenantId,
				fileBuffer,
				metadata,
			);

			expect(result.fileSize).toBe(4096);
		});

		it("should create correct CustomFont object structure", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true });
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer();
			const metadata = {
				name: "Custom Font Name",
				family: "Custom Family",
				category: "serif" as const,
			};

			const result = await uploadFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				tenantId,
				fileBuffer,
				metadata,
			);

			expect(result).toMatchObject({
				id: expect.any(String),
				tenantId: "tenant-123",
				name: "Custom Font Name",
				family: "Custom Family",
				category: "serif",
				woff2Path: expect.stringContaining("fonts/tenant-123/"),
				fileSize: expect.any(Number),
			});
			expect(result.woffPath).toBeUndefined();
		});

		it("should handle different font categories correctly", async () => {
			const mockR2 = createMockR2();
			const tenantId = "tenant-123";
			const fileBuffer = createFileBuffer();

			const categories = ["sans-serif", "serif", "mono", "display"] as const;

			for (const category of categories) {
				const mockDb = createMockDb({ runSuccess: true });
				const metadata = { ...createFontMetadata(), category };

				const result = await uploadFont(
					mockR2 as unknown as R2Bucket,
					mockDb as unknown as D1Database,
					tenantId,
					fileBuffer,
					metadata,
				);

				expect(result.category).toBe(category);
			}
		});
	});

	describe("deleteFont", () => {
		it("should successfully delete a font from D1 and R2", async () => {
			const fontId = "font-123";
			const mockFont: CustomFont = {
				id: fontId,
				tenantId: "tenant-123",
				name: "Test Font",
				family: "Test Family",
				category: "sans-serif",
				woff2Path: "fonts/tenant-123/font-123.woff2",
				fileSize: 1024,
			};

			const mockR2 = createMockR2();
			const mockDb = createMockDb({
				runSuccess: true,
				firstResult: {
					id: mockFont.id,
					tenant_id: mockFont.tenantId,
					name: mockFont.name,
					family: mockFont.family,
					category: mockFont.category,
					woff2_path: mockFont.woff2Path,
					woff_path: null,
					file_size: mockFont.fileSize,
					created_at: Date.now(),
				},
			});

			const result = await deleteFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				fontId,
			);

			expect(result).toBe(true);
			expect(mockR2.delete).toHaveBeenCalledWith("fonts/tenant-123/font-123.woff2");
		});

		it("should return false for non-existent font", async () => {
			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true, firstResult: null });

			const result = await deleteFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				"non-existent-font",
			);

			expect(result).toBe(false);
			expect(mockR2.delete).not.toHaveBeenCalled();
		});

		it("should handle both woff2 and woff paths when deleting", async () => {
			const fontId = "font-456";
			const mockFont = {
				id: fontId,
				tenant_id: "tenant-123",
				name: "Test Font",
				family: "Test Family",
				category: "sans-serif",
				woff2_path: "fonts/tenant-123/font-456.woff2",
				woff_path: "fonts/tenant-123/font-456.woff",
				file_size: 1024,
				created_at: Date.now(),
			};

			const mockR2 = createMockR2();
			const mockDb = createMockDb({ runSuccess: true, firstResult: mockFont });

			const result = await deleteFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				fontId,
			);

			expect(result).toBe(true);
			expect(mockR2.delete).toHaveBeenCalledWith("fonts/tenant-123/font-456.woff2");
			expect(mockR2.delete).toHaveBeenCalledWith("fonts/tenant-123/font-456.woff");
			expect(mockR2.delete).toHaveBeenCalledTimes(2);
		});

		it("should return false when DB delete fails", async () => {
			const fontId = "font-789";
			const mockFont = {
				id: fontId,
				tenant_id: "tenant-123",
				name: "Test Font",
				family: "Test Family",
				category: "sans-serif",
				woff2_path: "fonts/tenant-123/font-789.woff2",
				woff_path: null,
				file_size: 1024,
				created_at: Date.now(),
			};

			const mockR2 = createMockR2();

			// First prepare call for getFont (returns font), second for delete (fails)
			let callCount = 0;
			const mockDb = {
				prepare: vi.fn(() => {
					callCount++;
					if (callCount === 1) {
						// getFont call
						return {
							bind: vi.fn(() => ({
								first: vi.fn().mockResolvedValue(mockFont),
							})),
						};
					} else {
						// delete call
						return {
							bind: vi.fn(() => ({
								run: vi.fn().mockResolvedValue({ success: false }),
							})),
						};
					}
				}),
			};

			const result = await deleteFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				fontId,
			);

			expect(result).toBe(false);
		});

		it("should handle errors gracefully and return false", async () => {
			const mockR2 = createMockR2();
			const mockDb = {
				prepare: vi.fn(() => {
					throw new Error("Database error");
				}),
			};

			const result = await deleteFont(
				mockR2 as unknown as R2Bucket,
				mockDb as unknown as D1Database,
				"font-error",
			);

			expect(result).toBe(false);
		});
	});

	describe("listFonts", () => {
		it("should return empty array for tenant with no fonts", async () => {
			const mockDb = createMockDb({ allResults: [] });

			const result = await listFonts(mockDb as unknown as D1Database, "tenant-empty");

			expect(result).toEqual([]);
		});

		it("should return fonts ordered by created_at DESC", async () => {
			const mockFonts = [
				{
					id: "font-3",
					tenant_id: "tenant-123",
					name: "Newest Font",
					family: "Newest",
					category: "sans-serif",
					woff2_path: "fonts/tenant-123/font-3.woff2",
					woff_path: null,
					file_size: 1024,
					created_at: 1700000003,
				},
				{
					id: "font-2",
					tenant_id: "tenant-123",
					name: "Middle Font",
					family: "Middle",
					category: "serif",
					woff2_path: "fonts/tenant-123/font-2.woff2",
					woff_path: null,
					file_size: 2048,
					created_at: 1700000002,
				},
				{
					id: "font-1",
					tenant_id: "tenant-123",
					name: "Oldest Font",
					family: "Oldest",
					category: "mono",
					woff2_path: "fonts/tenant-123/font-1.woff2",
					woff_path: null,
					file_size: 512,
					created_at: 1700000001,
				},
			];

			const mockDb = createMockDb({ allResults: mockFonts });

			const result = await listFonts(mockDb as unknown as D1Database, "tenant-123");

			expect(result).toHaveLength(3);
			expect(result[0].name).toBe("Newest Font");
			expect(result[1].name).toBe("Middle Font");
			expect(result[2].name).toBe("Oldest Font");
		});

		it("should filter fonts by tenant_id correctly", async () => {
			const mockDb = createMockDb();

			await listFonts(mockDb as unknown as D1Database, "tenant-specific");

			expect(mockDb.prepare).toHaveBeenCalledWith(
				"SELECT * FROM custom_fonts WHERE tenant_id = ? ORDER BY created_at DESC",
			);
		});

		it("should map database columns to CustomFont interface", async () => {
			const mockFonts = [
				{
					id: "font-123",
					tenant_id: "tenant-456",
					name: "Test Font",
					family: "Test Family",
					category: "display",
					woff2_path: "fonts/tenant-456/font-123.woff2",
					woff_path: "fonts/tenant-456/font-123.woff",
					file_size: 3072,
					created_at: 1700000000,
				},
			];

			const mockDb = createMockDb({ allResults: mockFonts });

			const result = await listFonts(mockDb as unknown as D1Database, "tenant-456");

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: "font-123",
				tenantId: "tenant-456",
				name: "Test Font",
				family: "Test Family",
				category: "display",
				woff2Path: "fonts/tenant-456/font-123.woff2",
				woffPath: "fonts/tenant-456/font-123.woff",
				fileSize: 3072,
			});
		});

		it("should handle null woff_path correctly", async () => {
			const mockFonts = [
				{
					id: "font-123",
					tenant_id: "tenant-123",
					name: "Test Font",
					family: "Test Family",
					category: "sans-serif",
					woff2_path: "fonts/tenant-123/font-123.woff2",
					woff_path: null,
					file_size: 1024,
					created_at: 1700000000,
				},
			];

			const mockDb = createMockDb({ allResults: mockFonts });

			const result = await listFonts(mockDb as unknown as D1Database, "tenant-123");

			expect(result[0].woffPath).toBeUndefined();
		});

		it("should handle errors gracefully and return empty array", async () => {
			const mockDb = {
				prepare: vi.fn(() => {
					throw new Error("Database error");
				}),
			};

			const result = await listFonts(mockDb as unknown as D1Database, "tenant-error");

			expect(result).toEqual([]);
		});
	});

	describe("getFont", () => {
		it("should return null for non-existent font ID", async () => {
			const mockDb = createMockDb({ firstResult: null });

			const result = await getFont(mockDb as unknown as D1Database, "non-existent");

			expect(result).toBeNull();
		});

		it("should return correct CustomFont object for valid ID", async () => {
			const mockFont = {
				id: "font-abc",
				tenant_id: "tenant-xyz",
				name: "Beautiful Font",
				family: "Beautiful Family",
				category: "serif",
				woff2_path: "fonts/tenant-xyz/font-abc.woff2",
				woff_path: null,
				file_size: 2048,
				created_at: 1700000000,
			};

			const mockDb = createMockDb({ firstResult: mockFont });

			const result = await getFont(mockDb as unknown as D1Database, "font-abc");

			expect(result).toBeDefined();
			expect(result).toMatchObject({
				id: "font-abc",
				tenantId: "tenant-xyz",
				name: "Beautiful Font",
				family: "Beautiful Family",
				category: "serif",
				woff2Path: "fonts/tenant-xyz/font-abc.woff2",
				fileSize: 2048,
			});
			expect(result!.woffPath).toBeUndefined();
		});

		it("should map all database columns correctly", async () => {
			const mockFont = {
				id: "font-full",
				tenant_id: "tenant-full",
				name: "Complete Font",
				family: "Complete Family",
				category: "mono",
				woff2_path: "fonts/tenant-full/font-full.woff2",
				woff_path: "fonts/tenant-full/font-full.woff",
				file_size: 4096,
				created_at: 1700000000,
			};

			const mockDb = createMockDb({ firstResult: mockFont });

			const result = await getFont(mockDb as unknown as D1Database, "font-full");

			expect(result).toEqual({
				id: "font-full",
				tenantId: "tenant-full",
				name: "Complete Font",
				family: "Complete Family",
				category: "mono",
				woff2Path: "fonts/tenant-full/font-full.woff2",
				woffPath: "fonts/tenant-full/font-full.woff",
				fileSize: 4096,
			});
		});

		it("should handle errors gracefully and return null", async () => {
			const mockDb = {
				prepare: vi.fn(() => {
					throw new Error("Database error");
				}),
			};

			const result = await getFont(mockDb as unknown as D1Database, "font-error");

			expect(result).toBeNull();
		});
	});

	describe("countFonts", () => {
		it("should return 0 for tenant with no fonts", async () => {
			const mockDb = createMockDb({ firstResult: { count: 0 } });

			const result = await countFonts(mockDb as unknown as D1Database, "tenant-empty");

			expect(result).toBe(0);
		});

		it("should return correct count for tenant with fonts", async () => {
			const mockDb = createMockDb({ firstResult: { count: 5 } });

			const result = await countFonts(mockDb as unknown as D1Database, "tenant-123");

			expect(result).toBe(5);
		});

		it("should handle null result and return 0", async () => {
			const mockDb = createMockDb({ firstResult: null });

			const result = await countFonts(mockDb as unknown as D1Database, "tenant-null");

			expect(result).toBe(0);
		});

		it("should handle undefined count and return 0", async () => {
			const mockDb = createMockDb({ firstResult: {} });

			const result = await countFonts(mockDb as unknown as D1Database, "tenant-undefined");

			expect(result).toBe(0);
		});

		it("should filter by tenant_id in query", async () => {
			const mockDb = createMockDb({ firstResult: { count: 3 } });

			await countFonts(mockDb as unknown as D1Database, "tenant-specific");

			expect(mockDb.prepare).toHaveBeenCalledWith(
				"SELECT COUNT(*) as count FROM custom_fonts WHERE tenant_id = ?",
			);
		});

		it("should handle errors gracefully and return 0", async () => {
			const mockDb = {
				prepare: vi.fn(() => {
					throw new Error("Database error");
				}),
			};

			const result = await countFonts(mockDb as unknown as D1Database, "tenant-error");

			expect(result).toBe(0);
		});
	});
});
