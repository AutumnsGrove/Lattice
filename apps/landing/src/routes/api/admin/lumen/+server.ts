/**
 * GET /api/admin/lumen — Lumen usage analytics + safety monitoring for admin dashboard
 *
 * AI analytics data is returned for all authenticated admins.
 * Safety data (Thorn/Petal) is only included for Wayfinder users.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getStats,
  getFlaggedContent,
  getRecentEvents,
} from "@autumnsgrove/lattice/thorn";
import { isWayfinder } from "@autumnsgrove/lattice/config";

interface LumenUsageRow {
  task: string;
  count: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  avg_latency: number;
}

interface LumenRecentRow {
  id: number;
  task: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  latency_ms: number;
  cached: number;
  created_at: string;
}

interface PetalFlag {
  id: string;
  user_id: string;
  flag_type: string;
  created_at: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    return json({ error: "Database not configured" }, { status: 500 });
  }

  const db = platform.env.DB;
  const userIsWayfinder = locals.user ? isWayfinder(locals.user.email) : false;

  try {
    // AI analytics queries (available to all admins)
    const aiQueries = Promise.all([
      // Today's usage by task
      // Uses SQLite's datetime() for consistent format with CURRENT_TIMESTAMP
      // (JS toISOString() uses 'T' separator which breaks lexicographic comparison)
      db
        .prepare(
          `SELECT
            task,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
          FROM lumen_usage
          WHERE created_at >= datetime('now', 'start of day')
          GROUP BY task`,
        )
        .all<LumenUsageRow>(),

      // Last 7 days usage
      db
        .prepare(
          `SELECT
            task,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
          FROM lumen_usage
          WHERE created_at >= datetime('now', '-7 days')
          GROUP BY task`,
        )
        .all<LumenUsageRow>(),

      // Recent requests (last 50)
      db
        .prepare(
          `SELECT
            id,
            task,
            model,
            provider,
            input_tokens,
            output_tokens,
            cost,
            latency_ms,
            cached,
            created_at
          FROM lumen_usage
          ORDER BY created_at DESC
          LIMIT 50`,
        )
        .all<LumenRecentRow>(),

      // Usage by provider
      db
        .prepare(
          `SELECT
            provider,
            COUNT(*) as count,
            SUM(cost) as total_cost
          FROM lumen_usage
          WHERE created_at >= datetime('now', '-7 days')
          GROUP BY provider`,
        )
        .all<{ provider: string; count: number; total_cost: number }>(),
    ]);

    // Safety queries — Wayfinder only, run in parallel with AI queries
    const safetyQueries = userIsWayfinder
      ? Promise.all([
          getStats(db, 30).catch((err) => {
            console.error("[Lumen/Safety] Failed to load Thorn stats:", err);
            return null;
          }),
          db
            .prepare(
              `SELECT category, COUNT(*) as count FROM petal_security_log
               WHERE result = 'block'
               AND category IS NOT NULL
               AND timestamp > datetime('now', '-720 hours')
               GROUP BY category
               ORDER BY count DESC`,
            )
            .all<{ category: string; count: number }>()
            .then((r) => r.results || [])
            .catch((err) => {
              console.error("[Lumen/Safety] Failed to load Petal blocks:", err);
              return [] as Array<{ category: string; count: number }>;
            }),
          getFlaggedContent(db, { status: "pending" }).catch((err) => {
            console.error("[Lumen/Safety] Failed to load Thorn flagged:", err);
            return [];
          }),
          getRecentEvents(db, { days: 7, limit: 25 }).catch((err) => {
            console.error("[Lumen/Safety] Failed to load Thorn events:", err);
            return [];
          }),
          db
            .prepare(
              `SELECT id, user_id, flag_type, created_at FROM petal_account_flags
               WHERE review_status = 'pending'
               ORDER BY created_at DESC
               LIMIT 25`,
            )
            .all<PetalFlag>()
            .then((r) => r.results || [])
            .catch((err) => {
              console.error("[Lumen/Safety] Failed to load Petal flags:", err);
              return [] as PetalFlag[];
            }),
        ])
      : null;

    // Await both query batches in parallel
    const [aiResults, safetyResults] = await Promise.all([
      aiQueries,
      safetyQueries,
    ]);

    const [todayStats, weekStats, recentUsage, providers] = aiResults;

    const response: Record<string, unknown> = {
      today: todayStats.results ?? [],
      week: weekStats.results ?? [],
      recent: recentUsage.results ?? [],
      providers: providers.results ?? [],
    };

    // Include safety data only for Wayfinder
    if (safetyResults) {
      const [thornStats, petalBlocks, thornFlagged, thornRecent, petalFlags] =
        safetyResults;
      response.safety = {
        thornStats: thornStats || {
          total: 0,
          allowed: 0,
          warned: 0,
          flagged: 0,
          blocked: 0,
          passRate: 0,
          byCategory: [],
          byContentType: [],
        },
        petalBlocks,
        thornFlagged,
        thornRecent,
        petalFlags,
      };
    }

    return json(response);
  } catch (err) {
    console.error("[Lumen Analytics] Error:", err);
    return json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
};
