// src/lib/server/theme-loader.ts
// Load theme settings from D1 database

import type { ThemeSettings, ThemeColors, ThemeFonts, ThemeLayout } from "../types.js";

interface ThemeSettingsRow {
	tenant_id: string;
	theme_id: string;
	accent_color: string;
	customizer_enabled: number;
	custom_colors: string | null;
	custom_typography: string | null;
	custom_layout: string | null;
	custom_css: string | null;
	community_theme_id: string | null;
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
 * Convert database row to ThemeSettings
 */
function rowToThemeSettings(row: ThemeSettingsRow): ThemeSettings {
	return {
		tenantId: row.tenant_id,
		themeId: row.theme_id,
		accentColor: row.accent_color,
		customizerEnabled: row.customizer_enabled === 1,
		customColors: parseJsonOrUndefined<Partial<ThemeColors>>(row.custom_colors),
		customTypography: parseJsonOrUndefined<Partial<ThemeFonts>>(row.custom_typography),
		customLayout: parseJsonOrUndefined<Partial<ThemeLayout>>(row.custom_layout),
		customCSS: row.custom_css ?? undefined,
		communityThemeId: row.community_theme_id ?? undefined,
	};
}

/**
 * Load theme settings for a tenant from the database
 */
export async function loadThemeSettings(
	db: D1Database,
	tenantId: string,
): Promise<ThemeSettings | null> {
	const row = await db
		.prepare("SELECT * FROM theme_settings WHERE tenant_id = ?")
		.bind(tenantId)
		.first<ThemeSettingsRow>();

	if (!row) return null;
	return rowToThemeSettings(row);
}

/**
 * Load theme settings with defaults fallback
 */
export async function loadThemeSettingsWithDefaults(
	db: D1Database,
	tenantId: string,
): Promise<ThemeSettings> {
	const settings = await loadThemeSettings(db, tenantId);
	if (settings) return settings;

	// Return default settings using grove[600] as default accent
	return {
		tenantId,
		themeId: "grove",
		accentColor: "#16a34a",
		customizerEnabled: false,
	};
}

/**
 * Check if a tenant has custom theme settings
 */
export async function hasThemeSettings(db: D1Database, tenantId: string): Promise<boolean> {
	const result = await db
		.prepare("SELECT 1 FROM theme_settings WHERE tenant_id = ? LIMIT 1")
		.bind(tenantId)
		.first();
	return result !== null;
}

// Type declaration for Cloudflare D1
declare global {
	interface D1Database {
		prepare(query: string): D1PreparedStatement;
		batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	}

	interface D1PreparedStatement {
		bind(...values: unknown[]): D1PreparedStatement;
		first<T = unknown>(): Promise<T | null>;
		all<T = unknown>(): Promise<D1Result<T>>;
		run(): Promise<D1Result>;
	}

	interface D1Result<T = unknown> {
		results?: T[];
		success: boolean;
		meta: object;
	}
}
