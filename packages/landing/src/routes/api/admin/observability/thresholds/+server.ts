/**
 * GET  /api/admin/observability/thresholds — List alert thresholds
 * POST /api/admin/observability/thresholds — Upsert an alert threshold
 *
 * Wayfinder access required for both methods.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	getAlertThresholds,
	upsertAlertThreshold,
} from "@autumnsgrove/lattice/server/observability";
import { isWayfinder } from "@autumnsgrove/lattice/config";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db)
		return json(
			{ error: "GROVE-OBS-503", error_description: "Database unavailable" },
			{ status: 503 },
		);
	if (!isWayfinder(locals.user?.email ?? ""))
		return json(
			{ error: "GROVE-OBS-403", error_description: "Wayfinder access required" },
			{ status: 403 },
		);

	try {
		const thresholds = await getAlertThresholds(db);
		return json({ thresholds });
	} catch (err) {
		console.error("[Vista/Thresholds] GET Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};

export const POST: RequestHandler = async ({ platform, locals, request }) => {
	const db = platform?.env?.DB;
	if (!db)
		return json(
			{ error: "GROVE-OBS-503", error_description: "Database unavailable" },
			{ status: 503 },
		);
	if (!isWayfinder(locals.user?.email ?? ""))
		return json(
			{ error: "GROVE-OBS-403", error_description: "Wayfinder access required" },
			{ status: 403 },
		);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ error: "GROVE-OBS-400", error_description: "Invalid JSON body." },
			{ status: 400 },
		);
	}

	if (
		typeof body !== "object" ||
		body === null ||
		!("serviceName" in body) ||
		!("metricType" in body) ||
		!("operator" in body) ||
		!("thresholdValue" in body) ||
		!("severity" in body)
	) {
		return json(
			{
				error: "GROVE-OBS-400",
				error_description:
					"Missing required fields: serviceName, metricType, operator, thresholdValue, severity.",
			},
			{ status: 400 },
		);
	}

	const { serviceName, metricType, operator, thresholdValue, severity } = body as Record<
		string,
		unknown
	>;

	const validOperators = ["gt", "lt", "gte", "lte", "eq"];
	const validSeverities = ["info", "warning", "critical"];

	if (typeof serviceName !== "string" || !serviceName.trim())
		return json(
			{ error: "GROVE-OBS-400", error_description: "serviceName must be a non-empty string." },
			{ status: 400 },
		);
	if (serviceName.length > 100)
		return json(
			{ error: "GROVE-OBS-400", error_description: "serviceName must not exceed 100 characters." },
			{ status: 400 },
		);
	if (typeof metricType !== "string" || !metricType.trim())
		return json(
			{ error: "GROVE-OBS-400", error_description: "metricType must be a non-empty string." },
			{ status: 400 },
		);
	if (metricType.length > 100)
		return json(
			{ error: "GROVE-OBS-400", error_description: "metricType must not exceed 100 characters." },
			{ status: 400 },
		);
	if (typeof operator !== "string" || !validOperators.includes(operator))
		return json(
			{
				error: "GROVE-OBS-400",
				error_description: `operator must be one of: ${validOperators.join(", ")}.`,
			},
			{ status: 400 },
		);
	if (typeof thresholdValue !== "number" || isNaN(thresholdValue) || !isFinite(thresholdValue))
		return json(
			{
				error: "GROVE-OBS-400",
				error_description: "thresholdValue must be a finite number.",
			},
			{ status: 400 },
		);
	if (typeof severity !== "string" || !validSeverities.includes(severity))
		return json(
			{
				error: "GROVE-OBS-400",
				error_description: `severity must be one of: ${validSeverities.join(", ")}.`,
			},
			{ status: 400 },
		);

	try {
		await upsertAlertThreshold(db, {
			serviceName,
			metricType,
			operator: operator as "gt" | "lt" | "gte" | "lte" | "eq",
			thresholdValue,
			severity: severity as "info" | "warning" | "critical",
		});
		return json({ success: true });
	} catch (err) {
		console.error("[Vista/Thresholds] POST Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
