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
    "User-Agent": "GroveEngine-GitDashboard",
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
    "User-Agent": "GroveEngine-GitDashboard",
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

export const USER_COMMITS_QUERY = `
query($username: String!, $limit: Int!) {
  user(login: $username) {
    repositories(first: $limit, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR]) {
      nodes {
        name
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, author: {id: null}) {
                nodes {
                  oid
                  message
                  committedDate
                  additions
                  deletions
                }
              }
            }
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
      throw new Error(`GitHub user not found: ${username}`);
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

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
    throw new Error(`GitHub GraphQL error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GitHub GraphQL error: ${data.errors[0].message}`);
  }

  const calendar = data.data.user.contributionsCollection.contributionCalendar;

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
