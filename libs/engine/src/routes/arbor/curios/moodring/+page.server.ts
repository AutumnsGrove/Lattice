import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  isValidMode,
  isValidDisplayStyle,
  isValidColorScheme,
  isValidHexColor,
  sanitizeMoodText,
  sanitizeNote,
  generateMoodLogId,
  MODE_OPTIONS,
  DISPLAY_STYLE_OPTIONS,
  COLOR_SCHEME_OPTIONS,
  MAX_LOG_ENTRIES,
} from "$lib/curios/moodring";

interface MoodRingRow {
  tenant_id: string;
  mode: string;
  manual_mood: string | null;
  manual_color: string | null;
  color_scheme: string;
  display_style: string;
  updated_at: string;
}

interface MoodLogRow {
  id: string;
  mood: string;
  color: string;
  note: string | null;
  logged_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      config: null,
      logEntries: [],
      modeOptions: MODE_OPTIONS,
      displayStyleOptions: DISPLAY_STYLE_OPTIONS,
      colorSchemeOptions: COLOR_SCHEME_OPTIONS,
      error: "Database not available",
    };
  }

  const [configResult, logResult] = await Promise.all([
    db
      .prepare(`SELECT * FROM mood_ring_config WHERE tenant_id = ?`)
      .bind(tenantId)
      .first<MoodRingRow>()
      .catch(() => null),
    db
      .prepare(
        `SELECT id, mood, color, note, logged_at FROM mood_ring_log
         WHERE tenant_id = ? ORDER BY logged_at DESC LIMIT 30`,
      )
      .bind(tenantId)
      .all<MoodLogRow>()
      .catch(() => ({ results: [] as MoodLogRow[] })),
  ]);

  const config = configResult
    ? {
        mode: configResult.mode,
        manualMood: configResult.manual_mood,
        manualColor: configResult.manual_color,
        colorScheme: configResult.color_scheme,
        displayStyle: configResult.display_style,
      }
    : null;

  return {
    config,
    logEntries: logResult.results,
    modeOptions: MODE_OPTIONS,
    displayStyleOptions: DISPLAY_STYLE_OPTIONS,
    colorSchemeOptions: COLOR_SCHEME_OPTIONS,
  };
};

export const actions: Actions = {
  saveConfig: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const mode = isValidMode(formData.get("mode") as string)
      ? (formData.get("mode") as string)
      : "time";

    const displayStyle = isValidDisplayStyle(
      formData.get("displayStyle") as string,
    )
      ? (formData.get("displayStyle") as string)
      : "ring";

    const colorScheme = isValidColorScheme(
      formData.get("colorScheme") as string,
    )
      ? (formData.get("colorScheme") as string)
      : "default";

    const manualMood = sanitizeMoodText(formData.get("manualMood") as string);
    const manualColorRaw = (formData.get("manualColor") as string)?.trim();
    const manualColor =
      manualColorRaw && isValidHexColor(manualColorRaw) ? manualColorRaw : null;

    try {
      await db
        .prepare(
          `INSERT INTO mood_ring_config (tenant_id, mode, manual_mood, manual_color, color_scheme, display_style, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             mode = excluded.mode,
             manual_mood = excluded.manual_mood,
             manual_color = excluded.manual_color,
             color_scheme = excluded.color_scheme,
             display_style = excluded.display_style,
             updated_at = datetime('now')`,
        )
        .bind(
          tenantId,
          mode,
          manualMood,
          manualColor,
          colorScheme,
          displayStyle,
        )
        .run();

      return { success: true, configSaved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  logMood: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const mood = sanitizeMoodText(formData.get("mood") as string);
    if (!mood) {
      return fail(400, {
        error: "Mood text is required",
        error_code: "MISSING_MOOD",
      });
    }

    const colorRaw = (formData.get("color") as string)?.trim();
    const color = colorRaw && isValidHexColor(colorRaw) ? colorRaw : "#7cb85c";
    const note = sanitizeNote(formData.get("note") as string);
    const id = generateMoodLogId();

    try {
      await db
        .prepare(
          `INSERT INTO mood_ring_log (id, tenant_id, mood, color, note) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, tenantId, mood, color, note)
        .run();

      // Prune
      await db
        .prepare(
          `DELETE FROM mood_ring_log WHERE tenant_id = ? AND id NOT IN (
             SELECT id FROM mood_ring_log WHERE tenant_id = ? ORDER BY logged_at DESC LIMIT ?
           )`,
        )
        .bind(tenantId, tenantId, MAX_LOG_ENTRIES)
        .run();

      return { success: true, moodLogged: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },
};
