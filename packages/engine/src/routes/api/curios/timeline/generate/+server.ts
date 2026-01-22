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

interface GitHubRepo {
  name: string;
  full_name: string;
  fork: boolean;
  pushed_at: string;
}

interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
      email: string;
    };
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
    // Fetch commits from GitHub (uses Commits API, with fast path from backfill data)
    const commits = await fetchGitHubCommits(
      config.github_username,
      githubToken,
      targetDate,
      config.repos_include ? JSON.parse(config.repos_include) : null,
      config.repos_exclude ? JSON.parse(config.repos_exclude) : null,
      db,
      tenantId,
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
 * Fetch commits from GitHub for a specific date using the Commits API.
 *
 * Uses a two-tier strategy:
 * 1. Fast path: If timeline_activity has repos_active for this date (from backfill),
 *    use those repos directly — skips GitHub repo discovery.
 * 2. Slow path: Discover repos via /users/{username}/repos, then query each.
 */
async function fetchGitHubCommits(
  username: string,
  token: string,
  date: string,
  includeRepos: string[] | null,
  excludeRepos: string[] | null,
  db: D1Database,
  tenantId: string,
): Promise<Commit[]> {
  let repoFullNames: string[] = [];

  // Fast path: check if backfill already recorded which repos had activity
  try {
    const activity = await db
      .prepare(
        `SELECT repos_active FROM timeline_activity
         WHERE tenant_id = ? AND activity_date = ?`,
      )
      .bind(tenantId, date)
      .first<{ repos_active: string }>();

    if (activity?.repos_active) {
      const repoNames = JSON.parse(activity.repos_active) as string[];
      // repos_active stores short names; we need full_name (owner/repo)
      repoFullNames = repoNames.map((name) => `${username}/${name}`);
      console.log(
        `Fast path: using ${repoFullNames.length} repos from backfill data`,
      );
    }
  } catch {
    // Non-fatal: fall through to slow path
  }

  // Slow path: discover repos from GitHub API
  if (repoFullNames.length === 0) {
    const repos = await fetchUserRepos(
      username,
      token,
      includeRepos,
      excludeRepos,
    );
    repoFullNames = repos.map((r) => r.full_name);
    console.log(
      `Slow path: discovered ${repoFullNames.length} repos from GitHub API`,
    );
  }

  // Fetch commits from each repo for the target date
  const allCommits: Commit[] = [];

  for (const repoFullName of repoFullNames) {
    const repoName = repoFullName.split("/")[1];

    // Apply include/exclude filters (fast path repos may not be filtered yet)
    if (includeRepos && !includeRepos.includes(repoName)) continue;
    if (excludeRepos && excludeRepos.includes(repoName)) continue;

    const repoCommits = await fetchRepoCommitsForDate(
      repoFullName,
      username,
      token,
      date,
    );
    allCommits.push(...repoCommits);

    // Rate limit between repos
    if (repoFullNames.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allCommits;
}

/**
 * Fetch user's repositories, filtered by include/exclude lists.
 * No repo limit since generate processes a single day only.
 */
async function fetchUserRepos(
  username: string,
  token: string,
  includeRepos: string[] | null,
  excludeRepos: string[] | null,
): Promise<GitHubRepo[]> {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GroveEngine-Timeline-Curio",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repos: ${response.status}`);
  }

  let repos = (await response.json()) as GitHubRepo[];

  // Filter by include/exclude
  if (includeRepos) {
    repos = repos.filter((r) => includeRepos.includes(r.name));
  }
  if (excludeRepos) {
    repos = repos.filter((r) => !excludeRepos.includes(r.name));
  }

  // Exclude forks by default
  repos = repos.filter((r) => !r.fork);

  return repos;
}

/**
 * Fetch commits for a specific repo on a single date.
 * Uses the Commits API which has no 90-day limit.
 */
async function fetchRepoCommitsForDate(
  repoFullName: string,
  authorUsername: string,
  token: string,
  date: string,
): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  const perPage = 100;

  const sinceDate = `${date}T00:00:00Z`;
  const untilDate = `${date}T23:59:59Z`;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${repoFullName}/commits`);
    url.searchParams.set("author", authorUsername);
    url.searchParams.set("since", sinceDate);
    url.searchParams.set("until", untilDate);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GroveEngine-Timeline-Curio",
      },
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Empty repository
        break;
      }
      console.warn(
        `Failed to fetch commits for ${repoFullName}: ${response.status}`,
      );
      break;
    }

    const pageCommits = (await response.json()) as GitHubCommitDetail[];

    if (pageCommits.length === 0) {
      break;
    }

    const repoName = repoFullName.split("/")[1];

    for (const commit of pageCommits) {
      commits.push({
        sha: commit.sha,
        message: commit.commit.message,
        repo: repoName,
        timestamp: commit.commit.author.date,
        additions: 0,
        deletions: 0,
      });
    }

    if (pageCommits.length < perPage) {
      break;
    }

    page++;

    // Rate limit between pages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return commits;
}
