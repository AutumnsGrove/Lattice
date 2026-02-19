// src/lib/server/community-themes.ts
// CRUD operations for community themes in D1 database

import type {
	CommunityTheme,
	CommunityThemeStatus,
	ThemeColors,
	ThemeFonts,
	ThemeLayout,
} from "../types.js";

interface CommunityThemeRow {
	id: string;
	creator_tenant_id: string;
	name: string;
	description: string | null;
	tags: string | null;
	base_theme: string;
	custom_colors: string | null;
	custom_typography: string | null;
	custom_layout: string | null;
	custom_css: string | null;
	thumbnail_path: string | null;
	downloads: number;
	rating_sum: number;
	rating_count: number;
	status: CommunityThemeStatus;
	reviewed_at: number | null;
	created_at: number;
	updated_at: number;
}

/**
 * Parse JSON safely with fallback to undefined
 */
function parseJsonOrUndefined<T>(json: string | null): T | undefined {
	if (!json) return undefined;
	try {
		return JSON.parse(json) as T;
	} catch {
		return undefined;
	}
}

/**
 * Serialize value to JSON or null
 */
function toJsonOrNull(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value === "object" && Object.keys(value).length === 0) return null;
	return JSON.stringify(value);
}

/**
 * Convert database row to CommunityTheme
 */
