/**
 * Reeds Comment Service
 *
 * Service layer for the Reeds dual-mode comment system.
 * Handles comment CRUD, threading, rate limiting, and moderation queries.
 *
 * All data access goes through TenantDb for automatic tenant isolation.
 */

import { getTenantDb, type TenantDb } from "./database.js";
import { renderMarkdown } from "$lib/utils/markdown.js";

// ============================================================================
// Types
// ============================================================================

export interface CommentRecord {
  id: string;
  tenant_id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  parent_id: string | null;
  content: string;
  content_html: string | null;
  /** SQLite INTEGER (0/1) — use `is_public ? 1 : 0` when writing, truthy check when reading */
  is_public: number;
  status: string;
  moderation_note: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

export interface CommentSettingsRecord {
  tenant_id: string;
  comments_enabled: number;
  public_comments_enabled: number;
  who_can_comment: string;
  show_comment_count: number;
  notify_on_reply: number;
  notify_on_pending: number;
  notify_on_thread_reply: number;
  updated_at: string;
}

export interface ThreadedComment extends CommentRecord {
  replies: ThreadedComment[];
  depth: number;
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Strip control characters from user input.
 * Covers C0 (\x00-\x1F), DEL (\x7F), C1 (\x80-\x9F), and Unicode
 * line/paragraph separators (U+2028, U+2029) that could cause rendering
 * exploits or obfuscation. Preserves \n, \r, \t for markdown formatting.
 */
export function stripControlChars(input: string): string {
  return input.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F\u2028\u2029]/g,
    "",
  );
}

// ============================================================================
// Comment Settings
// ============================================================================

const DEFAULT_SETTINGS: Omit<CommentSettingsRecord, "tenant_id" | "updated_at"> = {
  comments_enabled: 1,
  public_comments_enabled: 1,
  who_can_comment: "anyone",
  show_comment_count: 1,
  notify_on_reply: 1,
  notify_on_pending: 1,
  notify_on_thread_reply: 1,
};

/**
 * Get comment settings for a tenant, returning defaults if none exist.
 */
