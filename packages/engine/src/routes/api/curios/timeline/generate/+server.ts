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
import {
  getTimelineToken,
  TIMELINE_SECRET_KEYS,
} from "$lib/curios/timeline/secrets.server";
import { createLumenClient } from "$lib/lumen/index.js";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

/** Maximum concurrent GitHub API requests to avoid rate limiting */
const CONCURRENCY_LIMIT = 5;

/**
 * Run async functions with limited concurrency.
 * Processes items in batches of `limit` size for controlled parallelism.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number = CONCURRENCY_LIMIT,
): Promise<R[]> {
  const results: R[] = [];

  // Process in batches
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

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
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Rate limit generation (expensive AI + GitHub API operation)
  if (platform?.env?.CACHE_KV) {
    const { response } = await checkRateLimit({
      kv: platform.env.CACHE_KV,
      key: buildRateLimitKey("ai/timeline-generate", user.id),
      limit: 20,
      windowSeconds: 86400, // 24 hours
      namespace: "ai-ratelimit",
      failClosed: true,
    });
    if (response) return response;
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
    throwGroveError(400, API_ERRORS.FEATURE_DISABLED, "API");
  }

  // Get tokens using SecretsManager (preferred) with legacy fallback
  const env = {
    DB: db,
    GROVE_KEK: platform?.env?.GROVE_KEK,
    TOKEN_ENCRYPTION_KEY: platform?.env?.TOKEN_ENCRYPTION_KEY,
  };

  const githubResult = await getTimelineToken(
    env,
    tenantId,
    TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
    config.github_token_encrypted,
  );

  const openrouterResult = await getTimelineToken(
    env,
    tenantId,
    TIMELINE_SECRET_KEYS.OPENROUTER_KEY,
    config.openrouter_key_encrypted,
  );

  // Log any auto-migrations
  if (githubResult.migrated) {
    console.log(
      `[Timeline Generate] Auto-migrated GitHub token to SecretsManager`,
    );
  }
  if (openrouterResult.migrated) {
    console.log(
      `[Timeline Generate] Auto-migrated OpenRouter key to SecretsManager`,
    );
  }

  const githubToken = githubResult.token;
  const openrouterKey = openrouterResult.token;

  if (!githubToken) {
    console.error(
      `[Timeline Generate] GitHub token not found. Source attempted: ${githubResult.source}. GROVE_KEK present: ${!!platform?.env?.GROVE_KEK}`,
    );
    return json(
      {
        success: false,
        error: "github_token_missing",
        message:
          "GitHub token could not be retrieved. Check that it's saved in Timeline settings.",
        debug: {
          secretSource: githubResult.source,
          kekConfigured: !!platform?.env?.GROVE_KEK,
          legacyKeyConfigured: !!platform?.env?.TOKEN_ENCRYPTION_KEY,
          legacyColumnPresent: !!config.github_token_encrypted,
        },
      },
      { status: 400 },
    );
  }

  if (!openrouterKey) {
    console.error(
      `[Timeline Generate] OpenRouter key not found. Source attempted: ${openrouterResult.source}. GROVE_KEK present: ${!!platform?.env?.GROVE_KEK}`,
    );
    return json(
      {
        success: false,
        error: "openrouter_key_missing",
        message:
          "OpenRouter API key could not be retrieved. Check that it's saved in Timeline settings.",
        debug: {
          secretSource: openrouterResult.source,
          kekConfigured: !!platform?.env?.GROVE_KEK,
          legacyKeyConfigured: !!platform?.env?.TOKEN_ENCRYPTION_KEY,
          legacyColumnPresent: !!config.openrouter_key_encrypted,
        },
      },
      { status: 400 },
    );
  }

  // Log token retrieval diagnostics (helps debug key issues without exposing values)
  console.log(
    `[Timeline Generate] Token sources: github=${githubResult.source}, openrouter=${openrouterResult.source}`,
  );

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

    // Enrich commits with stats from individual commit details
    await fetchCommitStats(commits, config.github_username, githubToken);

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

    // Call AI via Lumen (uses tenant's own OpenRouter key)
    const globalKey = platform?.env?.OPENROUTER_API_KEY || openrouterKey;
    const lumen = createLumenClient({
      openrouterApiKey: globalKey,
      ai: platform?.env?.AI,
      db,
    });

    const aiResponse = await lumen.run({
      task: "summary",
      input: [
        { role: "system", content: promptResult.systemPrompt },
        { role: "user", content: promptResult.userPrompt },
      ],
      tenant: tenantId,
      options: {
        model: config.openrouter_model,
        tenantApiKey: openrouterKey,
        maxTokens: 2048,
        temperature: 0.5,
        skipQuota: true, // User pays via their own key
      },
    });

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
        aiResponse.model,
        aiResponse.usage.input,
        aiResponse.usage.output,
        aiResponse.usage.cost,
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
        model: aiResponse.model,
        inputTokens: aiResponse.usage.input,
        outputTokens: aiResponse.usage.output,
        cost: aiResponse.usage.cost,
      },
      context: {
        historicalDays: historicalContext.length,
        preDetectedTask,
        finalDetectedTask: contextData.detectedFocus?.task ?? null,
        focusStreak: contextData.focusStreak,
      },
    });
  } catch (err) {
    // Extract actionable error details instead of returning generic message
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Check for Lumen-specific errors with provider details
    const isLumenError =
      err instanceof Error && "code" in err && "attempts" in err;
    const attempts = isLumenError
      ? (
          err as {
            attempts?: Array<{
              provider: string;
              model: string;
              error: string;
            }>;
          }
        ).attempts
      : undefined;

    console.error(
      `[Timeline Generate] Failed for ${targetDate}:`,
      errorMessage,
    );
    if (attempts) {
      console.error(
        `[Timeline Generate] Provider attempts:`,
        JSON.stringify(attempts),
      );
    }

    // Return detailed error so the UI can show what actually went wrong
    return json(
      {
        success: false,
        error: "generation_failed",
        message: errorMessage,
        debug: {
          date: targetDate,
          model: config.openrouter_model,
          providerAttempts: attempts ?? null,
        },
      },
      { status: 500 },
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

  // Filter repos by include/exclude lists
  const filteredRepos = repoFullNames.filter((repoFullName) => {
    const repoName = repoFullName.split("/")[1];
    if (includeRepos && !includeRepos.includes(repoName)) return false;
    if (excludeRepos && excludeRepos.includes(repoName)) return false;
    return true;
  });

  // Fetch commits from repos in parallel (5 concurrent requests - 3+ seconds savings)
  const commitArrays = await runWithConcurrency(filteredRepos, (repoFullName) =>
    fetchRepoCommitsForDate(repoFullName, username, token, date),
  );
  const allCommits = commitArrays.flat();

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

/**
 * Enrich commits with real additions/deletions from individual commit details.
 * The Commits list API doesn't include stats — we must fetch each commit individually.
 * Uses concurrent fetching (5 at a time) for significant speed improvement.
 */
async function fetchCommitStats(
  commits: Commit[],
  username: string,
  token: string,
): Promise<void> {
  // Fetch commit stats in parallel batches
  await runWithConcurrency(commits, async (commit) => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${commit.repo}/commits/${commit.sha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GroveEngine-Timeline-Curio",
          },
        },
      );

      if (response.ok) {
        const detail = (await response.json()) as GitHubCommitDetail;
        commit.additions = detail.stats?.additions ?? 0;
        commit.deletions = detail.stats?.deletions ?? 0;
      }
    } catch {
      // Non-fatal: keep 0 for this commit
    }
  });
}