function rowToCommunityTheme(row: CommunityThemeRow): CommunityTheme {
	return {
		id: row.id,
		creatorTenantId: row.creator_tenant_id,
		name: row.name,
		description: row.description ?? undefined,
		tags: parseJsonOrUndefined<string[]>(row.tags),
		baseTheme: row.base_theme,
		customColors: parseJsonOrUndefined<Partial<ThemeColors>>(row.custom_colors),
		customTypography: parseJsonOrUndefined<Partial<ThemeFonts>>(row.custom_typography),
		customLayout: parseJsonOrUndefined<Partial<ThemeLayout>>(row.custom_layout),
		customCSS: row.custom_css ?? undefined,
		thumbnailPath: row.thumbnail_path ?? undefined,
		downloads: row.downloads,
		ratingSum: row.rating_sum,
		ratingCount: row.rating_count,
		status: row.status,
		reviewedAt: row.reviewed_at ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Create a new community theme
 */
export async function createCommunityTheme(
	db: D1Database,
	theme: Omit<
		CommunityTheme,
		"id" | "downloads" | "ratingSum" | "ratingCount" | "status" | "createdAt" | "updatedAt"
	>,
): Promise<CommunityTheme> {
	try {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		const result = await db
			.prepare(
				`INSERT INTO community_themes (
					id,
					creator_tenant_id,
					name,
					description,
					tags,
					base_theme,
					custom_colors,
					custom_typography,
					custom_layout,
					custom_css,
					thumbnail_path,
					downloads,
					rating_sum,
					rating_count,
					status,
					reviewed_at,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'pending', ?, ?, ?)`,
			)
			.bind(
				id,
				theme.creatorTenantId,
				theme.name,
				theme.description ?? null,
				toJsonOrNull(theme.tags),
				theme.baseTheme,
				toJsonOrNull(theme.customColors),
				toJsonOrNull(theme.customTypography),
				toJsonOrNull(theme.customLayout),
				theme.customCSS ?? null,
				theme.thumbnailPath ?? null,
				theme.reviewedAt ?? null,
				now,
				now,
			)
			.run();

		if (!result.success) {
			throw new Error("Failed to create community theme");
		}

		// Return the created theme
		return {
			id,
			creatorTenantId: theme.creatorTenantId,
			name: theme.name,
			description: theme.description,
			tags: theme.tags,
			baseTheme: theme.baseTheme,
			customColors: theme.customColors,
			customTypography: theme.customTypography,
			customLayout: theme.customLayout,
			customCSS: theme.customCSS,
			thumbnailPath: theme.thumbnailPath,
			downloads: 0,
			ratingSum: 0,
			ratingCount: 0,
			status: "pending",
			reviewedAt: theme.reviewedAt,
			createdAt: now,
			updatedAt: now,
		};
	} catch (error) {
		console.error("Failed to create community theme:", error);
		throw error;
	}
}

/**
 * Get a community theme by ID
 */
export async function getCommunityTheme(
	db: D1Database,
	themeId: string,
): Promise<CommunityTheme | null> {
	try {
		const row = await db
			.prepare("SELECT * FROM community_themes WHERE id = ?")
			.bind(themeId)
			.first<CommunityThemeRow>();

		if (!row) return null;
		return rowToCommunityTheme(row);
	} catch (error) {
		console.error("Failed to get community theme:", error);
		return null;
	}
}

/**
 * Update a community theme
 */
export async function updateCommunityTheme(
	db: D1Database,
	themeId: string,
	updates: Partial<Omit<CommunityTheme, "id" | "creatorTenantId" | "createdAt">>,
): Promise<boolean> {
	try {
		// Build dynamic SQL update statement
		const fields: string[] = [];
		const values: unknown[] = [];

		if (updates.name !== undefined) {
			fields.push("name = ?");
			values.push(updates.name);
		}
		if (updates.description !== undefined) {
			fields.push("description = ?");
			values.push(updates.description ?? null);
		}
		if (updates.tags !== undefined) {
			fields.push("tags = ?");
			values.push(toJsonOrNull(updates.tags));
		}
		if (updates.baseTheme !== undefined) {
			fields.push("base_theme = ?");
			values.push(updates.baseTheme);
		}
		if (updates.customColors !== undefined) {
			fields.push("custom_colors = ?");
			values.push(toJsonOrNull(updates.customColors));
		}
		if (updates.customTypography !== undefined) {
			fields.push("custom_typography = ?");
			values.push(toJsonOrNull(updates.customTypography));
		}
		if (updates.customLayout !== undefined) {
			fields.push("custom_layout = ?");
			values.push(toJsonOrNull(updates.customLayout));
		}
		if (updates.customCSS !== undefined) {
			fields.push("custom_css = ?");
			values.push(updates.customCSS ?? null);
		}
		if (updates.thumbnailPath !== undefined) {
			fields.push("thumbnail_path = ?");
			values.push(updates.thumbnailPath ?? null);
		}
		if (updates.downloads !== undefined) {
			fields.push("downloads = ?");
			values.push(updates.downloads);
		}
		if (updates.ratingSum !== undefined) {
			fields.push("rating_sum = ?");
			values.push(updates.ratingSum);
		}
		if (updates.ratingCount !== undefined) {
			fields.push("rating_count = ?");
			values.push(updates.ratingCount);
		}
		if (updates.status !== undefined) {
			fields.push("status = ?");
			values.push(updates.status);
		}
		if (updates.reviewedAt !== undefined) {
			fields.push("reviewed_at = ?");
			values.push(updates.reviewedAt ?? null);
		}

		// Always update updated_at
		fields.push("updated_at = unixepoch()");

		if (fields.length === 1) {
			// Only updated_at would be updated, nothing to do
			return true;
		}

		// Add themeId as the last parameter for WHERE clause
		values.push(themeId);

		const sql = `UPDATE community_themes SET ${fields.join(", ")} WHERE id = ?`;
		const result = await db
			.prepare(sql)
			.bind(...values)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to update community theme:", error);
		return false;
	}
}

/**
 * Delete a community theme (only by creator)
 */
export async function deleteCommunityTheme(
	db: D1Database,
	themeId: string,
	creatorTenantId: string,
): Promise<boolean> {
	try {
		const result = await db
			.prepare("DELETE FROM community_themes WHERE id = ? AND creator_tenant_id = ?")
			.bind(themeId, creatorTenantId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to delete community theme:", error);
		return false;
	}
}

/**
 * List community themes with filtering and pagination
 */
export async function listCommunityThemes(
	db: D1Database,
	options: {
		status?: CommunityThemeStatus | CommunityThemeStatus[];
		creatorTenantId?: string;
		limit?: number;
		offset?: number;
		orderBy?: "downloads" | "rating" | "created_at" | "updated_at";
		orderDir?: "asc" | "desc";
	} = {},
): Promise<CommunityTheme[]> {
	try {
		const conditions: string[] = [];
		const values: unknown[] = [];

		// Filter by status
		if (options.status) {
			if (Array.isArray(options.status)) {
				const placeholders = options.status.map(() => "?").join(", ");
				conditions.push(`status IN (${placeholders})`);
				values.push(...options.status);
			} else {
				conditions.push("status = ?");
				values.push(options.status);
			}
		}

		// Filter by creator
		if (options.creatorTenantId) {
			conditions.push("creator_tenant_id = ?");
			values.push(options.creatorTenantId);
		}

		// Build WHERE clause
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		// Build ORDER BY clause
		let orderByClause = "ORDER BY created_at DESC"; // Default
		if (options.orderBy) {
			const orderDir = options.orderDir?.toUpperCase() === "ASC" ? "ASC" : "DESC";
			switch (options.orderBy) {
				case "downloads":
					orderByClause = `ORDER BY downloads ${orderDir}`;
					break;
				case "rating":
					// Order by average rating (handle division by zero)
					orderByClause = `ORDER BY CASE WHEN rating_count > 0 THEN CAST(rating_sum AS REAL) / rating_count ELSE 0 END ${orderDir}`;
					break;
				case "created_at":
					orderByClause = `ORDER BY created_at ${orderDir}`;
					break;
				case "updated_at":
					orderByClause = `ORDER BY updated_at ${orderDir}`;
					break;
			}
		}

		// Build LIMIT/OFFSET clause
		let limitClause = "";
		if (options.limit !== undefined) {
			limitClause = `LIMIT ?`;
			values.push(options.limit);
			if (options.offset !== undefined) {
				limitClause += ` OFFSET ?`;
				values.push(options.offset);
			}
		}

		const sql = `SELECT * FROM community_themes ${whereClause} ${orderByClause} ${limitClause}`;
		const result = await db
			.prepare(sql)
			.bind(...values)
			.all<CommunityThemeRow>();

		if (!result.results) return [];
		return result.results.map(rowToCommunityTheme);
	} catch (error) {
		console.error("Failed to list community themes:", error);
		return [];
	}
}

/**
 * Increment download count for a theme
 */
export async function incrementDownloads(db: D1Database, themeId: string): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				"UPDATE community_themes SET downloads = downloads + 1, updated_at = unixepoch() WHERE id = ?",
			)
			.bind(themeId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to increment downloads:", error);
		return false;
	}
}

/**
 * Add a rating to a theme
 */
export async function addRating(
	db: D1Database,
	themeId: string,
	rating: 1 | 2 | 3 | 4 | 5,
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				`UPDATE community_themes
				SET rating_sum = rating_sum + ?,
					rating_count = rating_count + 1,
					updated_at = unixepoch()
				WHERE id = ?`,
			)
			.bind(rating, themeId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to add rating:", error);
		return false;
	}
}