export async function getCommentSettings(
  tenantDb: TenantDb,
): Promise<CommentSettingsRecord> {
  const settings = await tenantDb.queryOne<CommentSettingsRecord>(
    "comment_settings",
  );

  if (settings) return settings;

  return {
    tenant_id: tenantDb.tenantId,
    ...DEFAULT_SETTINGS,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Comment Queries
// ============================================================================

/**
 * Get approved public comments for a post, ordered by creation date.
 */
export async function getApprovedComments(
  tenantDb: TenantDb,
  postId: string,
): Promise<CommentRecord[]> {
  return tenantDb.queryMany<CommentRecord>(
    "comments",
    "post_id = ? AND is_public = 1 AND status = ?",
    [postId, "approved"],
    { orderBy: "created_at ASC" },
  );
}

/**
 * Get private replies for a post (visible only to blog author).
 */
export async function getPrivateReplies(
  tenantDb: TenantDb,
  postId: string,
): Promise<CommentRecord[]> {
  return tenantDb.queryMany<CommentRecord>(
    "comments",
    "post_id = ? AND is_public = 0",
    [postId],
    { orderBy: "created_at DESC" },
  );
}

/**
 * Get pending comments for moderation queue.
 */
export async function getPendingComments(
  tenantDb: TenantDb,
): Promise<CommentRecord[]> {
  return tenantDb.queryMany<CommentRecord>(
    "comments",
    "is_public = 1 AND status = ?",
    ["pending"],
    { orderBy: "created_at ASC", limit: 100 },
  );
}

/**
 * Get count of pending public comments (for nav badge).
 */
export async function getPendingCount(
  tenantDb: TenantDb,
): Promise<number> {
  return tenantDb.count(
    "comments",
    "is_public = 1 AND status = ?",
    ["pending"],
  );
}

/**
 * Get moderated comments (rejected/spam) for review.
 */
export async function getModeratedComments(
  tenantDb: TenantDb,
): Promise<CommentRecord[]> {
  return tenantDb.queryMany<CommentRecord>(
    "comments",
    "is_public = 1 AND status IN (?, ?)",
    ["rejected", "spam"],
    { orderBy: "moderated_at DESC", limit: 100 },
  );
}

/**
 * Get all private replies across all posts for the author inbox.
 */
export async function getAllPrivateReplies(
  tenantDb: TenantDb,
): Promise<CommentRecord[]> {
  return tenantDb.queryMany<CommentRecord>(
    "comments",
    "is_public = 0",
    [],
    { orderBy: "created_at DESC", limit: 100 },
  );
}

/**
 * Get comment count for a post (approved public comments only).
 */
export async function getCommentCount(
  tenantDb: TenantDb,
  postId: string,
): Promise<number> {
  return tenantDb.count(
    "comments",
    "post_id = ? AND is_public = 1 AND status = ?",
    [postId, "approved"],
  );
}

/**
 * Get a single comment by ID.
 */
export async function getCommentById(
  tenantDb: TenantDb,
  commentId: string,
): Promise<CommentRecord | null> {
  return tenantDb.findById<CommentRecord>("comments", commentId);
}

// ============================================================================
// Threading
// ============================================================================

const MAX_THREAD_DEPTH = 3;

/**
 * Build a threaded comment tree from a flat list.
 * Comments beyond MAX_THREAD_DEPTH are flattened with @mention prefix.
 */
export function buildCommentTree(
  comments: CommentRecord[],
): ThreadedComment[] {
  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  // First pass: create threaded wrappers
  for (const comment of comments) {
    map.set(comment.id, { ...comment, replies: [], depth: 0 });
  }

  // Second pass: build tree
  for (const comment of comments) {
    const node = map.get(comment.id)!;

    if (!comment.parent_id || !map.has(comment.parent_id)) {
      // Top-level comment
      node.depth = 0;
      roots.push(node);
    } else {
      const parent = map.get(comment.parent_id)!;
      node.depth = parent.depth + 1;

      if (node.depth < MAX_THREAD_DEPTH) {
        parent.replies.push(node);
      } else {
        // Flatten deep replies to parent level (max depth)
        node.depth = MAX_THREAD_DEPTH - 1;
        parent.replies.push(node);
      }
    }
  }

  return roots;
}

// ============================================================================
// Comment Creation
// ============================================================================

/**
 * Create a new comment or reply.
 * Returns the new comment ID.
 */
export async function createComment(
  tenantDb: TenantDb,
  data: {
    postId: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    content: string;
    isPublic: boolean;
    parentId?: string;
  },
): Promise<string> {
  // Defense-in-depth: strip control characters before storage and rendering
  const cleanContent = stripControlChars(data.content);
  const cleanName = stripControlChars(data.authorName);
  const contentHtml = renderMarkdown(cleanContent);

  // Private replies are auto-approved (no moderation needed)
  // Public comments start as pending
  const status = data.isPublic ? "pending" : "approved";

  return tenantDb.insert("comments", {
    post_id: data.postId,
    author_id: data.authorId,
    author_name: cleanName,
    author_email: data.authorEmail,
    parent_id: data.parentId || null,
    content: cleanContent,
    content_html: contentHtml,
    is_public: data.isPublic ? 1 : 0,
    status,
  });
}

// ============================================================================
// Comment Editing
// ============================================================================

const EDIT_WINDOW_MINUTES = 15;

/**
 * Check if a comment is within the edit window.
 */
export function isWithinEditWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const cutoff = Date.now() - EDIT_WINDOW_MINUTES * 60 * 1000;
  return created > cutoff;
}

/**
 * Edit a comment's content. Only allowed within the edit window.
 * Returns false for soft-deleted comments (content = '[deleted]') to
 * prevent resurrection of removed comments within the edit window.
 */
export async function editComment(
  tenantDb: TenantDb,
  commentId: string,
  newContent: string,
): Promise<boolean> {
  // Prevent editing soft-deleted comments
  const existing = await tenantDb.findById<CommentRecord>(
    "comments",
    commentId,
  );
  if (!existing || existing.content === "[deleted]") {
    return false;
  }

  const cleanContent = stripControlChars(newContent);
  const contentHtml = renderMarkdown(cleanContent);
  const changes = await tenantDb.update(
    "comments",
    {
      content: cleanContent,
      content_html: contentHtml,
      edited_at: new Date().toISOString(),
    },
    "id = ?",
    [commentId],
  );
  return changes > 0;
}

// ============================================================================
// Comment Deletion
// ============================================================================

/**
 * Delete a comment. If it has replies, replace content with [deleted].
 * If no replies, remove entirely.
 */
export async function deleteComment(
  tenantDb: TenantDb,
  commentId: string,
): Promise<boolean> {
  // Check if this comment has any replies
  const hasReplies = await tenantDb.exists(
    "comments",
    "parent_id = ?",
    [commentId],
  );

  if (hasReplies) {
    // Soft delete: replace content, keep structure for thread integrity
    const changes = await tenantDb.update(
      "comments",
      {
        content: "[deleted]",
        content_html: "<p>[deleted]</p>",
        author_name: "[deleted]",
        status: "approved",
      },
      "id = ?",
      [commentId],
    );
    return changes > 0;
  } else {
    // Hard delete: no replies, remove entirely
    return tenantDb.deleteById("comments", commentId);
  }
}

// ============================================================================
// Moderation
// ============================================================================

/**
 * Moderate a comment (approve, reject, or mark as spam).
 */
export async function moderateComment(
  tenantDb: TenantDb,
  commentId: string,
  action: "approve" | "reject" | "spam",
  moderatorId: string,
  note?: string,
): Promise<boolean> {
  const statusMap = {
    approve: "approved",
    reject: "rejected",
    spam: "spam",
  };

  const changes = await tenantDb.update(
    "comments",
    {
      status: statusMap[action],
      moderated_at: new Date().toISOString(),
      moderated_by: moderatorId,
      moderation_note: note || null,
    },
    "id = ?",
    [commentId],
  );
  return changes > 0;
}

// ============================================================================
// Blocked Users
// ============================================================================

/**
 * Check if a user is blocked from commenting on a blog.
 */
export async function isUserBlocked(
  db: D1Database,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      "SELECT 1 FROM blocked_commenters WHERE tenant_id = ? AND blocked_user_id = ? LIMIT 1",
    )
    .bind(tenantId, userId)
    .first();
  return result !== null;
}

