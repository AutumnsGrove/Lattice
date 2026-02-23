/**
 * Guestbook Curio API — Config (Admin)
 *
 * GET  — Fetch guestbook config
 * POST — Update guestbook config
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	DEFAULT_GUESTBOOK_CONFIG,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch config
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const config = await db
		.prepare(
			`SELECT enabled, style, entries_per_page, require_approval,
              allow_emoji, max_message_length, custom_prompt,
              wall_backing, cta_style, allowed_styles, color_palette, inline_mode,
              updated_at
       FROM guestbook_config WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>();

	if (!config) {
		return json({ config: DEFAULT_GUESTBOOK_CONFIG });
	}

	let parsedAllowedStyles: GuestbookSigningStyle[] | null = null;
	try {
		if (config.allowed_styles) {
			const arr = JSON.parse(config.allowed_styles);
			if (Array.isArray(arr)) {
				parsedAllowedStyles = arr.filter((s: string) =>
					VALID_SIGNING_STYLES.includes(s as GuestbookSigningStyle),
				) as GuestbookSigningStyle[];
			}
		}
	} catch {
		/* invalid JSON — treat as null */
	}

	let parsedColorPalette: string[] | null = null;
	try {
		if (config.color_palette) {
			const arr = JSON.parse(config.color_palette);
			if (Array.isArray(arr)) {
				parsedColorPalette = arr.filter((c: string) => isValidHexColor(c));
			}
		}
	} catch {
		/* invalid JSON — treat as null */
	}

	return json({
		config: {
			enabled: Boolean(config.enabled),
			style: config.style,
			entriesPerPage: config.entries_per_page,
			requireApproval: Boolean(config.require_approval),
			allowEmoji: Boolean(config.allow_emoji),
			maxMessageLength: config.max_message_length,
			customPrompt: config.custom_prompt,
			wallBacking: config.wall_backing || DEFAULT_GUESTBOOK_CONFIG.wallBacking,
			ctaStyle: config.cta_style || DEFAULT_GUESTBOOK_CONFIG.ctaStyle,
			allowedStyles: parsedAllowedStyles,
			colorPalette: parsedColorPalette,
			inlineMode: config.inline_mode || DEFAULT_GUESTBOOK_CONFIG.inlineMode,
			updatedAt: config.updated_at,
		},
	});
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Update config
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	// Validate style
	const validStyles = ["cozy", "classic", "modern", "pixel"];
	const style = validStyles.includes(body.style as string)
		? (body.style as string)
		: DEFAULT_GUESTBOOK_CONFIG.style;

	// Validate entries per page (10-100)
	const entriesPerPage = Math.max(10, Math.min(100, parseInt(String(body.entriesPerPage)) || 20));

	// Validate max message length (50-2000)
	const maxMessageLength = Math.max(
		50,
		Math.min(2000, parseInt(String(body.maxMessageLength)) || 500),
	);

	// Validate new config fields
	const wallBacking = VALID_WALL_BACKINGS.includes(body.wallBacking as GuestbookWallBacking)
		? (body.wallBacking as string)
		: DEFAULT_GUESTBOOK_CONFIG.wallBacking;

	const ctaStyle = VALID_CTA_STYLES.includes(body.ctaStyle as GuestbookCtaStyle)
		? (body.ctaStyle as string)
		: DEFAULT_GUESTBOOK_CONFIG.ctaStyle;

	const inlineMode = VALID_INLINE_MODES.includes(body.inlineMode as GuestbookInlineMode)
		? (body.inlineMode as string)
		: DEFAULT_GUESTBOOK_CONFIG.inlineMode;

	// Validate allowed styles — JSON array of signing style names
	let allowedStylesJson: string | null = null;
	if (Array.isArray(body.allowedStyles) && body.allowedStyles.length > 0) {
		const valid = (body.allowedStyles as string[]).filter((s) =>
			VALID_SIGNING_STYLES.includes(s as GuestbookSigningStyle),
		);
		if (valid.length > 0) {
			allowedStylesJson = JSON.stringify(valid);
		}
	}

	// Validate color palette — JSON array of hex colors
	let colorPaletteJson: string | null = null;
	if (Array.isArray(body.colorPalette) && body.colorPalette.length > 0) {
		const valid = (body.colorPalette as string[]).filter((c) => isValidHexColor(c));
		if (valid.length > 0) {
			colorPaletteJson = JSON.stringify(valid);
		}
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
				body.enabled ? 1 : 0,
				style,
				entriesPerPage,
				body.requireApproval ? 1 : 0,
				body.allowEmoji ? 1 : 0,
				maxMessageLength,
				typeof body.customPrompt === "string" ? body.customPrompt.trim() || null : null,
				wallBacking,
				ctaStyle,
				allowedStylesJson,
				colorPaletteJson,
				inlineMode,
			)
			.run();
	} catch (err) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Guestbook config save failed",
			cause: err,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}

	return json({ success: true });
};
