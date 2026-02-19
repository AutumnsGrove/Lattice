import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { stripHtml } from "$lib/curios/sanitize";
import {
  generatePollId,
  generateOptionId,
  isValidPollType,
  isValidResultsVisibility,
  sanitizeQuestion,
  sanitizeOptionText,
  parseOptions,
  POLL_TYPE_OPTIONS,
  RESULTS_VISIBILITY_OPTIONS,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MAX_DESCRIPTION_LENGTH,
  type PollRecord,
} from "$lib/curios/polls";

interface PollRow {
  id: string;
  tenant_id: string;
  question: string;
  description: string | null;
  poll_type: string;
  options: string;
  results_visibility: string;
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
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      polls: [],
      pollTypeOptions: POLL_TYPE_OPTIONS,
      visibilityOptions: RESULTS_VISIBILITY_OPTIONS,
      error: "Database not available",
    };
  }

  const [pollsResult, voteCounts] = await Promise.all([
    db
      .prepare(
        `SELECT id, tenant_id, question, description, poll_type, options, results_visibility, is_pinned, close_date, created_at, updated_at
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

  const voteCountMap = new Map(
    voteCounts.results.map((v) => [v.poll_id, v.vote_count]),
  );

  const polls = pollsResult.results.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    question: row.question,
    description: row.description,
    pollType: row.poll_type,
    options: parseOptions(row.options),
    resultsVisibility: row.results_visibility,
    isPinned: Boolean(row.is_pinned),
    closeDate: row.close_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    voteCount: voteCountMap.get(row.id) ?? 0,
  }));

  return {
    polls,
    pollTypeOptions: POLL_TYPE_OPTIONS,
    visibilityOptions: RESULTS_VISIBILITY_OPTIONS,
  };
};

export const actions: Actions = {
  create: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const question = sanitizeQuestion(
      formData.get("question") as string | null,
    );

    if (!question) {
      return fail(400, {
        error: "Question is required",
        error_code: "MISSING_QUESTION",
      });
    }

    const description =
      stripHtml(formData.get("description") as string)
        .trim()
        .slice(0, MAX_DESCRIPTION_LENGTH) || null;

    const pollType = formData.get("pollType") as string;
    const finalPollType = isValidPollType(pollType) ? pollType : "single";

    const resultsVisibility = formData.get("resultsVisibility") as string;
    const finalVisibility = isValidResultsVisibility(resultsVisibility)
      ? resultsVisibility
      : "after-vote";

    // Parse options from form
    const optionTexts: string[] = [];
    for (let i = 0; i < MAX_OPTIONS; i++) {
      const text = sanitizeOptionText(
        formData.get(`option_${i}`) as string | null,
      );
      if (text) optionTexts.push(text);
    }

    if (optionTexts.length < MIN_OPTIONS) {
      return fail(400, {
        error: `At least ${MIN_OPTIONS} options are required`,
        error_code: "TOO_FEW_OPTIONS",
      });
    }

    const options = optionTexts.map((text) => ({
      id: generateOptionId(),
      text,
    }));

    const isPinned = formData.get("isPinned") === "true";
    const closeDate = (formData.get("closeDate") as string) || null;

    const id = generatePollId();

    try {
      await db
        .prepare(
          `INSERT INTO polls (id, tenant_id, question, description, poll_type, options, results_visibility, is_pinned, close_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          tenantId,
          question,
          description,
          finalPollType,
          JSON.stringify(options),
          finalVisibility,
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

  remove: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const pollId = formData.get("pollId") as string;

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
