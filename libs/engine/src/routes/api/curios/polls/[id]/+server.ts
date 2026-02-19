/**
 * Polls Curio API — Single Poll
 *
 * GET    — Get poll with results (public)
 * POST   — Cast a vote (public, rate-limited)
 * DELETE — Delete poll (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateVoteId,
  parseOptions,
  parseSelectedOptions,
  calculateResults,
  isPollClosed,
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
}

interface VoteRow {
  selected_options: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Get poll with results
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const poll = await db
    .prepare(
      `SELECT id, tenant_id, question, description, poll_type, options, results_visibility, is_pinned, close_date, created_at
       FROM polls WHERE id = ? AND tenant_id = ?`,
    )
    .bind(params.id, tenantId)
    .first<PollRow>();

  if (!poll) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  const options = parseOptions(poll.options);
  const isClosed = isPollClosed(poll.close_date);

  // Get votes for results
  const votesResult = await db
    .prepare(
      `SELECT selected_options FROM poll_votes WHERE poll_id = ? AND tenant_id = ?`,
    )
    .bind(params.id, tenantId)
    .all<VoteRow>();

  const votes = votesResult.results.map((v) => ({
    selectedOptions: parseSelectedOptions(v.selected_options),
  }));

  const results = calculateResults(options, votes);

  // Check if current visitor has voted
  let hasVoted = false;
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(params.id + clientIp + userAgent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const voterHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const existing = await db
      .prepare(
        `SELECT id FROM poll_votes WHERE poll_id = ? AND voter_hash = ? AND tenant_id = ?`,
      )
      .bind(params.id, voterHash, tenantId)
      .first<{ id: string }>();

    hasVoted = Boolean(existing);
  } catch {
    // If hashing fails, assume not voted
  }

  // Determine if results should be shown
  let showResults = false;
  if (poll.results_visibility === "always") showResults = true;
  else if (poll.results_visibility === "after-vote" && hasVoted)
    showResults = true;
  else if (poll.results_visibility === "after-close" && isClosed)
    showResults = true;

  return json({
    poll: {
      id: poll.id,
      question: poll.question,
      description: poll.description,
      pollType: poll.poll_type,
      options,
      resultsVisibility: poll.results_visibility,
      isPinned: Boolean(poll.is_pinned),
      isClosed,
      closeDate: poll.close_date,
      results: showResults ? results : null,
      hasVoted,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Cast a vote (public)
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Verify poll exists and is not closed
  const poll = await db
    .prepare(
      `SELECT id, poll_type, options, close_date FROM polls WHERE id = ? AND tenant_id = ?`,
    )
    .bind(params.id, tenantId)
    .first<{
      id: string;
      poll_type: string;
      options: string;
      close_date: string | null;
    }>();

  if (!poll) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  if (isPollClosed(poll.close_date)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  // Validate selected options
  const selectedOptions = Array.isArray(body.selectedOptions)
    ? body.selectedOptions.filter((s: unknown) => typeof s === "string")
    : [];

  if (selectedOptions.length === 0) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const validOptions = parseOptions(poll.options);
  const validOptionIds = new Set(validOptions.map((o) => o.id));
  const filtered = selectedOptions.filter((id: string) =>
    validOptionIds.has(id),
  );

  if (filtered.length === 0) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Single choice: only one option allowed
  if (poll.poll_type === "single" && filtered.length > 1) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Generate voter hash
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  let voterHash: string;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(params.id + clientIp + userAgent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    voterHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  const id = generateVoteId();

  try {
    await db
      .prepare(
        `INSERT INTO poll_votes (id, poll_id, tenant_id, voter_hash, selected_options)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, params.id, tenantId, voterHash, JSON.stringify(filtered))
      .run();
  } catch (err: unknown) {
    // Unique constraint violation = already voted
    if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      String((err as { message: string }).message).includes("UNIQUE")
    ) {
      throwGroveError(409, API_ERRORS.RATE_LIMITED, "API");
    }
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Poll vote failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true, voted: true }, { status: 201 });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete poll (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
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

  const existing = await db
    .prepare(`SELECT id FROM polls WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM poll_votes WHERE poll_id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    await db
      .prepare(`DELETE FROM polls WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Poll delete failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
