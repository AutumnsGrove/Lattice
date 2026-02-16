/**
 * Report API — Report a post for moderation
 *
 * POST /api/feed/[id]/report — Submit report { reason, details? }
 *
 * Auto-hide: if a post accumulates 3+ reports, set visible = 0.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { VALID_REPORT_REASONS } from "$lib/server/types";
import { createThreshold } from "@autumnsgrove/groveengine/threshold";
import { thresholdCheck } from "@autumnsgrove/groveengine/threshold/sveltekit";

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

  // Rate limit — check early before parsing body or hitting DB
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `meadow/report:${locals.user.id}`,
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
    // The UPDATE uses a subquery so the count reflects the newly inserted
    // report — no race window between checking and acting.
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
           WHERE id = ? AND (SELECT COUNT(*) FROM meadow_reports WHERE post_id = ?) >= 3`,
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
