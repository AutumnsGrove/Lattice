/**
 * Artifacts Curio API — List & Create
 *
 * GET  — Get all artifacts for tenant (public, cached)
 * POST — Add an artifact (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";
import {
	generateArtifactId,
	isValidArtifactType,
	isValidArtifactName,
	isValidPlacement,
	isValidVisibility,
	isValidRevealAnimation,
	isValidContainer,
	sanitizeConfig,
	parseDiscoveryRules,
	MAX_CONFIG_SIZE,
	MAX_ARTIFACTS_PER_TENANT,
	type ArtifactDisplay,
} from "@autumnsgrove/lattice/curios/artifacts";

interface ArtifactRow {
	id: string;
	tenant_id: string;
	name: string;
	artifact_type: string;
	placement: string;
	config: string;
	sort_order: number;
	visibility: string;
	discovery_rules: string;
	reveal_animation: string;
	container: string;
	position_x: number | null;
	position_y: number | null;
	z_index: number;
	fallback_zone: string;
	created_at: string;
}

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Optional type filter
	const typeFilter = url.searchParams.get("type");

	let query = `SELECT id, name, artifact_type, placement, config, sort_order,
		visibility, discovery_rules, reveal_animation, container,
		position_x, position_y, z_index, fallback_zone
		FROM artifacts WHERE tenant_id = ?`;
	const binds: unknown[] = [tenantId];

	if (typeFilter) {
		query += ` AND artifact_type = ?`;
		binds.push(typeFilter);
	}

	query += ` ORDER BY sort_order ASC, created_at ASC LIMIT 500`;

	const result = await db
		.prepare(query)
		.bind(...binds)
		.all<ArtifactRow>();

	const artifacts: ArtifactDisplay[] = (result.results ?? []).map((row) => ({
		id: row.id,
		name: row.name ?? "",
		artifactType: row.artifact_type as ArtifactDisplay["artifactType"],
		placement: (row.placement || "sidebar") as ArtifactDisplay["placement"],
		config: sanitizeConfig(row.config),
		visibility: (row.visibility || "always") as ArtifactDisplay["visibility"],
		discoveryRules: parseDiscoveryRules(row.discovery_rules),
		revealAnimation: (row.reveal_animation || "fade") as ArtifactDisplay["revealAnimation"],
		container: (row.container || "none") as ArtifactDisplay["container"],
		positionX: row.position_x ?? null,
		positionY: row.position_y ?? null,
		zIndex: row.z_index ?? 10,
		fallbackZone: (row.fallback_zone || "floating") as ArtifactDisplay["fallbackZone"],
	}));

	return json(
		{ artifacts, tenantId },
		{
			headers: {
				"Cache-Control": "public, max-age=60, stale-while-revalidate=120",
			},
		},
	);
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const artifactType = body.artifactType as string;
	if (!artifactType || !isValidArtifactType(artifactType)) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	const name = typeof body.name === "string" ? body.name.trim() : "";
	if (name && !isValidArtifactName(name)) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	const placement = isValidPlacement(body.placement as string)
		? (body.placement as string)
		: "sidebar";

	const visibility = isValidVisibility(body.visibility as string)
		? (body.visibility as string)
		: "always";

	const revealAnimation = isValidRevealAnimation(body.revealAnimation as string)
		? (body.revealAnimation as string)
		: "fade";

	const container = isValidContainer(body.container as string)
		? (body.container as string)
		: "none";

	const discoveryRules = body.discoveryRules ? JSON.stringify(body.discoveryRules) : "[]";

	const configStr = body.config ? JSON.stringify(body.config) : "{}";
	if (configStr.length > MAX_CONFIG_SIZE) {
		throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
	}

	const positionX = typeof body.positionX === "number" ? body.positionX : null;
	const positionY = typeof body.positionY === "number" ? body.positionY : null;
	const zIndex = typeof body.zIndex === "number" ? body.zIndex : 10;
	const fallbackZone = isValidPlacement(body.fallbackZone as string)
		? (body.fallbackZone as string)
		: "floating";

	const id = generateArtifactId();

	// Enforce per-tenant artifact limit
	const countResult = await db
		.prepare(`SELECT COUNT(*) as count FROM artifacts WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<{ count: number }>();
	if ((countResult?.count ?? 0) >= MAX_ARTIFACTS_PER_TENANT) {
		throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
	}

	try {
		const maxSort = await db
			.prepare(
				`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM artifacts WHERE tenant_id = ?`,
			)
			.bind(tenantId)
			.first<{ max_sort: number }>();

		const sortOrder = (maxSort?.max_sort ?? -1) + 1;

		await db
			.prepare(
				`INSERT INTO artifacts (id, tenant_id, name, artifact_type, placement, config, sort_order,
				 visibility, discovery_rules, reveal_animation, container,
				 position_x, position_y, z_index, fallback_zone)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				tenantId,
				name,
				artifactType,
				placement,
				configStr,
				sortOrder,
				visibility,
				discoveryRules,
				revealAnimation,
				container,
				positionX,
				positionY,
				zIndex,
				fallbackZone,
			)
			.run();

		return json({ success: true, id }, { status: 201 });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Artifact create failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
