/**
 * Git Stats API
 *
 * Fetch aggregated GitHub statistics for a user.
 * Combines data from user profile and contributions.
 *
 * Design: Resilient fetching - user and contributions are fetched independently.
 * If contributions fail, we still return user data with empty contributions.
 *
 * Token resolution (in order):
 * 1. Tenant-specific token from git_dashboard_config (encrypted)
 * 2. Global GITHUB_TOKEN env var (fallback)
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
  calculateStreak,
  calculatePeriodContributions,
  DEFAULT_GIT_CONFIG,
  type GitUser,
  type GitContributions,
} from "$lib/git";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import type { ThresholdResult } from "$lib/threshold/types.js";
import { safeDecryptToken } from "$lib/server/encryption";
import { API_ERRORS, throwGroveError } from "$lib/errors";

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

// Rate limit: 60 requests per minute per IP
// This endpoint calls GitHub's REST and GraphQL APIs which have their own limits:
// - REST API: 60 req/hour unauthenticated, 5000 req/hour with token
// - GraphQL API: 5000 points/hour (each query ~1-2 points)
// We cache responses in KV to reduce actual API calls, so 60/min is safe.
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export const GET: RequestHandler = async ({
  params,
  platform,
  request,
  locals,
}) => {
  const { username } = params;
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!username || !isValidUsername(username)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Resolve token: tenant config first, then global env fallback
  let token: string | null = null;

  if (db && tenantId) {
    try {
      const config = await db
        .prepare(
          `SELECT github_token_encrypted FROM git_dashboard_config WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<{ github_token_encrypted: string | null }>();

      if (config?.github_token_encrypted) {
        const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;
        token = await safeDecryptToken(
          config.github_token_encrypted,
          encryptionKey,
        );
      }
    } catch (err) {
      console.warn(
        "Failed to fetch tenant token, falling back to global:",
        err,
      );
    }
  }

  // Fallback to global GITHUB_TOKEN
  if (!token) {
    token = platform?.env?.GITHUB_TOKEN ?? null;
  }

  // Rate limiting by IP using Threshold SDK
  let rateLimitResult: ThresholdResult | null = null;
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const clientIP = getClientIP(request);
    const { result, response } = await thresholdCheckWithResult(threshold, {
      key: `git/stats:${clientIP}`,
      ...RATE_LIMIT,
    });
    if (response) return response;
    rateLimitResult = result;
  }

  // Helper to get response headers
  const getHeaders = () =>
    rateLimitResult
      ? thresholdHeaders(rateLimitResult, RATE_LIMIT.limit)
      : undefined;

  // Check cache first
  const cacheKey = getCacheKey("stats", username);
  if (kv) {
    try {
      const cached = await kv.get<GitStatsResponse>(cacheKey, "json");
      if (cached) {
        return json({ ...cached, cached: true }, { headers: getHeaders() });
      }
    } catch (err) {
      console.warn(`[Git Stats] Cache read failed for ${username}:`, err);
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
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
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
    throwGroveError(502, API_ERRORS.UPSTREAM_ERROR, "API");
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
    } catch (err) {
      console.warn(`[Git Stats] Cache write failed for ${username}:`, err);
    }
  }

  return json({ ...response, cached: false }, { headers: getHeaders() });
};
