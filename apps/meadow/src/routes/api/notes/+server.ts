/**
 * Notes API — Create a Note
 *
 * POST /api/notes — Leave a note in the meadow
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createNote } from "$lib/server/notes";
import { sanitizeNoteHtml } from "$lib/server/sanitize";
import { createThreshold } from "@autumnsgrove/lattice/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";

const MAX_BODY_LENGTH = 1000;
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;

export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

  // Rate limit: 30 notes per hour
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/notes",
      limit: 30,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  // Parse and validate body
  let payload: { body?: string; content_html?: string; tags?: string[] };
  try {
    payload = await request.json();
  } catch {
    return json(
      { error: "GROVE-API-001", error_description: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length === 0 || body.length > MAX_BODY_LENGTH) {
    return json(
      {
        error: "GROVE-API-040",
        error_description: `Note body must be 1-${MAX_BODY_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  // Validate tags
  let tags: string[] = [];
  if (Array.isArray(payload.tags)) {
    tags = payload.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= MAX_TAG_LENGTH)
      .slice(0, MAX_TAGS);
  }

  // Sanitize content_html if provided
  const contentHtml =
    typeof payload.content_html === "string"
      ? sanitizeNoteHtml(payload.content_html)
      : null;

  // Resolve the user's tenant for FK constraint on meadow_posts.tenant_id
  let tenantId = "";
  let authorSubdomain = "";
  try {
    const tenant = await db
      .prepare(
        "SELECT id, subdomain FROM tenants WHERE user_id = ? AND active = 1 LIMIT 1",
      )
      .bind(locals.user.id)
      .first<{ id: string; subdomain: string }>();
    if (tenant) {
      tenantId = tenant.id;
      authorSubdomain = tenant.subdomain ?? "";
    }
  } catch (err) {
    console.error("[Notes API] Tenant lookup failed:", err);
  }

  if (!tenantId) {
    return json(
      {
        error: "GROVE-API-041",
        error_code: "NO_TENANT",
        error_description:
          "You need a Grove blog before you can leave notes. Plant one at plant.grove.place!",
      },
      { status: 403 },
    );
  }

  try {
    const post = await createNote(
      db,
      locals.user.id,
      locals.user.name ?? null,
      body,
      tags,
      contentHtml,
      tenantId,
      authorSubdomain,
    );

    return json({ success: true, post }, { status: 201 });
  } catch (err) {
    console.error("[Notes API] Create failed:", err);
    return json(
      {
        error: "GROVE-API-080",
        error_code: "INTERNAL_ERROR",
        error_description: "Failed to create note. Please try again.",
      },
      { status: 500 },
    );
  }
};
