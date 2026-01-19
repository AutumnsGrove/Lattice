/**
 * Timeline Curio API - Manual Generation Endpoint
 *
 * POST /api/curios/timeline/generate
 * Manually trigger timeline summary generation for a specific date.
 * Admin-only endpoint for testing and on-demand generation.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  callOpenRouter,
  calculateOpenRouterCost,
  buildVoicedPrompt,
  parseAIResponse,
  // Long-horizon context
  getHistoricalContext,
  detectTaskFromText,
  buildSummaryContextData,
  formatHistoricalContextForPrompt,
  formatContinuationForPrompt,
  detectContinuation,
  type Commit,
  type GutterComment,
  type CustomVoiceConfig,
  type PromptContextInput,
} from "$lib/curios/timeline";
import { safeDecryptToken } from "$lib/server/encryption";

interface GenerateRequest {
  date?: string;
}

interface ConfigRow {
  enabled: number;
  github_username: string;
  github_token_encrypted: string;
  openrouter_key_encrypted: string;
  openrouter_model: string;
  voice_preset: string;
  custom_system_prompt: string | null;
  custom_summary_instructions: string | null;
  custom_gutter_style: string | null;
  repos_include: string | null;
  repos_exclude: string | null;
  timezone: string;
  owner_name: string | null;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  repository?: {
    name: string;
  };
  stats?: {
    additions: number;
    deletions: number;
  };
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

  // Parse request body
  const body = (await request.json()) as GenerateRequest;
  const targetDate = body.date ?? new Date().toISOString().split("T")[0];

  // Fetch config
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
        owner_name
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    throw error(
      400,
      "Timeline not configured. Please set up in Admin → Curios → Timeline.",
    );
  }

  if (!config.github_token_encrypted) {
    throw error(400, "GitHub token not configured");
  }

  if (!config.openrouter_key_encrypted) {
    throw error(400, "OpenRouter API key not configured");
  }

  // Decrypt tokens for API calls (safeDecryptToken handles both encrypted and plaintext)
  const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;
  const githubToken = await safeDecryptToken(
    config.github_token_encrypted,
    encryptionKey,
  );
  const openrouterKey = await safeDecryptToken(
    config.openrouter_key_encrypted,
    encryptionKey,
  );

  if (!githubToken) {
    throw error(500, "Failed to decrypt GitHub token");
  }

  if (!openrouterKey) {
    throw error(500, "Failed to decrypt OpenRouter API key");
  }

  try {
    // Fetch commits from GitHub
    const commits = await fetchGitHubCommits(
      config.github_username,
      githubToken,
      targetDate,
      config.repos_include ? JSON.parse(config.repos_include) : null,
      config.repos_exclude ? JSON.parse(config.repos_exclude) : null,
    );

    if (commits.length === 0) {
      return json({
        success: true,
        message: `No commits found for ${targetDate}`,
        summary: null,
      });
    }

    // ==========================================================================
    // Long-Horizon Context: Get historical context BEFORE generating
    // ==========================================================================
    const repos = [...new Set(commits.map((c) => c.repo))];
    let historicalContext: Awaited<ReturnType<typeof getHistoricalContext>> =
      [];
    let preDetectedTask = null;
    let promptContext: PromptContextInput | null = null;

    try {
      // Fetch context from previous days
      historicalContext = await getHistoricalContext(db, tenantId, targetDate);

      // Pre-detect task type from commit messages for continuation detection
      const commitText = commits.map((c) => c.message).join(" ");
      preDetectedTask = detectTaskFromText(commitText);

      // Check for multi-day continuation
      const continuation = detectContinuation(
        historicalContext,
        preDetectedTask,
      );

      // Build context to pass to AI
      if (historicalContext.length > 0 || continuation) {
        promptContext = {
          historicalContext:
            formatHistoricalContextForPrompt(historicalContext),
          continuationNote: formatContinuationForPrompt(continuation),
        };
      }

      console.log(
        `Context: task=${preDetectedTask}, continuation=${continuation?.startDate || "none"}, history=${historicalContext.length} days`,
      );
    } catch (contextError) {
      // Non-fatal: continue without context if it fails
      console.error(
        "Failed to get historical context (non-fatal):",
        contextError,
      );
    }

    // ==========================================================================
    // Build prompt based on voice (with optional context)
    // ==========================================================================
    const customConfig: CustomVoiceConfig | null =
      config.voice_preset === "custom"
        ? {
            systemPrompt: config.custom_system_prompt ?? undefined,
            summaryInstructions:
              config.custom_summary_instructions ?? undefined,
            gutterStyle: config.custom_gutter_style ?? undefined,
          }
        : null;

    const promptResult = buildVoicedPrompt(
      config.voice_preset,
      commits,
      targetDate,
      config.owner_name ?? "the developer",
      customConfig,
      promptContext,
    );

    // Call OpenRouter
    const aiResponse = await callOpenRouter(
      openrouterKey,
      config.openrouter_model,
      promptResult.systemPrompt,
      promptResult.userPrompt,
      { maxTokens: 2000 },
    );

    // Parse AI response
    const parsed = parseAIResponse(aiResponse.content);

    // ==========================================================================
    // Long-Horizon Context: Build context data for storage
    // ==========================================================================
    const contextData = buildSummaryContextData(
      { brief: parsed.brief, detailed: parsed.detailed },
      commits,
      targetDate,
      historicalContext,
      preDetectedTask,
    );

    console.log(
      `Final context: detected=${contextData.detectedFocus?.task || "none"}, streak=${contextData.focusStreak}`,
    );

    // Calculate stats
    const totalAdditions = commits.reduce(
      (sum, c) => sum + (c.additions ?? 0),
      0,
    );
    const totalDeletions = commits.reduce(
      (sum, c) => sum + (c.deletions ?? 0),
      0,
    );

    // Generate ID
    const summaryId = `${tenantId}-${targetDate}`;

    // Store summary with context data
    await db
      .prepare(
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
        tenantId,
        targetDate,
        parsed.brief,
        parsed.detailed,
        JSON.stringify(parsed.gutter),
        commits.length,
        JSON.stringify(repos),
        totalAdditions,
        totalDeletions,
        config.openrouter_model,
        config.voice_preset,
        JSON.stringify(contextData.contextBrief),
        contextData.detectedFocus
          ? JSON.stringify(contextData.detectedFocus)
          : null,
        contextData.continuationOf,
        contextData.focusStreak,
      )
      .run();

    // Update activity table
    await db
      .prepare(
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
        tenantId,
        targetDate,
        commits.length,
        JSON.stringify(repos),
        totalAdditions,
        totalDeletions,
      )
      .run();

    // Log AI usage
    await db
      .prepare(
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
        tenantId,
        config.openrouter_model,
        aiResponse.inputTokens,
        aiResponse.outputTokens,
        calculateOpenRouterCost(
          config.openrouter_model,
          aiResponse.inputTokens,
          aiResponse.outputTokens,
        ),
      )
      .run();

    // Build response summary
    const summary = {
      id: summaryId,
      summaryDate: targetDate,
      briefSummary: parsed.brief,
      detailedTimeline: parsed.detailed,
      gutterComments: parsed.gutter,
      commitCount: commits.length,
      reposActive: repos,
      totalAdditions,
      totalDeletions,
      voicePreset: config.voice_preset,
      // Long-horizon context info
      detectedFocus: contextData.detectedFocus?.task ?? null,
      focusStreak: contextData.focusStreak,
      continuationOf: contextData.continuationOf,
    };

    return json({
      success: true,
      message: `Generated summary for ${targetDate}`,
      summary,
      usage: {
        model: config.openrouter_model,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        cost: calculateOpenRouterCost(
          config.openrouter_model,
          aiResponse.inputTokens,
          aiResponse.outputTokens,
        ),
      },
      context: {
        historicalDays: historicalContext.length,
        preDetectedTask,
        finalDetectedTask: contextData.detectedFocus?.task ?? null,
        focusStreak: contextData.focusStreak,
      },
    });
  } catch (err) {
    console.error("Failed to generate timeline summary:", err);
    throw error(
      500,
      `Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
};

/**
 * Fetch commits from GitHub for a specific date.
 */
