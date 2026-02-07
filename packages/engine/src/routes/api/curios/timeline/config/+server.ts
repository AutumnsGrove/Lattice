/**
 * Timeline Curio API - Configuration Endpoint
 *
 * GET /api/curios/timeline/config - Fetch current config (admin only)
 * PUT /api/curios/timeline/config - Update config (admin only)
 *
 * Admin-only endpoint for managing Timeline Curio settings.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  DEFAULT_TIMELINE_CONFIG,
  CLEAR_TOKEN_VALUE,
} from "$lib/curios/timeline";
import { encryptToken } from "$lib/server/encryption";

interface ConfigRow {
  enabled: number;
  github_username: string | null;
  github_token_encrypted: string | null;
  openrouter_key_encrypted: string | null;
  openrouter_model: string;
  voice_preset: string;
  custom_system_prompt: string | null;
  custom_summary_instructions: string | null;
  custom_gutter_style: string | null;
  repos_include: string | null;
  repos_exclude: string | null;
  timezone: string;
  owner_name: string | null;
  updated_at: number;
}

interface ConfigUpdateRequest {
  enabled?: boolean;
  githubUsername?: string;
  githubToken?: string;
  openrouterKey?: string;
  openrouterModel?: string;
  voicePreset?: string;
  customSystemPrompt?: string;
  customSummaryInstructions?: string;
  customGutterStyle?: string;
  reposInclude?: string[];
  reposExclude?: string[];
  timezone?: string;
  ownerName?: string;
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
        github_username,
        github_token_encrypted,
        openrouter_key_encrypted,
        openrouter_model,
        voice_preset,
        custom_system_prompt,
        custom_summary_instructions,
        custom_gutter_style,
        repos_include,
        repos_exclude,
        timezone,
        owner_name,
        updated_at
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    // Return defaults if no config exists
    return json({
      config: {
        ...DEFAULT_TIMELINE_CONFIG,
        githubUsername: null,
        customSystemPrompt: null,
        customSummaryInstructions: null,
        customGutterStyle: null,
        reposInclude: null,
        reposExclude: null,
        ownerName: null,
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
      githubUsername: config.github_username,
      openrouterModel: config.openrouter_model,
      voicePreset: config.voice_preset,
      customSystemPrompt: config.custom_system_prompt,
      customSummaryInstructions: config.custom_summary_instructions,
      customGutterStyle: config.custom_gutter_style,
      reposInclude: config.repos_include
        ? JSON.parse(config.repos_include)
        : null,
      reposExclude: config.repos_exclude
        ? JSON.parse(config.repos_exclude)
        : null,
      timezone: config.timezone,
      ownerName: config.owner_name,
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
    githubUsername,
    githubToken,
    openrouterKey,
    openrouterModel,
    voicePreset,
    customSystemPrompt,
    customSummaryInstructions,
    customGutterStyle,
    reposInclude,
    reposExclude,
    timezone,
    ownerName,
  } = body;

  // Validate required fields when enabling
  if (enabled && !githubUsername?.trim()) {
    throw error(400, "GitHub username is required when enabling Timeline");
  }

  // Length limits on free-text fields (defense against storage abuse)
  if (customSystemPrompt && customSystemPrompt.length > 10_000) {
    throw error(400, "Custom system prompt too long (max 10,000 characters)");
  }
  if (customSummaryInstructions && customSummaryInstructions.length > 5_000) {
    throw error(
      400,
      "Custom summary instructions too long (max 5,000 characters)",
    );
  }
  if (customGutterStyle && customGutterStyle.length > 2_000) {
    throw error(400, "Custom gutter style too long (max 2,000 characters)");
  }
  if (ownerName && ownerName.length > 200) {
    throw error(400, "Owner name too long (max 200 characters)");
  }
  if (githubUsername && githubUsername.length > 100) {
    throw error(400, "GitHub username too long (max 100 characters)");
  }
  if (timezone && timezone.length > 100) {
    throw error(400, "Timezone too long (max 100 characters)");
  }

  // Parse repo lists if arrays
  const reposIncludeJson =
    Array.isArray(reposInclude) && reposInclude.length > 0
      ? JSON.stringify(reposInclude)
      : null;
  const reposExcludeJson =
    Array.isArray(reposExclude) && reposExclude.length > 0
      ? JSON.stringify(reposExclude)
      : null;

  try {
    // Encrypt tokens before storing
    // Token handling: null = preserve existing, "" = clear, "value" = set new
    const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;

    // Determine token values: CLEAR_TOKEN_VALUE -> "", actual token -> encrypt, undefined -> null (preserve)
    let githubTokenForDb: string | null = null;
    let openrouterKeyForDb: string | null = null;

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

    if (openrouterKey === CLEAR_TOKEN_VALUE) {
      // Explicit clear request
      openrouterKeyForDb = "";
    } else if (openrouterKey?.trim()) {
      // New token value - encrypt it
      const rawKey = openrouterKey.trim();
      openrouterKeyForDb = encryptionKey
        ? await encryptToken(rawKey, encryptionKey)
        : rawKey;
    }

    if (!encryptionKey && (githubToken?.trim() || openrouterKey?.trim())) {
      console.warn(
        "TOKEN_ENCRYPTION_KEY not set - tokens will be stored unencrypted",
      );
    }

    await db
      .prepare(
        `INSERT INTO timeline_curio_config (
          tenant_id,
          enabled,
          github_username,
          github_token_encrypted,
          openrouter_key_encrypted,
          openrouter_model,
          voice_preset,
          custom_system_prompt,
          custom_summary_instructions,
          custom_gutter_style,
          repos_include,
          repos_exclude,
          timezone,
          owner_name,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          enabled = excluded.enabled,
          github_username = excluded.github_username,
          github_token_encrypted = CASE
            WHEN excluded.github_token_encrypted = '' THEN NULL
            ELSE COALESCE(excluded.github_token_encrypted, github_token_encrypted)
          END,
          openrouter_key_encrypted = CASE
            WHEN excluded.openrouter_key_encrypted = '' THEN NULL
            ELSE COALESCE(excluded.openrouter_key_encrypted, openrouter_key_encrypted)
          END,
          openrouter_model = excluded.openrouter_model,
          voice_preset = excluded.voice_preset,
          custom_system_prompt = excluded.custom_system_prompt,
          custom_summary_instructions = excluded.custom_summary_instructions,
          custom_gutter_style = excluded.custom_gutter_style,
          repos_include = excluded.repos_include,
          repos_exclude = excluded.repos_exclude,
          timezone = excluded.timezone,
          owner_name = excluded.owner_name,
          updated_at = strftime('%s', 'now')`,
      )
      .bind(
        tenantId,
        enabled ? 1 : 0,
        githubUsername?.trim() || null,
        githubTokenForDb,
        openrouterKeyForDb,
        openrouterModel || DEFAULT_TIMELINE_CONFIG.openrouterModel,
        voicePreset || DEFAULT_TIMELINE_CONFIG.voicePreset,
        customSystemPrompt?.trim() || null,
        customSummaryInstructions?.trim() || null,
        customGutterStyle?.trim() || null,
        reposIncludeJson,
        reposExcludeJson,
        timezone || DEFAULT_TIMELINE_CONFIG.timezone,
        ownerName?.trim() || null,
      )
      .run();

    return json({ success: true });
  } catch (err) {
    console.error("Failed to save Timeline config:", err);
    throw error(500, "Failed to save configuration");
  }
};
