/**
 * Guestbook Curio API — Public Endpoints
 *
 * GET  — Fetch approved entries (paginated)
 * POST — Submit a new entry (rate-limited, public)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	generateGuestbookId,
	sanitizeName,
	sanitizeMessage,
	isValidEmoji,
	isValidHexColor,
	isSpam,
	getRandomSigningStyle,
	getRandomColor,
	RATE_LIMIT_MINUTES,
	VALID_SIGNING_STYLES,
	type GuestbookDisplayEntry,
	type GuestbookSigningStyle,
} from "$lib/curios/guestbook";

interface ConfigRow {
	enabled: number;
	require_approval: number;
	allow_emoji: number;
	max_message_length: number;
	entries_per_page: number;
	allowed_styles: string | null;
	color_palette: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch approved entries (public, paginated)
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Check if guestbook is enabled
	const config = await db
		.prepare(`SELECT enabled, entries_per_page FROM guestbook_config WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<{ enabled: number; entries_per_page: number }>();

	if (!config?.enabled) {
		throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
	}

	const perPage = config.entries_per_page || 20;
	const limit = Math.min(
		Math.max(1, parseInt(url.searchParams.get("limit") ?? String(perPage)) || perPage),
		100,
	);
	const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0") || 0);

	// Fetch approved entries and count in parallel
	const [entriesResult, total] = await Promise.all([
		db
			.prepare(
				`SELECT id, name, message, emoji, entry_style, entry_color, created_at
         FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 1
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
			)
			.bind(tenantId, limit, offset)
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

	const entries: GuestbookDisplayEntry[] = (entriesResult.results ?? []).map((row) => ({
		id: row.id,
		name: row.name,
		message: row.message,
		emoji: row.emoji,
		entryStyle: (row.entry_style as GuestbookSigningStyle) ?? null,
		entryColor: row.entry_color ?? null,
		createdAt: row.created_at,
	}));

	return json(
		{
			entries,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + entries.length < total,
			},
		},
		{
			headers: {
				"Cache-Control": "public, max-age=30, stale-while-revalidate=60",
			},
		},
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Submit a new entry (public, rate-limited)
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

	// Load config
	const config = await db
		.prepare(
			`SELECT enabled, require_approval, allow_emoji, max_message_length,
              allowed_styles, color_palette
       FROM guestbook_config WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>();

	if (!config?.enabled) {
		throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
	}

	// Parse request body
	let body: {
		name?: string;
		message?: string;
		emoji?: string;
		entryStyle?: string;
		entryColor?: string;
	};
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	// Validate message (required)
	const message = sanitizeMessage(body.message ?? "", config.max_message_length || 500);
	if (!message) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// Spam check
	if (isSpam(message)) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	// Sanitize name
	const name = sanitizeName(body.name);

	// Validate emoji (optional)
	let emoji: string | null = null;
	if (body.emoji && config.allow_emoji) {
		if (isValidEmoji(body.emoji)) {
			emoji = body.emoji;
		}
		// Silently ignore invalid emoji — not an error
	}

	// Parse tenant's allowed styles and color palette
	let allowedStyles: GuestbookSigningStyle[] | null = null;
	try {
		if (config.allowed_styles) {
			const parsed = JSON.parse(config.allowed_styles);
			if (Array.isArray(parsed) && parsed.length > 0) {
				allowedStyles = parsed.filter((s: string) =>
					VALID_SIGNING_STYLES.includes(s as GuestbookSigningStyle),
				) as GuestbookSigningStyle[];
			}
		}
	} catch {
		// Invalid JSON — treat as null (all styles allowed)
	}

	let colorPalette: string[] | null = null;
	try {
		if (config.color_palette) {
			const parsed = JSON.parse(config.color_palette);
			if (Array.isArray(parsed) && parsed.length > 0) {
				colorPalette = parsed.filter((c: string) => isValidHexColor(c));
			}
		}
	} catch {
		// Invalid JSON — treat as null (default palette)
	}

	// Validate entry style (optional — assign random if not provided)
	let entryStyle: GuestbookSigningStyle;
	if (body.entryStyle && VALID_SIGNING_STYLES.includes(body.entryStyle as GuestbookSigningStyle)) {
		const requested = body.entryStyle as GuestbookSigningStyle;
		// Check against tenant's allowed styles
		if (!allowedStyles || allowedStyles.includes(requested)) {
			entryStyle = requested;
		} else {
			entryStyle = getRandomSigningStyle(allowedStyles);
		}
	} else {
		entryStyle = getRandomSigningStyle(allowedStyles);
	}

	// Validate entry color (optional — assign random if not provided)
	let entryColor: string;
	if (body.entryColor && isValidHexColor(body.entryColor)) {
		// Check against tenant's color palette
		if (!colorPalette || colorPalette.includes(body.entryColor)) {
			entryColor = body.entryColor;
		} else {
			entryColor = getRandomColor(colorPalette);
		}
	} else {
		entryColor = getRandomColor(colorPalette);
	}

	// Rate limiting via IP hash
	const clientIp =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		"unknown";

	let ipHash: string | null = null;
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(clientIp + tenantId);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		ipHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	} catch {
		// Fallback: simple deterministic hash so rate limiting still works
		let hash = 0;
		const raw = clientIp + tenantId;
		for (let i = 0; i < raw.length; i++) {
			hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
		}
		ipHash = `fallback_${Math.abs(hash).toString(16)}`;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "IP hash crypto failed, using fallback hash",
		});
	}

	if (ipHash) {
		const cutoff = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();

		try {
			const recent = await db
				.prepare(
					`SELECT COUNT(*) as count FROM guestbook_entries
           WHERE tenant_id = ? AND ip_hash = ? AND created_at > ?`,
				)
				.bind(tenantId, ipHash, cutoff)
				.first<{ count: number }>();

			if (recent && recent.count > 0) {
				throwGroveError(429, API_ERRORS.RATE_LIMITED, "API");
			}
		} catch (err: unknown) {
			// If it's a rate limit error, re-throw it
			if (err && typeof err === "object" && "status" in err) {
				throw err;
			}
			// Otherwise, rate limit check failed — allow the entry
			logGroveError("API", API_ERRORS.OPERATION_FAILED, {
				detail: "Rate limit check failed",
				cause: err,
			});
		}
	}

	// Insert entry
	const id = generateGuestbookId();
	const approved = config.require_approval ? 0 : 1;

	try {
		await db
			.prepare(
				`INSERT INTO guestbook_entries (id, tenant_id, name, message, emoji, approved, ip_hash, entry_style, entry_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(id, tenantId, name, message, emoji, approved, ipHash, entryStyle, entryColor)
			.run();
	} catch (err) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Guestbook entry insert failed",
			cause: err,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}

	return json(
		{
			success: true,
			entry: {
				id,
				name,
				message,
				emoji,
				entryStyle,
				entryColor,
				approved: Boolean(approved),
			},
			requiresApproval: Boolean(config.require_approval),
		},
		{ status: 201 },
	);
};
