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

export const GET: RequestHandler = async ({ params, platform }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  // Check cache first
  if (kv) {
    const cacheKey = getCacheKey("user", username);
    const cached = await kv.get(cacheKey, "json");
    if (cached) {
      return json({ user: cached, cached: true });
    }
  }

  try {
    // Fetch from GitHub (no token needed for public user data)
    const user = await fetchUser(username);

    // Cache the result
    if (kv) {
      const cacheKey = getCacheKey("user", username);
      await kv.put(cacheKey, JSON.stringify(user), {
        expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
      });
    }

    return json({ user, cached: false });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw error(404, "User not found");
    }
    console.error("Failed to fetch GitHub user:", err);
    throw error(502, "Failed to fetch user from GitHub");
  }
};
