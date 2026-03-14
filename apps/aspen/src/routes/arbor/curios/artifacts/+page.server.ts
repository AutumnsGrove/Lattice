import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
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
	ARTIFACT_TYPES,
	PLACEMENT_OPTIONS,
	VISIBILITY_OPTIONS,
	REVEAL_ANIMATION_OPTIONS,
	CONTAINER_OPTIONS,
	ARTIFACT_CONFIG_FIELDS,
	MAX_CONFIG_SIZE,
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
			configFields: ARTIFACT_CONFIG_FIELDS,
			error: "Database not available",
		};
	}

	const result = await db
		.prepare(
			`SELECT id, name, artifact_type, placement, config, sort_order, created_at,
			 visibility, discovery_rules, reveal_animation, container
			 FROM artifacts WHERE tenant_id = ?
			 ORDER BY sort_order ASC, created_at ASC`,
		)
		.bind(tenantId)
		.all<ArtifactRow>()
		.catch(() => ({ results: [] as ArtifactRow[] }));

	const artifacts = (result.results ?? []).map((row) => ({
		id: row.id,
		name: row.name ?? "",
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
		configFields: ARTIFACT_CONFIG_FIELDS,
	};
};

const AddArtifactSchema = z.object({
	name: z.string().optional().default(""),
	artifactType: z.string().optional().default(""),
	placement: z.string().optional().default("sidebar"),
	visibility: z.string().optional().default("always"),
	revealAnimation: z.string().optional().default("fade"),
	container: z.string().optional().default("none"),
	config: z.string().optional().default("{}"),
});

const RemoveArtifactSchema = z.object({
	artifactId: z.string().min(1),
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
		const parsed = parseFormData(formData, AddArtifactSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const name = d.name.trim();
		const artifactType = d.artifactType;

		if (name && !isValidArtifactName(name)) {
			return fail(400, {
				error: "Name must be 1-80 characters",
				error_code: "INVALID_NAME",
			});
		}

		if (!artifactType || !isValidArtifactType(artifactType)) {
			return fail(400, {
				error: "Invalid artifact type",
				error_code: "INVALID_TYPE",
			});
		}

		const placement = isValidPlacement(d.placement) ? d.placement : "sidebar";
		const visibility = isValidVisibility(d.visibility) ? d.visibility : "always";
		const revealAnimation = isValidRevealAnimation(d.revealAnimation) ? d.revealAnimation : "fade";
		const container = isValidContainer(d.container) ? d.container : "none";

		const configStr = d.config || "{}";
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
					`INSERT INTO artifacts (id, tenant_id, name, artifact_type, placement, config, sort_order,
					 visibility, reveal_animation, container)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
		const parsed = parseFormData(formData, RemoveArtifactSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { artifactId } = parsed.data;

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
