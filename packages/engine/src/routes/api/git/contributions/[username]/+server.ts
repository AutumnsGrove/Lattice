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

export const GET: RequestHandler = async ({ params, platform, url }) => {
  const { username } = params;
  const kv = platform?.env?.CACHE_KV;
  const token = platform?.env?.GITHUB_TOKEN;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  if (!token) {
    throw error(503, "GitHub token not configured");
  }

  // Check if client wants activity format (for heatmap)
  const format = url.searchParams.get("format") || "raw";

  // Check cache first
  const cacheKey = getCacheKey("contributions", username, { format });
  if (kv) {
    const cached = await kv.get(cacheKey, "json");
    if (cached) {
      return json({ ...cached, cached: true });
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
      await kv.put(cacheKey, JSON.stringify(responseData), {
        expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
      });
    }

    return json({ ...responseData, cached: false });
  } catch (err) {
    console.error("Failed to fetch GitHub contributions:", err);
    throw error(502, "Failed to fetch contributions from GitHub");
  }
};
