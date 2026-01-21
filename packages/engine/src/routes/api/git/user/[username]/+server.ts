/**
 * Git User API
 *
 * Fetch GitHub user profile information.
 * Uses KV caching to reduce API calls.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  fetchUser,
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
// Calls GitHub REST API (60 req/hour unauthenticated, 5000 with token)
// KV caching reduces actual API calls significantly
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export const GET: RequestHandler = async ({ params, platform, request }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  // Rate limiting by IP (public endpoint)
  let rateLimitResult: RateLimitResult | null = null;
  if (kv) {
    const clientIP = getClientIP(request);
    const { result, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/user", clientIP),
      ...RATE_LIMIT,
    });
    if (response) return response;
    rateLimitResult = result;
  }

  // Helper to get response headers
  const getHeaders = () =>
    rateLimitResult
      ? rateLimitHeaders(rateLimitResult, RATE_LIMIT.limit)
      : undefined;

  // Check cache first
  if (kv) {
    try {
      const cacheKey = getCacheKey("user", username);
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return json({ user: cached, cached: true }, { headers: getHeaders() });
      }
    } catch {
      // Cache read failed, continue with fresh fetch
    }
  }

  try {
    // Fetch from GitHub (no token needed for public user data)
    const user = await fetchUser(username);

    // Cache the result
    if (kv) {
      try {
        const cacheKey = getCacheKey("user", username);
        await kv.put(cacheKey, JSON.stringify(user), {
          expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
        });
      } catch {
        // Cache write failed, continue
      }
    }

    return json({ user, cached: false }, { headers: getHeaders() });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw error(404, "User not found");
    }
    console.error("Failed to fetch GitHub user:", err);
    throw error(502, "Unable to fetch user data. Please try again later.");
  }
};
