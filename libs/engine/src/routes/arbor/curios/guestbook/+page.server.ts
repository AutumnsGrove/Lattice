import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
	DEFAULT_GUESTBOOK_CONFIG,
	GUESTBOOK_STYLE_OPTIONS,
	GUESTBOOK_WALL_BACKINGS,
	GUESTBOOK_SIGNING_STYLES,
	DEFAULT_COLOR_PALETTE,
	VALID_WALL_BACKINGS,
	VALID_CTA_STYLES,
	VALID_INLINE_MODES,
	VALID_SIGNING_STYLES,
	isValidHexColor,
	type GuestbookWallBacking,
	type GuestbookCtaStyle,
	type GuestbookInlineMode,
	type GuestbookSigningStyle,
} from "$lib/curios/guestbook";

interface ConfigRow {
	enabled: number;
	style: string;
	entries_per_page: number;
	require_approval: number;
	allow_emoji: number;
	max_message_length: number;
	custom_prompt: string | null;
	wall_backing: string | null;
	cta_style: string | null;
	allowed_styles: string | null;
	color_palette: string | null;
	inline_mode: string | null;
	updated_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			config: null,
			stats: { totalEntries: 0, pendingEntries: 0, approvedEntries: 0 },
			styleOptions: GUESTBOOK_STYLE_OPTIONS,
			error: "Database not available",
		};
	}

	// PERFORMANCE: Run config and all counts in parallel
	const [config, totalEntries, pendingEntries, approvedEntries] = await Promise.all([
		db
			.prepare(
				`SELECT enabled, style, entries_per_page, require_approval,
                allow_emoji, max_message_length, custom_prompt,
                wall_backing, cta_style, allowed_styles, color_palette, inline_mode,
                updated_at
         FROM guestbook_config WHERE tenant_id = ?`,
			)
			.bind(tenantId)
			.first<ConfigRow>(),

		db
			.prepare(`SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch(() => 0),

		db
			.prepare(
				`SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ? AND approved = 0`,
			)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch(() => 0),

		db
			.prepare(
				`SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ? AND approved = 1`,
			)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch(() => 0),
	]);

	let parsedConfig = null;
	if (config) {
		let allowedStyles: GuestbookSigningStyle[] | null = null;
		try {
			if (config.allowed_styles) {
				const arr = JSON.parse(config.allowed_styles);
				if (Array.isArray(arr)) {
					allowedStyles = arr.filter((s: string) =>
						VALID_SIGNING_STYLES.includes(s as GuestbookSigningStyle),
					) as GuestbookSigningStyle[];
				}
			}
		} catch {
			/* invalid JSON */
		}

		let colorPalette: string[] | null = null;
		try {
			if (config.color_palette) {
				const arr = JSON.parse(config.color_palette);
				if (Array.isArray(arr)) {
					colorPalette = arr.filter((c: string) => isValidHexColor(c));
				}
			}
		} catch {
			/* invalid JSON */
		}

		parsedConfig = {
			enabled: Boolean(config.enabled),
			style: config.style,
			entriesPerPage: config.entries_per_page,
			requireApproval: Boolean(config.require_approval),
			allowEmoji: Boolean(config.allow_emoji),
			maxMessageLength: config.max_message_length,
			customPrompt: config.custom_prompt,
			wallBacking: config.wall_backing || DEFAULT_GUESTBOOK_CONFIG.wallBacking,
			ctaStyle: config.cta_style || DEFAULT_GUESTBOOK_CONFIG.ctaStyle,
			allowedStyles,
			colorPalette,
			inlineMode: config.inline_mode || DEFAULT_GUESTBOOK_CONFIG.inlineMode,
			updatedAt: config.updated_at,
		};
	}

	return {
		config: parsedConfig || DEFAULT_GUESTBOOK_CONFIG,
		stats: {
			totalEntries,
			pendingEntries,
			approvedEntries,
		},
		styleOptions: GUESTBOOK_STYLE_OPTIONS,
		wallBackingOptions: GUESTBOOK_WALL_BACKINGS,
		signingStyleOptions: GUESTBOOK_SIGNING_STYLES,
		defaultColorPalette: DEFAULT_COLOR_PALETTE,
	};
};

export const actions: Actions = {
	save: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();

		const enabled = formData.get("enabled") === "true";
		const style = formData.get("style") as string;
		const entriesPerPage = parseInt(formData.get("entriesPerPage") as string) || 20;
		const requireApproval = formData.get("requireApproval") === "true";
		const allowEmoji = formData.get("allowEmoji") === "true";
		const maxMessageLength = parseInt(formData.get("maxMessageLength") as string) || 500;
		const customPrompt = formData.get("customPrompt") as string | null;

		// New enhancement fields
		const wallBacking = formData.get("wallBacking") as string;
		const ctaStyle = formData.get("ctaStyle") as string;
		const inlineMode = formData.get("inlineMode") as string;
		const allowedStylesRaw = formData.get("allowedStyles") as string | null;
		const colorPaletteRaw = formData.get("colorPalette") as string | null;

		// Validate existing fields
		const validStyles = ["cozy", "classic", "modern", "pixel"];
		const finalStyle = validStyles.includes(style) ? style : DEFAULT_GUESTBOOK_CONFIG.style;
		const validEntriesPerPage = Math.max(10, Math.min(100, entriesPerPage));
		const validMaxMessageLength = Math.max(50, Math.min(2000, maxMessageLength));

		// Validate new fields
		const finalWallBacking = VALID_WALL_BACKINGS.includes(wallBacking as GuestbookWallBacking)
			? wallBacking
			: DEFAULT_GUESTBOOK_CONFIG.wallBacking;
		const finalCtaStyle = VALID_CTA_STYLES.includes(ctaStyle as GuestbookCtaStyle)
			? ctaStyle
			: DEFAULT_GUESTBOOK_CONFIG.ctaStyle;
		const finalInlineMode = VALID_INLINE_MODES.includes(inlineMode as GuestbookInlineMode)
			? inlineMode
			: DEFAULT_GUESTBOOK_CONFIG.inlineMode;

		// Parse allowed styles JSON
		let allowedStylesJson: string | null = null;
		try {
			if (allowedStylesRaw) {
				const arr = JSON.parse(allowedStylesRaw);
				if (Array.isArray(arr) && arr.length > 0) {
					const valid = arr.filter((s: string) =>
						VALID_SIGNING_STYLES.includes(s as GuestbookSigningStyle),
					);
					if (valid.length > 0) allowedStylesJson = JSON.stringify(valid);
				}
			}
		} catch {
			/* invalid JSON — treat as null */
		}

		// Parse color palette JSON
		let colorPaletteJson: string | null = null;
		try {
			if (colorPaletteRaw) {
				const arr = JSON.parse(colorPaletteRaw);
				if (Array.isArray(arr) && arr.length > 0) {
					const valid = arr.filter((c: string) => isValidHexColor(c));
					if (valid.length > 0) colorPaletteJson = JSON.stringify(valid);
				}
			}
		} catch {
			/* invalid JSON — treat as null */
		}

		try {
			await db
				.prepare(
					`INSERT INTO guestbook_config (
             tenant_id, enabled, style, entries_per_page, require_approval,
             allow_emoji, max_message_length, custom_prompt,
             wall_backing, cta_style, allowed_styles, color_palette, inline_mode,
             updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             enabled = excluded.enabled,
             style = excluded.style,
             entries_per_page = excluded.entries_per_page,
             require_approval = excluded.require_approval,
             allow_emoji = excluded.allow_emoji,
             max_message_length = excluded.max_message_length,
             custom_prompt = excluded.custom_prompt,
             wall_backing = excluded.wall_backing,
             cta_style = excluded.cta_style,
             allowed_styles = excluded.allowed_styles,
             color_palette = excluded.color_palette,
             inline_mode = excluded.inline_mode,
             updated_at = datetime('now')`,
				)
				.bind(
					tenantId,
					enabled ? 1 : 0,
					finalStyle,
					validEntriesPerPage,
					requireApproval ? 1 : 0,
					allowEmoji ? 1 : 0,
					validMaxMessageLength,
					customPrompt?.trim() || null,
					finalWallBacking,
					finalCtaStyle,
					allowedStylesJson,
					colorPaletteJson,
					finalInlineMode,
				)
				.run();

			return { success: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},
};
