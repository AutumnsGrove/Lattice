import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	generateBadgeId,
	isValidBadgeType,
	isValidBadgePosition,
	sanitizeCustomText,
	BADGE_DEFINITIONS,
	BADGE_POSITION_OPTIONS,
	type StatusBadgeRecord,
} from "@autumnsgrove/lattice/curios/statusbadge";

interface BadgeRow {
	id: string;
	tenant_id: string;
	badge_type: string;
	position: string;
	animated: number;
	custom_text: string | null;
	show_date: number;
	created_at: string;
}

function rowToRecord(row: BadgeRow): StatusBadgeRecord {
	return {
		id: row.id,
		tenantId: row.tenant_id,
		badgeType: row.badge_type as StatusBadgeRecord["badgeType"],
		position: row.position as StatusBadgeRecord["position"],
		animated: Boolean(row.animated),
		customText: row.custom_text,
		showDate: Boolean(row.show_date),
		createdAt: row.created_at,
	};
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			badges: [],
			badgeDefinitions: BADGE_DEFINITIONS,
			positionOptions: BADGE_POSITION_OPTIONS,
			error: "Database not available",
		};
	}

	const result = await db
		.prepare(
			`SELECT id, tenant_id, badge_type, position, animated, custom_text, show_date, created_at
       FROM status_badges
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
		)
		.bind(tenantId)
		.all<BadgeRow>()
		.catch(() => ({ results: [] as BadgeRow[] }));

	const badges = (result.results ?? []).map(rowToRecord);

	return {
		badges,
		badgeDefinitions: BADGE_DEFINITIONS,
		positionOptions: BADGE_POSITION_OPTIONS,
	};
};

const AddBadgeSchema = z.object({
	badgeType: z.string().min(1),
	position: z.string().optional().default("floating"),
	animated: z.string().optional(),
	customText: z.string().nullable().optional(),
	showDate: z.string().optional(),
});

const UpdateBadgeSchema = z.object({
	id: z.string().min(1),
	position: z.string().optional().default("floating"),
	animated: z.string().optional(),
	customText: z.string().nullable().optional(),
	showDate: z.string().optional(),
});

const RemoveBadgeSchema = z.object({
	id: z.string().min(1),
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
		const parsed = parseFormData(formData, AddBadgeSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		const badgeType = d.badgeType;
		const position = d.position || "floating";
		const animated = d.animated !== "false";
		const customText = sanitizeCustomText(d.customText ?? null);
		const showDate = d.showDate === "true";

		if (!isValidBadgeType(badgeType)) {
			return fail(400, {
				error: "Invalid badge type",
				error_code: "INVALID_BADGE_TYPE",
			});
		}

		if (!isValidBadgePosition(position)) {
			return fail(400, {
				error: "Invalid badge position",
				error_code: "INVALID_BADGE_POSITION",
			});
		}

		const id = generateBadgeId();

		try {
			await db
				.prepare(
					`INSERT INTO status_badges (id, tenant_id, badge_type, position, animated, custom_text, show_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(id, tenantId, badgeType, position, animated ? 1 : 0, customText, showDate ? 1 : 0)
				.run();

			return { success: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	update: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, UpdateBadgeSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		const id = d.id;
		const position = d.position || "floating";
		const animated = d.animated !== "false";
		const customText = sanitizeCustomText(d.customText ?? null);
		const showDate = d.showDate === "true";

		if (!isValidBadgePosition(position)) {
			return fail(400, {
				error: "Invalid badge position",
				error_code: "INVALID_BADGE_POSITION",
			});
		}

		try {
			await db
				.prepare(
					`UPDATE status_badges
           SET position = ?, animated = ?, custom_text = ?, show_date = ?
           WHERE id = ? AND tenant_id = ?`,
				)
				.bind(position, animated ? 1 : 0, customText, showDate ? 1 : 0, id, tenantId)
				.run();

			return { success: true, updated: true };
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
		const parsed = parseFormData(formData, RemoveBadgeSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { id } = parsed.data;

		try {
			await db
				.prepare(`DELETE FROM status_badges WHERE id = ? AND tenant_id = ?`)
				.bind(id, tenantId)
				.run();

			return { success: true, removed: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
