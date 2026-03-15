/**
 * Shrines Public Route — Server
 *
 * Loads published shrines for the public shrines page.
 * Only returns shrines with is_published = 1.
 */

import type { PageServerLoad } from "./$types";
import type { ShrineType, ShrineSize, FrameStyle } from "@autumnsgrove/lattice/curios/shrines";
import { SITE_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseContents } from "@autumnsgrove/lattice/curios/shrines";

interface ShrineRow {
	id: string;
	title: string;
	shrine_type: string;
	description: string | null;
	size: string;
	frame_style: string;
	contents: string;
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

	const result = await db
		.prepare(
			`SELECT id, title, shrine_type, description, size, frame_style, contents
       FROM shrines WHERE tenant_id = ? AND is_published = 1
       ORDER BY sort_order ASC, created_at ASC`,
		)
		.bind(tenantId)
		.all<ShrineRow>()
		.catch((error) => {
			logGroveError("Site", SITE_ERRORS.PAGE_LOAD_FAILED, { cause: error });
			return { results: [] as ShrineRow[] };
		});

	const shrines = (result.results ?? []).map((row) => ({
		id: row.id,
		title: row.title,
		shrineType: row.shrine_type as ShrineType,
		description: row.description,
		size: row.size as ShrineSize,
		frameStyle: row.frame_style as FrameStyle,
		contents: parseContents(row.contents),
	}));

	return { shrines };
};
