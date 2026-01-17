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
import { DEFAULT_JOURNEY_CONFIG } from "$lib/curios/journey";

interface ConfigRow {
  enabled: number;
  github_repo_url: string | null;
  github_token_encrypted: string | null;
  openrouter_key_encrypted: string | null;
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
        github_token_encrypted,
        openrouter_key_encrypted,
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

  // Transform to camelCase, don't expose encrypted tokens
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
      hasGithubToken: Boolean(config.github_token_encrypted),
      hasOpenrouterKey: Boolean(config.openrouter_key_encrypted),
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

  // Validate snapshot frequency
  const validFrequencies = ["release", "weekly", "monthly", "manual"];
  if (snapshotFrequency && !validFrequencies.includes(snapshotFrequency)) {
    throw error(400, "Invalid snapshot frequency");
  }

  try {
    // Note: In production, encrypt tokens before storing
    const githubTokenEncrypted = githubToken?.trim() || null;
    const openrouterKeyEncrypted = openrouterKey?.trim() || null;

    await db
      .prepare(
        `INSERT INTO journey_curio_config (
          tenant_id,
          enabled,
          github_repo_url,
          github_token_encrypted,
          openrouter_key_encrypted,
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
          github_token_encrypted = COALESCE(excluded.github_token_encrypted, github_token_encrypted),
          openrouter_key_encrypted = COALESCE(excluded.openrouter_key_encrypted, openrouter_key_encrypted),
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
        githubTokenEncrypted,
        openrouterKeyEncrypted,
        openrouterModel || DEFAULT_JOURNEY_CONFIG.openrouterModel,
        snapshotFrequency || DEFAULT_JOURNEY_CONFIG.snapshotFrequency,
        showLanguageChart !== undefined
          ? showLanguageChart
            ? 1
            : 0
          : DEFAULT_JOURNEY_CONFIG.showLanguageChart
            ? 1
            : 0,
        showGrowthChart !== undefined
          ? showGrowthChart
            ? 1
            : 0
          : DEFAULT_JOURNEY_CONFIG.showGrowthChart
            ? 1
            : 0,
        showMilestones !== undefined
          ? showMilestones
            ? 1
            : 0
          : DEFAULT_JOURNEY_CONFIG.showMilestones
            ? 1
            : 0,
        timezone || DEFAULT_JOURNEY_CONFIG.timezone,
      )
      .run();

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save Journey config:", err);
    throw error(500, "Failed to save configuration");
  }
};
