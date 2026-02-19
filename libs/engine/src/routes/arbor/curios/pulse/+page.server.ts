import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { DEFAULT_PULSE_CONFIG, buildWebhookUrl } from "$lib/curios/pulse";
import { createSecretsManager } from "$lib/server/secrets";

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

interface ConfigRow {
  enabled: number;
  show_heatmap: number;
  show_feed: number;
  show_stats: number;
  show_trends: number;
  show_ci: number;
  repos_include: string | null;
  repos_exclude: string | null;
  timezone: string;
  feed_max_items: number;
  updated_at: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;

  // Landing mode: use the engine's own tenant ID for dogfooding
  const isLanding = locals.context.type === "landing";
  const tenantId =
    locals.tenantId ??
    (isLanding ? platform?.env?.PULSE_LANDING_TENANT_ID : undefined);

  if (!db || !tenantId) {
    return {
      config: null,
      webhookUrl: "",
      hasWebhookSecret: false,
      lastEvent: null,
      eventCountToday: 0,
    };
  }

  // Run queries in parallel
  const [config, lastEvent, eventCountToday, hasSecret] = await Promise.all([
    db
      .prepare(
        `SELECT enabled, show_heatmap, show_feed, show_stats, show_trends, show_ci,
                repos_include, repos_exclude, timezone, feed_max_items, updated_at
         FROM pulse_curio_config WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<ConfigRow>(),

    db
      .prepare(
        `SELECT event_type, occurred_at FROM pulse_events
         WHERE tenant_id = ? ORDER BY occurred_at DESC LIMIT 1`,
      )
      .bind(tenantId)
      .first<{ event_type: string; occurred_at: number }>()
      .catch(() => null),

    db
      .prepare(
        `SELECT COUNT(*) as count FROM pulse_events
         WHERE tenant_id = ? AND occurred_at >= strftime('%s', 'now', 'start of day')`,
      )
      .bind(tenantId)
      .first<{ count: number }>()
      .then((r) => r?.count ?? 0)
      .catch(() => 0),

    (async () => {
      try {
        const sm = await createSecretsManager(platform?.env);
        return sm.hasSecret(tenantId, "pulse_webhook_secret");
      } catch {
        return false;
      }
    })(),
  ]);

  let parsedConfig = null;
  if (config) {
    parsedConfig = {
      enabled: Boolean(config.enabled),
      showHeatmap: Boolean(config.show_heatmap),
      showFeed: Boolean(config.show_feed),
      showStats: Boolean(config.show_stats),
      showTrends: Boolean(config.show_trends),
      showCi: Boolean(config.show_ci),
      reposInclude: config.repos_include
        ? (safeParseJson(config.repos_include) as string[] | null)
        : null,
      reposExclude: config.repos_exclude
        ? (safeParseJson(config.repos_exclude) as string[] | null)
        : null,
      timezone: config.timezone,
      feedMaxItems: config.feed_max_items,
      updatedAt: config.updated_at,
    };
  }

  return {
    config: parsedConfig ?? {
      ...DEFAULT_PULSE_CONFIG,
    },
    webhookUrl: buildWebhookUrl(tenantId),
    hasWebhookSecret: hasSecret,
    lastEvent,
    eventCountToday,
  };
};

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;

    // Landing mode: use the engine's own tenant ID
    const isLanding = locals.context.type === "landing";
    const tenantId =
      locals.tenantId ??
      (isLanding ? platform?.env?.PULSE_LANDING_TENANT_ID : undefined);

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();

    const enabled = formData.get("enabled") === "true";
    const showHeatmap = formData.get("showHeatmap") === "true";
    const showFeed = formData.get("showFeed") === "true";
    const showStats = formData.get("showStats") === "true";
    const showTrends = formData.get("showTrends") === "true";
    const showCi = formData.get("showCi") === "true";
    const timezone = (formData.get("timezone") as string) || "America/New_York";
    const feedMaxItems = Math.max(
      10,
      Math.min(500, parseInt(formData.get("feedMaxItems") as string) || 100),
    );
    const reposInclude =
      (formData.get("reposInclude") as string)?.trim() || null;
    const reposExclude =
      (formData.get("reposExclude") as string)?.trim() || null;

    const reposIncludeJson = reposInclude
      ? JSON.stringify(
          reposInclude
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
        )
      : null;
    const reposExcludeJson = reposExclude
      ? JSON.stringify(
          reposExclude
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
        )
      : null;

    try {
      // Generate webhook secret on first enable
      if (enabled) {
        try {
          const sm = await createSecretsManager(platform?.env);
          const hasSecret = await sm.hasSecret(
            tenantId,
            "pulse_webhook_secret",
          );
          if (!hasSecret) {
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            const secret = Array.from(bytes)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            await sm.setSecret(tenantId, "pulse_webhook_secret", secret);
          }
        } catch (err) {
          logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: err });
          // Continue saving config even if secret generation fails
        }
      }

      await db
        .prepare(
          `INSERT INTO pulse_curio_config (
            tenant_id, enabled, show_heatmap, show_feed, show_stats, show_trends, show_ci,
            repos_include, repos_exclude, timezone, feed_max_items, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
          ON CONFLICT(tenant_id) DO UPDATE SET
            enabled = excluded.enabled,
            show_heatmap = excluded.show_heatmap,
            show_feed = excluded.show_feed,
            show_stats = excluded.show_stats,
            show_trends = excluded.show_trends,
            show_ci = excluded.show_ci,
            repos_include = excluded.repos_include,
            repos_exclude = excluded.repos_exclude,
            timezone = excluded.timezone,
            feed_max_items = excluded.feed_max_items,
            updated_at = strftime('%s', 'now')`,
        )
        .bind(
          tenantId,
          enabled ? 1 : 0,
          showHeatmap ? 1 : 0,
          showFeed ? 1 : 0,
          showStats ? 1 : 0,
          showTrends ? 1 : 0,
          showCi ? 1 : 0,
          reposIncludeJson,
          reposExcludeJson,
          timezone,
          feedMaxItems,
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
