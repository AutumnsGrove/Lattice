/**
 * Shelves Curio API — Single Item
 *
 * PATCH  — Update an item (admin)
 * DELETE — Remove an item (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	isValidUrl,
	sanitizeTitle,
	sanitizeCreator,
	sanitizeDescription,
	sanitizeCategory,
	sanitizeNote,
	sanitizeRating,
	MAX_URL_LENGTH,
} from "$lib/curios/shelves";

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!tenantId) throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const existing = await db
		.prepare(
			`SELECT b.id FROM bookmarks b
			 JOIN bookmark_shelves s ON b.shelf_id = s.id
			 WHERE b.id = ? AND s.tenant_id = ?`,
		)
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

	if (body.title !== undefined) {
		const title = sanitizeTitle(body.title as string);
		if (!title) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		updates.push("title = ?");
		values.push(title);
	}

	if (body.url !== undefined) {
		const url = (body.url as string)?.trim();
		if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("url = ?");
		values.push(url);
	}

	if (body.creator !== undefined) {
		updates.push("author = ?");
		values.push(sanitizeCreator(body.creator as string));
	}

	if (body.description !== undefined) {
		updates.push("description = ?");
		values.push(sanitizeDescription(body.description as string));
	}

	if (body.category !== undefined) {
		updates.push("category = ?");
		values.push(sanitizeCategory(body.category as string));
	}

	if (body.coverUrl !== undefined) {
		const coverUrl = (body.coverUrl as string)?.trim() || null;
		if (coverUrl && (!isValidUrl(coverUrl) || coverUrl.length > MAX_URL_LENGTH)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("cover_url = ?");
		values.push(coverUrl);
	}

	if (body.thumbnailUrl !== undefined) {
		const thumbUrl = (body.thumbnailUrl as string)?.trim() || null;
		if (thumbUrl && (!isValidUrl(thumbUrl) || thumbUrl.length > MAX_URL_LENGTH)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("thumbnail_url = ?");
		values.push(thumbUrl);
	}

	if (body.isStatus1 !== undefined) {
		updates.push("is_currently_reading = ?");
		values.push(body.isStatus1 ? 1 : 0);
	}

	if (body.isStatus2 !== undefined) {
		updates.push("is_favorite = ?");
		values.push(body.isStatus2 ? 1 : 0);
	}

	if (body.rating !== undefined) {
		updates.push("rating = ?");
		values.push(sanitizeRating(body.rating));
	}

	if (body.note !== undefined) {
		updates.push("note = ?");
		values.push(sanitizeNote(body.note as string));
	}

	if (updates.length === 0) {
		return json({ success: true, noChanges: true });
	}

	values.push(params.id, tenantId);

	try {
		await db
			.prepare(
				`UPDATE bookmarks SET ${updates.join(", ")}
				 WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
			)
			.bind(...values)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Item update failed",
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
		.prepare(
			`SELECT b.id FROM bookmarks b
			 JOIN bookmark_shelves s ON b.shelf_id = s.id
			 WHERE b.id = ? AND s.tenant_id = ?`,
		)
		.bind(params.id, tenantId)
		.first<{ id: string }>();

	if (!existing) throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");

	try {
		await db
			.prepare(
				`DELETE FROM bookmarks WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
			)
			.bind(params.id, tenantId)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Item delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
