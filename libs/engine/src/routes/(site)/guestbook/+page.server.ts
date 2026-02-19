/**
 * Guestbook Public Route — Server
 *
 * Loads guestbook config and approved entries for the public page.
 * No auth gate — guestbooks are available to all tiers (Seedling+).
 */

import type { PageServerLoad } from "./$types";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";
import {
  DEFAULT_GUESTBOOK_CONFIG,
  GUESTBOOK_EMOJI,
} from "$lib/curios/guestbook";

interface ConfigRow {
  enabled: number;
  style: string;
  entries_per_page: number;
  require_approval: number;
  allow_emoji: number;
  max_message_length: number;
  custom_prompt: string | null;
}

interface EntryRow {
  id: string;
  name: string;
  message: string;
  emoji: string | null;
  created_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(503, SITE_ERRORS.DB_NOT_CONFIGURED, "Site");
  }

  if (!tenantId) {
    throwGroveError(400, SITE_ERRORS.TENANT_CONTEXT_REQUIRED, "Site");
  }

  // Load config
  const config = await db
    .prepare(
      `SELECT enabled, style, entries_per_page, require_approval,
              allow_emoji, max_message_length, custom_prompt
       FROM guestbook_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config?.enabled) {
    throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
  }

  const entriesPerPage = config.entries_per_page || 20;

  // Fetch entries and count in parallel
  const [entriesResult, total] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, message, emoji, created_at
         FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 1
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(tenantId, entriesPerPage)
      .all<EntryRow>()
      .catch(() => ({ results: [] as EntryRow[] })),

    db
      .prepare(
        `SELECT COUNT(*) as total FROM guestbook_entries
         WHERE tenant_id = ? AND approved = 1`,
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
    createdAt: row.created_at,
  }));

  return {
    entries,
    total,
    config: {
      style: config.style || DEFAULT_GUESTBOOK_CONFIG.style,
      entriesPerPage,
      allowEmoji: Boolean(config.allow_emoji),
      maxMessageLength: config.max_message_length || 500,
      customPrompt: config.custom_prompt,
      requireApproval: Boolean(config.require_approval),
    },
    emoji: GUESTBOOK_EMOJI as unknown as string[],
  };
};
