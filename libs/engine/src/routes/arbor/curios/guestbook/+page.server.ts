import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  DEFAULT_GUESTBOOK_CONFIG,
  GUESTBOOK_STYLE_OPTIONS,
} from "$lib/curios/guestbook";

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

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      config: null,
      stats: { totalEntries: 0, pendingEntries: 0, approvedEntries: 0 },
      styleOptions: GUESTBOOK_STYLE_OPTIONS,
      error: "Database not available",
    };
  }

  // PERFORMANCE: Run config and all counts in parallel
  const [config, totalEntries, pendingEntries, approvedEntries] =
    await Promise.all([
      db
        .prepare(
          `SELECT enabled, style, entries_per_page, require_approval,
                allow_emoji, max_message_length, custom_prompt, updated_at
         FROM guestbook_config WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<ConfigRow>(),

      db
        .prepare(
          `SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<{ count: number }>()
        .then((r) => r?.count ?? 0)
        .catch(() => 0),

      db
        .prepare(
          `SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ? AND approved = 0`,
        )
        .bind(tenantId)
        .first<{ count: number }>()
        .then((r) => r?.count ?? 0)
        .catch(() => 0),

      db
        .prepare(
          `SELECT COUNT(*) as count FROM guestbook_entries WHERE tenant_id = ? AND approved = 1`,
        )
        .bind(tenantId)
        .first<{ count: number }>()
        .then((r) => r?.count ?? 0)
        .catch(() => 0),
    ]);

  let parsedConfig = null;
  if (config) {
    parsedConfig = {
      enabled: Boolean(config.enabled),
      style: config.style,
      entriesPerPage: config.entries_per_page,
      requireApproval: Boolean(config.require_approval),
      allowEmoji: Boolean(config.allow_emoji),
      maxMessageLength: config.max_message_length,
      customPrompt: config.custom_prompt,
      updatedAt: config.updated_at,
    };
  }

  return {
    config: parsedConfig || DEFAULT_GUESTBOOK_CONFIG,
    stats: {
      totalEntries,
      pendingEntries,
      approvedEntries,
    },
    styleOptions: GUESTBOOK_STYLE_OPTIONS,
  };
};

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();

    const enabled = formData.get("enabled") === "true";
    const style = formData.get("style") as string;
    const entriesPerPage =
      parseInt(formData.get("entriesPerPage") as string) || 20;
    const requireApproval = formData.get("requireApproval") === "true";
    const allowEmoji = formData.get("allowEmoji") === "true";
    const maxMessageLength =
      parseInt(formData.get("maxMessageLength") as string) || 500;
    const customPrompt = formData.get("customPrompt") as string | null;

    // Validate
    const validStyles = ["cozy", "classic", "modern", "pixel"];
    const finalStyle = validStyles.includes(style)
      ? style
      : DEFAULT_GUESTBOOK_CONFIG.style;
    const validEntriesPerPage = Math.max(10, Math.min(100, entriesPerPage));
    const validMaxMessageLength = Math.max(
      50,
      Math.min(2000, maxMessageLength),
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
          enabled ? 1 : 0,
          finalStyle,
          validEntriesPerPage,
          requireApproval ? 1 : 0,
          allowEmoji ? 1 : 0,
          validMaxMessageLength,
          customPrompt?.trim() || null,
        )
        .run();

      return { success: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },
};
