import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { parseFormData } from "$lib/server/utils/form-data";
import {
	generatePlacementId,
	isValidScale,
	isValidRotation,
	isValidPosition,
	isValidZIndex,
	ASSET_CATEGORY_OPTIONS,
} from "$lib/curios/clipart";

interface PlacementRow {
	id: string;
	asset_id: string;
	page_path: string;
	x_position: number;
	y_position: number;
	scale: number;
	rotation: number;
	z_index: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			placements: [],
			categoryOptions: ASSET_CATEGORY_OPTIONS,
			error: "Database not available",
		};
	}

	const result = await db
		.prepare(
			`SELECT id, asset_id, page_path, x_position, y_position, scale, rotation, z_index
       FROM clipart_placements WHERE tenant_id = ?
       ORDER BY page_path ASC, z_index ASC`,
		)
		.bind(tenantId)
		.all<PlacementRow>()
		.catch(() => ({ results: [] as PlacementRow[] }));

	const placements = (result.results ?? []).map((row) => ({
		id: row.id,
		assetId: row.asset_id,
		pagePath: row.page_path,
		xPosition: row.x_position,
		yPosition: row.y_position,
		scale: row.scale,
		rotation: row.rotation,
		zIndex: row.z_index,
	}));

	return {
		placements,
		categoryOptions: ASSET_CATEGORY_OPTIONS,
	};
};

const AddClipartSchema = z.object({
	assetId: z.string().optional().default(""),
	pagePath: z.string().optional().default("/"),
	xPosition: z.string().optional().default("50"),
	yPosition: z.string().optional().default("50"),
	scale: z.string().optional().default("1.0"),
	rotation: z.string().optional().default("0"),
	zIndex: z.string().optional().default("10"),
});

const RemoveClipartSchema = z.object({
	placementId: z.string().min(1),
});

export const actions: Actions = {
	add: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, AddClipartSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const assetId = d.assetId.trim();
		if (!assetId) {
			return fail(400, {
				error: "Asset is required",
				error_code: "MISSING_ASSET",
			});
		}

		const pagePath = d.pagePath.trim() || "/";

		const xPosition = parseFloat(d.xPosition) || 50;
		const yPosition = parseFloat(d.yPosition) || 50;
		if (!isValidPosition(xPosition) || !isValidPosition(yPosition)) {
			return fail(400, {
				error: "Invalid position",
				error_code: "INVALID_POSITION",
			});
		}

		const scale = parseFloat(d.scale) || 1.0;
		if (!isValidScale(scale)) {
			return fail(400, { error: "Invalid scale", error_code: "INVALID_SCALE" });
		}

		const rotation = parseFloat(d.rotation) || 0;
		if (!isValidRotation(rotation)) {
			return fail(400, {
				error: "Invalid rotation",
				error_code: "INVALID_ROTATION",
			});
		}

		const zIndex = parseInt(d.zIndex, 10) || 10;
		if (!isValidZIndex(zIndex)) {
			return fail(400, {
				error: "Invalid z-index",
				error_code: "INVALID_ZINDEX",
			});
		}

		const id = generatePlacementId();

		try {
			await db
				.prepare(
					`INSERT INTO clipart_placements (id, tenant_id, asset_id, page_path, x_position, y_position, scale, rotation, z_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(id, tenantId, assetId, pagePath, xPosition, yPosition, scale, rotation, zIndex)
				.run();

			return { success: true, placementAdded: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	remove: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, RemoveClipartSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { placementId } = parsed.data;

		try {
			await db
				.prepare(`DELETE FROM clipart_placements WHERE id = ? AND tenant_id = ?`)
				.bind(placementId, tenantId)
				.run();

			return { success: true, placementRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
