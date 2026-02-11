/**
 * PATCH  /api/reeds/[slug]/[commentId] — Edit own comment
 * DELETE /api/reeds/[slug]/[commentId] — Delete own comment
 */

import { json } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import {
  getCommentById,
  editComment,
  deleteComment,
  isWithinEditWindow,
} from "$lib/server/services/reeds.js";
import type { RequestHandler } from "./$types.js";

const MAX_CONTENT_LENGTH = 10_000;

// ============================================================================
// PATCH — Edit own comment (within 15-minute window)
// ============================================================================

export const PATCH: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { commentId } = params;

  try {
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Get the comment
    const comment = await getCommentById(tenantDb, commentId);
    if (!comment) {
      throwGroveError(404, API_ERRORS.COMMENT_NOT_FOUND, "API");
    }

    // Verify ownership
    if (comment.author_id !== locals.user.id) {
      throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
    }

    // Prevent editing soft-deleted comments
    if (comment.content === "[deleted]") {
      throwGroveError(404, API_ERRORS.COMMENT_NOT_FOUND, "API");
    }

    // Check edit window
    if (!isWithinEditWindow(comment.created_at)) {
      throwGroveError(403, API_ERRORS.COMMENT_EDIT_WINDOW_CLOSED, "API");
    }

    // Parse and validate input
    const data = sanitizeObject(await request.json()) as { content?: string };

    if (!data.content || data.content.trim().length === 0) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    if (data.content.length > MAX_CONTENT_LENGTH) {
      throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }

    await editComment(tenantDb, commentId, data.content.trim());

    return json({
      success: true,
      message: "Comment updated.",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

// ============================================================================
// DELETE — Delete own comment (or blog author can delete any)
// ============================================================================

export const DELETE: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { commentId } = params;

  try {
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    const comment = await getCommentById(tenantDb, commentId);
    if (!comment) {
      throwGroveError(404, API_ERRORS.COMMENT_NOT_FOUND, "API");
    }

    // Allow deletion if:
    // 1. The user is the comment author
    // 2. The user is the blog owner (tenant owner)
    const isCommentAuthor = comment.author_id === locals.user.id;
    let isBlogOwner = false;

    if (!isCommentAuthor) {
      try {
        await getVerifiedTenantId(
          platform.env.DB,
          locals.tenantId,
          locals.user,
        );
        isBlogOwner = true;
      } catch {
        isBlogOwner = false;
      }
    }

    if (!isCommentAuthor && !isBlogOwner) {
      throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
    }

    await deleteComment(tenantDb, commentId);

    return json({
      success: true,
      message: "Comment removed.",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
