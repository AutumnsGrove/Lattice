import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { stripHtml } from "$lib/curios/sanitize";
import { parseFormData } from "$lib/server/utils/form-data";
import {
	generatePollId,
	generateOptionId,
	isValidPollType,
	isValidResultsVisibility,
	isValidContainerStyle,
	isValidEmoji,
	sanitizeQuestion,
	sanitizeOptionText,
	parseOptions,
	isPollClosed,
	POLL_TYPE_OPTIONS,
	RESULTS_VISIBILITY_OPTIONS,
	CONTAINER_STYLE_OPTIONS,
	MIN_OPTIONS,
	MAX_OPTIONS,
	MAX_DESCRIPTION_LENGTH,
	type PollOption,
} from "$lib/curios/polls";

interface PollRow {
	id: string;
	tenant_id: string;
	question: string;
	description: string | null;
	poll_type: string;
	options: string;
	results_visibility: string;
	container_style: string;
	status: string;
	is_pinned: number;
	close_date: string | null;
	created_at: string;
	updated_at: string;
}

interface VoteCountRow {
	poll_id: string;
	vote_count: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			polls: [],
			pollTypeOptions: POLL_TYPE_OPTIONS,
			visibilityOptions: RESULTS_VISIBILITY_OPTIONS,
			containerStyleOptions: CONTAINER_STYLE_OPTIONS,
			error: "Database not available",
		};
	}

	const [pollsResult, voteCounts] = await Promise.all([
		db
			.prepare(
				`SELECT id, tenant_id, question, description, poll_type, options, results_visibility, container_style, status, is_pinned, close_date, created_at, updated_at
         FROM polls WHERE tenant_id = ?
         ORDER BY is_pinned DESC, created_at DESC`,
			)
			.bind(tenantId)
			.all<PollRow>()
			.catch(() => ({ results: [] as PollRow[] })),
		db
			.prepare(
				`SELECT poll_id, COUNT(*) as vote_count
         FROM poll_votes WHERE tenant_id = ?
         GROUP BY poll_id`,
			)
			.bind(tenantId)
			.all<VoteCountRow>()
			.catch(() => ({ results: [] as VoteCountRow[] })),
	]);

	const voteCountMap = new Map((voteCounts.results ?? []).map((v) => [v.poll_id, v.vote_count]));

	const polls = (pollsResult.results ?? []).map((row) => ({
		id: row.id,
		tenantId: row.tenant_id,
		question: row.question,
		description: row.description,
		pollType: row.poll_type,
		options: parseOptions(row.options),
		resultsVisibility: row.results_visibility,
		containerStyle: row.container_style || "glass",
		status: row.status || "active",
		isPinned: Boolean(row.is_pinned),
		isClosed: isPollClosed(row.close_date),
		closeDate: row.close_date,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		voteCount: voteCountMap.get(row.id) ?? 0,
	}));

	return {
		polls,
		pollTypeOptions: POLL_TYPE_OPTIONS,
		visibilityOptions: RESULTS_VISIBILITY_OPTIONS,
		containerStyleOptions: CONTAINER_STYLE_OPTIONS,
	};
};

const CreatePollSchema = z.object({
	question: z.string().nullable().optional(),
	description: z.string().optional().default(""),
	pollType: z.string().optional().default("single"),
	resultsVisibility: z.string().optional().default("after-vote"),
	containerStyle: z.string().optional().default("glass"),
	isPinned: z.string().optional(),
	closeDate: z.string().optional().default(""),
});

const PollIdSchema = z.object({
	pollId: z.string().min(1),
});

export const actions: Actions = {
	create: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, CreatePollSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const question = sanitizeQuestion(d.question ?? null);

		if (!question) {
			return fail(400, {
				error: "Question is required",
				error_code: "MISSING_QUESTION",
			});
		}

		const description = stripHtml(d.description).trim().slice(0, MAX_DESCRIPTION_LENGTH) || null;

		const finalPollType = isValidPollType(d.pollType) ? d.pollType : "single";
		const finalVisibility = isValidResultsVisibility(d.resultsVisibility)
			? d.resultsVisibility
			: "after-vote";
		const finalContainerStyle = isValidContainerStyle(d.containerStyle)
			? d.containerStyle
			: "glass";

		// Parse options with optional emoji + color
		const options: PollOption[] = [];
		for (let i = 0; i < MAX_OPTIONS; i++) {
			const text = sanitizeOptionText(formData.get(`option_${i}`) as string | null);
			if (!text) continue;
			const option: PollOption = { id: generateOptionId(), text };
			const emoji = (formData.get(`option_emoji_${i}`) as string | null)?.trim();
			const color = formData.get(`option_color_${i}`) as string | null;
			if (emoji && isValidEmoji(emoji)) option.emoji = emoji;
			if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) option.color = color;
			options.push(option);
		}

		if (options.length < MIN_OPTIONS) {
			return fail(400, {
				error: `At least ${MIN_OPTIONS} options are required`,
				error_code: "TOO_FEW_OPTIONS",
			});
		}

		const isPinned = d.isPinned === "true";
		const closeDate = d.closeDate || null;

		const id = generatePollId();

		try {
			await db
				.prepare(
					`INSERT INTO polls (id, tenant_id, question, description, poll_type, options, results_visibility, container_style, is_pinned, close_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					tenantId,
					question,
					description,
					finalPollType,
					JSON.stringify(options),
					finalVisibility,
					finalContainerStyle,
					isPinned ? 1 : 0,
					closeDate,
				)
				.run();

			return { success: true, pollCreated: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	archive: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, PollIdSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { pollId } = parsed.data;

		try {
			await db
				.prepare(
					`UPDATE polls SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`,
				)
				.bind(pollId, tenantId)
				.run();

			return { success: true, pollArchived: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},

	duplicate: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, PollIdSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const sourcePollId = parsed.data.pollId;

		const source = await db
			.prepare(
				`SELECT question, description, poll_type, options, results_visibility, container_style FROM polls WHERE id = ? AND tenant_id = ?`,
			)
			.bind(sourcePollId, tenantId)
			.first<{
				question: string;
				description: string | null;
				poll_type: string;
				options: string;
				results_visibility: string;
				container_style: string;
			}>();

		if (!source) {
			return fail(404, { error: "Poll not found", error_code: "NOT_FOUND" });
		}

		// Re-generate option IDs for the duplicate
		const sourceOptions = parseOptions(source.options);
		const newOptions = sourceOptions.map((opt) => ({
			...opt,
			id: generateOptionId(),
		}));

		const id = generatePollId();

		try {
			await db
				.prepare(
					`INSERT INTO polls (id, tenant_id, question, description, poll_type, options, results_visibility, container_style)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					tenantId,
					source.question,
					source.description,
					source.poll_type,
					JSON.stringify(newOptions),
					source.results_visibility,
					source.container_style || "glass",
				)
				.run();

			return { success: true, pollDuplicated: true };
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
		const parsed = parseFormData(formData, PollIdSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { pollId } = parsed.data;

		try {
			await db
				.prepare(`DELETE FROM poll_votes WHERE poll_id = ? AND tenant_id = ?`)
				.bind(pollId, tenantId)
				.run();

			await db
				.prepare(`DELETE FROM polls WHERE id = ? AND tenant_id = ?`)
				.bind(pollId, tenantId)
				.run();

			return { success: true, pollRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
