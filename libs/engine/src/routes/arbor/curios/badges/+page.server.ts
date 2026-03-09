import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { parseFormData } from "$lib/server/utils/form-data";
import {
	generateCustomBadgeId,
	sanitizeBadgeName,
	sanitizeBadgeDescription,
	isValidIconUrl,
	isValidWallLayout,
	isValidShowcaseStyle,
	isValidBadgeSize,
	SYSTEM_BADGES,
	COMMUNITY_BADGES,
	BADGE_RARITY_OPTIONS,
	WALL_LAYOUT_OPTIONS,
	SHOWCASE_STYLE_OPTIONS,
	BADGE_SIZE_OPTIONS,
	DEFAULT_CONFIG,
	MAX_CUSTOM_BADGES,
	ALL_PREBUILT_BADGES,
	getPrebuiltBadgesByCategory,
} from "$lib/curios/badges";

interface EarnedBadgeRow {
	badge_id: string;
	name: string;
	description: string;
	icon_url: string;
	category: string;
	rarity: string;
	earned_at: string;
	is_showcased: number;
	display_order: number;
}

interface CustomBadgeRow {
	id: string;
	name: string;
	description: string;
	icon_url: string;
	created_at: string;
}

interface ConfigRow {
	wall_layout: string;
	showcase_style: string;
	badge_size: string;
}

const ToggleShowcaseSchema = z.object({
	badgeId: z.string().min(1),
	showcase: z.string().optional(),
});

const SaveBadgeConfigSchema = z.object({
	wallLayout: z.string().optional().default(""),
	showcaseStyle: z.string().optional().default(""),
	badgeSize: z.string().optional().default(""),
});

const CreateCustomBadgeSchema = z.object({
	name: z.string().optional().default(""),
	description: z.string().optional().default(""),
	iconUrl: z.string().optional().default(""),
});

const RemoveCustomBadgeSchema = z.object({
	badgeId: z.string().min(1),
});

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			earnedBadges: [],
			customBadges: [],
			systemBadges: SYSTEM_BADGES,
			communityBadges: COMMUNITY_BADGES,
			rarityOptions: BADGE_RARITY_OPTIONS,
			wallLayoutOptions: WALL_LAYOUT_OPTIONS,
			showcaseStyleOptions: SHOWCASE_STYLE_OPTIONS,
			badgeSizeOptions: BADGE_SIZE_OPTIONS,
			config: DEFAULT_CONFIG,
			prebuiltBadgesByCategory: getPrebuiltBadgesByCategory(),
			error: "Database not available",
		};
	}

	const [earnedResult, customResult, configRow] = await Promise.all([
		db
			.prepare(
				`SELECT bd.id as badge_id, bd.name, bd.description, bd.icon_url, bd.category, bd.rarity,
                tb.earned_at, tb.is_showcased, tb.display_order
         FROM tenant_badges tb
         JOIN badge_definitions bd ON tb.badge_id = bd.id
         WHERE tb.tenant_id = ?
         ORDER BY tb.is_showcased DESC, tb.display_order ASC`,
			)
			.bind(tenantId)
			.all<EarnedBadgeRow>()
			.catch(() => ({ results: [] as EarnedBadgeRow[] })),
		db
			.prepare(
				`SELECT id, name, description, icon_url, created_at
         FROM custom_badges WHERE tenant_id = ?
         ORDER BY created_at DESC`,
			)
			.bind(tenantId)
			.all<CustomBadgeRow>()
			.catch(() => ({ results: [] as CustomBadgeRow[] })),
		db
			.prepare(
				`SELECT wall_layout, showcase_style, badge_size
         FROM badges_config WHERE tenant_id = ?`,
			)
			.bind(tenantId)
			.first<ConfigRow>()
			.catch(() => null),
	]);

	const earnedBadges = (earnedResult.results ?? []).map((row) => ({
		id: row.badge_id,
		name: row.name,
		description: row.description,
		iconUrl: row.icon_url,
		category: row.category,
		rarity: row.rarity,
		earnedAt: row.earned_at,
		isShowcased: row.is_showcased === 1,
	}));

	const customBadges = (customResult.results ?? []).map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		iconUrl: row.icon_url,
		createdAt: row.created_at,
	}));

	const config = configRow
		? {
				wallLayout: isValidWallLayout(configRow.wall_layout)
					? configRow.wall_layout
					: DEFAULT_CONFIG.wallLayout,
				showcaseStyle: isValidShowcaseStyle(configRow.showcase_style)
					? configRow.showcase_style
					: DEFAULT_CONFIG.showcaseStyle,
				badgeSize: isValidBadgeSize(configRow.badge_size)
					? configRow.badge_size
					: DEFAULT_CONFIG.badgeSize,
			}
		: DEFAULT_CONFIG;

	return {
		earnedBadges,
		customBadges,
		systemBadges: SYSTEM_BADGES,
		communityBadges: COMMUNITY_BADGES,
		rarityOptions: BADGE_RARITY_OPTIONS,
		wallLayoutOptions: WALL_LAYOUT_OPTIONS,
		showcaseStyleOptions: SHOWCASE_STYLE_OPTIONS,
		badgeSizeOptions: BADGE_SIZE_OPTIONS,
		config,
		prebuiltBadgesByCategory: getPrebuiltBadgesByCategory(),
	};
};

