/**
 * Git Contributions API
 *
 * Fetch GitHub contribution calendar via GraphQL.
 * Requires a GitHub token for GraphQL API access.
 *
 * Token resolution (in order):
 * 1. Tenant-specific token from git_dashboard_config (encrypted)
 * 2. Global GITHUB_TOKEN env var (fallback)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  fetchContributions,
  contributionsToActivity,
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
import { safeDecryptToken } from "$lib/server/encryption";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

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

  if (!token) {
    throwGroveError(503, API_ERRORS.GITHUB_TOKEN_NOT_CONFIGURED, "API");
  }

  // Rate limiting by IP using Threshold SDK
  let rateLimitResult: ThresholdResult | null = null;
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const clientIP = getClientIP(request);
    const { result, response } = await thresholdCheckWithResult(threshold, {
      key: `git/contributions:${clientIP}`,
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
      ? thresholdHeaders(rateLimitResult, RATE_LIMIT.limit)
      : undefined;

  // Check cache first
  const cacheKey = getCacheKey("contributions", username, { format });
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return json({ ...cached, cached: true }, { headers: getHeaders() });
      }
    } catch (err) {
      console.warn(
        `[Git Contributions] Cache read failed for ${username}:`,
        err,
      );
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
      } catch (err) {
        console.warn(
          `[Git Contributions] Cache write failed for ${username}:`,
          err,
        );
      }
    }

    return json({ ...responseData, cached: false }, { headers: getHeaders() });
  } catch (err) {
    logGroveError("API", API_ERRORS.UPSTREAM_ERROR, {
      detail: `Failed to fetch GitHub contributions for ${username}`,
      cause: err,
    });
    return json(
      {
        error: API_ERRORS.UPSTREAM_ERROR.userMessage,
        error_code: API_ERRORS.UPSTREAM_ERROR.code,
      },
      { status: 502 },
    );
  }
};
