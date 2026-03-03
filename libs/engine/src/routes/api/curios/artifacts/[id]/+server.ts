/**
 * Artifacts Curio API — Single Artifact
 *
 * PATCH  — Update artifact fields (admin)
 * DELETE — Remove an artifact (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	isValidPlacement,
	isValidVisibility,
	isValidRevealAnimation,
	isValidContainer,
	MAX_CONFIG_SIZE,
} from "$lib/curios/artifacts";

export const PATCH: RequestHandler = async ({
	params,
	request,
	platform,
	locals,
}) => {
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

	const existing = await db
		.prepare(`SELECT id FROM artifacts WHERE id = ? AND tenant_id = ?`)
		.bind(params.id, tenantId)
		.first<{ id: string }>();

	if (!existing) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const updates: string[] = [];
	const values: unknown[] = [];

	if (body.placement !== undefined) {
		if (!isValidPlacement(body.placement as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("placement = ?");
		values.push(body.placement);
	}

	if (body.config !== undefined) {
		const configStr = JSON.stringify(body.config);
		if (configStr.length > MAX_CONFIG_SIZE) {
			throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
		}
		updates.push("config = ?");
		values.push(configStr);
	}

	if (body.visibility !== undefined) {
		if (!isValidVisibility(body.visibility as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("visibility = ?");
		values.push(body.visibility);
	}

	if (body.discoveryRules !== undefined) {
		updates.push("discovery_rules = ?");
		values.push(JSON.stringify(body.discoveryRules));
	}

	if (body.revealAnimation !== undefined) {
		if (!isValidRevealAnimation(body.revealAnimation as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("reveal_animation = ?");
		values.push(body.revealAnimation);
	}

	if (body.container !== undefined) {
		if (!isValidContainer(body.container as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("container = ?");
		values.push(body.container);
	}

	if (typeof body.positionX === "number" || body.positionX === null) {
		updates.push("position_x = ?");
		values.push(body.positionX);
	}

	if (typeof body.positionY === "number" || body.positionY === null) {
		updates.push("position_y = ?");
		values.push(body.positionY);
	}

	if (typeof body.zIndex === "number") {
		updates.push("z_index = ?");
		values.push(body.zIndex);
	}

	if (body.fallbackZone !== undefined) {
		if (!isValidPlacement(body.fallbackZone as string)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}
		updates.push("fallback_zone = ?");
		values.push(body.fallbackZone);
	}

	if (updates.length === 0) {
		return json({ success: true, noChanges: true });
	}

	values.push(params.id, tenantId);

	try {
		await db
			.prepare(
				`UPDATE artifacts SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
			)
			.bind(...values)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Artifact update failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
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

	const existing = await db
		.prepare(`SELECT id FROM artifacts WHERE id = ? AND tenant_id = ?`)
		.bind(params.id, tenantId)
		.first<{ id: string }>();

	if (!existing) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	try {
		await db
			.prepare(`DELETE FROM artifacts WHERE id = ? AND tenant_id = ?`)
			.bind(params.id, tenantId)
			.run();

		return json({ success: true });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Artifact delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
