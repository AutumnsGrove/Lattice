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

  try {
    const db = platform.env.DB;
    const tenantId = locals.tenantId;

    // Get post count and approximate word count using SQL
    //
    // NOTE: Word count is an APPROXIMATION using space counting.
    // Limitations:
    // - Multiple consecutive spaces are counted as multiple words
    // - Markdown syntax (**bold**, [links], etc.) is counted as text
    // - Code blocks and frontmatter are included
    //
    // For accurate counts, consider caching word_count on the posts table
    // calculated during save (future optimization).
    const statsQuery = `
      SELECT
        COUNT(*) as post_count,
        COALESCE(SUM(
          LENGTH(markdown_content) - LENGTH(REPLACE(markdown_content, ' ', '')) + 1
        ), 0) as total_words
      FROM posts
      WHERE tenant_id = ?
    `;

    const statsResult = await db.prepare(statsQuery).bind(tenantId).first<PostStatsRow>();

    // Get top 5 tags with counts
    // Tags are stored as JSON arrays, so we need to parse them
    const postsQuery = `
      SELECT tags FROM posts WHERE tenant_id = ? AND tags IS NOT NULL AND tags != '[]'
    `;
    const postsResult = await db.prepare(postsQuery).bind(tenantId).all();

    // Count tag occurrences
    const tagCounts: Record<string, number> = {};
    for (const row of postsResult.results || []) {
      try {
        const tags = JSON.parse((row as { tags: string }).tags || '[]') as string[];
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      } catch (err) {
        // Log invalid JSON for debugging data issues
        console.warn('Invalid tags JSON in post:', (row as { id?: string }).id, err);
      }
    }

    // Sort by count and take top 5
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Get account creation date from users table
    let accountAgeDays = 0;
    try {
      const userQuery = `
        SELECT created_at FROM users WHERE id = ? LIMIT 1
      `;
      const userResult = await db.prepare(userQuery).bind(locals.user.id).first<UserRow>();

      if (userResult?.created_at) {
        const createdAt = new Date(userResult.created_at);
        const now = new Date();
        accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
    } catch {
      // User table might not have created_at, use fallback
      accountAgeDays = 30;
    }

    const stats: StatsResult = {
      postCount: statsResult?.post_count || 0,
      totalWords: statsResult?.total_words || 0,
      draftCount: 0, // TODO: implement when drafts are added
      topTags,
      accountAgeDays
    };

    return json(stats);
  } catch (err) {
    console.error("Error fetching stats:", err);
    throw error(500, "Failed to fetch stats");
  }
};
