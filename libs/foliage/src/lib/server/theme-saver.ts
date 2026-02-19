// src/lib/server/theme-saver.ts
// Save theme settings to D1 database

import type { ThemeSettings } from "../types.js";

/**
 * Serialize value to JSON or null
 */
function toJsonOrNull(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value === "object" && Object.keys(value).length === 0) return null;
	return JSON.stringify(value);
}

/**
 * Save or update theme settings for a tenant (upsert)
 */
export async function saveThemeSettings(db: D1Database, settings: ThemeSettings): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				`INSERT INTO theme_settings (
					tenant_id,
					theme_id,
					accent_color,
					customizer_enabled,
					custom_colors,
					custom_typography,
					custom_layout,
					custom_css,
					community_theme_id,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
				ON CONFLICT(tenant_id) DO UPDATE SET
					theme_id = excluded.theme_id,
					accent_color = excluded.accent_color,
					customizer_enabled = excluded.customizer_enabled,
					custom_colors = excluded.custom_colors,
					custom_typography = excluded.custom_typography,
					custom_layout = excluded.custom_layout,
					custom_css = excluded.custom_css,
					community_theme_id = excluded.community_theme_id,
					updated_at = unixepoch()`,
			)
			.bind(
				settings.tenantId,
				settings.themeId,
				settings.accentColor,
				settings.customizerEnabled ? 1 : 0,
				toJsonOrNull(settings.customColors),
				toJsonOrNull(settings.customTypography),
				toJsonOrNull(settings.customLayout),
				settings.customCSS ?? null,
				settings.communityThemeId ?? null,
			)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to save theme settings:", error);
		return false;
	}
}

/**
 * Update only the accent color for a tenant
 */
export async function updateAccentColor(
	db: D1Database,
	tenantId: string,
	accentColor: string,
): Promise<boolean> {
	try {
		// First try to update existing row
		const updateResult = await db
			.prepare(
				"UPDATE theme_settings SET accent_color = ?, updated_at = unixepoch() WHERE tenant_id = ?",
			)
			.bind(accentColor, tenantId)
			.run();

		// If no rows were updated, insert a new row with defaults
		if (
			updateResult.meta &&
			typeof updateResult.meta === "object" &&
			"changes" in updateResult.meta
		) {
			if ((updateResult.meta as { changes: number }).changes === 0) {
				const insertResult = await db
					.prepare(
						`INSERT INTO theme_settings (tenant_id, accent_color, updated_at)
						VALUES (?, ?, unixepoch())`,
					)
					.bind(tenantId, accentColor)
					.run();
				return insertResult.success;
			}
		}

		return updateResult.success;
	} catch (error) {
		console.error("Failed to update accent color:", error);
		return false;
	}
}

/**
 * Update only the theme ID for a tenant
 */
export async function updateThemeId(
	db: D1Database,
	tenantId: string,
	themeId: string,
): Promise<boolean> {
	try {
		// First try to update existing row
		const updateResult = await db
			.prepare(
				"UPDATE theme_settings SET theme_id = ?, updated_at = unixepoch() WHERE tenant_id = ?",
			)
			.bind(themeId, tenantId)
			.run();

		// If no rows were updated, insert a new row with defaults
		if (
			updateResult.meta &&
			typeof updateResult.meta === "object" &&
			"changes" in updateResult.meta
		) {
			if ((updateResult.meta as { changes: number }).changes === 0) {
				const insertResult = await db
					.prepare(
						`INSERT INTO theme_settings (tenant_id, theme_id, updated_at)
						VALUES (?, ?, unixepoch())`,
					)
					.bind(tenantId, themeId)
					.run();
				return insertResult.success;
			}
		}

		return updateResult.success;
	} catch (error) {
		console.error("Failed to update theme ID:", error);
		return false;
	}
}

/**
 * Update custom colors for a tenant
 */
export async function updateCustomColors(
	db: D1Database,
	tenantId: string,
	customColors: ThemeSettings["customColors"],
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				"UPDATE theme_settings SET custom_colors = ?, updated_at = unixepoch() WHERE tenant_id = ?",
			)
			.bind(toJsonOrNull(customColors), tenantId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to update custom colors:", error);
		return false;
	}
}

/**
 * Update custom CSS for a tenant
 */
export async function updateCustomCSS(
	db: D1Database,
	tenantId: string,
	customCSS: string | null,
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				"UPDATE theme_settings SET custom_css = ?, updated_at = unixepoch() WHERE tenant_id = ?",
			)
			.bind(customCSS, tenantId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to update custom CSS:", error);
		return false;
	}
}

/**
 * Enable or disable customizer for a tenant
 */
export async function setCustomizerEnabled(
	db: D1Database,
	tenantId: string,
	enabled: boolean,
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				"UPDATE theme_settings SET customizer_enabled = ?, updated_at = unixepoch() WHERE tenant_id = ?",
			)
			.bind(enabled ? 1 : 0, tenantId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to update customizer enabled:", error);
		return false;
	}
}

/**
 * Reset theme settings to defaults (delete the row)
 */
export async function resetThemeSettings(db: D1Database, tenantId: string): Promise<boolean> {
	try {
		const result = await db
			.prepare("DELETE FROM theme_settings WHERE tenant_id = ?")
			.bind(tenantId)
			.run();

		return result.success;
	} catch (error) {
		console.error("Failed to reset theme settings:", error);
		return false;
	}
}

/**
 * Delete all theme settings (use with caution)
 */
export async function deleteThemeSettings(db: D1Database, tenantId: string): Promise<boolean> {
	return resetThemeSettings(db, tenantId);
}
