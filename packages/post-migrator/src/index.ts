/**
 * Post Migrator Worker - Hot/Warm/Cold Storage Migration
 *
 * Runs daily via cron trigger to optimize storage costs:
 * - Hot → Warm: Posts >7 days old with <10 views/week
 * - Warm → Cold: Posts >30 days old with <1 view/week (content → R2)
 * - Cold → Warm: Popular post detected (auto-promote)
 *
 * Storage tiers:
 * - Hot: DO memory (fast, expensive for inactive content)
 * - Warm: DO SQLite (hibernates, moderate cost)
 * - Cold: R2 bucket (bulk storage, $0.015/GB)
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// ============================================================================
// Types
// ============================================================================

interface Env {
  DB: D1Database;
  COLD_STORAGE: R2Bucket;
  ENGINE: Fetcher;

  // Config vars
  HOT_TO_WARM_DAYS: string;
  WARM_TO_COLD_DAYS: string;
  HOT_VIEW_THRESHOLD: string;
  WARM_VIEW_THRESHOLD: string;
  BATCH_SIZE: string;
}

interface PostRecord {
  id: number;
  tenant_id: string;
  slug: string;
  title: string;
  markdown_content: string;
  html_content: string;
  gutter_content: string;
  storage_location: "hot" | "warm" | "cold";
  r2_key: string | null;
  published_at: string | null;
  updated_at: string;
}

interface MigrationResult {
  hotToWarm: number;
  warmToCold: number;
  coldToWarm: number;
  errors: string[];
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
  /**
   * Scheduled handler - runs on cron trigger (daily at 3 AM UTC)
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log(
      `[PostMigrator] Starting migration run at ${new Date().toISOString()}`,
    );

    try {
      const result = await runMigration(env);

      console.log("[PostMigrator] Migration complete:", {
        hotToWarm: result.hotToWarm,
        warmToCold: result.warmToCold,
        coldToWarm: result.coldToWarm,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error("[PostMigrator] Errors encountered:", result.errors);
      }
    } catch (err) {
      console.error("[PostMigrator] Migration failed:", err);
      throw err;
    }
  },

  /**
   * HTTP handler - for manual trigger and health checks
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "post-migrator" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Manual trigger (requires auth in production)
    if (url.pathname === "/run" && request.method === "POST") {
      // In production, add auth check here
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const result = await runMigration(env);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: err instanceof Error ? err.message : "Migration failed",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Status endpoint - show migration stats
    if (url.pathname === "/status") {
      try {
        const stats = await getStorageStats(env);
        return new Response(JSON.stringify(stats), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: err instanceof Error ? err.message : "Failed to get stats",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ============================================================================
// Migration Logic
// ============================================================================

async function runMigration(env: Env): Promise<MigrationResult> {
  const result: MigrationResult = {
    hotToWarm: 0,
    warmToCold: 0,
    coldToWarm: 0,
    errors: [],
  };

  const hotToWarmDays = parseInt(env.HOT_TO_WARM_DAYS || "7", 10);
  const warmToColdDays = parseInt(env.WARM_TO_COLD_DAYS || "30", 10);
  const hotViewThreshold = parseInt(env.HOT_VIEW_THRESHOLD || "10", 10);
  const warmViewThreshold = parseInt(env.WARM_VIEW_THRESHOLD || "1", 10);
  const batchSize = parseInt(env.BATCH_SIZE || "100", 10);

  // Calculate cutoff timestamps
  const now = Date.now();
  const hotCutoff = now - hotToWarmDays * 24 * 60 * 60 * 1000;
  const warmCutoff = now - warmToColdDays * 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // --- Hot → Warm Migration ---
  // Posts older than 7 days with <10 views in the past week
  try {
    const hotPosts = await env.DB.prepare(
      `
      SELECT p.id, p.tenant_id, p.slug, p.title, p.storage_location
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'hot'
        AND p.published_at < ?
        AND COALESCE(v.view_count, 0) < ?
      LIMIT ?
    `,
    )
      .bind(weekAgo, hotCutoff, hotViewThreshold, batchSize)
      .all();

    for (const post of hotPosts.results || []) {
      try {
        await env.DB.prepare(
          `
          UPDATE posts SET storage_location = 'warm', updated_at = ? WHERE id = ?
        `,
        )
          .bind(Date.now(), post.id)
          .run();

        result.hotToWarm++;
        console.log(
          `[PostMigrator] Hot → Warm: ${post.tenant_id}/${post.slug}`,
        );
      } catch (err) {
        result.errors.push(`Hot→Warm failed for ${post.slug}: ${err}`);
      }
    }
  } catch (err) {
    result.errors.push(`Hot→Warm query failed: ${err}`);
  }

  // --- Warm → Cold Migration ---
  // Posts older than 30 days with <1 view in the past week, move content to R2
  try {
    const warmPosts = await env.DB.prepare(
      `
      SELECT p.id, p.tenant_id, p.slug, p.title, p.markdown_content,
             p.html_content, p.gutter_content, p.storage_location
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'warm'
        AND p.published_at < ?
        AND COALESCE(v.view_count, 0) < ?
        AND p.r2_key IS NULL
      LIMIT ?
    `,
    )
      .bind(weekAgo, warmCutoff, warmViewThreshold, batchSize)
      .all<PostRecord>();

    for (const post of warmPosts.results || []) {
      try {
        // Generate R2 key
        const r2Key = `cold/${post.tenant_id}/${post.slug}.json`;

        // Upload content to R2
        await env.COLD_STORAGE.put(
          r2Key,
          JSON.stringify({
            markdownContent: post.markdown_content,
            htmlContent: post.html_content,
            gutterContent: post.gutter_content,
          }),
          { httpMetadata: { contentType: "application/json" } },
        );

        // Update D1 - clear content, set r2_key
        await env.DB.prepare(
          `
          UPDATE posts
          SET storage_location = 'cold',
              markdown_content = '',
              html_content = '',
              gutter_content = '[]',
              r2_key = ?,
              updated_at = ?
          WHERE id = ?
        `,
        )
          .bind(r2Key, Date.now(), post.id)
          .run();

        result.warmToCold++;
        console.log(
          `[PostMigrator] Warm → Cold: ${post.tenant_id}/${post.slug} → ${r2Key}`,
        );
      } catch (err) {
        result.errors.push(`Warm→Cold failed for ${post.slug}: ${err}`);
      }
    }
  } catch (err) {
    result.errors.push(`Warm→Cold query failed: ${err}`);
  }

  // --- Cold → Warm Promotion ---
  // Cold posts that received views recently should be promoted back
  try {
    const coldPosts = await env.DB.prepare(
      `
      SELECT p.id, p.tenant_id, p.slug, p.r2_key, v.view_count
      FROM posts p
      INNER JOIN (
        SELECT post_id, COUNT(*) as view_count
        FROM post_views
        WHERE viewed_at > ?
        GROUP BY post_id
        HAVING COUNT(*) >= ?
      ) v ON p.id = v.post_id
      WHERE p.storage_location = 'cold'
        AND p.r2_key IS NOT NULL
      LIMIT ?
    `,
    )
      .bind(weekAgo, warmViewThreshold, batchSize)
      .all<PostRecord & { view_count: number }>();

    for (const post of coldPosts.results || []) {
      try {
        // Fetch content from R2
        const r2Object = await env.COLD_STORAGE.get(post.r2_key!);
        if (!r2Object) {
          result.errors.push(`Cold→Warm: R2 object not found for ${post.slug}`);
          continue;
        }

        const content = (await r2Object.json()) as {
          markdownContent: string;
          htmlContent: string;
          gutterContent: string;
        };

        // Restore content to D1
        await env.DB.prepare(
          `
          UPDATE posts
          SET storage_location = 'warm',
              markdown_content = ?,
              html_content = ?,
              gutter_content = ?,
              r2_key = NULL,
              updated_at = ?
          WHERE id = ?
        `,
        )
          .bind(
            content.markdownContent,
            content.htmlContent,
            content.gutterContent,
            Date.now(),
            post.id,
          )
          .run();

        // Delete from R2 (content is now in D1)
        await env.COLD_STORAGE.delete(post.r2_key!);

        result.coldToWarm++;
        console.log(
          `[PostMigrator] Cold → Warm: ${post.tenant_id}/${post.slug} (${post.view_count} views)`,
        );
      } catch (err) {
        result.errors.push(`Cold→Warm failed for ${post.slug}: ${err}`);
      }
    }
  } catch (err) {
    result.errors.push(`Cold→Warm query failed: ${err}`);
  }

  return result;
}

// ============================================================================
// Stats Helper
// ============================================================================

async function getStorageStats(env: Env): Promise<{
  hot: number;
  warm: number;
  cold: number;
  total: number;
  lastRun?: string;
}> {
  const stats = await env.DB.prepare(
    `
    SELECT
      storage_location,
      COUNT(*) as count
    FROM posts
    WHERE published_at IS NOT NULL
    GROUP BY storage_location
  `,
  ).all<{ storage_location: string; count: number }>();

  const result = {
    hot: 0,
    warm: 0,
    cold: 0,
    total: 0,
  };

  for (const row of stats.results || []) {
    const location = row.storage_location as "hot" | "warm" | "cold";
    result[location] = row.count;
    result.total += row.count;
  }

  return result;
}
