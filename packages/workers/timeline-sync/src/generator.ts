/**
 * Timeline Generator
 *
 * Core per-tenant processing logic for generating timeline summaries.
 * Orchestrates the full flow: decrypt tokens → fetch commits → AI → store.
 */

import type {
  Env,
  TenantConfig,
  TenantConfigRow,
  Commit,
  GenerationResult,
  CustomVoiceConfig,
} from "./config";
import { DEFAULT_OPENROUTER_MODEL } from "./config";
import { safeDecryptToken, isEncryptedToken } from "./encryption";
import { fetchGitHubCommits, fetchCommitStats } from "./github";
import { callOpenRouter, parseAIResponse } from "./openrouter";
import { buildVoicedPrompt } from "./voices";
import {
  getHistoricalContext,
  detectTaskFromText,
  detectContinuation,
  formatHistoricalContextForPrompt,
  formatContinuationForPrompt,
  buildSummaryContextData,
} from "./context";

// =============================================================================
// Public API
// =============================================================================

/**
 * Get all enabled tenants with valid configuration.
 */
export async function getEnabledTenants(
  db: D1Database,
): Promise<TenantConfig[]> {
  const result = await db
    .prepare(
      `
      SELECT
        tenant_id,
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
        owner_name
      FROM timeline_curio_config
      WHERE enabled = 1
        AND github_token_encrypted IS NOT NULL
        AND openrouter_key_encrypted IS NOT NULL
    `,
    )
    .all<TenantConfigRow>();

  return (result.results || []).map(parseConfigRow);
}

/**
 * Process timeline generation for a single tenant.
 * Isolated error handling so failures don't affect other tenants.
 */
