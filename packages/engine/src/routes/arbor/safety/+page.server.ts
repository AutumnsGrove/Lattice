/**
 * Safety Dashboard - Server Load
 *
 * Wayfinder-only page showing combined Petal (image) and Thorn (text)
 * moderation metrics with a flagged content review queue.
 */

import { error, fail } from "@sveltejs/kit";
import {
  getStats,
  getFlaggedContent,
  getRecentEvents,
  updateFlagStatus,
} from "$lib/thorn/logging.js";
import { getRecentBlocksByCategory } from "$lib/server/petal/logging.js";
import type { PageServerLoad, Actions } from "./$types";

// Wayfinder-only access
const ADMIN_EMAILS = ["autumn@grove.place", "admin@grove.place"];

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

interface PetalFlag {
  id: string;
  user_id: string;
  flag_type: string;
  created_at: string;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!isAdmin(locals.user.email)) {
    throw error(
      403,
      "Access denied. This page is for Grove administrators only.",
    );
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const { DB } = platform.env;

  // Run all queries in parallel with individual error handling
  const [thornStats, petalBlocks, thornFlagged, thornRecent, petalFlags] =
    await Promise.all([
      getStats(DB, 30).catch((err) => {
        console.error("[Safety] Failed to load Thorn stats:", err);
        return null;
      }),
      getRecentBlocksByCategory(DB, 720).catch((err) => {
        console.error("[Safety] Failed to load Petal blocks:", err);
        return [];
      }),
      getFlaggedContent(DB, { status: "pending" }).catch((err) => {
        console.error("[Safety] Failed to load Thorn flags:", err);
        return [];
      }),
      getRecentEvents(DB, { days: 7, limit: 25 }).catch((err) => {
        console.error("[Safety] Failed to load Thorn events:", err);
        return [];
      }),
      DB.prepare(
        `SELECT * FROM petal_account_flags
         WHERE review_status = 'pending'
         ORDER BY created_at DESC
         LIMIT 25`,
      )
        .all<PetalFlag>()
        .then((r: { results: PetalFlag[] | undefined }) => r.results || [])
        .catch((err: unknown) => {
          console.error("[Safety] Failed to load Petal flags:", err);
          return [] as PetalFlag[];
        }),
    ]);

  return {
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
    petalBlocks: petalBlocks as Array<{ category: string; count: number }>,
    thornFlagged,
    thornRecent,
    petalFlags,
  };
};

export const actions: Actions = {
  /**
   * Review a flagged content item (clear or remove)
   */
  reviewFlag: async ({ request, locals, platform }) => {
    if (!locals.user || !isAdmin(locals.user.email)) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const flagId = formData.get("flag_id")?.toString();
    const action = formData.get("action")?.toString() as "cleared" | "removed";
    const notes = formData.get("notes")?.toString().trim() || undefined;

    if (!flagId) {
      return fail(400, { error: "Flag ID is required" });
    }

    if (action !== "cleared" && action !== "removed") {
      return fail(400, { error: "Action must be 'cleared' or 'removed'" });
    }

    const success = await updateFlagStatus(
      platform.env.DB,
      flagId,
      action,
      locals.user.email,
      notes,
    );

    if (!success) {
      return fail(500, { error: "Failed to update flag status" });
    }

    return {
      success: true,
      message: `Content ${action === "cleared" ? "cleared" : "removed"} successfully`,
    };
  },
};
