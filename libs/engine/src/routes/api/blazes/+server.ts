import { json } from "@sveltejs/kit";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { VALID_BLAZE_COLORS, VALID_BLAZE_ICONS, isValidBlazeHexColor } from "$lib/blazes/index.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/** Max custom blazes per tenant */
const MAX_BLAZES_PER_TENANT = 20;

/** Blaze slug validation: lowercase alphanumeric + hyphens, 2-40 chars */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface BlazeRow {
	slug: string;
	label: string;
	icon: string;
	color: string;
}

/**
 * GET /api/blazes — List available blazes
 *
 * Returns global defaults + tenant-scoped custom blazes (if authenticated).
 * Unauthenticated requests receive only global defaults.
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	try {
		// Fire global query immediately — it's needed regardless of auth
		const globalQuery = platform.env.DB.prepare(
			"SELECT slug, label, icon, color FROM blaze_definitions WHERE tenant_id IS NULL ORDER BY sort_order",
		).all<BlazeRow>();

		// If authenticated with a tenant, fire both queries in parallel
		// (locals.tenantId is already verified by session middleware)
		if (locals.user && locals.tenantId) {
			const [globalResult, tenantResult] = await Promise.all([
				globalQuery,
				platform.env.DB.prepare(
					"SELECT slug, label, icon, color FROM blaze_definitions WHERE tenant_id = ? ORDER BY sort_order",
				)
					.bind(locals.tenantId)
					.all<BlazeRow>(),
			]);

			const blazes = [
				...(globalResult.results ?? []).map((r) => ({ ...r, scope: "global" as const })),
				...(tenantResult.results ?? []).map((r) => ({ ...r, scope: "tenant" as const })),
			];

			return json({ blazes }, { headers: { "Cache-Control": "private, max-age=60" } });
		}

		// Unauthenticated — globals only
		const globalResult = await globalQuery;
		const globals = (globalResult.results ?? []).map((row) => ({
			slug: row.slug,
			label: row.label,
			icon: row.icon,
			color: row.color,
			scope: "global" as const,
		}));

		return json({ blazes: globals }, { headers: { "Cache-Control": "public, max-age=300" } });
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * POST /api/blazes — Create a custom blaze definition
 *
 * Authenticated, tenant-scoped. Validates slug, label, icon, color.
 * Enforces 20-definition-per-tenant soft cap.
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Rate limit
	const threshold = createThreshold(platform?.env, { identifier: locals.user?.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `blazes/create:${locals.user.id}`,
			limit: 10,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	try {
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		const data = (await request.json()) as Record<string, unknown>;
		const slug = typeof data.slug === "string" ? data.slug.trim() : "";
		const label = typeof data.label === "string" ? data.label.trim() : "";
		const icon = typeof data.icon === "string" ? data.icon.trim() : "";
		const color = typeof data.color === "string" ? data.color.trim() : "";

		// Validate slug
		if (!slug || slug.length > 40 || !SLUG_PATTERN.test(slug)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Validate label
		if (!label || label.length > 30) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Validate icon (must be in allowed palette)
		if (!VALID_BLAZE_ICONS.includes(icon)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Validate color (palette key or hex color)
		if (!VALID_BLAZE_COLORS.includes(color) && !isValidBlazeHexColor(color)) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Enforce per-tenant soft cap. The COUNT/INSERT is not atomic, but D1
		// serializes writes so the race window is negligible. The UNIQUE constraint
		// on (tenant_id, slug) prevents true duplicates regardless.
		const countResult = await platform.env.DB.prepare(
			"SELECT COUNT(*) as count FROM blaze_definitions WHERE tenant_id = ?",
		)
			.bind(tenantId)
			.first<{ count: number }>();

		if (countResult && countResult.count >= MAX_BLAZES_PER_TENANT) {
			throwGroveError(403, API_ERRORS.USAGE_LIMIT_REACHED, "API");
		}

		// Generate ID and insert — rely on UNIQUE constraint for conflict detection
		const id = `blaze-${tenantId}-${slug}`;
		const nextOrder = (countResult?.count ?? 0) + 1;

		try {
			await platform.env.DB.prepare(
				"INSERT INTO blaze_definitions (id, tenant_id, slug, label, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
				.bind(id, tenantId, slug, label, icon, color, nextOrder)
				.run();
		} catch (insertErr) {
			if (String(insertErr).includes("UNIQUE")) {
				throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
			}
			throw insertErr;
		}

		return json(
			{
				success: true,
				blaze: { slug, label, icon, color, scope: "tenant" },
			},
			{ status: 201 },
		);
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
