/**
 * Polls Curio API
 *
 * GET  — Fetch polls (public, paginated)
 * POST — Create a new poll (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { stripHtml } from "$lib/curios/sanitize";
import {
  generatePollId,
  generateOptionId,
  isValidPollType,
  isValidResultsVisibility,
  sanitizeQuestion,
  sanitizeOptionText,
  parseOptions,
  isPollClosed,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MAX_DESCRIPTION_LENGTH,
  MAX_POLLS_PER_TENANT,
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
  is_pinned: number;
  close_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch polls (public)
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "10") || 10),
    50,
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0") || 0,
  );

  try {
    const result = await db
      .prepare(
        `SELECT id, tenant_id, question, description, poll_type, options, results_visibility, is_pinned, close_date, created_at, updated_at
         FROM polls
         WHERE tenant_id = ?
         ORDER BY is_pinned DESC, created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(tenantId, limit, offset)
      .all<PollRow>();

    const polls = result.results.map((row) => ({
      id: row.id,
      question: row.question,
      description: row.description,
      pollType: row.poll_type,
      options: parseOptions(row.options),
      resultsVisibility: row.results_visibility,
      isPinned: Boolean(row.is_pinned),
      isClosed: isPollClosed(row.close_date),
      closeDate: row.close_date,
      createdAt: row.created_at,
    }));

    return json(
      { polls },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Polls fetch failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Create a new poll (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
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

  const question = sanitizeQuestion(body.question as string | null);
  if (!question) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const description =
    typeof body.description === "string"
      ? stripHtml(body.description).trim().slice(0, MAX_DESCRIPTION_LENGTH) ||
        null
      : null;

  const pollType = isValidPollType(String(body.pollType ?? "single"))
    ? String(body.pollType)
    : "single";

  const resultsVisibility = isValidResultsVisibility(
    String(body.resultsVisibility ?? "after-vote"),
  )
    ? String(body.resultsVisibility)
    : "after-vote";

  // Process options
  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const options: PollOption[] = rawOptions
    .map((opt: unknown) => {
      const text = sanitizeOptionText(
        typeof opt === "string" ? opt : (opt as Record<string, string>)?.text,
      );
      return text ? { id: generateOptionId(), text } : null;
    })
    .filter((opt): opt is PollOption => opt !== null)
    .slice(0, MAX_OPTIONS);

  if (options.length < MIN_OPTIONS) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const isPinned = typeof body.isPinned === "boolean" ? body.isPinned : false;
  const closeDate = typeof body.closeDate === "string" ? body.closeDate : null;

  const id = generatePollId();

  // Enforce per-tenant poll limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM polls WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_POLLS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

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
        pollType,
        JSON.stringify(options),
        resultsVisibility,
        isPinned ? 1 : 0,
        closeDate,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Poll create failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    { success: true, poll: { id, question, options } },
    { status: 201 },
  );
};
