/**
 * Git Stats API
 *
 * Fetch aggregated GitHub statistics for a user.
 * Combines data from user profile and contributions.
 *
 * Design: Resilient fetching - user and contributions are fetched independently.
 * If contributions fail, we still return user data with empty contributions.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  fetchUser,
  fetchContributions,
  contributionsToActivity,
  getActivityLevel,
  isValidUsername,
  getCacheKey,
  DEFAULT_GIT_CONFIG,
  type GitUser,
  type GitContributions,
} from "$lib/git";
import {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
  getClientIP,
} from "$lib/server/rate-limits/index.js";

interface GitStatsResponse {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
  } | null;
  contributions: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    streak: {
      current: number;
      longest: number;
    };
  };
  activity: Array<{
    date: string;
    commits: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
  errors?: string[];
}

// Rate limit: 60 requests per minute (external API, expensive)
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

/**
 * Get today's date in YYYY-MM-DD format.
 * Uses UTC to match GitHub's contribution calendar (which is UTC-based).
 */
function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Calculate streak from activity data.
 * Uses UTC dates to match GitHub's contribution calendar.
 */
function calculateStreak(activity: Array<{ date: string; commits: number }>): {
  current: number;
  longest: number;
} {
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
  // GitHub contribution calendar uses UTC, so we use UTC here too
  const today = getTodayUTC();
  let checkDate = new Date(today + "T00:00:00Z");

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
 * Calculate contributions within a time period.
 * Uses UTC to match GitHub's contribution calendar.
 */
function calculatePeriodContributions(
  activity: Array<{ date: string; commits: number }>,
  days: number,
): number {
  const now = new Date();
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days),
  );

  return activity
    .filter((day) => new Date(day.date + "T00:00:00Z") >= cutoff)
    .reduce((sum, day) => sum + day.commits, 0);
}

export const GET: RequestHandler = async ({ params, platform, request }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;
  const token = platform?.env?.GITHUB_TOKEN;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  // Rate limiting by IP (public endpoint)
  if (kv) {
    const clientIP = getClientIP(request);
    const { result, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/stats", clientIP),
      ...RATE_LIMIT,
    });
    if (response) return response;
  }

  // Check cache first
  const cacheKey = getCacheKey("stats", username);
  if (kv) {
    try {
      const cached = await kv.get<GitStatsResponse>(cacheKey, "json");
      if (cached) {
        return json({ ...cached, cached: true });
      }
    } catch {
      // Cache read failed, continue with fresh fetch
    }
  }

  // Fetch user and contributions independently (resilient pattern)
  // If one fails, we can still return partial data
  const errors: string[] = [];
  let user: GitUser | null = null;
  let contributions: GitContributions | null = null;

  // Fetch user data (no token needed)
  try {
    user = await fetchUser(username);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw error(404, "User not found");
    }
    errors.push("user");
    console.error("Failed to fetch GitHub user:", err);
  }

  // Fetch contributions if token available
  if (token) {
    try {
      contributions = await fetchContributions(username, token);
    } catch (err) {
      errors.push("contributions");
      console.error("Failed to fetch GitHub contributions:", err);
    }
  }

  // If user fetch failed and we have no cached data, return error
  if (!user && errors.includes("user")) {
    throw error(502, "Unable to fetch user data. Please try again later.");
  }

  // Build response with available data
  let contributionsData = {
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    streak: { current: 0, longest: 0 },
  };
  let activityWithLevels: Array<{
    date: string;
    commits: number;
    level: 0 | 1 | 2 | 3 | 4;
  }> = [];

  if (contributions) {
    const activity = contributionsToActivity(contributions);

    contributionsData = {
      total: contributions.totalContributions,
      thisWeek: calculatePeriodContributions(activity, 7),
      thisMonth: calculatePeriodContributions(activity, 30),
      streak: calculateStreak(activity),
    };

    activityWithLevels = activity.map((day) => ({
      ...day,
      level: getActivityLevel(day.commits),
    }));
  }

  const response: GitStatsResponse = {
    user: user
      ? {
          login: user.login,
          name: user.name,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          publicRepos: user.publicRepos,
          followers: user.followers,
          following: user.following,
        }
      : null,
    contributions: contributionsData,
    activity: activityWithLevels,
  };

  // Include partial errors if any (helps debugging without exposing internals)
  if (errors.length > 0) {
    response.errors = errors;
  }

  // Cache the result (only if we have user data)
  if (kv && user) {
    try {
      await kv.put(cacheKey, JSON.stringify(response), {
        expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
      });
    } catch {
      // Cache write failed, continue
    }
  }

  return json({ ...response, cached: false });
};
