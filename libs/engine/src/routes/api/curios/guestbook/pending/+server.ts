/**
 * Guestbook Curio API — Pending Entries (Admin)
 *
 * GET — Fetch entries awaiting approval
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface EntryRow {
  id: string;
  name: string;
  message: string;
  emoji: string | null;
  ip_hash: string | null;
  created_at: string;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
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

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const [entriesResult, total] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, message, emoji, ip_hash, created_at
         FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 0
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(tenantId, limit, offset)
      .all<EntryRow>(),

    db
      .prepare(
        `SELECT COUNT(*) as total FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 0`,
      )
      .bind(tenantId)
      .first<{ total: number }>()
      .then((r) => r?.total ?? 0)
      .catch(() => 0),
  ]);

  const entries = entriesResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    message: row.message,
    emoji: row.emoji,
    ipHash: row.ip_hash,
    createdAt: row.created_at,
  }));

  return json({
    entries,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + entries.length < total,
    },
  });
};
