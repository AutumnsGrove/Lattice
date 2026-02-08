/**
 * DELETE /api/reeds/blocked/[userId] — Unblock a commenter
 *
 * Blog author only. Removes a user from the block list.
 */

import { json } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags/index.js";
import { unblockCommenter } from "$lib/server/services/reeds.js";
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

export const DELETE: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  if (!platform?.env?.DB || !locals.tenantId) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Gate: reeds_comments graft
  if (!(await isReedsEnabled(platform.env.DB, platform?.env?.CACHE_KV, locals.tenantId))) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  const { userId } = params;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    await unblockCommenter(platform.env.DB, tenantId, userId);

    return json({
      success: true,
      message: "User unblocked.",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
