/**
 * GET  /api/reeds/[slug] — List approved public comments
 * POST /api/reeds/[slug] — Submit a comment or reply
 */

import { json } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { moderatePublishedContent } from "$lib/thorn/hooks.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { isPaidTier } from "$lib/config/tiers.js";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags/index.js";
import {
  getApprovedComments,
  getCommentSettings,
  getCommentCount,
  createComment,
  buildCommentTree,
  isUserBlocked,
  checkCommentRateLimit,
} from "$lib/server/services/reeds.js";
import type { RequestHandler } from "./$types.js";

/**
 * Check if the reeds_comments graft is enabled for this tenant.
 * Returns false (feature disabled) if any check fails.
 */
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

// ============================================================================
// Validation Constants
// ============================================================================

const MAX_CONTENT_LENGTH = 10_000; // 10K characters
const MIN_CONTENT_LENGTH = 1;

// ============================================================================
// GET — List approved comments for a post
// ============================================================================

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Gate: reeds_comments graft
  if (
    !(await isReedsEnabled(
      platform.env.DB,
      platform?.env?.CACHE_KV,
      locals.tenantId,
    ))
  ) {
    throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
  }

  const { slug } = params;

  try {
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Get the post ID from slug (must resolve before comment queries that need post.id)
    const post = await tenantDb.queryOne<{ id: string }>("posts", "slug = ?", [
      slug,
    ]);

    if (!post) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Parallel: all three queries depend on post.id which is now resolved
    const [comments, commentCount, settings] = await Promise.all([
      getApprovedComments(tenantDb, post.id),
      getCommentCount(tenantDb, post.id),
      getCommentSettings(tenantDb),
    ]);

    // Build threaded tree
    const tree = buildCommentTree(comments);

    return json(
      {
        comments: tree,
        total: commentCount,
        settings: {
          comments_enabled: settings.comments_enabled,
          public_comments_enabled: settings.public_comments_enabled,
          who_can_comment: settings.who_can_comment,
          show_comment_count: settings.show_comment_count,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

// ============================================================================
// POST — Submit a comment or reply
// ============================================================================

interface CommentInput {
  content?: string;
  is_public?: boolean;
  parent_id?: string;
}

export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // Auth check
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Gate: reeds_comments graft
  if (
    !(await isReedsEnabled(
      platform.env.DB,
      platform?.env?.CACHE_KV,
      locals.tenantId,
    ))
  ) {
    throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
  }

  const { slug } = params;

  // Rate limit comment creation
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `comments/create:${locals.user.id}`,
      limit: 60,
      windowSeconds: 3600, // 60 comments per hour (burst protection)
      failMode: "open",
    });
    if (denied) return denied;
  }

  try {
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Get post
    const post = await tenantDb.queryOne<{ id: string; status: string }>(
      "posts",
      "slug = ? AND status = ?",
      [slug, "published"],
    );

    if (!post) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Check comment settings
    const settings = await getCommentSettings(tenantDb);
    if (!settings.comments_enabled) {
      throwGroveError(403, API_ERRORS.COMMENTS_DISABLED, "API");
    }

    // Enforce who_can_comment setting
    if (settings.who_can_comment === "nobody") {
      throwGroveError(403, API_ERRORS.COMMENTS_DISABLED, "API");
    }

    if (settings.who_can_comment === "grove_members" && !locals.user) {
      throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
    }

    if (settings.who_can_comment === "paid_only") {
      const context = locals.context;
      const plan = context?.type === "tenant" ? context.tenant.plan : null;
      if (!plan || !isPaidTier(plan)) {
        throwGroveError(403, API_ERRORS.COMMENTS_DISABLED, "API");
      }
    }

    // Check if user is blocked
    const blocked = await isUserBlocked(
      platform.env.DB,
      locals.tenantId,
      locals.user.id,
    );
    if (blocked) {
      throwGroveError(403, API_ERRORS.COMMENT_BLOCKED, "API");
    }

    // Parse and validate input
    const data = sanitizeObject(await request.json()) as CommentInput;

    if (!data.content || data.content.trim().length < MIN_CONTENT_LENGTH) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    if (data.content.length > MAX_CONTENT_LENGTH) {
      throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }

    // Explicit boolean coercion — only `true` makes it public
    const isPublic = data.is_public === true;

    // Check if public comments are enabled
    if (isPublic && !settings.public_comments_enabled) {
      throwGroveError(403, API_ERRORS.COMMENTS_DISABLED, "API");
    }

    // Per-tier rate limiting (free users have weekly/daily caps)
    const context = locals.context;
    const tenantPlan =
      context?.type === "tenant" ? context.tenant.plan : "seedling";
    const isFreeUser = !tenantPlan || tenantPlan === "free";

    if (isFreeUser) {
      const limitType = isPublic ? "public_comment" : "private_reply";
      const limit = isPublic ? 20 : 50;
      const window = isPublic ? "week" : "day";

      const rateCheck = await checkCommentRateLimit(
        platform.env.DB,
        locals.user.id,
        limitType,
        limit,
        window as "week" | "day",
      );

      if (!rateCheck.allowed) {
        throwGroveError(429, API_ERRORS.RATE_LIMITED, "API");
      }
    }

    // Validate parent_id if provided (must be an existing comment on same post)
    if (data.parent_id) {
      const parent = await tenantDb.queryOne<{ id: string; post_id: string }>(
        "comments",
        "id = ? AND post_id = ?",
        [data.parent_id, post.id],
      );
      if (!parent) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Create the comment
    const commentId = await createComment(tenantDb, {
      postId: post.id,
      authorId: locals.user.id,
      authorName: locals.user.name || "Anonymous",
      authorEmail: locals.user.email || "",
      content: data.content.trim(),
      isPublic,
      parentId: data.parent_id,
    });

    // Thorn: async content moderation for public comments (non-blocking)
    if (isPublic && platform?.env?.AI && platform.context) {
      platform.context.waitUntil(
        moderatePublishedContent({
          content: data.content,
          ai: platform.env.AI,
          db: platform.env.DB,
          openrouterApiKey: platform.env.OPENROUTER_API_KEY,
          tenantId: locals.tenantId,
          userId: locals.user.id,
          contentType: "comment",
          hookPoint: "on_comment",
          contentRef: commentId,
        }),
      );
    }

    const statusMessage = isPublic
      ? "Comment submitted! It will appear after the author reviews it."
      : "Reply sent! Only the author can see this.";

    return json({
      success: true,
      comment_id: commentId,
      status: isPublic ? "pending" : "approved",
      message: statusMessage,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
