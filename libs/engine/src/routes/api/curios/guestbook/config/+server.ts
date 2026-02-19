/**
 * Guestbook Curio API — Config (Admin)
 *
 * GET  — Fetch guestbook config
 * POST — Update guestbook config
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { DEFAULT_GUESTBOOK_CONFIG } from "$lib/curios/guestbook";

interface ConfigRow {
  enabled: number;
  style: string;
  entries_per_page: number;
  require_approval: number;
  allow_emoji: number;
  max_message_length: number;
  custom_prompt: string | null;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch config
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ platform, locals }) => {
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

  const config = await db
    .prepare(
      `SELECT enabled, style, entries_per_page, require_approval,
              allow_emoji, max_message_length, custom_prompt, updated_at
       FROM guestbook_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    return json({ config: DEFAULT_GUESTBOOK_CONFIG });
  }

  return json({
    config: {
      enabled: Boolean(config.enabled),
      style: config.style,
      entriesPerPage: config.entries_per_page,
      requireApproval: Boolean(config.require_approval),
      allowEmoji: Boolean(config.allow_emoji),
      maxMessageLength: config.max_message_length,
      customPrompt: config.custom_prompt,
      updatedAt: config.updated_at,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Update config
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

  // Validate style
  const validStyles = ["cozy", "classic", "modern", "pixel"];
  const style = validStyles.includes(body.style as string)
    ? (body.style as string)
    : DEFAULT_GUESTBOOK_CONFIG.style;

  // Validate entries per page (10-100)
  const entriesPerPage = Math.max(
    10,
    Math.min(100, parseInt(String(body.entriesPerPage)) || 20),
  );

  // Validate max message length (50-2000)
  const maxMessageLength = Math.max(
    50,
    Math.min(2000, parseInt(String(body.maxMessageLength)) || 500),
  );

  try {
    await db
      .prepare(
        `INSERT INTO guestbook_config (
           tenant_id, enabled, style, entries_per_page, require_approval,
           allow_emoji, max_message_length, custom_prompt, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id) DO UPDATE SET
           enabled = excluded.enabled,
           style = excluded.style,
           entries_per_page = excluded.entries_per_page,
           require_approval = excluded.require_approval,
           allow_emoji = excluded.allow_emoji,
           max_message_length = excluded.max_message_length,
           custom_prompt = excluded.custom_prompt,
           updated_at = datetime('now')`,
      )
      .bind(
        tenantId,
        body.enabled ? 1 : 0,
        style,
        entriesPerPage,
        body.requireApproval ? 1 : 0,
        body.allowEmoji ? 1 : 0,
        maxMessageLength,
        typeof body.customPrompt === "string"
          ? body.customPrompt.trim() || null
          : null,
      )
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Guestbook config save failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json({ success: true });
};
