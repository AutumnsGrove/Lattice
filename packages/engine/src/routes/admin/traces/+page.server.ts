/**
 * Traces Admin Page Server
 *
 * View and manage feedback submitted via the Trace component.
 * Provides filtering, stats, and mark-as-read functionality.
 */

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

interface TraceFeedback {
  id: string;
  source_path: string;
  vote: "up" | "down";
  comment: string | null;
  ip_hash: string;
  user_agent: string | null;
  created_at: number;
  read_at: number | null;
  archived_at: number | null;
}

interface TraceStats {
  total: number;
  upvotes: number;
  downvotes: number;
  withComments: number;
  unread: number;
}

interface SourceStats {
  source_path: string;
  total: number;
  upvotes: number;
  downvotes: number;
}

/**
 * Check if a user email is in the allowed admin list.
 * Uses ALLOWED_ADMIN_EMAILS environment variable (comma-separated).
 */
function isAdmin(
  email: string | undefined,
  allowedEmails: string | undefined,
): boolean {
  if (!email || !allowedEmails) return false;
  const adminList = allowedEmails.split(",").map((e) => e.trim().toLowerCase());
  return adminList.includes(email.toLowerCase());
}

/**
 * Escape SQL LIKE wildcards to prevent pattern injection.
 * Users could otherwise use % and _ to match unintended records.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Check if user is a Grove admin (uses ALLOWED_ADMIN_EMAILS env var)
  if (!isAdmin(locals.user.email, platform?.env?.ALLOWED_ADMIN_EMAILS)) {
    throw error(
      403,
      "Access denied. This page is for Grove administrators only.",
    );
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const { DB } = platform.env;

  // Filters from URL params
  const voteFilter = url.searchParams.get("vote") || "";
  const unreadOnly = url.searchParams.get("unread") === "true";
  const sourceFilter = url.searchParams.get("source") || "";

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  try {
    // Build query with optional filters
    // We track conditions and params together to avoid ordering mismatches
    let query = "SELECT * FROM trace_feedback WHERE archived_at IS NULL";
    const filterParams: (string | number)[] = [];
    const conditions: string[] = [];

    if (voteFilter === "up" || voteFilter === "down") {
      conditions.push("vote = ?");
      filterParams.push(voteFilter);
    }

    if (unreadOnly) {
      conditions.push("read_at IS NULL");
    }

    if (sourceFilter) {
      // Escape LIKE wildcards (% and _) to prevent pattern injection
      const escapedSource = escapeLikePattern(sourceFilter);
      conditions.push("source_path LIKE ? ESCAPE '\\'");
      filterParams.push(`%${escapedSource}%`);
    }

    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const params = [...filterParams, pageSize, offset];

    // Build count query (reuses same conditions and filterParams for consistency)
    let countQuery =
      "SELECT COUNT(*) as count FROM trace_feedback WHERE archived_at IS NULL";
    if (conditions.length > 0) {
      countQuery += " AND " + conditions.join(" AND ");
    }

    // Run all queries in parallel for performance
    const [tracesResult, countResult, statsResult, sourceStatsResult] =
      await Promise.all([
        // Get traces with pagination
        DB.prepare(query)
          .bind(...params)
          .all<TraceFeedback>(),

        // Get total count for pagination (uses same filterParams as main query)
        DB.prepare(countQuery)
          .bind(...filterParams)
          .first<{ count: number }>(),

        // Get overall stats
        DB.prepare(
          `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as upvotes,
          SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as downvotes,
          SUM(CASE WHEN comment IS NOT NULL THEN 1 ELSE 0 END) as withComments,
          SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread
        FROM trace_feedback
        WHERE archived_at IS NULL
      `,
        ).first<TraceStats>(),

        // Get stats by source
        DB.prepare(
          `
        SELECT
          source_path,
          COUNT(*) as total,
          SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as upvotes,
          SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM trace_feedback
        WHERE archived_at IS NULL
        GROUP BY source_path
        ORDER BY total DESC
        LIMIT 20
      `,
        ).all<SourceStats>(),
      ]);

    return {
      traces: tracesResult.results || [],
      stats: statsResult || {
        total: 0,
        upvotes: 0,
        downvotes: 0,
        withComments: 0,
        unread: 0,
      },
      sourceStats: sourceStatsResult.results || [],
      pagination: {
        page,
        pageSize,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / pageSize),
      },
      filters: {
        vote: voteFilter,
        unreadOnly,
        source: sourceFilter,
      },
    };
  } catch (err) {
    console.error("[Traces Admin] Error loading data:", err);
    throw error(500, "Failed to load traces");
  }
};

export const actions: Actions = {
  /**
   * Mark a trace as read
   */
  markRead: async ({ request, locals, platform }) => {
    if (
      !locals.user ||
      !isAdmin(locals.user.email, platform?.env?.ALLOWED_ADMIN_EMAILS)
    ) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const id = formData.get("id")?.toString();

    if (!id) {
      return fail(400, { error: "Trace ID is required" });
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      await DB.prepare("UPDATE trace_feedback SET read_at = ? WHERE id = ?")
        .bind(now, id)
        .run();

      return { success: true };
    } catch (err) {
      console.error("[Traces Admin] Error marking read:", err);
      return fail(500, { error: "Failed to mark as read" });
    }
  },

  /**
   * Mark all visible traces as read
   */
  markAllRead: async ({ locals, platform }) => {
    if (
      !locals.user ||
      !isAdmin(locals.user.email, platform?.env?.ALLOWED_ADMIN_EMAILS)
    ) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;

    try {
      const now = Math.floor(Date.now() / 1000);
      await DB.prepare(
        "UPDATE trace_feedback SET read_at = ? WHERE read_at IS NULL AND archived_at IS NULL",
      )
        .bind(now)
        .run();

      return { success: true, message: "All traces marked as read" };
    } catch (err) {
      console.error("[Traces Admin] Error marking all read:", err);
      return fail(500, { error: "Failed to mark all as read" });
    }
  },

  /**
   * Archive a trace (soft delete)
   */
  archive: async ({ request, locals, platform }) => {
    if (
      !locals.user ||
      !isAdmin(locals.user.email, platform?.env?.ALLOWED_ADMIN_EMAILS)
    ) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const id = formData.get("id")?.toString();

    if (!id) {
      return fail(400, { error: "Trace ID is required" });
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      await DB.prepare("UPDATE trace_feedback SET archived_at = ? WHERE id = ?")
        .bind(now, id)
        .run();

      return { success: true, message: "Trace archived" };
    } catch (err) {
      console.error("[Traces Admin] Error archiving:", err);
      return fail(500, { error: "Failed to archive trace" });
    }
  },
};
