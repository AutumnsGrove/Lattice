/**
 * Git Dashboard Utilities
 *
 * Utilities for fetching and displaying GitHub statistics.
 * Uses GitHub GraphQL API for efficient data fetching.
 */

// =============================================================================
// Types
// =============================================================================

export interface GitDashboardConfig {
  enabled: boolean;
  githubUsername: string | null;
  showOnHomepage: boolean;
  cacheTtlSeconds: number;
  settings?: Record<string, unknown>;
}

export interface GitCommit {
  sha: string;
  message: string;
  date: string;
  repo: string;
  additions: number;
  deletions: number;
}

export interface GitStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  commitsByHour: Record<number, number>; // 0-23
  commitsByDay: Record<string, number>; // "Monday" - "Sunday"
  commitsByRepo: Record<string, number>; // Top repos
  recentCommits: GitCommit[];
  reposAnalyzed: number;
  timeRange: "all_time" | "filtered";
  filteredSince: string | null;
}

export interface GitActivity {
  date: string;
  commits: number;
}

export interface GitContributions {
  totalContributions: number;
  weeks: Array<{
    contributionDays: Array<{
      contributionCount: number;
      date: string;
      weekday: number;
    }>;
  }>;
}

export interface GitUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  location: string | null;
  blog: string | null;
  company: string | null;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_GIT_CONFIG: Omit<GitDashboardConfig, "githubUsername"> = {
  enabled: false,
  showOnHomepage: false,
  cacheTtlSeconds: 3600,
};

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/** Sentinel value to indicate a token should be cleared (not just preserved) */
export const CLEAR_TOKEN_VALUE = "__CLEAR_TOKEN__";

const USERNAME_REGEX = /^[a-zA-Z0-9-]+$/;
const MAX_USERNAME_LENGTH = 39;

// =============================================================================
// Validation
// =============================================================================

export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== "string") return false;
  if (username.length > MAX_USERNAME_LENGTH) return false;
  return USERNAME_REGEX.test(username);
}

export function validateUsername(username: string): void {
  if (!isValidUsername(username)) {
    throw new Error(
      `Invalid GitHub username: ${username}. Must be 1-39 alphanumeric characters or hyphens.`,
    );
  }
}

// =============================================================================
// API Headers
// =============================================================================

export function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Lattice-GitDashboard",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function getGraphQLHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "Lattice-GitDashboard",
  };
}

// =============================================================================
// Cache Key Generation
// =============================================================================

export function getCacheKey(
  type: string,
  username: string,
  params?: Record<string, string | number>,
): string {
  let key = `github:${type}:${username}`;
  if (params) {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    if (paramStr) {
      key += `:${paramStr}`;
    }
  }
  return key;
}

// =============================================================================
// GraphQL Queries
// =============================================================================

export const CONTRIBUTIONS_QUERY = `
query($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            weekday
          }
        }
      }
    }
  }
}
`;

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch GitHub user profile
 */
export async function fetchUser(
  username: string,
  token?: string,
): Promise<GitUser> {
  validateUsername(username);

  const response = await fetch(`${GITHUB_API_URL}/users/${username}`, {
    headers: getHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Include "not found" in message for upstream detection
      throw new Error(`GitHub user not found: ${username}`);
    }
    // Don't expose status codes to end users
    console.error(`GitHub API error for user ${username}: ${response.status}`);
    throw new Error("Unable to fetch user data from GitHub");
  }

  const data = (await response.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    public_repos: number;
    followers: number;
    following: number;
    location: string | null;
    blog: string | null;
    company: string | null;
  };

  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
    location: data.location,
    blog: data.blog,
    company: data.company,
  };
}

/**
 * Fetch GitHub contribution calendar via GraphQL
 */
