import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
	generateShrineId,
	isValidShrineType,
	isValidSize,
	isValidFrameStyle,
	sanitizeTitle,
	sanitizeDescription,
	parseContents,
	SHRINE_TYPE_OPTIONS,
	SIZE_OPTIONS,
	FRAME_STYLE_OPTIONS,
	CONTENT_TYPE_OPTIONS,
	SHRINE_TEMPLATES,
	MAX_CONTENTS_SIZE,
	type ShrineType,
} from "$lib/curios/shrines";

interface ShrineRow {
	id: string;
	title: string;
	shrine_type: string;
	description: string | null;
	size: string;
	frame_style: string;
	contents: string;
	is_published: number;
	sort_order: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			shrines: [],
			shrineTypeOptions: SHRINE_TYPE_OPTIONS,
			sizeOptions: SIZE_OPTIONS,
			frameStyleOptions: FRAME_STYLE_OPTIONS,
			contentTypeOptions: CONTENT_TYPE_OPTIONS,
			shrineTemplates: SHRINE_TEMPLATES,
			error: "Database not available",
		};
	}

	const result = await db
		.prepare(
			`SELECT id, title, shrine_type, description, size, frame_style, contents, is_published, sort_order
       FROM shrines WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
		)
		.bind(tenantId)
		.all<ShrineRow>()
		.catch(() => ({ results: [] as ShrineRow[] }));

	const shrines = (result.results ?? []).map((row) => ({
		id: row.id,
		title: row.title,
		shrineType: row.shrine_type,
		description: row.description,
		size: row.size,
		frameStyle: row.frame_style,
		contents: parseContents(row.contents),
		isPublished: row.is_published === 1,
	}));

	return {
		shrines,
		shrineTypeOptions: SHRINE_TYPE_OPTIONS,
		sizeOptions: SIZE_OPTIONS,
		frameStyleOptions: FRAME_STYLE_OPTIONS,
		contentTypeOptions: CONTENT_TYPE_OPTIONS,
		shrineTemplates: SHRINE_TEMPLATES,
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

		const title = sanitizeTitle(formData.get("title") as string);
		if (!title) {
			return fail(400, {
				error: "Title is required",
				error_code: "MISSING_TITLE",
			});
		}

		const shrineType = formData.get("shrineType") as string;
		if (!isValidShrineType(shrineType)) {
			return fail(400, {
				error: "Invalid shrine type",
				error_code: "INVALID_TYPE",
			});
		}

		const size = formData.get("size") as string;
		if (!isValidSize(size)) {
			return fail(400, { error: "Invalid size", error_code: "INVALID_SIZE" });
		}

		const frameStyle = formData.get("frameStyle") as string;
		if (!isValidFrameStyle(frameStyle)) {
			return fail(400, {
				error: "Invalid frame style",
				error_code: "INVALID_FRAME",
			});
		}

		const description = sanitizeDescription(formData.get("description") as string);
		const id = generateShrineId();

		// Auto-populate with template contents based on shrine type
		const templateContents = SHRINE_TEMPLATES[shrineType as ShrineType] ?? [];
		const contentsJson = JSON.stringify(templateContents);

		try {
			const maxSort = await db
				.prepare(
					`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM shrines WHERE tenant_id = ?`,
				)
				.bind(tenantId)
				.first<{ max_sort: number }>();

			const sortOrder = (maxSort?.max_sort ?? -1) + 1;

			await db
				.prepare(
					`INSERT INTO shrines (id, tenant_id, title, shrine_type, description, size, frame_style, contents, is_published, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
				)
				.bind(
					id,
					tenantId,
					title,
					shrineType,
					description,
					size,
					frameStyle,
					contentsJson,
					sortOrder,
				)
				.run();

			return { success: true, shrineAdded: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	togglePublish: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const shrineId = formData.get("shrineId") as string;
		const isPublished = formData.get("isPublished") === "true" ? 0 : 1;

		try {
			await db
				.prepare(
					`UPDATE shrines SET is_published = ?, updated_at = datetime('now')
           WHERE id = ? AND tenant_id = ?`,
				)
				.bind(isPublished, shrineId, tenantId)
				.run();

			return { success: true, publishToggled: true };
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
		const shrineId = formData.get("shrineId") as string;

		try {
			await db
				.prepare(`DELETE FROM shrines WHERE id = ? AND tenant_id = ?`)
				.bind(shrineId, tenantId)
				.run();

			return { success: true, shrineRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},

	updateContents: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const shrineId = formData.get("shrineId") as string;
		const contentsRaw = formData.get("contents") as string;

		if (!shrineId || !contentsRaw) {
			return fail(400, { error: "Missing required fields", error_code: "MISSING_FIELDS" });
		}

		if (contentsRaw.length > MAX_CONTENTS_SIZE) {
			return fail(400, { error: "Contents too large", error_code: "CONTENTS_TOO_LARGE" });
		}

		// Validate JSON structure
		const contents = parseContents(contentsRaw);
		const validatedJson = JSON.stringify(contents);

		try {
			await db
				.prepare(
					`UPDATE shrines SET contents = ?, updated_at = datetime('now')
           WHERE id = ? AND tenant_id = ?`,
				)
				.bind(validatedJson, shrineId, tenantId)
				.run();

			return { success: true, contentsUpdated: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	loadTemplate: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const shrineId = formData.get("shrineId") as string;
		const shrineType = formData.get("shrineType") as string;

		if (!shrineId || !isValidShrineType(shrineType)) {
			return fail(400, { error: "Invalid request", error_code: "INVALID_REQUEST" });
		}

		const templateContents = SHRINE_TEMPLATES[shrineType as ShrineType] ?? [];
		const contentsJson = JSON.stringify(templateContents);

		try {
			await db
				.prepare(
					`UPDATE shrines SET contents = ?, updated_at = datetime('now')
           WHERE id = ? AND tenant_id = ?`,
				)
				.bind(contentsJson, shrineId, tenantId)
				.run();

			return { success: true, templateLoaded: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},
};
