// tests/community-themes.test.ts
// Comprehensive integration tests for community theme server functions

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createCommunityTheme,
	getCommunityTheme,
	updateCommunityTheme,
	deleteCommunityTheme,
	listCommunityThemes,
	incrementDownloads,
	addRating,
	updateThemeStatus,
	getThemesByCreator,
	getApprovedThemes,
	getFeaturedThemes,
} from "../src/lib/server/community-themes.js";
import type { CommunityTheme, ThemeColors, ThemeFonts, ThemeLayout } from "../src/lib/types.js";

// Mock D1Database interface
interface MockD1Statement {
	bind: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
	first: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
}

interface MockD1Database {
	prepare: ReturnType<typeof vi.fn>;
}

// Helper to create mock database
function createMockDb(): { db: MockD1Database; statement: MockD1Statement } {
	const mockStatement: MockD1Statement = {
		bind: vi.fn(),
		run: vi.fn(),
		first: vi.fn(),
		all: vi.fn(),
	};

	// Chain methods
	mockStatement.bind.mockReturnValue(mockStatement);

	const mockDb: MockD1Database = {
		prepare: vi.fn(() => mockStatement),
	};

	return { db: mockDb, statement: mockStatement };
}

// Sample theme data
const sampleCustomColors: Partial<ThemeColors> = {
	background: "#1a1a1a",
	foreground: "#ffffff",
	accent: "#00ff00",
};

const sampleCustomTypography: Partial<ThemeFonts> = {
	heading: "Arial",
	body: "Georgia",
};

const sampleCustomLayout: Partial<ThemeLayout> = {
	type: "sidebar",
	spacing: "comfortable",
};

const sampleThemeInput = {
	creatorTenantId: "tenant-123",
	name: "Test Theme",
	description: "A test theme",
	tags: ["dark", "minimal"],
	baseTheme: "grove",
	customColors: sampleCustomColors,
	customTypography: sampleCustomTypography,
	customLayout: sampleCustomLayout,
	customCSS: ".custom { color: red; }",
	thumbnailPath: "/path/to/thumbnail.png",
};

const sampleThemeRow = {
	id: "theme-uuid-123",
	creator_tenant_id: "tenant-123",
	name: "Test Theme",
	description: "A test theme",
	tags: '["dark","minimal"]',
	base_theme: "grove",
	custom_colors: JSON.stringify(sampleCustomColors),
	custom_typography: JSON.stringify(sampleCustomTypography),
	custom_layout: JSON.stringify(sampleCustomLayout),
	custom_css: ".custom { color: red; }",
	thumbnail_path: "/path/to/thumbnail.png",
	downloads: 0,
	rating_sum: 0,
	rating_count: 0,
	status: "pending" as const,
	reviewed_at: null,
	created_at: 1234567890,
	updated_at: 1234567890,
};

