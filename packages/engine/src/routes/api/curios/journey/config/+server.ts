/**
 * Journey Curio API - Configuration Endpoint
 *
 * GET /api/curios/journey/config - Fetch current config (admin only)
 * PUT /api/curios/journey/config - Update config (admin only)
 *
 * Admin-only endpoint for managing Journey Curio settings.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  DEFAULT_JOURNEY_CONFIG,
  isValidGithubRepoUrl,
  toSqliteBoolean,
  CLEAR_TOKEN_VALUE,
} from "$lib/curios/journey";
import { encryptToken } from "$lib/server/encryption";

interface ConfigRow {
  enabled: number;
  github_repo_url: string | null;
  github_token: string | null;
  openrouter_key: string | null;
  openrouter_model: string;
  snapshot_frequency: string;
  show_language_chart: number;
  show_growth_chart: number;
  show_milestones: number;
  timezone: string;
  updated_at: number;
}

interface ConfigUpdateRequest {
  enabled?: boolean;
  githubRepoUrl?: string;
  githubToken?: string;
  openrouterKey?: string;
  openrouterModel?: string;
  snapshotFrequency?: "release" | "weekly" | "monthly" | "manual";
  showLanguageChart?: boolean;
  showGrowthChart?: boolean;
  showMilestones?: boolean;
  timezone?: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;
  const user = locals.user;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Require authentication for config access
  if (!user) {
    throw error(401, "Authentication required");
  }

  const config = await db
    .prepare(
      `SELECT
        enabled,
        github_repo_url,
        github_token,
        openrouter_key,
        openrouter_model,
        snapshot_frequency,
        show_language_chart,
        show_growth_chart,
        show_milestones,
        timezone,
        updated_at
      FROM journey_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    // Return defaults if no config exists
    return json({
      config: {
        ...DEFAULT_JOURNEY_CONFIG,
        githubRepoUrl: null,
        hasGithubToken: false,
        hasOpenrouterKey: false,
        updatedAt: null,
      },
    });
  }

  // Transform to camelCase, don't expose tokens in responses
  return json({
    config: {
      enabled: Boolean(config.enabled),
      githubRepoUrl: config.github_repo_url,
      openrouterModel: config.openrouter_model,
      snapshotFrequency: config.snapshot_frequency,
      showLanguageChart: Boolean(config.show_language_chart),
      showGrowthChart: Boolean(config.show_growth_chart),
      showMilestones: Boolean(config.show_milestones),
      timezone: config.timezone,
      // Indicate if tokens are set without exposing them
      hasGithubToken: Boolean(config.github_token),
      hasOpenrouterKey: Boolean(config.openrouter_key),
      updatedAt: config.updated_at,
    },
  });
};

export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;
  const user = locals.user;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  if (!user) {
    throw error(401, "Authentication required");
  }

  const body = (await request.json()) as ConfigUpdateRequest;

  const {
    enabled,
    githubRepoUrl,
    githubToken,
    openrouterKey,
    openrouterModel,
    snapshotFrequency,
    showLanguageChart,
    showGrowthChart,
    showMilestones,
    timezone,
  } = body;

  // Validate required fields when enabling
  if (enabled && !githubRepoUrl?.trim()) {
    throw error(400, "GitHub repository URL is required when enabling Journey");
  }

  // Validate GitHub repo URL format (owner/repo)
  if (githubRepoUrl?.trim() && !isValidGithubRepoUrl(githubRepoUrl)) {
    throw error(
      400,
      "GitHub repository URL must be in format: owner/repo (e.g., 'AutumnsGrove/GroveEngine')",
    );
  }

  // Validate snapshot frequency
  const validFrequencies = ["release", "weekly", "monthly", "manual"];
  if (snapshotFrequency && !validFrequencies.includes(snapshotFrequency)) {
    throw error(400, "Invalid snapshot frequency");
  }

  try {
    // Handle token values:
    // - CLEAR_TOKEN_VALUE ("__CLEAR__") explicitly deletes the token
    // - Empty string or whitespace preserves existing token (COALESCE)
    // - Any other value sets the new token (encrypted)
    const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;

    // Determine raw token values first
    const rawGithubToken =
      githubToken === CLEAR_TOKEN_VALUE
        ? "" // Empty string will be stored, clearing the token
        : githubToken?.trim() || null; // null preserves existing via COALESCE
    const rawOpenrouterKey =
      openrouterKey === CLEAR_TOKEN_VALUE ? "" : openrouterKey?.trim() || null;

    // Encrypt non-empty tokens if encryption key is available
    let githubTokenValue = rawGithubToken;
    let openrouterKeyValue = rawOpenrouterKey;

    if (encryptionKey) {
      if (rawGithubToken && rawGithubToken !== "") {
        githubTokenValue = await encryptToken(rawGithubToken, encryptionKey);
      }
      if (rawOpenrouterKey && rawOpenrouterKey !== "") {
        openrouterKeyValue = await encryptToken(
          rawOpenrouterKey,
          encryptionKey,
        );
      }
    } else if (rawGithubToken || rawOpenrouterKey) {
      // Log warning if trying to save tokens without encryption key
      console.warn(
        "TOKEN_ENCRYPTION_KEY not set - tokens will be stored unencrypted",
      );
    }

    // Use CASE expression to handle token clearing vs preservation
    // When value is empty string -> clear the token (set to NULL)
    // When value is NULL -> preserve existing (COALESCE)
    // When value is set -> use the new value
    await db
      .prepare(
        `INSERT INTO journey_curio_config (
          tenant_id,
          enabled,
          github_repo_url,
          github_token,
          openrouter_key,
          openrouter_model,
          snapshot_frequency,
          show_language_chart,
          show_growth_chart,
          show_milestones,
          timezone,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          enabled = excluded.enabled,
          github_repo_url = excluded.github_repo_url,
          github_token = CASE
            WHEN excluded.github_token = '' THEN NULL
            ELSE COALESCE(excluded.github_token, github_token)
          END,
          openrouter_key = CASE
            WHEN excluded.openrouter_key = '' THEN NULL
            ELSE COALESCE(excluded.openrouter_key, openrouter_key)
          END,
          openrouter_model = excluded.openrouter_model,
          snapshot_frequency = excluded.snapshot_frequency,
          show_language_chart = excluded.show_language_chart,
          show_growth_chart = excluded.show_growth_chart,
          show_milestones = excluded.show_milestones,
          timezone = excluded.timezone,
          updated_at = strftime('%s', 'now')`,
      )
      .bind(
        tenantId,
        enabled ? 1 : 0,
        githubRepoUrl?.trim() || null,
        githubTokenValue,
        openrouterKeyValue,
        openrouterModel || DEFAULT_JOURNEY_CONFIG.openrouterModel,
        snapshotFrequency || DEFAULT_JOURNEY_CONFIG.snapshotFrequency,
        toSqliteBoolean(
          showLanguageChart,
          DEFAULT_JOURNEY_CONFIG.showLanguageChart,
        ),
        toSqliteBoolean(
          showGrowthChart,
          DEFAULT_JOURNEY_CONFIG.showGrowthChart,
        ),
        toSqliteBoolean(showMilestones, DEFAULT_JOURNEY_CONFIG.showMilestones),
        timezone || DEFAULT_JOURNEY_CONFIG.timezone,
      )
      .run();

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save Journey config:", err);
    throw error(500, "Failed to save configuration");
  }
};
