/**
 * Arbor Reeds — Comment Moderation & Management
 *
 * Loads pending comments, private replies, moderated comments,
 * blocked users, and comment settings for the blog author.
 */

import { getTenantDb } from "$lib/server/services/database.js";
import {
  getPendingComments,
  getAllPrivateReplies,
  getModeratedComments,
  getCommentSettings,
  getBlockedCommenters,
  type CommentRecord,
  type CommentSettingsRecord,
  type BlockedCommenterRecord,
} from "$lib/server/services/reeds.js";
import { ARBOR_ERRORS, throwGroveError } from "$lib/errors";
import type { PageServerLoad } from "./$types.js";

interface PostLookup {
  id: string;
  slug: string;
  title: string;
}

export const load: PageServerLoad = async ({ platform, locals, parent }) => {
  // Gate: reeds_comments graft (cascaded from arbor layout)
  const parentData = await parent();
  if (!parentData.grafts?.reeds_comments) {
    throwGroveError(404, ARBOR_ERRORS.GREENHOUSE_REQUIRED, "Arbor");
  }

  if (!locals.tenantId || !platform?.env?.DB) {
    return {
      pending: [],
      replies: [],
      moderated: [],
      blocked: [],
      settings: null,
      postMap: {},
    };
  }

  const tenantDb = getTenantDb(platform.env.DB, {
    tenantId: locals.tenantId,
  });

  const [pending, replies, moderated, blocked, settings, posts] =
    await Promise.all([
      getPendingComments(tenantDb).catch((err) => {
        console.error("[Reeds] Failed to load pending comments:", err);
        return [] as CommentRecord[];
      }),
      getAllPrivateReplies(tenantDb).catch((err) => {
        console.error("[Reeds] Failed to load private replies:", err);
        return [] as CommentRecord[];
      }),
      getModeratedComments(tenantDb).catch((err) => {
        console.error("[Reeds] Failed to load moderated comments:", err);
        return [] as CommentRecord[];
      }),
      getBlockedCommenters(platform.env.DB, locals.tenantId).catch((err) => {
        console.error("[Reeds] Failed to load blocked users:", err);
        return [] as BlockedCommenterRecord[];
      }),
      getCommentSettings(tenantDb).catch((err) => {
        console.error("[Reeds] Failed to load settings:", err);
        return null;
      }),
      tenantDb
        .queryMany<PostLookup>("posts", undefined, [], {
          orderBy: "created_at DESC",
          limit: 500,
        })
        .catch((err) => {
          console.error("[Reeds] Failed to load posts:", err);
          return [] as PostLookup[];
        }),
    ]);

  // Build a post lookup map for display
  const postMap: Record<string, { slug: string; title: string }> = {};
  for (const post of posts) {
    postMap[post.id] = { slug: post.slug, title: post.title };
  }

  return {
    pending,
    replies,
    moderated,
    blocked,
    settings,
    postMap,
  };
};
