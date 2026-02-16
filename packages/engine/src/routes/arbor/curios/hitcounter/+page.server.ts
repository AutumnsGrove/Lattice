import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateHitCounterId,
  sanitizeLabel,
  DEFAULT_HIT_COUNTER_CONFIG,
  HIT_COUNTER_STYLE_OPTIONS,
  HIT_COUNTER_LABEL_PRESETS,
  HIT_COUNTER_COUNT_MODE_OPTIONS,
  HIT_COUNTER_SINCE_DATE_STYLE_OPTIONS,
  VALID_COUNT_MODES,
  VALID_SINCE_DATE_STYLES,
  type HitCounterCountMode,
  type HitCounterSinceDateStyle,
} from "$lib/curios/hitcounter";

interface CounterRow {
  id: string;
  page_path: string;
  count: number;
  style: string;
  label: string;
  show_since_date: number;
  started_at: string;
  updated_at: string;
  count_mode: string;
  since_date_style: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      config: null,
      styleOptions: HIT_COUNTER_STYLE_OPTIONS,
      labelPresets: HIT_COUNTER_LABEL_PRESETS,
      countModeOptions: HIT_COUNTER_COUNT_MODE_OPTIONS,
      sinceDateStyleOptions: HIT_COUNTER_SINCE_DATE_STYLE_OPTIONS,
      error: "Database not available",
    };
  }

  const counter = await db
    .prepare(
      `SELECT id, page_path, count, style, label, show_since_date, started_at, updated_at, count_mode, since_date_style
       FROM hit_counters
       WHERE tenant_id = ? AND page_path = '/'`,
    )
    .bind(tenantId)
    .first<CounterRow>()
    .catch(() => null);

  let parsedConfig = null;
  if (counter) {
    parsedConfig = {
      pagePath: counter.page_path,
      count: counter.count,
      style: counter.style,
      label: counter.label,
      showSinceDate: Boolean(counter.show_since_date),
      startedAt: counter.started_at,
      updatedAt: counter.updated_at,
      countMode: (counter.count_mode || "every") as HitCounterCountMode,
      sinceDateStyle: (counter.since_date_style ||
        "footnote") as HitCounterSinceDateStyle,
    };
  }

  return {
    config: parsedConfig || {
      ...DEFAULT_HIT_COUNTER_CONFIG,
      startedAt: new Date().toISOString(),
    },
    styleOptions: HIT_COUNTER_STYLE_OPTIONS,
    labelPresets: HIT_COUNTER_LABEL_PRESETS,
    countModeOptions: HIT_COUNTER_COUNT_MODE_OPTIONS,
    sinceDateStyleOptions: HIT_COUNTER_SINCE_DATE_STYLE_OPTIONS,
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

    const style = formData.get("style") as string;
    const label = formData.get("label") as string;
    const showSinceDate = formData.get("showSinceDate") === "true";
    const countMode = formData.get("countMode") as string;
    const sinceDateStyle = formData.get("sinceDateStyle") as string;

    // Validate against allowed values — invalid silently falls back to defaults
    const validStyles = ["classic", "odometer", "minimal", "lcd"];
    const finalStyle = validStyles.includes(style)
      ? style
      : DEFAULT_HIT_COUNTER_CONFIG.style;
    const finalLabel = sanitizeLabel(label);
    const finalCountMode = VALID_COUNT_MODES.includes(
      countMode as HitCounterCountMode,
    )
      ? countMode
      : DEFAULT_HIT_COUNTER_CONFIG.countMode;
    const finalSinceDateStyle = VALID_SINCE_DATE_STYLES.includes(
      sinceDateStyle as HitCounterSinceDateStyle,
    )
      ? sinceDateStyle
      : DEFAULT_HIT_COUNTER_CONFIG.sinceDateStyle;

    try {
      await db
        .prepare(
          `INSERT INTO hit_counters (id, tenant_id, page_path, count, style, label, show_since_date, count_mode, since_date_style, updated_at)
           VALUES (?, ?, '/', 0, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id, page_path) DO UPDATE SET
             style = excluded.style,
             label = excluded.label,
             show_since_date = excluded.show_since_date,
             count_mode = excluded.count_mode,
             since_date_style = excluded.since_date_style,
             updated_at = datetime('now')`,
        )
        .bind(
          generateHitCounterId(),
          tenantId,
          finalStyle,
          finalLabel,
          showSinceDate ? 1 : 0,
          finalCountMode,
          finalSinceDateStyle,
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

  reset: async ({ platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    try {
      await db
        .prepare(
          `UPDATE hit_counters SET count = 0, started_at = datetime('now'), updated_at = datetime('now')
           WHERE tenant_id = ? AND page_path = '/'`,
        )
        .bind(tenantId)
        .run();

      return { success: true, reset: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
