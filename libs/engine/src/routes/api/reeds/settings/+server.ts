/**
 * GET  /api/reeds/settings — Get comment settings
 * PATCH /api/reeds/settings — Update comment settings
 *
 * Blog author only. Manages comment configuration.
 */

import { json } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags/index.js";
import {
  getCommentSettings,
  upsertCommentSettings,
} from "$lib/server/services/reeds.js";
import type { RequestHandler } from "./$types.js";

/** Check if the reeds_comments graft is enabled for this tenant. */
async function isReedsEnabled(
  db: D1Database,
  kv: KVNamespace | undefined,
  tenantId: string,
): Promise<boolean> {
  if (!kv) return false;
  const flagsEnv = { DB: db, FLAGS_KV: kv };
  const inGreenhouse = await isInGreenhouse(tenantId, flagsEnv).catch(
    () => false,
  );
  if (!inGreenhouse) return false;
  return isFeatureEnabled(
    "reeds_comments",
    { tenantId, inGreenhouse: true },
    flagsEnv,
  ).catch(() => false);
}

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB || !locals.tenantId) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Gate: reeds_comments graft
  if (
    !(await isReedsEnabled(
      platform.env.DB,
      platform?.env?.CACHE_KV,
      locals.tenantId,
    ))
  ) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });
    const settings = await getCommentSettings(tenantDb);
    return json({ settings });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

const VALID_WHO_CAN_COMMENT = [
  "anyone",
  "grove_members",
  "paid_only",
  "nobody",
];

interface SettingsInput {
  comments_enabled?: number;
  public_comments_enabled?: number;
  who_can_comment?: string;
  show_comment_count?: number;
}

export const PATCH: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB || !locals.tenantId) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Gate: reeds_comments graft
  if (
    !(await isReedsEnabled(
      platform.env.DB,
      platform?.env?.CACHE_KV,
      locals.tenantId,
    ))
  ) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    const data = sanitizeObject(await request.json()) as SettingsInput;

    // Validate and pick only known fields
    const updates: Record<string, unknown> = {};

    if (typeof data.comments_enabled === "number") {
      updates.comments_enabled = data.comments_enabled ? 1 : 0;
    }
    if (typeof data.public_comments_enabled === "number") {
      updates.public_comments_enabled = data.public_comments_enabled ? 1 : 0;
    }
    if (
      typeof data.who_can_comment === "string" &&
      VALID_WHO_CAN_COMMENT.includes(data.who_can_comment)
    ) {
      updates.who_can_comment = data.who_can_comment;
    }
    if (typeof data.show_comment_count === "number") {
      updates.show_comment_count = data.show_comment_count ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    await upsertCommentSettings(tenantDb, updates);
    const settings = await getCommentSettings(tenantDb);

    return json({ success: true, settings });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
