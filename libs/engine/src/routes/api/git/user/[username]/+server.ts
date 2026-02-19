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
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import type { ThresholdResult } from "$lib/threshold/types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

// Rate limit: 60 requests per minute per IP
// Calls GitHub REST API (60 req/hour unauthenticated, 5000 with token)
// KV caching reduces actual API calls significantly
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export const GET: RequestHandler = async ({ params, platform, request }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;

  if (!username || !isValidUsername(username)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  // Rate limiting by IP using Threshold SDK
  let rateLimitResult: ThresholdResult | null = null;
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const clientIP = getClientIP(request);
    const { result, response } = await thresholdCheckWithResult(threshold, {
      key: `git/user:${clientIP}`,
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
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }
    console.error("Failed to fetch GitHub user:", err);
    throwGroveError(502, API_ERRORS.UPSTREAM_ERROR, "API");
  }
};
