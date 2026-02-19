/**
 * Report API — Report a post for moderation
 *
 * POST /api/feed/[id]/report — Submit report { reason, details? }
 *
 * Auto-hide: if a post accumulates 5+ reports, set visible = 0.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { VALID_REPORT_REASONS } from "$lib/server/types";
import { validateUUID } from "@autumnsgrove/lattice/utils/validation";
import { createThreshold } from "@autumnsgrove/lattice/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";

export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    return json(
      {
        error: "GROVE-API-020",
        error_code: "UNAUTHORIZED",
        error_description: "Please sign in to continue.",
      },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!validateUUID(params.id)) {
    return json(
      {
        error: "GROVE-API-040",
        error_code: "INVALID_REQUEST_BODY",
        error_description: "Invalid post ID format.",
      },
      { status: 400 },
    );
  }

  // Rate limit — check early before parsing body or hitting DB
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/report",
      limit: 10,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  let body: { reason?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "GROVE-API-040",
        error_code: "INVALID_REQUEST_BODY",
        error_description: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  if (!body.reason || !VALID_REPORT_REASONS.has(body.reason)) {
    return json(
      {
        error: "GROVE-API-042",
        error_code: "VALIDATION_FAILED",
        error_description: "Invalid report reason.",
      },
      { status: 400 },
    );
  }

  // Sanitize details (max 500 chars, strip HTML)
  const details = body.details
    ? body.details.slice(0, 500).replace(/<[^>]*>/g, "")
    : null;

  const id = crypto.randomUUID();

  try {
    // Verify the post exists before accepting a report
    const post = await db
      .prepare("SELECT id FROM meadow_posts WHERE id = ?")
      .bind(params.id)
      .first();

    if (!post) {
      return json(
        {
          error: "GROVE-API-044",
          error_code: "NOT_FOUND",
          error_description: "Post not found.",
        },
        { status: 404 },
      );
    }

    // Check for duplicate report from same user
    const existing = await db
      .prepare(
        `SELECT id FROM meadow_reports WHERE user_id = ? AND post_id = ?`,
      )
      .bind(locals.user.id, params.id)
      .first();

    if (existing) {
      return json(
        {
          error: "GROVE-API-042",
          error_code: "VALIDATION_FAILED",
          error_description: "You've already reported this post.",
        },
        { status: 409 },
      );
    }

    // Batch the INSERT + conditional auto-hide atomically.
    // D1 batch() runs statements sequentially in a single transaction.
    // The COUNT(*) subquery sees the row from the preceding INSERT,
    // so there's no race window between checking and acting.
    await db.batch([
      db
        .prepare(
          `INSERT INTO meadow_reports (id, user_id, post_id, reason, details)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, locals.user.id, params.id, body.reason, details),
      db
        .prepare(
          `UPDATE meadow_posts SET visible = 0
           WHERE id = ? AND (SELECT COUNT(*) FROM meadow_reports WHERE post_id = ?) >= 5`,
        )
        .bind(params.id, params.id),
    ]);
  } catch (err) {
    console.error("[Meadow Report] Insert failed:", err);
    return json(
      {
        error: "GROVE-API-080",
        error_code: "INTERNAL_ERROR",
        error_description: "Something went wrong.",
      },
      { status: 500 },
    );
  }

  return json({ success: true }, { status: 201 });
};
