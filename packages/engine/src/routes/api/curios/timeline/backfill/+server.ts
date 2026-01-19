/**
 * Timeline Curio API - Historical Backfill Endpoint
 *
 * POST /api/curios/timeline/backfill
 * Backfill historical commit data using the GitHub Commits API.
 * Unlike the Events API (90 days/300 events limit), this can go back
 * to the beginning of repo history.
 *
 * Admin-only endpoint for initial setup and historical data capture.
 *
 * Strategy:
 * 1. Events API (daily cron) - Fast, efficient for recent commits
 * 2. Commits API (backfill) - Complete history, per-repo queries
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { Commit } from "$lib/curios/timeline";
import { safeDecryptToken } from "$lib/server/encryption";

interface ConfigRow {
  github_username: string;
  github_token_encrypted: string;
  repos_include: string | null;
  repos_exclude: string | null;
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

interface BackfillRequest {
  startDate: string;
  endDate?: string;
  repoLimit?: number;
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

  const body = (await request.json()) as BackfillRequest;
  const {
    startDate, // YYYY-MM-DD - how far back to go
    endDate, // YYYY-MM-DD - defaults to today
    repoLimit = 10, // Max repos to process (rate limiting)
  } = body;

  if (!startDate) {
    throw error(400, "startDate is required (YYYY-MM-DD format)");
  }

  // Fetch config
  const config = await db
    .prepare(
      `SELECT
        github_username,
        github_token_encrypted,
        repos_include,
        repos_exclude
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config?.github_token_encrypted) {
    throw error(400, "GitHub token not configured");
  }

  // Decrypt token for API calls (safeDecryptToken handles both encrypted and plaintext)
  const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;
  const githubToken = await safeDecryptToken(
    config.github_token_encrypted,
    encryptionKey,
  );

  if (!githubToken) {
    throw error(500, "Failed to decrypt GitHub token");
  }

  const includeRepos = config.repos_include
    ? JSON.parse(config.repos_include)
    : null;
  const excludeRepos = config.repos_exclude
    ? JSON.parse(config.repos_exclude)
    : null;
  const end = endDate ?? new Date().toISOString().split("T")[0];

  try {
    // Step 1: Get user's repos
    const repos = await fetchUserRepos(
      config.github_username,
      githubToken,
      includeRepos,
      excludeRepos,
      repoLimit,
    );

    // Step 2: For each repo, fetch commits in date range
    const commitsByDate = new Map<string, Commit[]>();
    let totalCommits = 0;
    let processedRepos = 0;

    for (const repo of repos) {
      const repoCommits = await fetchRepoCommits(
        repo.full_name,
        config.github_username,
        githubToken,
        startDate,
        end,
      );

      totalCommits += repoCommits.length;
      processedRepos++;

      // Group commits by date
      for (const commit of repoCommits) {
        const commitDate = (commit.timestamp ?? commit.date ?? "").split(
          "T",
        )[0];
        if (!commitDate) continue; // Skip commits without dates
        if (!commitsByDate.has(commitDate)) {
          commitsByDate.set(commitDate, []);
        }
        commitsByDate.get(commitDate)!.push(commit);
      }

      // Rate limit: 1 repo per second to avoid hitting GitHub limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 3: Store activity data for each date
    let datesStored = 0;
    for (const [date, commits] of commitsByDate) {
      const repos = [...new Set(commits.map((c) => c.repo))];
      const totalAdditions = commits.reduce(
        (sum, c) => sum + (c.additions ?? 0),
        0,
      );
      const totalDeletions = commits.reduce(
        (sum, c) => sum + (c.deletions ?? 0),
        0,
      );

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
            commit_count = MAX(timeline_activity.commit_count, excluded.commit_count),
            repos_active = excluded.repos_active,
            lines_added = MAX(timeline_activity.lines_added, excluded.lines_added),
            lines_deleted = MAX(timeline_activity.lines_deleted, excluded.lines_deleted)`,
        )
        .bind(
          tenantId,
          date,
          commits.length,
          JSON.stringify(repos),
          totalAdditions,
          totalDeletions,
        )
        .run();

      datesStored++;
    }

    return json({
      success: true,
      message: `Backfilled ${totalCommits} commits across ${processedRepos} repos`,
      stats: {
        totalCommits,
        processedRepos,
        datesWithActivity: datesStored,
        dateRange: { start: startDate, end },
      },
    });
  } catch (err) {
    console.error("Backfill failed:", err);
    throw error(
      500,
      `Backfill failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
};

/**
 * Fetch user's repositories, filtered by include/exclude lists.
 */
async function fetchUserRepos(
  username: string,
  token: string,
  includeRepos: string[] | null,
  excludeRepos: string[] | null,
  limit: number,
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

  return repos.slice(0, limit);
}

/**
 * Fetch commits for a specific repo within a date range.
 * Uses the Commits API which has no 90-day limit.
 */
async function fetchRepoCommits(
  repoFullName: string,
  authorUsername: string,
  token: string,
  since: string,
  until: string,
): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  const perPage = 100;

  // The Commits API uses ISO8601 dates
  const sinceDate = `${since}T00:00:00Z`;
  const untilDate = `${until}T23:59:59Z`;

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
      // Repo might be empty or inaccessible
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

    // Extract repo name from full name
    const repoName = repoFullName.split("/")[1];

    for (const commit of pageCommits) {
      commits.push({
        sha: commit.sha,
        message: commit.commit.message,
        repo: repoName,
        timestamp: commit.commit.author.date,
        // Note: stats require an additional API call per commit
        // For backfill we skip this to avoid rate limits
        additions: 0,
        deletions: 0,
      });
    }

    // Check if there are more pages
    if (pageCommits.length < perPage) {
      break;
    }

    page++;

    // Rate limit between pages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return commits;
}
