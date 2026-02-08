/**
 * POST /api/reeds/[slug]/[commentId]/moderate — Moderate a comment
 *
 * Blog author only. Approve, reject, spam-flag, or block the commenter.
 */

import { json } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import {
  getCommentById,
  moderateComment,
  blockCommenter,
} from "$lib/server/services/reeds.js";
import type { RequestHandler } from "./$types.js";

interface ModerateInput {
  action?: string;
  note?: string;
}

export const POST: RequestHandler = async ({
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

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { commentId } = params;

  try {
    // Verify the user owns this blog
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const tenantDb = getTenantDb(platform.env.DB, { tenantId });

    const comment = await getCommentById(tenantDb, commentId);
    if (!comment) {
      throwGroveError(404, API_ERRORS.COMMENT_NOT_FOUND, "API");
    }

    const data = sanitizeObject(await request.json()) as ModerateInput;

    const validActions = ["approve", "reject", "spam", "block_user"];
    if (!data.action || !validActions.includes(data.action)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    // Cap moderation note length to prevent abuse
    const note = data.note ? data.note.slice(0, 500) : undefined;

    if (data.action === "block_user") {
      // Block the commenter AND reject this comment
      await blockCommenter(
        platform.env.DB,
        tenantId,
        comment.author_id,
        note,
      );
      await moderateComment(
        tenantDb,
        commentId,
        "reject",
        locals.user.id,
        "User blocked",
      );

      return json({
        success: true,
        message: "User blocked and comment rejected.",
      });
    }

    // Standard moderation action
    await moderateComment(
      tenantDb,
      commentId,
      data.action as "approve" | "reject" | "spam",
      locals.user.id,
      note,
    );

    const messages: Record<string, string> = {
      approve: "Comment approved and now visible.",
      reject: "Comment rejected.",
      spam: "Comment marked as spam.",
    };

    return json({
      success: true,
      message: messages[data.action] || "Comment moderated.",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
