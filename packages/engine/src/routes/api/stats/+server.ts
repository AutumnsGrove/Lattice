import { json, error } from "@sveltejs/kit";
import { getTenantDb } from "$lib/server/services/database.js";
import type { RequestHandler } from "./$types.js";

interface StatsResult {
  postCount: number;
  totalWords: number;
  draftCount: number;
  topTags: string[];
  accountAgeDays: number;
}

interface PostStatsRow {
  post_count: number;
  total_words: number;
}

interface TagRow {
  tag: string;
  count: number;
}

interface UserRow {
  created_at: string;
}

/**
 * GET /api/stats - Get dashboard statistics
 *
 * Calculates stats server-side to avoid fetching full post content.
 * Returns: post count, word count, top tags, account age
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  // Auth check for admin access
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }

  const db = platform.env.DB;
  const tenantId = locals.tenantId;

  // PERFORMANCE: Run all three stats queries in parallel (~400ms savings)
  // Each query has individual error handling to prevent cascading failures
  const [postStatsResult, tagsResult, tenantResult] = await Promise.all([
    // Query 1: Get post count and approximate word count
    // NOTE: Word count is an APPROXIMATION using space counting
    db
      .prepare(
        `SELECT
        COUNT(*) as post_count,
        COALESCE(SUM(
          LENGTH(markdown_content) - LENGTH(REPLACE(markdown_content, ' ', '')) + 1
        ), 0) as total_words
      FROM posts
      WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<PostStatsRow>()
      .catch((err) => {
        console.error("[Stats] Failed to fetch post stats:", err);
        return null;
      }),

    // Query 2: Get tags from all posts for counting
    db
      .prepare(
        `SELECT tags FROM posts WHERE tenant_id = ? AND tags IS NOT NULL AND tags != '[]'`,
      )
      .bind(tenantId)
      .all()
      .catch((err) => {
        console.error("[Stats] Failed to fetch tags:", err);
        return { results: [] };
      }),

    // Query 3: Get account creation date
    db
      .prepare(`SELECT created_at FROM tenants WHERE id = ? LIMIT 1`)
      .bind(tenantId)
      .first<UserRow>()
      .catch(() => null),
  ]);

  // Process post stats
  const postCount = postStatsResult?.post_count || 0;
  const totalWords = postStatsResult?.total_words || 0;

  // Process tags - count occurrences and get top 5
  const tagCounts: Record<string, number> = {};
  for (const row of tagsResult.results || []) {
    try {
      const tags = JSON.parse(
        (row as { tags: string }).tags || "[]",
      ) as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch (parseErr) {
      console.warn(
        "[Stats] Invalid tags JSON in post:",
        (row as { id?: string }).id,
        parseErr,
      );
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Process account age
  let accountAgeDays = 30; // Default fallback
  if (tenantResult?.created_at) {
    const createdAt = new Date(tenantResult.created_at);
    const now = new Date();
    accountAgeDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  const stats: StatsResult = {
    postCount,
    totalWords,
    draftCount: 0, // TODO: implement when drafts are added
    topTags,
    accountAgeDays,
  };

  // PERFORMANCE: Use no-cache to ensure fresh data after post changes
  // The browser can cache but must revalidate on each request
  // This prevents stale counts after creating/deleting posts (#623)
  return json(stats, {
    headers: { "Cache-Control": "private, no-cache" },
  });
};
