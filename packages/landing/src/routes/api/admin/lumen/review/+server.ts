/**
 * POST /api/admin/lumen/review — Review flagged content (clear or remove)
 *
 * Wayfinder-only endpoint for resolving flagged content from the safety queue.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { updateFlagStatus } from "@autumnsgrove/lattice/thorn";
import { isWayfinder } from "@autumnsgrove/lattice/config";

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user || !isWayfinder(locals.user.email)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  if (!platform?.env?.DB) {
    return json({ error: "Database not configured" }, { status: 500 });
  }

  let body: { flagId?: string; action?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { flagId, action, notes } = body;

  if (!flagId) {
    return json({ error: "flagId is required" }, { status: 400 });
  }

  if (action !== "cleared" && action !== "removed") {
    return json(
      { error: 'action must be "cleared" or "removed"' },
      { status: 400 },
    );
  }

  try {
    const success = await updateFlagStatus(
      platform.env.DB,
      flagId,
      action,
      locals.user.email,
      notes?.trim() || undefined,
    );

    if (!success) {
      return json(
        { error: "Flag not found or already reviewed" },
        { status: 409 },
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error("[Lumen/Review] Error:", err);
    return json({ error: "Failed to update flag status" }, { status: 500 });
  }
};
