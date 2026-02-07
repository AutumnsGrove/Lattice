/**
 * Git Dashboard Config API
 *
 * Get/update git dashboard configuration for the current tenant.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  DEFAULT_GIT_CONFIG,
  isValidUsername,
  CLEAR_TOKEN_VALUE,
} from "$lib/git";
import { queryOne, execute } from "$lib/server/services/database.js";
import {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
} from "$lib/server/rate-limits/index.js";
import { encryptToken } from "$lib/server/encryption";
import { API_ERRORS, throwGroveError } from "$lib/errors";

interface ConfigRow {
  tenant_id: string;
  enabled: number;
  github_username: string | null;
  github_token_encrypted: string | null;
  show_on_homepage: number;
  cache_ttl_seconds: number;
  settings: string | null;
}

interface ParsedConfig {
  enabled: boolean;
  githubUsername: string | null;
  hasGithubToken: boolean;
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
      `SELECT tenant_id, enabled, github_username, github_token_encrypted, show_on_homepage, cache_ttl_seconds, settings
       FROM git_dashboard_config
       WHERE tenant_id = ?`,
      [tenantId],
    );

    if (!config) {
      return {
        ...DEFAULT_GIT_CONFIG,
        githubUsername: null,
        hasGithubToken: false,
        settings: {},
      };
    }

    return {
      enabled: Boolean(config.enabled),
      githubUsername: config.github_username,
      hasGithubToken: Boolean(config.github_token_encrypted),
      showOnHomepage: Boolean(config.show_on_homepage),
      cacheTtlSeconds: config.cache_ttl_seconds,
      settings: config.settings ? JSON.parse(config.settings) : {},
    };
  } catch (err) {
    // Table may not exist if migration hasn't run yet - return defaults
    console.warn("git_dashboard_config query failed, returning defaults:", err);
    return {
      ...DEFAULT_GIT_CONFIG,
      githubUsername: null,
      hasGithubToken: false,
      settings: {},
    };
  }
}

// GET - Get git dashboard config
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(503, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!db) {
    throwGroveError(503, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
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
    githubToken?: string;
    showOnHomepage?: boolean;
    cacheTtlSeconds?: number;
  }
  const body = (await request.json()) as UpdateConfigBody;
  const {
    enabled,
    githubUsername,
    githubToken,
    showOnHomepage,
    cacheTtlSeconds,
  } = body;

  // Validate githubUsername if provided
  const trimmedUsername = githubUsername?.trim() || null;
  if (trimmedUsername && !isValidUsername(trimmedUsername)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Validate cacheTtlSeconds if provided
  const ttl = cacheTtlSeconds || DEFAULT_GIT_CONFIG.cacheTtlSeconds;
  if (typeof ttl !== "number" || ttl < 60 || ttl > 86400) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Handle token encryption
  // Token values: CLEAR_TOKEN_VALUE -> clear, actual token -> encrypt, undefined -> preserve
  const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;
  let githubTokenForDb: string | null = null;

  if (githubToken === CLEAR_TOKEN_VALUE) {
    // Explicit clear request - use empty string to trigger CASE NULL
    githubTokenForDb = "";
  } else if (githubToken?.trim()) {
    // New token value - encrypt it
    const rawToken = githubToken.trim();
    githubTokenForDb = encryptionKey
      ? await encryptToken(rawToken, encryptionKey)
      : rawToken;
  }
  // else: null/undefined = preserve existing (COALESCE handles this)

  if (!encryptionKey && githubToken?.trim()) {
    console.warn(
      "TOKEN_ENCRYPTION_KEY not set - GitHub token will be stored unencrypted",
    );
  }

  try {
    await execute(
      db,
      `INSERT INTO git_dashboard_config (
        tenant_id, enabled, github_username, github_token_encrypted, show_on_homepage, cache_ttl_seconds, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(tenant_id) DO UPDATE SET
        enabled = excluded.enabled,
        github_username = excluded.github_username,
        github_token_encrypted = CASE
          WHEN excluded.github_token_encrypted = '' THEN NULL
          ELSE COALESCE(excluded.github_token_encrypted, github_token_encrypted)
        END,
        show_on_homepage = excluded.show_on_homepage,
        cache_ttl_seconds = excluded.cache_ttl_seconds,
        updated_at = strftime('%s', 'now')`,
      [
        tenantId,
        enabled ? 1 : 0,
        trimmedUsername,
        githubTokenForDb,
        showOnHomepage ? 1 : 0,
        ttl,
      ],
    );

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save git dashboard config:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
