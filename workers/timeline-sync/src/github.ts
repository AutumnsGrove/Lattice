/**
 * GitHub API Integration
 *
 * Fetches commits from GitHub for timeline summary generation.
 * Handles repo discovery, commit fetching, and stats enrichment.
 */

import type {
  Commit,
  GitHubRepo,
  GitHubCommitDetail,
  TenantConfig,
} from "./config";
import { USER_AGENT } from "./config";

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch commits from GitHub for a specific date.
 *
 * Uses a two-tier strategy:
 * 1. Fast path: If timeline_activity has repos_active for this date (from backfill),
 *    use those repos directly — skips GitHub repo discovery.
 * 2. Slow path: Discover repos via /users/{username}/repos, then query each.
 */
export async function fetchGitHubCommits(
  config: TenantConfig,
  githubToken: string,
  targetDate: string,
  db: D1Database,
): Promise<Commit[]> {
  let repoFullNames: string[] = [];

  // Fast path: check if backfill already recorded which repos had activity
  try {
    const activity = await db
      .prepare(
        `SELECT repos_active FROM timeline_activity
         WHERE tenant_id = ? AND activity_date = ?`,
      )
      .bind(config.tenantId, targetDate)
      .first<{ repos_active: string }>();

    if (activity?.repos_active) {
      const repoNames = JSON.parse(activity.repos_active) as string[];
      // Validate repos belong to this tenant's GitHub username
      // (prevents cross-tenant data leakage from corrupted backfill data)
      const validRepoNames = repoNames.filter((name) => {
        // Short names shouldn't contain slashes (that would indicate wrong format)
        if (name.includes("/")) {
          console.warn(
            `[${config.tenantId}] Invalid repo format in backfill: ${name}`,
          );
          return false;
        }
        return true;
      });
      // repos_active stores short names; we need full_name (owner/repo)
      repoFullNames = validRepoNames.map(
        (name) => `${config.githubUsername}/${name}`,
      );
      console.log(
        `[${config.tenantId}] Fast path: using ${repoFullNames.length} repos from backfill data`,
      );
    }
  } catch {
    // Non-fatal: fall through to slow path
  }

  // Slow path: discover repos from GitHub API
  if (repoFullNames.length === 0) {
    const repos = await fetchUserRepos(
      config.githubUsername,
      githubToken,
      config.reposInclude,
      config.reposExclude,
    );
    repoFullNames = repos.map((r) => r.full_name);
    console.log(
      `[${config.tenantId}] Slow path: discovered ${repoFullNames.length} repos from GitHub API`,
    );
  }

  // Fetch commits from each repo for the target date
  const allCommits: Commit[] = [];

  for (const repoFullName of repoFullNames) {
    const repoName = repoFullName.split("/")[1];

    // Apply include/exclude filters (fast path repos may not be filtered yet)
    if (config.reposInclude && !config.reposInclude.includes(repoName))
      continue;
    if (config.reposExclude && config.reposExclude.includes(repoName)) continue;

    const repoCommits = await fetchRepoCommitsForDate(
      repoFullName,
      config.githubUsername,
      githubToken,
      targetDate,
    );
    allCommits.push(...repoCommits);

    // Rate limit between repos (200ms)
    if (repoFullNames.length > 1) {
      await sleep(200);
    }
  }

  return allCommits;
}

/**
 * Enrich commits with real additions/deletions from individual commit details.
 * The Commits list API doesn't include stats — we must fetch each commit individually.
 *
 * Uses concurrent fetching with a limit of 5 parallel requests to balance
 * speed vs rate limiting. Much faster than sequential for many commits.
 */
export async function fetchCommitStats(
  commits: Commit[],
  username: string,
  token: string,
): Promise<void> {
  const CONCURRENCY_LIMIT = 5;

  // Process commits in batches with concurrency limit
  for (let i = 0; i < commits.length; i += CONCURRENCY_LIMIT) {
    const batch = commits.slice(i, i + CONCURRENCY_LIMIT);

    await Promise.all(
      batch.map(async (commit) => {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${username}/${commit.repo}/commits/${commit.sha}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": USER_AGENT,
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
      }),
    );

    // Rate limit between batches (100ms)
    if (i + CONCURRENCY_LIMIT < commits.length) {
      await sleep(100);
    }
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Fetch user's repositories, filtered by include/exclude lists.
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
        "User-Agent": USER_AGENT,
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
        "User-Agent": USER_AGENT,
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
    await sleep(100);
  }

  return commits;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
