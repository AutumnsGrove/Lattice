/**
 * Guestbook Public Route — Server
 *
 * Loads guestbook config and approved entries for the public page.
 * No auth gate — guestbooks are available to all tiers (Seedling+).
 */

import type { PageServerLoad } from "./$types";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";
import {
	DEFAULT_GUESTBOOK_CONFIG,
	GUESTBOOK_EMOJI,
	VALID_SIGNING_STYLES,
	isValidHexColor,
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
}

interface EntryRow {
	id: string;
	name: string;
	message: string;
	emoji: string | null;
	entry_style: string | null;
	entry_color: string | null;
	created_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(503, SITE_ERRORS.DB_NOT_CONFIGURED, "Site");
	}

	if (!tenantId) {
		throwGroveError(400, SITE_ERRORS.TENANT_CONTEXT_REQUIRED, "Site");
	}

	// Load config
	const config = await db
		.prepare(
			`SELECT enabled, style, entries_per_page, require_approval,
              allow_emoji, max_message_length, custom_prompt,
              wall_backing, cta_style, allowed_styles, color_palette, inline_mode
       FROM guestbook_config WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>();

	if (!config?.enabled) {
		throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
	}

	const entriesPerPage = config.entries_per_page || 20;

	// Fetch entries and count in parallel
	const [entriesResult, total] = await Promise.all([
		db
			.prepare(
				`SELECT id, name, message, emoji, entry_style, entry_color, created_at
         FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 1
         ORDER BY created_at DESC
         LIMIT ?`,
			)
			.bind(tenantId, entriesPerPage)
			.all<EntryRow>()
			.catch(() => ({ results: [] as EntryRow[] })),

		db
			.prepare(
				`SELECT COUNT(*) as total FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 1`,
			)
			.bind(tenantId)
			.first<{ total: number }>()
			.then((r) => r?.total ?? 0)
			.catch(() => 0),
	]);

	const entries = (entriesResult.results ?? []).map((row) => ({
		id: row.id,
		name: row.name,
		message: row.message,
		emoji: row.emoji,
		entryStyle: (row.entry_style as GuestbookSigningStyle) ?? null,
		entryColor: row.entry_color ?? null,
		createdAt: row.created_at,
	}));

	// Parse allowed styles
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

	// Parse color palette
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

	return {
		entries,
		total,
		config: {
			style: config.style || DEFAULT_GUESTBOOK_CONFIG.style,
			entriesPerPage,
			allowEmoji: Boolean(config.allow_emoji),
			maxMessageLength: config.max_message_length || 500,
			customPrompt: config.custom_prompt,
			requireApproval: Boolean(config.require_approval),
			wallBacking: config.wall_backing || DEFAULT_GUESTBOOK_CONFIG.wallBacking,
			ctaStyle: config.cta_style || DEFAULT_GUESTBOOK_CONFIG.ctaStyle,
			allowedStyles,
			colorPalette,
			inlineMode: config.inline_mode || DEFAULT_GUESTBOOK_CONFIG.inlineMode,
		},
		emoji: GUESTBOOK_EMOJI as unknown as string[],
	};
};
