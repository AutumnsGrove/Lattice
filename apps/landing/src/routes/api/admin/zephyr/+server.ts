/**
 * GET /api/admin/zephyr — Zephyr broadcast analytics for admin dashboard
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface BroadcastRow {
  id: string;
  content: string;
  platforms: string;
  status: string;
  tenant: string;
  created_at: number;
}

export const GET: RequestHandler = async ({ platform }) => {
  // Zephyr tables are in the main database
  if (!platform?.env?.DB) {
    return json({
      error: "Database not configured",
      broadcasts: [],
      stats: null,
    });
  }

  const db = platform.env.DB;

  try {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [recentBroadcasts, statsResult] = await Promise.all([
      // Recent broadcasts
      db
        .prepare(
          `SELECT 
            id,
            content,
            platforms,
            status,
            tenant,
            created_at
          FROM zephyr_broadcasts
          ORDER BY created_at DESC
          LIMIT 50`,
        )
        .all<BroadcastRow>(),

      // Stats by status
      db
        .prepare(
          `SELECT 
            status,
            COUNT(*) as count,
            platforms
          FROM zephyr_broadcasts
          WHERE created_at >= ?
          GROUP BY status`,
        )
        .bind(oneWeekAgo)
        .all<{ status: string; count: number }>(),
    ]);

    // Calculate platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const row of recentBroadcasts.results ?? []) {
      try {
        const platforms = JSON.parse(row.platforms) as string[];
        for (const platform of platforms) {
          platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        }
      } catch {
        // Ignore parse errors
      }
    }

    const byStatus = statsResult.results ?? [];

    return json({
      broadcasts: recentBroadcasts.results ?? [],
      stats: {
        byStatus,
        byPlatform: platformCounts,
        total: byStatus.reduce(
          (sum: number, s: { count: number }) => sum + s.count,
          0,
        ),
      },
    });
  } catch (err) {
    console.error("[Zephyr Analytics] Error:", err);
    return json(
      {
        error: "Failed to fetch analytics",
        broadcasts: [],
        stats: null,
      },
      { status: 500 },
    );
  }
};