/**
 * Block a user from commenting on a blog.
 */
export async function blockCommenter(
  db: D1Database,
  tenantId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO blocked_commenters (tenant_id, blocked_user_id, reason, created_at) VALUES (?, ?, ?, datetime('now'))",
    )
    .bind(tenantId, userId, reason || null)
    .run();
}

/**
 * Unblock a user.
 */
export async function unblockCommenter(
  db: D1Database,
  tenantId: string,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      "DELETE FROM blocked_commenters WHERE tenant_id = ? AND blocked_user_id = ?",
    )
    .bind(tenantId, userId)
    .run();
}

export interface BlockedCommenterRecord {
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
}

/**
 * Get all blocked commenters for a tenant.
 */
export async function getBlockedCommenters(
  db: D1Database,
  tenantId: string,
): Promise<BlockedCommenterRecord[]> {
  const result = await db
    .prepare(
      "SELECT blocked_user_id, reason, created_at FROM blocked_commenters WHERE tenant_id = ? ORDER BY created_at DESC",
    )
    .bind(tenantId)
    .all<BlockedCommenterRecord>();
  return result.results ?? [];
}

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Upsert comment settings for a tenant.
 */
export async function upsertCommentSettings(
  tenantDb: TenantDb,
  settings: Partial<Omit<CommentSettingsRecord, "tenant_id" | "updated_at">>,
): Promise<void> {
  const existing = await tenantDb.queryOne<CommentSettingsRecord>(
    "comment_settings",
  );

  if (existing) {
    await tenantDb.update(
      "comment_settings",
      {
        ...settings,
        updated_at: new Date().toISOString(),
      },
      "tenant_id = ?",
      [tenantDb.tenantId],
    );
  } else {
    await tenantDb.insert("comment_settings", {
      ...settings,
      updated_at: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check and increment comment rate limit for a user.
 * Returns true if the action is allowed, false if rate limited.
 *
 * Uses D1 batch for atomicity — the upsert's WHERE clause ensures
 * the count only increments when below the limit, preventing race
 * condition bypass from concurrent requests. D1 is single-writer
 * SQLite, so batched writes are serialized.
 *
 * This is the secondary (durable, per-tier) limit. The primary
 * burst defense is the KV rate limiter in the API route handler
 * (60/hour global, regardless of tenant). Rate limits are keyed
 * by user_id only (not tenant-scoped) so they apply across all
 * tenants — a user's weekly cap is global, not per-blog.
 */
export async function checkCommentRateLimit(
  db: D1Database,
  userId: string,
  limitType: "public_comment" | "private_reply",
  limit: number,
  windowType: "week" | "day",
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  let periodStart: string;

  if (windowType === "week") {
    // Start of current week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    periodStart = monday.toISOString().split("T")[0];
  } else {
    // Start of current day
    periodStart = now.toISOString().split("T")[0];
  }

  // Atomic increment-if-allowed using D1 batch transaction.
  // The WHERE clause on DO UPDATE prevents increment when at/over limit,
  // and meta.changes tells us whether the slot was actually granted.
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO comment_rate_limits (user_id, limit_type, period_start, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (user_id, limit_type) DO UPDATE SET
           count = CASE
             WHEN comment_rate_limits.period_start != excluded.period_start THEN 1
             ELSE comment_rate_limits.count + 1
           END,
           period_start = excluded.period_start
         WHERE comment_rate_limits.period_start != excluded.period_start
            OR comment_rate_limits.count < ?`,
      )
      .bind(userId, limitType, periodStart, limit),
    db
      .prepare(
        `SELECT count FROM comment_rate_limits WHERE user_id = ? AND limit_type = ?`,
      )
      .bind(userId, limitType),
  ]);

  const writeResult = results[0];
  const readResult = results[1] as D1Result<{ count: number }>;
  const currentCount = readResult.results?.[0]?.count ?? 0;
  const wasIncremented = (writeResult.meta?.changes ?? 0) > 0;

  if (!wasIncremented) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - currentCount };
}