export async function processTenantTimeline(
  config: TenantConfig,
  targetDate: string,
  env: Env,
): Promise<GenerationResult> {
  const logPrefix = `[${config.tenantId}]`;

  try {
    // 0. Check if summary already exists (skip regeneration)
    const existing = await env.DB.prepare(
      `SELECT 1 FROM timeline_summaries
       WHERE tenant_id = ? AND summary_date = ? AND commit_count > 0`,
    )
      .bind(config.tenantId, targetDate)
      .first();

    if (existing) {
      console.log(
        `${logPrefix} Summary already exists for ${targetDate}, skipping`,
      );
      return {
        success: true,
        tenantId: config.tenantId,
        date: targetDate,
        commitCount: 0,
      };
    }

    // 1. Decrypt tokens
    const encryptionKey = env.TOKEN_ENCRYPTION_KEY;

    // Pre-flight check: if tokens are encrypted but no key, fail early
    const githubTokenIsEncrypted = isEncryptedToken(
      config.githubTokenEncrypted,
    );
    const openrouterKeyIsEncrypted = isEncryptedToken(
      config.openrouterKeyEncrypted,
    );

    if (
      (githubTokenIsEncrypted || openrouterKeyIsEncrypted) &&
      !encryptionKey
    ) {
      throw new Error(
        "Tokens are encrypted but TOKEN_ENCRYPTION_KEY is not configured",
      );
    }

    const githubToken = await safeDecryptToken(
      config.githubTokenEncrypted,
      encryptionKey,
    );
    const openrouterKey = await safeDecryptToken(
      config.openrouterKeyEncrypted,
      encryptionKey,
    );

    if (!githubToken) {
      const reason = githubTokenIsEncrypted
        ? "decryption failed (wrong key or corrupted data)"
        : "token is empty or null";
      throw new Error(`GitHub token invalid: ${reason}`);
    }

    if (!openrouterKey) {
      const reason = openrouterKeyIsEncrypted
        ? "decryption failed (wrong key or corrupted data)"
        : "key is empty or null";
      throw new Error(`OpenRouter API key invalid: ${reason}`);
    }

    // 2. Fetch GitHub commits
    console.log(`${logPrefix} Fetching commits for ${targetDate}...`);
    const commits = await fetchGitHubCommits(
      config,
      githubToken,
      targetDate,
      env.DB,
    );

    if (commits.length === 0) {
      console.log(`${logPrefix} No commits for ${targetDate}, skipping`);
      return {
        success: true,
        tenantId: config.tenantId,
        date: targetDate,
        commitCount: 0,
      };
    }

    console.log(`${logPrefix} Found ${commits.length} commits`);

    // 3. Enrich commits with stats
    await fetchCommitStats(commits, config.githubUsername, githubToken);

    // 4. Get historical context
    const repos = [...new Set(commits.map((c) => c.repo))];
    let historicalContext = await getHistoricalContext(
      env.DB,
      config.tenantId,
      targetDate,
    );

    // Pre-detect task type for continuation detection
    const commitText = commits.map((c) => c.message).join(" ");
    const preDetectedTask = detectTaskFromText(commitText);

    // Check for multi-day continuation
    const continuation = detectContinuation(historicalContext, preDetectedTask);

    // Build prompt context
    let promptContext: {
      historicalContext?: string;
      continuationNote?: string;
    } | null = null;
    if (historicalContext.length > 0 || continuation) {
      promptContext = {
        historicalContext: formatHistoricalContextForPrompt(historicalContext),
        continuationNote: formatContinuationForPrompt(continuation),
      };
    }

    console.log(
      `${logPrefix} Context: task=${preDetectedTask || "none"}, continuation=${continuation?.startDate || "none"}, history=${historicalContext.length} days`,
    );

    // 5. Build voiced prompt
    const customConfig: CustomVoiceConfig | null =
      config.voicePreset === "custom"
        ? {
            systemPrompt: config.customSystemPrompt ?? undefined,
            summaryInstructions: config.customSummaryInstructions ?? undefined,
            gutterStyle: config.customGutterStyle ?? undefined,
          }
        : null;

    const { systemPrompt, userPrompt } = buildVoicedPrompt(
      config.voicePreset,
      commits,
      targetDate,
      config.ownerName ?? "the developer",
      customConfig,
      promptContext,
    );

    // 6. Call OpenRouter
    console.log(
      `${logPrefix} Calling OpenRouter (${config.openrouterModel})...`,
    );
    const aiResult = await callOpenRouter(
      systemPrompt,
      userPrompt,
      config.openrouterModel || DEFAULT_OPENROUTER_MODEL,
      openrouterKey,
    );

    // 7. Parse AI response
    const parsed = parseAIResponse(aiResult.content);

    // 8. Build context data for storage
    const contextData = buildSummaryContextData(
      { brief: parsed.brief, detailed: parsed.detailed },
      commits,
      targetDate,
      historicalContext,
      preDetectedTask,
    );

    // 9. Calculate stats
    const totalAdditions = commits.reduce(
      (sum, c) => sum + (c.additions ?? 0),
      0,
    );
    const totalDeletions = commits.reduce(
      (sum, c) => sum + (c.deletions ?? 0),
      0,
    );

    // 10. Store to database (parallel writes for performance)
    const summaryId = `${config.tenantId}-${targetDate}`;

    await Promise.all([
      // Store summary
      env.DB.prepare(
        `INSERT INTO timeline_summaries (
          id,
          tenant_id,
          summary_date,
          brief_summary,
          detailed_timeline,
          gutter_content,
          commit_count,
          repos_active,
          total_additions,
          total_deletions,
          ai_model,
          voice_preset,
          context_brief,
          detected_focus,
          continuation_of,
          focus_streak,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id, summary_date) DO UPDATE SET
          brief_summary = excluded.brief_summary,
          detailed_timeline = excluded.detailed_timeline,
          gutter_content = excluded.gutter_content,
          commit_count = excluded.commit_count,
          repos_active = excluded.repos_active,
          total_additions = excluded.total_additions,
          total_deletions = excluded.total_deletions,
          ai_model = excluded.ai_model,
          voice_preset = excluded.voice_preset,
          context_brief = excluded.context_brief,
          detected_focus = excluded.detected_focus,
          continuation_of = excluded.continuation_of,
          focus_streak = excluded.focus_streak,
          created_at = strftime('%s', 'now')`,
      )
        .bind(
          summaryId,
          config.tenantId,
          targetDate,
          parsed.brief,
          parsed.detailed,
          JSON.stringify(parsed.gutter),
          commits.length,
          JSON.stringify(repos),
          totalAdditions,
          totalDeletions,
          aiResult.usage.model,
          config.voicePreset,
          JSON.stringify(contextData.contextBrief),
          contextData.detectedFocus
            ? JSON.stringify(contextData.detectedFocus)
            : null,
          contextData.continuationOf,
          contextData.focusStreak,
        )
        .run(),

      // Update activity table
      env.DB.prepare(
        `INSERT INTO timeline_activity (
          tenant_id,
          activity_date,
          commit_count,
          repos_active,
          lines_added,
          lines_deleted
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, activity_date) DO UPDATE SET
          commit_count = excluded.commit_count,
          repos_active = excluded.repos_active,
          lines_added = excluded.lines_added,
          lines_deleted = excluded.lines_deleted`,
      )
        .bind(
          config.tenantId,
          targetDate,
          commits.length,
          JSON.stringify(repos),
          totalAdditions,
          totalDeletions,
        )
        .run(),

      // Log AI usage
      env.DB.prepare(
        `INSERT INTO timeline_ai_usage (
          tenant_id,
          used_at,
          model,
          input_tokens,
          output_tokens,
          cost_usd
        ) VALUES (?, strftime('%s', 'now'), ?, ?, ?, ?)`,
      )
        .bind(
          config.tenantId,
          aiResult.usage.model,
          aiResult.usage.inputTokens,
          aiResult.usage.outputTokens,
          aiResult.usage.cost,
        )
        .run(),
    ]);

    console.log(
      `${logPrefix} Generated summary: ${commits.length} commits, ${totalAdditions}+ ${totalDeletions}-`,
    );

    return {
      success: true,
      tenantId: config.tenantId,
      date: targetDate,
      commitCount: commits.length,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Failed:`, errorMessage);

    return {
      success: false,
      tenantId: config.tenantId,
      date: targetDate,
      error: errorMessage,
    };
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely parse a JSON array from a database string.
 * Handles null, empty string, and invalid JSON gracefully.
 */
function safeParseJsonArray(value: string | null): string[] | null {
  if (!value || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Parse a raw database row into a TenantConfig object.
 */
function parseConfigRow(row: TenantConfigRow): TenantConfig {
  return {
    tenantId: row.tenant_id,
    githubUsername: row.github_username,
    githubTokenEncrypted: row.github_token_encrypted,
    openrouterKeyEncrypted: row.openrouter_key_encrypted,
    openrouterModel: row.openrouter_model,
    voicePreset: row.voice_preset,
    customSystemPrompt: row.custom_system_prompt,
    customSummaryInstructions: row.custom_summary_instructions,
    customGutterStyle: row.custom_gutter_style,
    reposInclude: safeParseJsonArray(row.repos_include),
    reposExclude: safeParseJsonArray(row.repos_exclude),
    timezone: row.timezone,
    ownerName: row.owner_name,
  };
}
