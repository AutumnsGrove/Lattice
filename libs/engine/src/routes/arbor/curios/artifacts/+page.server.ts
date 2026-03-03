import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
	generateArtifactId,
	isValidArtifactType,
	isValidPlacement,
	isValidVisibility,
	isValidRevealAnimation,
	isValidContainer,
	sanitizeConfig,
	parseDiscoveryRules,
	ARTIFACT_TYPES,
	PLACEMENT_OPTIONS,
	VISIBILITY_OPTIONS,
	REVEAL_ANIMATION_OPTIONS,
	CONTAINER_OPTIONS,
	MAX_CONFIG_SIZE,
} from "$lib/curios/artifacts";

interface ArtifactRow {
	id: string;
	tenant_id: string;
	artifact_type: string;
	placement: string;
	config: string;
	sort_order: number;
	visibility: string;
	discovery_rules: string;
	reveal_animation: string;
	container: string;
	created_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			artifacts: [],
			artifactTypes: ARTIFACT_TYPES,
			placementOptions: PLACEMENT_OPTIONS,
			visibilityOptions: VISIBILITY_OPTIONS,
			revealAnimationOptions: REVEAL_ANIMATION_OPTIONS,
			containerOptions: CONTAINER_OPTIONS,
			error: "Database not available",
		};
	}

	const result = await db
		.prepare(
			`SELECT id, artifact_type, placement, config, sort_order, created_at,
			 visibility, discovery_rules, reveal_animation, container
			 FROM artifacts WHERE tenant_id = ?
			 ORDER BY sort_order ASC, created_at ASC`,
		)
		.bind(tenantId)
		.all<ArtifactRow>()
		.catch(() => ({ results: [] as ArtifactRow[] }));

	const artifacts = (result.results ?? []).map((row) => ({
		id: row.id,
		artifactType: row.artifact_type,
		placement: row.placement,
		config: sanitizeConfig(row.config),
		sortOrder: row.sort_order,
		visibility: row.visibility || "always",
		discoveryRules: parseDiscoveryRules(row.discovery_rules),
		revealAnimation: row.reveal_animation || "fade",
		container: row.container || "none",
	}));

	return {
		artifacts,
		artifactTypes: ARTIFACT_TYPES,
		placementOptions: PLACEMENT_OPTIONS,
		visibilityOptions: VISIBILITY_OPTIONS,
		revealAnimationOptions: REVEAL_ANIMATION_OPTIONS,
		containerOptions: CONTAINER_OPTIONS,
	};
};

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
		const artifactType = formData.get("artifactType") as string;

		if (!artifactType || !isValidArtifactType(artifactType)) {
			return fail(400, {
				error: "Invalid artifact type",
				error_code: "INVALID_TYPE",
			});
		}

		const placement = isValidPlacement(formData.get("placement") as string)
			? (formData.get("placement") as string)
			: "sidebar";

		const visibility = isValidVisibility(
			formData.get("visibility") as string,
		)
			? (formData.get("visibility") as string)
			: "always";

		const revealAnimation = isValidRevealAnimation(
			formData.get("revealAnimation") as string,
		)
			? (formData.get("revealAnimation") as string)
			: "fade";

		const container = isValidContainer(
			formData.get("container") as string,
		)
			? (formData.get("container") as string)
			: "none";

		const configStr = (formData.get("config") as string) || "{}";
		if (configStr.length > MAX_CONFIG_SIZE) {
			return fail(400, {
				error: "Configuration too large",
				error_code: "CONFIG_TOO_LARGE",
			});
		}

		const id = generateArtifactId();

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
					`INSERT INTO artifacts (id, tenant_id, artifact_type, placement, config, sort_order,
					 visibility, reveal_animation, container)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					tenantId,
					artifactType,
					placement,
					configStr,
					sortOrder,
					visibility,
					revealAnimation,
					container,
				)
				.run();

			return { success: true, artifactAdded: true };
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
		const artifactId = formData.get("artifactId") as string;

		try {
			await db
				.prepare(`DELETE FROM artifacts WHERE id = ? AND tenant_id = ?`)
				.bind(artifactId, tenantId)
				.run();

			return { success: true, artifactRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, {
				cause: error,
			});
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