export async function fetchContributions(
  username: string,
  token: string,
): Promise<GitContributions> {
  validateUsername(username);

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: getGraphQLHeaders(token),
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { username },
    }),
  });

  if (!response.ok) {
    console.error(
      `GitHub GraphQL error for contributions ${username}: ${response.status}`,
    );
    throw new Error("Unable to fetch contributions from GitHub");
  }

  interface GraphQLResponse {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions: number;
            weeks: Array<{
              contributionDays: Array<{
                contributionCount: number;
                date: string;
                weekday: number;
              }>;
            }>;
          };
        };
      };
    };
    errors?: Array<{ message: string }>;
  }

  const data = (await response.json()) as GraphQLResponse;

  if (data.errors) {
    console.error(
      `GitHub GraphQL error for ${username}:`,
      data.errors[0].message,
    );
    throw new Error("Unable to fetch contributions from GitHub");
  }

  const calendar =
    data.data?.user?.contributionsCollection?.contributionCalendar;

  if (!calendar) {
    throw new Error(`GitHub user not found: ${username}`);
  }

  return {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks,
  };
}

/**
 * Transform contributions to activity format for heatmap
 */
export function contributionsToActivity(
  contributions: GitContributions,
): GitActivity[] {
  const activity: GitActivity[] = [];

  for (const week of contributions.weeks) {
    for (const day of week.contributionDays) {
      activity.push({
        date: day.date,
        commits: day.contributionCount,
      });
    }
  }

  return activity;
}

/**
 * Calculate activity level (0-4) for heatmap coloring
 */
export function getActivityLevel(commits: number): 0 | 1 | 2 | 3 | 4 {
  if (commits === 0) return 0;
  if (commits <= 2) return 1;
  if (commits <= 5) return 2;
  if (commits <= 10) return 3;
  return 4;
}

// =============================================================================
// Streak Calculations
// =============================================================================

/**
 * Get today's date in YYYY-MM-DD format (UTC).
 * Uses UTC to match GitHub's contribution calendar.
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Calculate current and longest streak from activity data.
 * Uses UTC dates to match GitHub's contribution calendar.
 *
 * Current streak: Consecutive days with commits from today backwards.
 * Longest streak: Maximum consecutive days with commits in the dataset.
 *
 * @param activity - Array of { date, commits } objects
 * @param today - Override today's date for testing (YYYY-MM-DD format)
 */
export function calculateStreak(
  activity: Array<{ date: string; commits: number }>,
  today?: string,
): { current: number; longest: number } {
  if (activity.length === 0) {
    return { current: 0, longest: 0 };
  }

  let current = 0;
  let longest = 0;
  let tempStreak = 0;

  // Sort by date descending to calculate current streak
  const sorted = [...activity].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Calculate current streak (from today backwards)
  const todayDate = today ?? getTodayUTC();
  let checkDate = new Date(todayDate + "T00:00:00Z");

  for (const day of sorted) {
    const dayDate = day.date;
    const expectedDate = checkDate.toISOString().split("T")[0];

    if (dayDate === expectedDate && day.commits > 0) {
      current++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else if (dayDate === expectedDate && day.commits === 0) {
      break;
    } else if (dayDate < expectedDate) {
      // Skip days not in data (weekends or missing data)
      checkDate = new Date(dayDate + "T00:00:00Z");
      if (day.commits > 0) {
        current++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  const chronological = [...activity].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const day of chronological) {
    if (day.commits > 0) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { current, longest };
}

/**
 * Calculate total contributions within a time period.
 *
 * @param activity - Array of { date, commits } objects
 * @param days - Number of days to look back
 * @param today - Override today's date for testing (YYYY-MM-DD format)
 */
export function calculatePeriodContributions(
  activity: Array<{ date: string; commits: number }>,
  days: number,
  today?: string,
): number {
  const todayDate = today ? new Date(today) : new Date();
  const cutoff = new Date(
    Date.UTC(
      todayDate.getUTCFullYear(),
      todayDate.getUTCMonth(),
      todayDate.getUTCDate() - days,
    ),
  );

  return activity
    .filter((day) => new Date(day.date + "T00:00:00Z") >= cutoff)
    .reduce((sum, day) => sum + day.commits, 0);
}
