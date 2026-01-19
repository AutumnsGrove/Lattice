/**
 * Git Dashboard Config API
 *
 * Get/update git dashboard configuration for the current tenant.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { DEFAULT_GIT_CONFIG } from "$lib/git";

interface ConfigRow {
  enabled: number;
  github_username: string | null;
  show_on_homepage: number;
  cache_ttl_seconds: number;
  settings: string | null;
}

// GET - Get git dashboard config
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const config = await db
    .prepare(
      `SELECT enabled, github_username, show_on_homepage, cache_ttl_seconds, settings
       FROM git_dashboard_config
       WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    return json({
      config: {
        ...DEFAULT_GIT_CONFIG,
        githubUsername: null,
      },
    });
  }

  return json({
    config: {
      enabled: Boolean(config.enabled),
      githubUsername: config.github_username,
      showOnHomepage: Boolean(config.show_on_homepage),
      cacheTtlSeconds: config.cache_ttl_seconds,
      settings: config.settings ? JSON.parse(config.settings) : {},
    },
  });
};

// PUT - Update git dashboard config
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const body = await request.json();
  const { enabled, githubUsername, showOnHomepage, cacheTtlSeconds } = body;

  try {
    await db
      .prepare(
        `INSERT INTO git_dashboard_config (
          tenant_id, enabled, github_username, show_on_homepage, cache_ttl_seconds, updated_at
        ) VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          enabled = excluded.enabled,
          github_username = excluded.github_username,
          show_on_homepage = excluded.show_on_homepage,
          cache_ttl_seconds = excluded.cache_ttl_seconds,
          updated_at = strftime('%s', 'now')`,
      )
      .bind(
        tenantId,
        enabled ? 1 : 0,
        githubUsername?.trim() || null,
        showOnHomepage ? 1 : 0,
        cacheTtlSeconds || DEFAULT_GIT_CONFIG.cacheTtlSeconds,
      )
      .run();

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save git dashboard config:", err);
    throw error(500, "Failed to save configuration");
  }
};
