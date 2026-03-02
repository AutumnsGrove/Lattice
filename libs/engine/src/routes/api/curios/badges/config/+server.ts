/**
 * Badges Config API — Display configuration
 *
 * GET  — Get tenant's badge display config (public)
 * PUT  — Update badge display config (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, buildErrorJson } from "$lib/errors";
import {
	DEFAULT_CONFIG,
	isValidWallLayout,
	isValidShowcaseStyle,
	isValidBadgeSize,
} from "$lib/curios/badges";
import type { BadgesDisplayConfig } from "$lib/curios/badges";

interface ConfigRow {
	tenant_id: string;
	wall_layout: string;
	showcase_style: string;
	badge_size: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const row = await db
		.prepare(
			`SELECT tenant_id, wall_layout, showcase_style, badge_size
       FROM badges_config WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>()
		.catch(() => null);

	const config: BadgesDisplayConfig = row
		? {
				wallLayout: isValidWallLayout(row.wall_layout)
					? row.wall_layout
					: DEFAULT_CONFIG.wallLayout,
				showcaseStyle: isValidShowcaseStyle(row.showcase_style)
					? row.showcase_style
					: DEFAULT_CONFIG.showcaseStyle,
				badgeSize: isValidBadgeSize(row.badge_size) ? row.badge_size : DEFAULT_CONFIG.badgeSize,
			}
		: DEFAULT_CONFIG;

	return json(
		{ config },
		{
			headers: {
				"Cache-Control": "public, max-age=120, stale-while-revalidate=240",
			},
		},
	);
};

export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!locals.user) {
		return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return json(buildErrorJson(API_ERRORS.INVALID_REQUEST_BODY), {
			status: 400,
		});
	}

	const rawWallLayout = typeof body.wallLayout === "string" ? body.wallLayout : "";
	const rawShowcaseStyle = typeof body.showcaseStyle === "string" ? body.showcaseStyle : "";
	const rawBadgeSize = typeof body.badgeSize === "string" ? body.badgeSize : "";

	const wallLayout = isValidWallLayout(rawWallLayout) ? rawWallLayout : DEFAULT_CONFIG.wallLayout;
	const showcaseStyle = isValidShowcaseStyle(rawShowcaseStyle)
		? rawShowcaseStyle
		: DEFAULT_CONFIG.showcaseStyle;
	const badgeSize = isValidBadgeSize(rawBadgeSize) ? rawBadgeSize : DEFAULT_CONFIG.badgeSize;

	await db
		.prepare(
			`INSERT INTO badges_config (tenant_id, wall_layout, showcase_style, badge_size, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id) DO UPDATE SET
         wall_layout = excluded.wall_layout,
         showcase_style = excluded.showcase_style,
         badge_size = excluded.badge_size,
         updated_at = datetime('now')`,
		)
		.bind(tenantId, wallLayout, showcaseStyle, badgeSize)
		.run();

	return json({
		config: { wallLayout, showcaseStyle, badgeSize },
	});
};
