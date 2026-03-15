/**
 * Glass Cathedral Panels API
 *
 * GET — Get panels for a cathedral artifact (public)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";

interface PanelRow {
	id: string;
	panel_order: number;
	background_color: string | null;
	background_image_url: string | null;
	text_content: string | null;
	text_color: string | null;
	link_url: string | null;
}

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const result = await db
		.prepare(
			`SELECT id, panel_order, background_color, background_image_url,
			 text_content, text_color, link_url
			 FROM cathedral_panels
			 WHERE artifact_id = ? AND tenant_id = ?
			 ORDER BY panel_order ASC`,
		)
		.bind(params.id, tenantId)
		.all<PanelRow>();

	const panels = (result.results ?? []).map((row) => ({
		id: row.id,
		order: row.panel_order,
		backgroundColor: row.background_color,
		backgroundImageUrl: row.background_image_url,
		textContent: row.text_content,
		textColor: row.text_color,
		linkUrl: row.link_url,
	}));

	return json(
		{ panels },
		{
			headers: {
				"Cache-Control": "public, max-age=120, stale-while-revalidate=300",
			},
		},
	);
};
