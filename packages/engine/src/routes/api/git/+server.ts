/**
 * Git Dashboard Config API
 *
 * Get/update git dashboard configuration for the current tenant.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { DEFAULT_GIT_CONFIG, isValidUsername } from "$lib/git";
import { queryOne, execute } from "$lib/server/services/database.js";
import {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
} from "$lib/server/rate-limits/index.js";

interface ConfigRow {
  tenant_id: string;
  enabled: number;
  github_username: string | null;
  show_on_homepage: number;
  cache_ttl_seconds: number;
  settings: string | null;
}

interface ParsedConfig {
  enabled: boolean;
  githubUsername: string | null;
  showOnHomepage: boolean;
  cacheTtlSeconds: number;
  settings: Record<string, unknown>;
}

// Rate limits chosen to balance usability with API protection:
// - Config reads are cheap (local DB) but we limit to prevent abuse
// - Config writes are more expensive (DB write + potential cache invalidation)
const READ_LIMIT = { limit: 30, windowSeconds: 60 };
const WRITE_LIMIT = { limit: 10, windowSeconds: 60 };

/**
 * Fetch and transform tenant config from database.
 * Returns default config if table doesn't exist or no config found.
 */
async function getConfigForTenant(
  db: D1Database,
  tenantId: string,
): Promise<ParsedConfig> {
  try {
    const config = await queryOne<ConfigRow>(
      db,
      `SELECT tenant_id, enabled, github_username, show_on_homepage, cache_ttl_seconds, settings
       FROM git_dashboard_config
       WHERE tenant_id = ?`,
      [tenantId],
    );

    if (!config) {
      return { ...DEFAULT_GIT_CONFIG, githubUsername: null, settings: {} };
    }

    return {
      enabled: Boolean(config.enabled),
      githubUsername: config.github_username,
      showOnHomepage: Boolean(config.show_on_homepage),
      cacheTtlSeconds: config.cache_ttl_seconds,
      settings: config.settings ? JSON.parse(config.settings) : {},
    };
  } catch (err) {
    // Table may not exist if migration hasn't run yet - return defaults
    console.warn("git_dashboard_config query failed, returning defaults:", err);
    return { ...DEFAULT_GIT_CONFIG, githubUsername: null, settings: {} };
  }
}

// GET - Get git dashboard config
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Service temporarily unavailable");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Rate limiting (only if KV available)
  let rateLimitResult = null;
  if (kv) {
    const { result, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/config", tenantId),
      ...READ_LIMIT,
    });
    if (response) return response;
    rateLimitResult = result;
  }

  // Fetch config (helper handles missing table gracefully)
  const config = await getConfigForTenant(db, tenantId);

  return json(
    { config },
    {
      headers: rateLimitResult
        ? rateLimitHeaders(rateLimitResult, READ_LIMIT.limit)
        : undefined,
    },
  );
};

// PUT - Update git dashboard config
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Service temporarily unavailable");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Rate limiting
  if (kv) {
    const { response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/config/write", tenantId),
      ...WRITE_LIMIT,
    });
    if (response) return response;
  }

  interface UpdateConfigBody {
    enabled?: boolean;
    githubUsername?: string;
    showOnHomepage?: boolean;
    cacheTtlSeconds?: number;
  }
  const body = (await request.json()) as UpdateConfigBody;
  const { enabled, githubUsername, showOnHomepage, cacheTtlSeconds } = body;

  // Validate githubUsername if provided
  const trimmedUsername = githubUsername?.trim() || null;
  if (trimmedUsername && !isValidUsername(trimmedUsername)) {
    throw error(
      400,
      "Invalid GitHub username. Must be 1-39 alphanumeric characters or hyphens.",
    );
  }

  // Validate cacheTtlSeconds if provided
  const ttl = cacheTtlSeconds || DEFAULT_GIT_CONFIG.cacheTtlSeconds;
  if (typeof ttl !== "number" || ttl < 60 || ttl > 86400) {
    throw error(400, "Cache TTL must be between 60 and 86400 seconds.");
  }

  try {
    await execute(
      db,
      `INSERT INTO git_dashboard_config (
        tenant_id, enabled, github_username, show_on_homepage, cache_ttl_seconds, updated_at
      ) VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(tenant_id) DO UPDATE SET
        enabled = excluded.enabled,
        github_username = excluded.github_username,
        show_on_homepage = excluded.show_on_homepage,
        cache_ttl_seconds = excluded.cache_ttl_seconds,
        updated_at = strftime('%s', 'now')`,
      [tenantId, enabled ? 1 : 0, trimmedUsername, showOnHomepage ? 1 : 0, ttl],
    );

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save git dashboard config:", err);
    throw error(500, "Unable to save configuration. Please try again.");
  }
};
