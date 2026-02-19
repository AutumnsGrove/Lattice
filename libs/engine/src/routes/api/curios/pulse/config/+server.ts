/**
 * Pulse Curio API — Configuration Endpoint
 *
 * GET  /api/curios/pulse/config — Fetch current config (admin only)
 * PUT  /api/curios/pulse/config — Update config (admin only)
 * POST /api/curios/pulse/config — Regenerate webhook secret (admin only)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { DEFAULT_PULSE_CONFIG, buildWebhookUrl } from "$lib/curios/pulse";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
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

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;
  const user = locals.user;

  if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  if (!tenantId)
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  if (!user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

  const config = await db
    .prepare(
      `SELECT enabled, show_heatmap, show_feed, show_stats, show_trends, show_ci,
              repos_include, repos_exclude, timezone, feed_max_items, updated_at
       FROM pulse_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  // Check if webhook secret exists
  let hasWebhookSecret = false;
  try {
    const secretsManager = await createSecretsManager(platform?.env);
    hasWebhookSecret = await secretsManager.hasSecret(
      tenantId,
      "pulse_webhook_secret",
    );
  } catch {
    // KEK not configured — secrets unavailable
  }

  if (!config) {
    return json({
      config: {
        ...DEFAULT_PULSE_CONFIG,
        hasWebhookSecret,
        webhookUrl: buildWebhookUrl(tenantId),
        updatedAt: null,
      },
    });
  }

  return json({
    config: {
      enabled: Boolean(config.enabled),
      showHeatmap: Boolean(config.show_heatmap),
      showFeed: Boolean(config.show_feed),
      showStats: Boolean(config.show_stats),
      showTrends: Boolean(config.show_trends),
      showCi: Boolean(config.show_ci),
      reposInclude: config.repos_include
        ? safeParseJson(config.repos_include)
        : null,
      reposExclude: config.repos_exclude
        ? safeParseJson(config.repos_exclude)
        : null,
      timezone: config.timezone,
      feedMaxItems: config.feed_max_items,
      hasWebhookSecret,
      webhookUrl: buildWebhookUrl(tenantId),
      updatedAt: config.updated_at,
    },
  });
};

export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;
  const user = locals.user;

  if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  if (!tenantId)
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  if (!user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

  const body = (await request.json()) as Record<string, unknown>;

  const enabled = Boolean(body.enabled);
  const showHeatmap = body.showHeatmap !== false;
  const showFeed = body.showFeed !== false;
  const showStats = body.showStats !== false;
  const showTrends = body.showTrends !== false;
  const showCi = body.showCi !== false;
  let timezone = "America/New_York";
  if (typeof body.timezone === "string") {
    try {
      // Validate against IANA timezone database
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
      timezone = body.timezone.slice(0, 100);
    } catch {
      // Invalid timezone — use default
    }
  }
  const feedMaxItems = Math.max(
    10,
    Math.min(500, Number(body.feedMaxItems) || 100),
  );

  const reposInclude =
    Array.isArray(body.reposInclude) && body.reposInclude.length > 0
      ? JSON.stringify(
          body.reposInclude
            .filter((r: unknown): r is string => typeof r === "string")
            .slice(0, 50)
            .map((r) => r.slice(0, 200)),
        )
      : null;
  const reposExclude =
    Array.isArray(body.reposExclude) && body.reposExclude.length > 0
      ? JSON.stringify(
          body.reposExclude
            .filter((r: unknown): r is string => typeof r === "string")
            .slice(0, 50)
            .map((r) => r.slice(0, 200)),
        )
      : null;

  try {
    // On first enable, generate a webhook secret if none exists
    let webhookSecret: string | null = null;
    if (enabled) {
      try {
        const secretsManager = await createSecretsManager(platform?.env);
        const hasSecret = await secretsManager.hasSecret(
          tenantId,
          "pulse_webhook_secret",
        );
        if (!hasSecret) {
          // Generate a 32-byte hex secret
          const bytes = new Uint8Array(32);
          crypto.getRandomValues(bytes);
          webhookSecret = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          await secretsManager.setSecret(
            tenantId,
            "pulse_webhook_secret",
            webhookSecret,
          );
        }
      } catch (err) {
        logGroveError("API", API_ERRORS.KEK_NOT_CONFIGURED, { cause: err });
        throwGroveError(500, API_ERRORS.KEK_NOT_CONFIGURED, "API");
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
        reposInclude,
        reposExclude,
        timezone,
        feedMaxItems,
      )
      .run();

    return json({
      success: true,
      webhookUrl: buildWebhookUrl(tenantId),
      // Only return the secret on first generation (shown once)
      ...(webhookSecret ? { webhookSecret } : {}),
    });
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * POST /api/curios/pulse/config — Regenerate webhook secret
 */
export const POST: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;
  const user = locals.user;

  if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  if (!tenantId)
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  if (!user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

  try {
    const secretsManager = await createSecretsManager(platform?.env);

    // Generate a new 32-byte hex secret
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const webhookSecret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await secretsManager.setSecret(
      tenantId,
      "pulse_webhook_secret",
      webhookSecret,
    );

    return json({
      success: true,
      webhookSecret,
      webhookUrl: buildWebhookUrl(tenantId),
    });
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