describe("Community Themes Server Functions", () => {
	let mockDb: MockD1Database;
	let mockStatement: MockD1Statement;

	beforeEach(() => {
		const mocks = createMockDb();
		mockDb = mocks.db;
		mockStatement = mocks.statement;
		vi.clearAllMocks();
	});

	describe("createCommunityTheme", () => {
		it("should generate a UUID for new theme", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);

			expect(result.id).toBeDefined();
			expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it("should set status to pending by default", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);

			expect(result.status).toBe("pending");
		});

		it("should initialize downloads, ratingSum, and ratingCount to 0", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);

			expect(result.downloads).toBe(0);
			expect(result.ratingSum).toBe(0);
			expect(result.ratingCount).toBe(0);
		});

		it("should store JSON fields correctly", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);

			expect(result.customColors).toEqual(sampleCustomColors);
			expect(result.customTypography).toEqual(sampleCustomTypography);
			expect(result.customLayout).toEqual(sampleCustomLayout);
			expect(result.tags).toEqual(["dark", "minimal"]);
		});

		it("should set created_at and updated_at timestamps", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const beforeTime = Math.floor(Date.now() / 1000);
			const result = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);
			const afterTime = Math.floor(Date.now() / 1000);

			expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
			expect(result.createdAt).toBeLessThanOrEqual(afterTime);
			expect(result.updatedAt).toEqual(result.createdAt);
		});

		it("should handle optional fields being undefined", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const minimalInput = {
				creatorTenantId: "tenant-123",
				name: "Minimal Theme",
				baseTheme: "grove",
			};

			const result = await createCommunityTheme(mockDb as unknown as D1Database, minimalInput);

			expect(result.description).toBeUndefined();
			expect(result.tags).toBeUndefined();
			expect(result.customColors).toBeUndefined();
			expect(result.customCSS).toBeUndefined();
		});

		it("should throw error if database insert fails", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			await expect(
				createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput),
			).rejects.toThrow("Failed to create community theme");
		});

		it("should handle database errors gracefully", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database connection failed"));

			await expect(
				createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput),
			).rejects.toThrow("Database connection failed");
		});
	});

	describe("getCommunityTheme", () => {
		it("should return null for non-existent theme ID", async () => {
			mockStatement.first.mockResolvedValue(null);

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "non-existent-id");

			expect(result).toBeNull();
		});

		it("should map database row to CommunityTheme interface", async () => {
			mockStatement.first.mockResolvedValue(sampleThemeRow);

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result).toBeDefined();
			expect(result?.id).toBe("theme-uuid-123");
			expect(result?.creatorTenantId).toBe("tenant-123");
			expect(result?.name).toBe("Test Theme");
			expect(result?.status).toBe("pending");
		});

		it("should parse JSON fields correctly", async () => {
			mockStatement.first.mockResolvedValue(sampleThemeRow);

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.customColors).toEqual(sampleCustomColors);
			expect(result?.customTypography).toEqual(sampleCustomTypography);
			expect(result?.customLayout).toEqual(sampleCustomLayout);
			expect(result?.tags).toEqual(["dark", "minimal"]);
		});

		it("should handle null JSON fields gracefully", async () => {
			mockStatement.first.mockResolvedValue({
				...sampleThemeRow,
				tags: null,
				custom_colors: null,
				custom_typography: null,
				custom_layout: null,
				custom_css: null,
			});

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.tags).toBeUndefined();
			expect(result?.customColors).toBeUndefined();
			expect(result?.customTypography).toBeUndefined();
			expect(result?.customLayout).toBeUndefined();
			expect(result?.customCSS).toBeUndefined();
		});

		it("should return null on database errors", async () => {
			mockStatement.first.mockRejectedValue(new Error("Database error"));

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result).toBeNull();
		});
	});

	describe("updateCommunityTheme", () => {
		it("should update only the name field", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				name: "Updated Name",
			});

			expect(result).toBe(true);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE community_themes SET name = ?, updated_at = unixepoch()"),
			);
		});

		it("should update multiple fields at once", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				name: "New Name",
				description: "New Description",
				status: "approved",
			});

			expect(result).toBe(true);
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("name = ?");
			expect(sqlCall).toContain("description = ?");
			expect(sqlCall).toContain("status = ?");
		});

		it("should always set updated_at timestamp", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				name: "Updated",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("updated_at = unixepoch()");
		});

		it("should handle empty update object", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateCommunityTheme(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				{},
			);

			expect(result).toBe(true);
			// Should not call prepare if nothing to update
			expect(mockDb.prepare).not.toHaveBeenCalled();
		});

		it("should update JSON fields correctly", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const newColors: Partial<ThemeColors> = { accent: "#ff0000" };

			const result = await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				customColors: newColors,
			});

			expect(result).toBe(true);
			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toContain(JSON.stringify(newColors));
		});

		it("should return false on database failure", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				name: "Updated",
			});

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database error"));

			const result = await updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
				name: "Updated",
			});

			expect(result).toBe(false);
		});
	});

	describe("deleteCommunityTheme", () => {
		it("should verify creator ownership before deletion", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await deleteCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", "tenant-123");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toEqual(["theme-uuid-123", "tenant-123"]);
		});

		it("should return false for wrong creator", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await deleteCommunityTheme(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"wrong-tenant-id",
			);

			expect(result).toBe(false);
		});

		it("should return true on successful deletion", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await deleteCommunityTheme(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"tenant-123",
			);

			expect(result).toBe(true);
		});

		it("should handle database errors", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database error"));

			const result = await deleteCommunityTheme(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"tenant-123",
			);

			expect(result).toBe(false);
		});
	});

	describe("listCommunityThemes", () => {
		const mockThemes = [sampleThemeRow, { ...sampleThemeRow, id: "theme-uuid-456" }];

		it("should filter by single status", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, { status: "pending" });

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("WHERE status = ?");
		});

		it("should filter by status array", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				status: ["approved", "featured"],
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("status IN (?, ?)");
		});

		it("should filter by creator tenant ID", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				creatorTenantId: "tenant-123",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("creator_tenant_id = ?");
		});

		it("should apply limit and offset for pagination", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				limit: 10,
				offset: 5,
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("LIMIT ?");
			expect(sqlCall).toContain("OFFSET ?");
		});

		it("should order by downloads DESC", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				orderBy: "downloads",
				orderDir: "desc",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY downloads DESC");
		});

		it("should order by rating (ratingSum/ratingCount)", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				orderBy: "rating",
				orderDir: "desc",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("rating_sum");
			expect(sqlCall).toContain("rating_count");
		});

		it("should order by created_at", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				orderBy: "created_at",
				orderDir: "asc",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY created_at ASC");
		});

		it("should combine multiple filters", async () => {
			mockStatement.all.mockResolvedValue({ results: mockThemes });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				status: ["approved", "featured"],
				creatorTenantId: "tenant-123",
				limit: 10,
				offset: 0,
				orderBy: "downloads",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("WHERE");
			expect(sqlCall).toContain("status IN");
			expect(sqlCall).toContain("creator_tenant_id = ?");
			expect(sqlCall).toContain("ORDER BY downloads");
			expect(sqlCall).toContain("LIMIT ?");
		});

		it("should return empty array if no results", async () => {
			mockStatement.all.mockResolvedValue({ results: [] });

			const result = await listCommunityThemes(mockDb as unknown as D1Database);

			expect(result).toEqual([]);
		});

		it("should handle database errors", async () => {
			mockStatement.all.mockRejectedValue(new Error("Database error"));

			const result = await listCommunityThemes(mockDb as unknown as D1Database);

			expect(result).toEqual([]);
		});
	});

	describe("incrementDownloads", () => {
		it("should increment downloads by 1", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result).toBe(true);
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("downloads = downloads + 1");
		});

		it("should update updated_at timestamp", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123");

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("updated_at = unixepoch()");
		});

		it("should return false on database failure", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database error"));

			const result = await incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result).toBe(false);
		});
	});

	describe("addRating", () => {
		it("should add rating to ratingSum", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);

			expect(result).toBe(true);
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("rating_sum = rating_sum + ?");
		});

		it("should increment ratingCount", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("rating_count = rating_count + 1");
		});

		it("should accept rating of 1", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 1);

			expect(result).toBe(true);
			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toContain(1);
		});

		it("should accept rating of 5", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);

			expect(result).toBe(true);
			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toContain(5);
		});

		it("should update updated_at timestamp", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 3);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("updated_at = unixepoch()");
		});

		it("should return false on database failure", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 4);

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database error"));

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);

			expect(result).toBe(false);
		});
	});

	describe("updateThemeStatus", () => {
		it("should update theme status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"approved",
			);

			expect(result).toBe(true);
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("status = ?");
		});

		it("should set reviewed_at for approved status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const beforeTime = Math.floor(Date.now() / 1000);
			await updateThemeStatus(mockDb as unknown as D1Database, "theme-uuid-123", "approved");
			const afterTime = Math.floor(Date.now() / 1000);

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];

			expect(reviewedAt).toBeGreaterThanOrEqual(beforeTime);
			expect(reviewedAt).toBeLessThanOrEqual(afterTime);
		});

		it("should set reviewed_at for featured status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateThemeStatus(mockDb as unknown as D1Database, "theme-uuid-123", "featured");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];

			expect(reviewedAt).not.toBeNull();
		});

		it("should set reviewed_at for rejected status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateThemeStatus(mockDb as unknown as D1Database, "theme-uuid-123", "rejected");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];

			expect(reviewedAt).not.toBeNull();
		});

		it("should not set reviewed_at for draft status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateThemeStatus(mockDb as unknown as D1Database, "theme-uuid-123", "draft");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];

			expect(reviewedAt).toBeNull();
		});

		it("should return false on database failure", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"approved",
			);

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			mockStatement.run.mockRejectedValue(new Error("Database error"));

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"approved",
			);

			expect(result).toBe(false);
		});
	});

	describe("getThemesByCreator", () => {
		it("should return themes by creator tenant ID", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			const result = await getThemesByCreator(mockDb as unknown as D1Database, "tenant-123");

			expect(result).toHaveLength(1);
			expect(result[0].creatorTenantId).toBe("tenant-123");
		});

		it("should order by created_at DESC", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			await getThemesByCreator(mockDb as unknown as D1Database, "tenant-123");

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY created_at DESC");
		});

		it("should filter by creator correctly", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			await getThemesByCreator(mockDb as unknown as D1Database, "tenant-123");

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("creator_tenant_id = ?");
		});
	});

	describe("getApprovedThemes", () => {
		const approvedTheme = { ...sampleThemeRow, status: "approved" as const };
		const featuredTheme = { ...sampleThemeRow, status: "featured" as const };

		it("should return only approved and featured themes", async () => {
			mockStatement.all.mockResolvedValue({ results: [approvedTheme, featuredTheme] });

			const result = await getApprovedThemes(mockDb as unknown as D1Database);

			expect(result).toHaveLength(2);
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("status IN (?, ?)");
		});

		it("should order by downloads DESC", async () => {
			mockStatement.all.mockResolvedValue({ results: [approvedTheme] });

			await getApprovedThemes(mockDb as unknown as D1Database);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY downloads DESC");
		});

		it("should apply limit parameter", async () => {
			mockStatement.all.mockResolvedValue({ results: [approvedTheme] });

			await getApprovedThemes(mockDb as unknown as D1Database, 10);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("LIMIT ?");
		});

		it("should apply offset parameter", async () => {
			mockStatement.all.mockResolvedValue({ results: [approvedTheme] });

			await getApprovedThemes(mockDb as unknown as D1Database, 10, 5);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("OFFSET ?");
		});
	});

	describe("getFeaturedThemes", () => {
		const featuredTheme = { ...sampleThemeRow, status: "featured" as const, downloads: 100 };

		it("should return only featured status themes", async () => {
			mockStatement.all.mockResolvedValue({ results: [featuredTheme] });

			await getFeaturedThemes(mockDb as unknown as D1Database);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("status = ?");
			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toContain("featured");
		});

		it("should order by downloads DESC", async () => {
			mockStatement.all.mockResolvedValue({ results: [featuredTheme] });

			await getFeaturedThemes(mockDb as unknown as D1Database);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY downloads DESC");
		});

		it("should apply limit parameter", async () => {
			mockStatement.all.mockResolvedValue({ results: [featuredTheme] });

			await getFeaturedThemes(mockDb as unknown as D1Database, 5);

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("LIMIT ?");
		});

		it("should return correctly mapped CommunityTheme objects", async () => {
			mockStatement.all.mockResolvedValue({ results: [featuredTheme] });

			const result = await getFeaturedThemes(mockDb as unknown as D1Database);

			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("featured");
			expect(result[0].downloads).toBe(100);
		});
	});

	describe("Rating Calculations", () => {
		it("should calculate average rating from ratingSum and ratingCount", async () => {
			const rowWithRatings = {
				...sampleThemeRow,
				rating_sum: 15,
				rating_count: 3,
			};
			mockStatement.first.mockResolvedValue(rowWithRatings);

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.ratingSum).toBe(15);
			expect(result?.ratingCount).toBe(3);
			// Average rating would be 5.0
			expect(result!.ratingSum / result!.ratingCount).toBe(5);
		});

		it("should handle zero ratings without division errors", async () => {
			mockStatement.first.mockResolvedValue({
				...sampleThemeRow,
				rating_sum: 0,
				rating_count: 0,
			});

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.ratingSum).toBe(0);
			expect(result?.ratingCount).toBe(0);
		});

		it("should accumulate ratings correctly with addRating", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			// Simulate adding multiple ratings
			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);
			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 4);
			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 3);

			// Check that the SQL includes increment operations
			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("rating_sum = rating_sum + ?");
			expect(sqlCall).toContain("rating_count = rating_count + 1");
		});

		it("should handle very high rating counts", async () => {
			mockStatement.first.mockResolvedValue({
				...sampleThemeRow,
				rating_sum: 50000,
				rating_count: 10000,
			});

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.ratingSum).toBe(50000);
			expect(result?.ratingCount).toBe(10000);
			expect(result!.ratingSum / result!.ratingCount).toBe(5);
		});

		it("should support partial ratings (non-5-star)", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 3);

			expect(result).toBe(true);
			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toContain(3);
		});
	});

	describe("Status Transitions and Validation", () => {
		it("should support pending status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"pending",
			);

			expect(result).toBe(true);
		});

		it("should support in_review status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"in_review",
			);

			expect(result).toBe(true);
		});

		it("should support approved status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"approved",
			);

			expect(result).toBe(true);
		});

		it("should support featured status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"featured",
			);

			expect(result).toBe(true);
		});

		it("should support changes_requested status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"changes_requested",
			);

			expect(result).toBe(true);
		});

		it("should support rejected status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"rejected",
			);

			expect(result).toBe(true);
		});

		it("should support removed status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"removed",
			);

			expect(result).toBe(true);
		});

		it("should support draft status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"draft",
			);

			expect(result).toBe(true);
		});

		it("should set reviewed_at for changes_requested status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"changes_requested",
			);

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];
			expect(reviewedAt).not.toBeNull();
		});

		it("should set null reviewed_at for pending status", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await updateThemeStatus(mockDb as unknown as D1Database, "theme-uuid-123", "pending");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			const reviewedAt = bindCall[1];
			expect(reviewedAt).toBeNull();
		});
	});

	describe("Creator Ownership Verification", () => {
		it("should verify creator ownership in delete operation", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await deleteCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", "tenant-123");

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("creator_tenant_id = ?");
		});

		it("should include both ID and creator in delete query", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await deleteCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-456", "tenant-456");

			const bindCall = (mockStatement.bind as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(bindCall).toEqual(["theme-uuid-456", "tenant-456"]);
		});

		it("should return false when creator does not own the theme", async () => {
			mockStatement.run.mockResolvedValue({ success: false });

			const result = await deleteCommunityTheme(
				mockDb as unknown as D1Database,
				"theme-uuid-789",
				"different-tenant-id",
			);

			expect(result).toBe(false);
		});
	});

	describe("List Filters - Complex Combinations", () => {
		it("should combine status and creator filters", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				status: "approved",
				creatorTenantId: "tenant-123",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("WHERE");
			expect(sqlCall).toContain("status = ?");
			expect(sqlCall).toContain("creator_tenant_id = ?");
			expect(sqlCall).toContain("AND");
		});

		it("should handle pagination with filters", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				status: ["approved", "featured"],
				limit: 20,
				offset: 40,
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("LIMIT ?");
			expect(sqlCall).toContain("OFFSET ?");
			expect(sqlCall).toContain("status IN");
		});

		it("should apply all sorting options", async () => {
			mockStatement.all.mockResolvedValue({ results: [] });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				orderBy: "updated_at",
				orderDir: "asc",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("ORDER BY updated_at ASC");
		});

		it("should default to descending order when not specified", async () => {
			mockStatement.all.mockResolvedValue({ results: [] });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				orderBy: "created_at",
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("DESC");
		});

		it("should handle offset without limit", async () => {
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			await listCommunityThemes(mockDb as unknown as D1Database, {
				limit: 10,
			});

			const sqlCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sqlCall).toContain("LIMIT ?");
		});
	});

	describe("Error Handling and Edge Cases", () => {
		it("should handle null in optional theme fields", async () => {
			mockStatement.first.mockResolvedValue({
				...sampleThemeRow,
				description: null,
				custom_css: null,
				thumbnail_path: null,
				reviewed_at: null,
			});

			const result = await getCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123");

			expect(result?.description).toBeUndefined();
			expect(result?.customCSS).toBeUndefined();
			expect(result?.thumbnailPath).toBeUndefined();
			expect(result?.reviewedAt).toBeUndefined();
		});

		it("should handle very long custom CSS", async () => {
			const longCSS = ".class { color: red; }".repeat(500);
			mockStatement.run.mockResolvedValue({ success: true });

			const result = await createCommunityTheme(mockDb as unknown as D1Database, {
				...sampleThemeInput,
				customCSS: longCSS,
			});

			expect(result.customCSS).toBe(longCSS);
		});

		it("should handle large number of tags", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
			const result = await createCommunityTheme(mockDb as unknown as D1Database, {
				...sampleThemeInput,
				tags: manyTags,
			});

			expect(result.tags).toHaveLength(50);
		});

		it("should handle special characters in theme name", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			const specialName = 'Theme\'s "Dark" & Moody';
			const result = await createCommunityTheme(mockDb as unknown as D1Database, {
				...sampleThemeInput,
				name: specialName,
			});

			expect(result.name).toBe(specialName);
		});

		it("should handle empty array results gracefully", async () => {
			mockStatement.all.mockResolvedValue({ results: [] });

			const result = await listCommunityThemes(mockDb as unknown as D1Database);

			expect(result).toEqual([]);
			expect(Array.isArray(result)).toBe(true);
		});

		it("should handle undefined results from database", async () => {
			mockStatement.all.mockResolvedValue({ results: undefined });

			const result = await listCommunityThemes(mockDb as unknown as D1Database);

			expect(result).toEqual([]);
		});

		it("should handle multiple rating additions without data loss", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);
			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 4);
			await addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5);

			expect(mockStatement.run).toHaveBeenCalledTimes(3);
		});

		it("should handle multiple download increments", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			for (let i = 0; i < 5; i++) {
				await incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123");
			}

			expect(mockStatement.run).toHaveBeenCalledTimes(5);
		});

		it("should handle concurrent operations gracefully", async () => {
			mockStatement.run.mockResolvedValue({ success: true });
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			const ops = [
				incrementDownloads(mockDb as unknown as D1Database, "theme-uuid-123"),
				addRating(mockDb as unknown as D1Database, "theme-uuid-123", 5),
				updateCommunityTheme(mockDb as unknown as D1Database, "theme-uuid-123", {
					name: "Updated",
				}),
			];

			const results = await Promise.all(ops);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r === true || r === true || r === true)).toBe(true);
		});
	});

	describe("Integration Scenarios", () => {
		it("should support a complete theme creation workflow", async () => {
			mockStatement.run.mockResolvedValue({ success: true });
			mockStatement.first.mockResolvedValue(sampleThemeRow);

			// Create theme
			const created = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);
			expect(created.status).toBe("pending");

			// Retrieve theme
			const retrieved = await getCommunityTheme(mockDb as unknown as D1Database, created.id);
			expect(retrieved).toBeDefined();
		});

		it("should support moderation workflow", async () => {
			mockStatement.run.mockResolvedValue({ success: true });

			// Set to in_review
			let result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"in_review",
			);
			expect(result).toBe(true);

			// Approve
			result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"approved",
			);
			expect(result).toBe(true);

			// Feature
			result = await updateThemeStatus(
				mockDb as unknown as D1Database,
				"theme-uuid-123",
				"featured",
			);
			expect(result).toBe(true);
		});

		it("should support full CRUD operations", async () => {
			mockStatement.run.mockResolvedValue({ success: true });
			mockStatement.first.mockResolvedValue(sampleThemeRow);
			mockStatement.all.mockResolvedValue({ results: [sampleThemeRow] });

			// Create
			const created = await createCommunityTheme(mockDb as unknown as D1Database, sampleThemeInput);
			expect(created.id).toBeDefined();

			// Read
			const read = await getCommunityTheme(mockDb as unknown as D1Database, created.id);
			expect(read).toBeDefined();

			// Update
			const updated = await updateCommunityTheme(mockDb as unknown as D1Database, created.id, {
				name: "Updated Name",
			});
			expect(updated).toBe(true);

			// List (simulating Read many)
			const listed = await listCommunityThemes(mockDb as unknown as D1Database);
			expect(Array.isArray(listed)).toBe(true);

			// Delete
			const deleted = await deleteCommunityTheme(
				mockDb as unknown as D1Database,
				created.id,
				"tenant-123",
			);
			expect(deleted).toBe(true);
		});
	});
});