export const actions: Actions = {
	toggleShowcase: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, ToggleShowcaseSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { badgeId } = parsed.data;
		const showcase = parsed.data.showcase === "true" ? 1 : 0;

		try {
			await db
				.prepare(`UPDATE tenant_badges SET is_showcased = ? WHERE badge_id = ? AND tenant_id = ?`)
				.bind(showcase, badgeId, tenantId)
				.run();

			return { success: true, showcaseToggled: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	saveConfig: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, SaveBadgeConfigSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const wallLayout = parsed.data.wallLayout || DEFAULT_CONFIG.wallLayout;
		const showcaseStyle = parsed.data.showcaseStyle || DEFAULT_CONFIG.showcaseStyle;
		const badgeSize = parsed.data.badgeSize || DEFAULT_CONFIG.badgeSize;

		if (!isValidWallLayout(wallLayout)) {
			return fail(400, { error: "Invalid wall layout", error_code: "INVALID_LAYOUT" });
		}
		if (!isValidShowcaseStyle(showcaseStyle)) {
			return fail(400, { error: "Invalid showcase style", error_code: "INVALID_STYLE" });
		}
		if (!isValidBadgeSize(badgeSize)) {
			return fail(400, { error: "Invalid badge size", error_code: "INVALID_SIZE" });
		}

		try {
			await db
				.prepare(
					`INSERT INTO badges_config (tenant_id, wall_layout, showcase_style, badge_size, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             wall_layout = excluded.wall_layout,
             showcase_style = excluded.showcase_style,
             badge_size = excluded.badge_size,
             updated_at = datetime('now')`,
				)
				.bind(tenantId, wallLayout, showcaseStyle, badgeSize)
				.run();

			return { success: true, configSaved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	createCustom: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, CreateCustomBadgeSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const name = sanitizeBadgeName(parsed.data.name);
		if (!name) {
			return fail(400, {
				error: "Badge name is required",
				error_code: "MISSING_NAME",
			});
		}

		const description = sanitizeBadgeDescription(parsed.data.description);
		if (!description) {
			return fail(400, {
				error: "Badge description is required",
				error_code: "MISSING_DESCRIPTION",
			});
		}

		const iconUrl = parsed.data.iconUrl?.trim();
		if (!iconUrl || !isValidIconUrl(iconUrl)) {
			return fail(400, {
				error: "A valid icon URL is required",
				error_code: "INVALID_ICON_URL",
			});
		}

		// Check limit
		const countResult = await db
			.prepare(`SELECT COUNT(*) as count FROM custom_badges WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ count: number }>();

		if ((countResult?.count ?? 0) >= MAX_CUSTOM_BADGES) {
			return fail(400, {
				error: `Maximum of ${MAX_CUSTOM_BADGES} custom badges reached`,
				error_code: "LIMIT_REACHED",
			});
		}

		const id = generateCustomBadgeId();

		try {
			await db
				.prepare(
					`INSERT INTO custom_badges (id, tenant_id, name, description, icon_url) VALUES (?, ?, ?, ?, ?)`,
				)
				.bind(id, tenantId, name, description, iconUrl)
				.run();

			return { success: true, customCreated: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	removeCustom: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, RemoveCustomBadgeSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { badgeId } = parsed.data;

		try {
			await db
				.prepare(`DELETE FROM custom_badges WHERE id = ? AND tenant_id = ?`)
				.bind(badgeId, tenantId)
				.run();

			return { success: true, customRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