/**
 * Update theme status (for moderation)
 */
export async function updateThemeStatus(
	db: D1Database,
	themeId: string,
	status: CommunityThemeStatus,
): Promise<boolean> {
	try {
		const reviewedAt = ["approved", "featured", "rejected", "changes_requested"].includes(status)
			? Math.floor(Date.now() / 1000)
			: null;

		const result = await db
			.prepare(
				"UPDATE community_themes SET status = ?, reviewed_at = ?, updated_at = unixepoch() WHERE id = ?",
			)
			.bind(status, reviewedAt, themeId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to update theme status:", error);
		return false;
	}
}

/**
 * Get all themes by a specific creator
 */
export async function getThemesByCreator(
	db: D1Database,
	creatorTenantId: string,
): Promise<CommunityTheme[]> {
	return listCommunityThemes(db, {
		creatorTenantId,
		orderBy: "created_at",
		orderDir: "desc",
	});
}

/**
 * Get approved themes with pagination
 */
export async function getApprovedThemes(
	db: D1Database,
	limit?: number,
	offset?: number,
): Promise<CommunityTheme[]> {
	return listCommunityThemes(db, {
		status: ["approved", "featured"],
		limit,
		offset,
		orderBy: "downloads",
		orderDir: "desc",
	});
}

/**
 * Get featured themes
 */
export async function getFeaturedThemes(db: D1Database, limit?: number): Promise<CommunityTheme[]> {
	return listCommunityThemes(db, {
		status: "featured",
		limit,
		orderBy: "downloads",
		orderDir: "desc",
	});
}