async function fetchGitHubCommits(
  username: string,
  token: string,
  date: string,
  includeRepos: string[] | null,
  excludeRepos: string[] | null,
): Promise<Commit[]> {
  // Calculate date range (full day in UTC)
  const startDate = new Date(`${date}T00:00:00Z`);
  const endDate = new Date(`${date}T23:59:59Z`);

  // Fetch user's events from GitHub
  const response = await fetch(
    `https://api.github.com/users/${username}/events?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GroveEngine-Timeline-Curio",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  const events = (await response.json()) as Array<{
    type: string;
    created_at: string;
    repo: { name: string };
    payload: {
      commits?: Array<{
        sha: string;
        message: string;
      }>;
    };
  }>;

  // Filter for PushEvents on the target date
  const commits: Commit[] = [];

  for (const event of events) {
    if (event.type !== "PushEvent") continue;

    const eventDate = new Date(event.created_at);
    if (eventDate < startDate || eventDate > endDate) continue;

    const repoName = event.repo.name.split("/")[1]; // Remove owner prefix

    // Check include/exclude filters
    if (includeRepos && !includeRepos.includes(repoName)) continue;
    if (excludeRepos && excludeRepos.includes(repoName)) continue;

    // Extract commits from the push event
    for (const commit of event.payload.commits ?? []) {
      commits.push({
        sha: commit.sha,
        message: commit.message,
        repo: repoName,
        timestamp: event.created_at,
        // Note: Would need additional API calls for additions/deletions
        additions: 0,
        deletions: 0,
      });
    }
  }

  return commits;
}
