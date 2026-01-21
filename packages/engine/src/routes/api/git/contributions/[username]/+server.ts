/**
 * Git Contributions API
 *
 * Fetch GitHub contribution calendar via GraphQL.
 * Requires GITHUB_TOKEN for GraphQL API access.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  fetchContributions,
  contributionsToActivity,
  isValidUsername,
  getCacheKey,
  DEFAULT_GIT_CONFIG,
} from "$lib/git";
import {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
  getClientIP,
  type RateLimitResult,
} from "$lib/server/rate-limits/index.js";

// Rate limit: 60 requests per minute per IP
// Calls GitHub GraphQL API (5000 points/hour, each query ~1-2 points)
// This endpoint is expensive as it fetches full contribution calendar
// KV caching is essential here to avoid hitting GitHub limits
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export const GET: RequestHandler = async ({
  params,
  platform,
  url,
  request,
}) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;
  const token = platform?.env?.GITHUB_TOKEN;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  if (!token) {
    throw error(503, "Service temporarily unavailable");
  }

  // Rate limiting by IP (public endpoint)
  let rateLimitResult: RateLimitResult | null = null;
  if (kv) {
    const clientIP = getClientIP(request);
    const { result, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/contributions", clientIP),
      ...RATE_LIMIT,
    });
    if (response) return response;
    rateLimitResult = result;
  }

  // Check if client wants activity format (for heatmap)
  const format = url.searchParams.get("format") || "raw";

  // Helper to get response headers
  const getHeaders = () =>
    rateLimitResult
      ? rateLimitHeaders(rateLimitResult, RATE_LIMIT.limit)
      : undefined;

  // Check cache first
  const cacheKey = getCacheKey("contributions", username, { format });
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return json({ ...cached, cached: true }, { headers: getHeaders() });
      }
    } catch {
      // Cache read failed, continue with fresh fetch
    }
  }

  try {
    const contributions = await fetchContributions(username, token);

    let responseData;
    if (format === "activity") {
      // Transform to activity format for heatmap display
      const activity = contributionsToActivity(contributions);
      responseData = {
        activity,
        totalContributions: contributions.totalContributions,
      };
    } else {
      responseData = { contributions };
    }

    // Cache the result
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(responseData), {
          expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
        });
      } catch {
        // Cache write failed, continue
      }
    }

    return json({ ...responseData, cached: false }, { headers: getHeaders() });
  } catch (err) {
    console.error("Failed to fetch GitHub contributions:", err);
    throw error(502, "Unable to fetch contributions. Please try again later.");
  }
};
