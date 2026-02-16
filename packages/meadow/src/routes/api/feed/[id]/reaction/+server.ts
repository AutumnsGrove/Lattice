/**
 * Reaction API — Add or remove emoji reactions
 *
 * POST   /api/feed/[id]/reaction — Add reaction { emoji: "❤️" }
 * DELETE /api/feed/[id]/reaction — Remove reaction { emoji: "❤️" }
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { addReaction, removeReaction } from "$lib/server/reactions";
import { isValidReaction } from "$lib/constants/reactions";
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

  let body: { emoji?: string };
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

  if (!body.emoji || !isValidReaction(body.emoji)) {
    return json(
      {
        error: "GROVE-API-042",
        error_code: "VALIDATION_FAILED",
        error_description: "Invalid reaction emoji.",
      },
      { status: 400 },
    );
  }

  // Rate limit
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `meadow/reaction:${locals.user.id}`,
      limit: 60,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const created = await addReaction(db, locals.user.id, params.id, body.emoji);
  return json({ success: true, created });
};

export const DELETE: RequestHandler = async ({
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

  let body: { emoji?: string };
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

  if (!body.emoji) {
    return json(
      {
        error: "GROVE-API-041",
        error_code: "MISSING_REQUIRED_FIELDS",
        error_description: "Emoji is required.",
      },
      { status: 400 },
    );
  }

  // Rate limit
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `meadow/reaction:${locals.user.id}`,
      limit: 60,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const removed = await removeReaction(
    db,
    locals.user.id,
    params.id,
    body.emoji,
  );
  return json({ success: true, removed });
};
