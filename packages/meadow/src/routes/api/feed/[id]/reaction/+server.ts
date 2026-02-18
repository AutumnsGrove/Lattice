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
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/reaction",
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
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/reaction",
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
