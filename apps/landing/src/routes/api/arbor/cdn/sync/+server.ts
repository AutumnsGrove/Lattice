// CDN Sync Endpoint
// POST /api/admin/cdn/sync
//
// Triggers R2 → D1 metadata sync to recover missing records.
// Use when files exist in R2 but are missing from D1 (admin shows empty).

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { storage } from "@autumnsgrove/lattice/services";
import { getUserByEmail } from "$lib/server/db";

export const POST: RequestHandler = async ({ locals, platform }) => {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }
  if (!platform) {
    throw error(500, "Platform not available");
  }

  const { DB, CDN_BUCKET } = platform.env;

  // Get the user from database to get their ID for attribution
  const user = await getUserByEmail(DB, locals.user.email);
  if (!user) {
    throw error(401, "User not found");
  }

  try {
    const result = await storage.syncFromBucket(CDN_BUCKET, DB, {
      uploadedBy: user.id,
    });

    return json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      total: result.total,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[CDN Sync Error]", err);
    throw error(500, "Failed to sync from storage");
  }
};
