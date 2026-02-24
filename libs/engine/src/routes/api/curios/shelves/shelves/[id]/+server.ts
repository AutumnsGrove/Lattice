/**
 * Shelves Curio API — Single Shelf
 *
 * PATCH  — Update shelf config (admin)
 * DELETE — Remove a shelf and its items (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	sanitizeShelfName,
	sanitizeDescription,
	isValidDisplayMode,
	isValidMaterial,
} from "$lib/curios/shelves";

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!tenantId) throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const existing = await db
		.prepare(`SELECT id FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
		.bind(params.id, tenantId)
		.first<{ id: string }>();

	if (!existing) throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const updates: string[] = [];
	const values: unknown[] = [];

	if (body.name !== undefined) {
		const name = sanitizeShelfName(body.name as string);
		if (!name) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		updates.push("name = ?");
		values.push(name);
	}

	if (body.description !== undefined) {
		updates.push("description = ?");
		values.push(sanitizeDescription(body.description as string));
	}

	if (body.displayMode !== undefined) {
		if (!isValidDisplayMode(body.displayMode as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("display_mode = ?");
		values.push(body.displayMode);
	}

	if (body.material !== undefined) {
		if (!isValidMaterial(body.material as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("material = ?");
		values.push(body.material);
	}

	if (body.creatorLabel !== undefined) {
		updates.push("creator_label = ?");
		values.push(String(body.creatorLabel).slice(0, 50));
	}

	if (body.status1Label !== undefined) {
		updates.push("status1_label = ?");
		values.push(String(body.status1Label).slice(0, 50));
	}

	if (body.status2Label !== undefined) {
		updates.push("status2_label = ?");
		values.push(String(body.status2Label).slice(0, 50));
	}

	if (body.isFeatured !== undefined) {
		updates.push("is_featured = ?");
		values.push(body.isFeatured ? 1 : 0);
	}

	if (body.groupByCategory !== undefined) {
		updates.push("group_by_category = ?");
		values.push(body.groupByCategory ? 1 : 0);
	}

	if (body.autoFavicon !== undefined) {
		updates.push("auto_favicon = ?");
		values.push(body.autoFavicon ? 1 : 0);
	}

	if (updates.length === 0) {
		return json({ success: true, noChanges: true });
	}

	values.push(params.id, tenantId);

	try {
		await db
			.prepare(`UPDATE bookmark_shelves SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`)
			.bind(...values)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Shelf update failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!tenantId) throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const existing = await db
		.prepare(`SELECT id FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
		.bind(params.id, tenantId)
		.first<{ id: string }>();

	if (!existing) throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");

	try {
		await db
			.prepare(`DELETE FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
			.bind(params.id, tenantId)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Shelf delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
