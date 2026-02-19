/**
 * Note Delete API — Remove your own Note
 *
 * DELETE /api/notes/[id] — Delete a note you authored
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteNote } from "$lib/server/notes";
import { createThreshold } from "@autumnsgrove/lattice/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
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

  // Rate limit: 60 deletes per hour
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/notes/delete",
      limit: 60,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const deleted = await deleteNote(db, locals.user.id, params.id);
  if (!deleted) {
    return json(
      {
        error: "GROVE-API-044",
        error_description: "Note not found or you don't have permission.",
      },
      { status: 404 },
    );
  }

  return json({ success: true, deleted: true });
};
