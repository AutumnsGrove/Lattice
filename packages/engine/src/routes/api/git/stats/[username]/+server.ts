/**
 * Git Stats API
 *
 * Fetch aggregated GitHub statistics for a user.
 * Combines data from user profile and contributions.
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
} from "$lib/git";

interface GitStatsResponse {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
  };
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
}

function calculateStreak(activity: Array<{ date: string; commits: number }>): {
  current: number;
  longest: number;
} {
  let current = 0;
  let longest = 0;
  let tempStreak = 0;

  // Sort by date descending to calculate current streak
  const sorted = [...activity].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split("T")[0];
  let checkDate = new Date(today);

  for (const day of sorted) {
    const dayDate = day.date;
    const expectedDate = checkDate.toISOString().split("T")[0];

    if (dayDate === expectedDate && day.commits > 0) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dayDate === expectedDate && day.commits === 0) {
      break;
    } else if (dayDate < expectedDate) {
      // Skip days not in data
      checkDate = new Date(dayDate);
      if (day.commits > 0) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
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

function calculatePeriodContributions(
  activity: Array<{ date: string; commits: number }>,
  days: number,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return activity
    .filter((day) => new Date(day.date) >= cutoff)
    .reduce((sum, day) => sum + day.commits, 0);
}

export const GET: RequestHandler = async ({ params, platform }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;
  const token = platform?.env?.GITHUB_TOKEN;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  // Check cache first
  const cacheKey = getCacheKey("stats", username);
  if (kv) {
    const cached = await kv.get<GitStatsResponse>(cacheKey, "json");
    if (cached) {
      return json({ ...cached, cached: true });
    }
  }

  try {
    // Fetch user data (no token needed)
    const user = await fetchUser(username);

    // Fetch contributions if token available
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

    if (token) {
      const contributions = await fetchContributions(username, token);
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
      user: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        publicRepos: user.publicRepos,
        followers: user.followers,
        following: user.following,
      },
      contributions: contributionsData,
      activity: activityWithLevels,
    };

    // Cache the result
    if (kv) {
      await kv.put(cacheKey, JSON.stringify(response), {
        expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
      });
    }

    return json({ ...response, cached: false });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw error(404, "User not found");
    }
    console.error("Failed to fetch GitHub stats:", err);
    throw error(502, "Failed to fetch stats from GitHub");
  }
};
