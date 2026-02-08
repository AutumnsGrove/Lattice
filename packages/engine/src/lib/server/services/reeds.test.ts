/**
 * Reeds Comment Service — Tests
 *
 * Tests for pure functions, service layer, and direct D1 operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  stripControlChars,
  buildCommentTree,
  isWithinEditWindow,
  getCommentSettings,
  createComment,
  editComment,
  deleteComment,
  moderateComment,
  getApprovedComments,
  getCommentCount,
  getPendingComments,
  getPendingCount,
  getModeratedComments,
  getBlockedCommenters,
  upsertCommentSettings,
  getCommentById,
  isUserBlocked,
  blockCommenter,
  unblockCommenter,
  checkCommentRateLimit,
  type CommentRecord,
  type CommentSettingsRecord,
} from "./reeds.js";
import type { TenantDb } from "./database.js";

// ============================================================================
// Helpers
// ============================================================================

function makeComment(overrides: Partial<CommentRecord> = {}): CommentRecord {
  return {
    id: "comment-1",
    tenant_id: "tenant-1",
    post_id: "post-1",
    author_id: "user-1",
    author_name: "Test User",
    author_email: "test@example.com",
    parent_id: null,
    content: "Hello world",
    content_html: "<p>Hello world</p>",
    is_public: 1,
    status: "approved",
    moderation_note: null,
    moderated_at: null,
    moderated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edited_at: null,
    ...overrides,
  };
}

function createMockTenantDb(overrides: Partial<TenantDb> = {}): TenantDb {
  return {
    tenantId: "tenant-1",
    queryOne: vi.fn().mockResolvedValue(null),
    queryOneOrThrow: vi.fn(),
    queryMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByIdOrThrow: vi.fn(),
    insert: vi.fn().mockResolvedValue("new-id"),
    upsert: vi.fn().mockResolvedValue("upserted-id"),
    update: vi.fn().mockResolvedValue(1),
    updateById: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(1),
    deleteById: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(false),
    count: vi.fn().mockResolvedValue(0),
    batch: vi.fn(),
    raw: vi.fn(),
    ...overrides,
  } as unknown as TenantDb;
}

function createMockD1(): D1Database {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
    raw: vi.fn().mockResolvedValue([]),
  };

  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    exec: vi.fn(),
    batch: vi.fn(),
    dump: vi.fn(),
    _mockStatement: mockStatement,
  } as unknown as D1Database & { _mockStatement: typeof mockStatement };
}

// ============================================================================
// Pure Functions
// ============================================================================

describe("stripControlChars", () => {
  it("removes null bytes", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
  });

  it("removes C0 control characters", () => {
    expect(stripControlChars("a\x01b\x02c\x03d")).toBe("abcd");
    expect(stripControlChars("\x04\x05\x06\x07")).toBe("");
  });

  it("preserves newlines, carriage returns, and tabs", () => {
    expect(stripControlChars("hello\nworld")).toBe("hello\nworld");
    expect(stripControlChars("hello\rworld")).toBe("hello\rworld");
    expect(stripControlChars("hello\tworld")).toBe("hello\tworld");
  });

  it("removes DEL character (\\x7F)", () => {
    expect(stripControlChars("hello\x7Fworld")).toBe("helloworld");
  });

  it("removes C1 control characters (\\x80-\\x9F)", () => {
    expect(stripControlChars("hello\x80world")).toBe("helloworld");
    expect(stripControlChars("a\x85b\x8Dc\x9Fd")).toBe("abcd");
  });

  it("removes Unicode line/paragraph separators", () => {
    expect(stripControlChars("hello\u2028world")).toBe("helloworld");
    expect(stripControlChars("hello\u2029world")).toBe("helloworld");
  });

  it("preserves normal text and unicode", () => {
    const text = "Hello, world! This is a test. 🌲🍂";
    expect(stripControlChars(text)).toBe(text);
  });

  it("handles empty strings", () => {
    expect(stripControlChars("")).toBe("");
  });

  it("handles markdown formatting", () => {
    const md = "# Hello\n\n**bold** and *italic*\n\n```code```";
    expect(stripControlChars(md)).toBe(md);
  });
});

describe("isWithinEditWindow", () => {
  it("returns true for comment just created", () => {
    const now = new Date().toISOString();
    expect(isWithinEditWindow(now)).toBe(true);
  });

  it("returns true for comment created 14 minutes ago", () => {
    const fourteenAgo = new Date(Date.now() - 14 * 60 * 1000).toISOString();
    expect(isWithinEditWindow(fourteenAgo)).toBe(true);
  });

  it("returns false for comment created 16 minutes ago", () => {
    const sixteenAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    expect(isWithinEditWindow(sixteenAgo)).toBe(false);
  });

  it("returns false for comment created hours ago", () => {
    const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(isWithinEditWindow(hoursAgo)).toBe(false);
  });
});

describe("buildCommentTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it("returns flat list when no parent_ids", () => {
    const comments = [
      makeComment({ id: "c1", parent_id: null }),
      makeComment({ id: "c2", parent_id: null }),
      makeComment({ id: "c3", parent_id: null }),
    ];

    const tree = buildCommentTree(comments);
    expect(tree).toHaveLength(3);
    expect(tree[0].depth).toBe(0);
    expect(tree[1].depth).toBe(0);
    expect(tree[2].depth).toBe(0);
  });

  it("nests replies under their parent", () => {
    const comments = [
      makeComment({ id: "c1", parent_id: null }),
      makeComment({ id: "c2", parent_id: "c1" }),
      makeComment({ id: "c3", parent_id: "c1" }),
    ];

    const tree = buildCommentTree(comments);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("c1");
    expect(tree[0].replies).toHaveLength(2);
    expect(tree[0].replies[0].id).toBe("c2");
    expect(tree[0].replies[0].depth).toBe(1);
    expect(tree[0].replies[1].id).toBe("c3");
  });

  it("handles 3-level nesting", () => {
    const comments = [
      makeComment({ id: "c1", parent_id: null }),
      makeComment({ id: "c2", parent_id: "c1" }),
      makeComment({ id: "c3", parent_id: "c2" }),
    ];

    const tree = buildCommentTree(comments);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies[0].replies[0].id).toBe("c3");
    expect(tree[0].replies[0].replies[0].depth).toBe(2);
  });

  it("flattens comments beyond max depth", () => {
    const comments = [
      makeComment({ id: "c1", parent_id: null }),
      makeComment({ id: "c2", parent_id: "c1" }),
      makeComment({ id: "c3", parent_id: "c2" }),
      makeComment({ id: "c4", parent_id: "c3" }), // depth 3, should flatten
    ];

    const tree = buildCommentTree(comments);
    // c4 should be flattened to depth 2 (MAX_THREAD_DEPTH - 1)
    const c3 = tree[0].replies[0].replies[0];
    expect(c3.id).toBe("c3");
    expect(c3.replies).toHaveLength(1);
    expect(c3.replies[0].id).toBe("c4");
    expect(c3.replies[0].depth).toBe(2); // Flattened to MAX_THREAD_DEPTH - 1
  });

  it("promotes orphaned comments to root level", () => {
    const comments = [
      makeComment({ id: "c1", parent_id: "nonexistent" }),
      makeComment({ id: "c2", parent_id: null }),
    ];

    const tree = buildCommentTree(comments);
    expect(tree).toHaveLength(2);
    expect(tree[0].depth).toBe(0);
    expect(tree[1].depth).toBe(0);
  });
});

// ============================================================================
// Service Functions (TenantDb mocked)
// ============================================================================

describe("getCommentSettings", () => {
  it("returns stored settings when they exist", async () => {
    const stored: CommentSettingsRecord = {
      tenant_id: "tenant-1",
      comments_enabled: 0,
      public_comments_enabled: 0,
      who_can_comment: "paid_only",
      show_comment_count: 0,
      notify_on_reply: 0,
      notify_on_pending: 0,
      notify_on_thread_reply: 0,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const db = createMockTenantDb({
      queryOne: vi.fn().mockResolvedValue(stored),
    });

    const settings = await getCommentSettings(db);
    expect(settings).toEqual(stored);
    expect(settings.comments_enabled).toBe(0);
  });

  it("returns defaults when no settings exist", async () => {
    const db = createMockTenantDb({
      queryOne: vi.fn().mockResolvedValue(null),
    });

    const settings = await getCommentSettings(db);
    expect(settings.comments_enabled).toBe(1);
    expect(settings.public_comments_enabled).toBe(1);
    expect(settings.who_can_comment).toBe("anyone");
    expect(settings.show_comment_count).toBe(1);
    expect(settings.tenant_id).toBe("tenant-1");
  });
});

describe("getApprovedComments", () => {
  it("queries with correct filters", async () => {
    const db = createMockTenantDb();
    await getApprovedComments(db, "post-1");

    expect(db.queryMany).toHaveBeenCalledWith(
      "comments",
      "post_id = ? AND is_public = 1 AND status = ?",
      ["post-1", "approved"],
      { orderBy: "created_at ASC" },
    );
  });
});

describe("getCommentCount", () => {
  it("counts approved public comments", async () => {
    const db = createMockTenantDb({
      count: vi.fn().mockResolvedValue(5),
    });

    const count = await getCommentCount(db, "post-1");
    expect(count).toBe(5);
    expect(db.count).toHaveBeenCalledWith(
      "comments",
      "post_id = ? AND is_public = 1 AND status = ?",
      ["post-1", "approved"],
    );
  });
});

describe("getPendingComments", () => {
  it("queries pending public comments with limit", async () => {
    const db = createMockTenantDb();
    await getPendingComments(db);

    expect(db.queryMany).toHaveBeenCalledWith(
      "comments",
      "is_public = 1 AND status = ?",
      ["pending"],
      { orderBy: "created_at ASC", limit: 100 },
    );
  });
});

describe("getCommentById", () => {
  it("delegates to findById", async () => {
    const comment = makeComment();
    const db = createMockTenantDb({
      findById: vi.fn().mockResolvedValue(comment),
    });

    const result = await getCommentById(db, "comment-1");
    expect(result).toEqual(comment);
    expect(db.findById).toHaveBeenCalledWith("comments", "comment-1");
  });

  it("returns null for non-existent comment", async () => {
    const db = createMockTenantDb();
    const result = await getCommentById(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("createComment", () => {
  it("creates a public comment as pending", async () => {
    const db = createMockTenantDb();
    await createComment(db, {
      postId: "post-1",
      authorId: "user-1",
      authorName: "Alice",
      authorEmail: "alice@example.com",
      content: "Great post!",
      isPublic: true,
    });

    expect(db.insert).toHaveBeenCalledWith("comments", {
      post_id: "post-1",
      author_id: "user-1",
      author_name: "Alice",
      author_email: "alice@example.com",
      parent_id: null,
      content: "Great post!",
      content_html: expect.any(String),
      is_public: 1,
      status: "pending",
    });
  });

  it("creates a private reply as approved", async () => {
    const db = createMockTenantDb();
    await createComment(db, {
      postId: "post-1",
      authorId: "user-2",
      authorName: "Bob",
      authorEmail: "bob@example.com",
      content: "Nice thoughts!",
      isPublic: false,
    });

    expect(db.insert).toHaveBeenCalledWith("comments", {
      post_id: "post-1",
      author_id: "user-2",
      author_name: "Bob",
      author_email: "bob@example.com",
      parent_id: null,
      content: "Nice thoughts!",
      content_html: expect.any(String),
      is_public: 0,
      status: "approved",
    });
  });

  it("passes parent_id for replies", async () => {
    const db = createMockTenantDb();
    await createComment(db, {
      postId: "post-1",
      authorId: "user-1",
      authorName: "Alice",
      authorEmail: "alice@example.com",
      content: "Reply!",
      isPublic: true,
      parentId: "parent-comment-1",
    });

    expect(db.insert).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        parent_id: "parent-comment-1",
      }),
    );
  });

  it("strips control characters from content", async () => {
    const db = createMockTenantDb();
    await createComment(db, {
      postId: "post-1",
      authorId: "user-1",
      authorName: "Test\x00User",
      authorEmail: "test@example.com",
      content: "Hello\x00\x01world",
      isPublic: true,
    });

    expect(db.insert).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        content: "Helloworld",
        author_name: "TestUser",
      }),
    );
  });

  it("returns the new comment ID", async () => {
    const db = createMockTenantDb({
      insert: vi.fn().mockResolvedValue("new-comment-id"),
    });

    const id = await createComment(db, {
      postId: "post-1",
      authorId: "user-1",
      authorName: "Test",
      authorEmail: "test@example.com",
      content: "Test",
      isPublic: true,
    });

    expect(id).toBe("new-comment-id");
  });
});

describe("editComment", () => {
  it("updates content and content_html", async () => {
    const db = createMockTenantDb({
      findById: vi.fn().mockResolvedValue(makeComment()),
    });
    const result = await editComment(db, "comment-1", "Updated content");

    expect(result).toBe(true);
    expect(db.update).toHaveBeenCalledWith(
      "comments",
      {
        content: "Updated content",
        content_html: expect.any(String),
        edited_at: expect.any(String),
      },
      "id = ?",
      ["comment-1"],
    );
  });

  it("strips control characters from new content", async () => {
    const db = createMockTenantDb({
      findById: vi.fn().mockResolvedValue(makeComment()),
    });
    await editComment(db, "comment-1", "Updated\x00content");

    expect(db.update).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        content: "Updatedcontent",
      }),
      "id = ?",
      ["comment-1"],
    );
  });

  it("returns false when comment not found", async () => {
    const db = createMockTenantDb({
      findById: vi.fn().mockResolvedValue(null),
    });

    const result = await editComment(db, "nonexistent", "New content");
    expect(result).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns false for soft-deleted comments", async () => {
    const db = createMockTenantDb({
      findById: vi.fn().mockResolvedValue(
        makeComment({ content: "[deleted]", author_name: "[deleted]" }),
      ),
    });

    const result = await editComment(db, "comment-1", "Trying to resurrect");
    expect(result).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("deleteComment", () => {
  it("soft deletes when comment has replies", async () => {
    const db = createMockTenantDb({
      exists: vi.fn().mockResolvedValue(true), // has replies
    });

    await deleteComment(db, "comment-1");

    expect(db.update).toHaveBeenCalledWith(
      "comments",
      {
        content: "[deleted]",
        content_html: "<p>[deleted]</p>",
        author_name: "[deleted]",
        status: "approved",
      },
      "id = ?",
      ["comment-1"],
    );
    expect(db.deleteById).not.toHaveBeenCalled();
  });

  it("hard deletes when comment has no replies", async () => {
    const db = createMockTenantDb({
      exists: vi.fn().mockResolvedValue(false), // no replies
    });

    await deleteComment(db, "comment-1");

    expect(db.deleteById).toHaveBeenCalledWith("comments", "comment-1");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("checks for replies using parent_id", async () => {
    const db = createMockTenantDb();
    await deleteComment(db, "comment-1");

    expect(db.exists).toHaveBeenCalledWith(
      "comments",
      "parent_id = ?",
      ["comment-1"],
    );
  });
});

describe("moderateComment", () => {
  it("approves a comment", async () => {
    const db = createMockTenantDb();
    await moderateComment(db, "comment-1", "approve", "mod-1");

    expect(db.update).toHaveBeenCalledWith(
      "comments",
      {
        status: "approved",
        moderated_at: expect.any(String),
        moderated_by: "mod-1",
        moderation_note: null,
      },
      "id = ?",
      ["comment-1"],
    );
  });

  it("rejects a comment with note", async () => {
    const db = createMockTenantDb();
    await moderateComment(db, "comment-1", "reject", "mod-1", "Not appropriate");

    expect(db.update).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        status: "rejected",
        moderation_note: "Not appropriate",
      }),
      "id = ?",
      ["comment-1"],
    );
  });

  it("marks as spam", async () => {
    const db = createMockTenantDb();
    await moderateComment(db, "comment-1", "spam", "mod-1");

    expect(db.update).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({
        status: "spam",
      }),
      "id = ?",
      ["comment-1"],
    );
  });
});

// ============================================================================
// Direct D1 Functions
// ============================================================================

describe("isUserBlocked", () => {
  it("returns true when user is blocked", async () => {
    const db = createMockD1();
    const stmt = (db as unknown as { _mockStatement: { first: ReturnType<typeof vi.fn> } })._mockStatement;
    stmt.first.mockResolvedValue({ "1": 1 });

    const result = await isUserBlocked(db, "tenant-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when user is not blocked", async () => {
    const db = createMockD1();
    const result = await isUserBlocked(db, "tenant-1", "user-1");
    expect(result).toBe(false);
  });

  it("uses parameterized query", async () => {
    const db = createMockD1();
    await isUserBlocked(db, "tenant-1", "user-1");

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("blocked_commenters"),
    );
    const stmt = (db as unknown as { _mockStatement: { bind: ReturnType<typeof vi.fn> } })._mockStatement;
    expect(stmt.bind).toHaveBeenCalledWith("tenant-1", "user-1");
  });
});

describe("blockCommenter", () => {
  it("inserts a block record with reason", async () => {
    const db = createMockD1();
    await blockCommenter(db, "tenant-1", "user-1", "Spam");

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO blocked_commenters"),
    );
    const stmt = (db as unknown as { _mockStatement: { bind: ReturnType<typeof vi.fn> } })._mockStatement;
    expect(stmt.bind).toHaveBeenCalledWith("tenant-1", "user-1", "Spam");
  });

  it("handles no reason", async () => {
    const db = createMockD1();
    await blockCommenter(db, "tenant-1", "user-1");

    const stmt = (db as unknown as { _mockStatement: { bind: ReturnType<typeof vi.fn> } })._mockStatement;
    expect(stmt.bind).toHaveBeenCalledWith("tenant-1", "user-1", null);
  });
});

describe("unblockCommenter", () => {
  it("deletes the block record", async () => {
    const db = createMockD1();
    await unblockCommenter(db, "tenant-1", "user-1");

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM blocked_commenters"),
    );
    const stmt = (db as unknown as { _mockStatement: { bind: ReturnType<typeof vi.fn> } })._mockStatement;
    expect(stmt.bind).toHaveBeenCalledWith("tenant-1", "user-1");
  });
});

describe("checkCommentRateLimit", () => {
  /** Helper: create a mock D1 with batch returning the given write/read results */
  function createRateLimitMockD1(opts: { changes: number; count: number }) {
    const db = createMockD1();
    (db.batch as ReturnType<typeof vi.fn>).mockResolvedValue([
      { success: true, meta: { changes: opts.changes } },
      { success: true, results: [{ count: opts.count }] },
    ]);
    return db;
  }

  it("allows when under limit", async () => {
    const db = createRateLimitMockD1({ changes: 1, count: 1 });
    const result = await checkCommentRateLimit(
      db,
      "user-1",
      "public_comment",
      20,
      "week",
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("denies when at limit (no increment)", async () => {
    const db = createRateLimitMockD1({ changes: 0, count: 20 });
    const result = await checkCommentRateLimit(
      db,
      "user-1",
      "public_comment",
      20,
      "week",
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("denies when over limit", async () => {
    const db = createRateLimitMockD1({ changes: 0, count: 25 });
    const result = await checkCommentRateLimit(
      db,
      "user-1",
      "public_comment",
      20,
      "week",
    );

    expect(result.allowed).toBe(false);
  });

  it("uses atomic batch for increment and read", async () => {
    const db = createRateLimitMockD1({ changes: 1, count: 1 });
    await checkCommentRateLimit(
      db,
      "user-1",
      "private_reply",
      50,
      "day",
    );

    // Both UPSERT and SELECT run in a single atomic batch
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.prepare).toHaveBeenCalledTimes(2);
  });

  it("still uses batch when rate limited (atomic check)", async () => {
    const db = createRateLimitMockD1({ changes: 0, count: 50 });
    await checkCommentRateLimit(
      db,
      "user-1",
      "private_reply",
      50,
      "day",
    );

    // Batch is always called — the WHERE clause prevents increment atomically
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.prepare).toHaveBeenCalledTimes(2);
  });

  it("uses parameterized queries for UPSERT and SELECT", async () => {
    const db = createRateLimitMockD1({ changes: 1, count: 1 });
    await checkCommentRateLimit(
      db,
      "user-1",
      "public_comment",
      20,
      "week",
    );

    const calls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toContain("INSERT INTO comment_rate_limits");
    expect(calls[1][0]).toContain("SELECT count FROM comment_rate_limits");
  });
});

// ============================================================================
// Pending Count
// ============================================================================

describe("getPendingCount", () => {
  it("counts pending public comments", async () => {
    const db = createMockTenantDb({
      count: vi.fn().mockResolvedValue(3),
    });

    const count = await getPendingCount(db);
    expect(count).toBe(3);
    expect(db.count).toHaveBeenCalledWith(
      "comments",
      "is_public = 1 AND status = ?",
      ["pending"],
    );
  });

  it("returns 0 when no pending comments", async () => {
    const db = createMockTenantDb({
      count: vi.fn().mockResolvedValue(0),
    });

    const count = await getPendingCount(db);
    expect(count).toBe(0);
  });
});

// ============================================================================
// Moderated Comments
// ============================================================================

describe("getModeratedComments", () => {
  it("queries rejected and spam comments", async () => {
    const db = createMockTenantDb();
    await getModeratedComments(db);

    expect(db.queryMany).toHaveBeenCalledWith(
      "comments",
      "is_public = 1 AND status IN (?, ?)",
      ["rejected", "spam"],
      { orderBy: "moderated_at DESC", limit: 100 },
    );
  });

  it("returns moderated comments", async () => {
    const comments = [
      makeComment({ id: "c1", status: "rejected" }),
      makeComment({ id: "c2", status: "spam" }),
    ];
    const db = createMockTenantDb({
      queryMany: vi.fn().mockResolvedValue(comments),
    });

    const result = await getModeratedComments(db);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("rejected");
    expect(result[1].status).toBe("spam");
  });
});

// ============================================================================
// Blocked Commenters
// ============================================================================

describe("getBlockedCommenters", () => {
  it("returns blocked users for a tenant", async () => {
    const blocked = [
      { blocked_user_id: "user-1", reason: "Spam", created_at: "2025-01-01" },
      { blocked_user_id: "user-2", reason: null, created_at: "2025-01-02" },
    ];
    const db = createMockD1();
    const stmt = (db as unknown as { _mockStatement: { all: ReturnType<typeof vi.fn> } })._mockStatement;
    stmt.all.mockResolvedValue({ results: blocked });

    const result = await getBlockedCommenters(db, "tenant-1");
    expect(result).toHaveLength(2);
    expect(result[0].blocked_user_id).toBe("user-1");
    expect(result[0].reason).toBe("Spam");
    expect(result[1].reason).toBeNull();
  });

  it("returns empty array when no blocked users", async () => {
    const db = createMockD1();
    const result = await getBlockedCommenters(db, "tenant-1");
    expect(result).toEqual([]);
  });

  it("uses parameterized query with tenant_id", async () => {
    const db = createMockD1();
    await getBlockedCommenters(db, "tenant-1");

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("blocked_commenters WHERE tenant_id = ?"),
    );
    const stmt = (db as unknown as { _mockStatement: { bind: ReturnType<typeof vi.fn> } })._mockStatement;
    expect(stmt.bind).toHaveBeenCalledWith("tenant-1");
  });
});

// ============================================================================
// Upsert Comment Settings
// ============================================================================

describe("upsertCommentSettings", () => {
  it("updates existing settings", async () => {
    const existing: CommentSettingsRecord = {
      tenant_id: "tenant-1",
      comments_enabled: 1,
      public_comments_enabled: 1,
      who_can_comment: "anyone",
      show_comment_count: 1,
      notify_on_reply: 1,
      notify_on_pending: 1,
      notify_on_thread_reply: 0,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const db = createMockTenantDb({
      queryOne: vi.fn().mockResolvedValue(existing),
    });

    await upsertCommentSettings(db, { comments_enabled: 0 });

    expect(db.update).toHaveBeenCalledWith(
      "comment_settings",
      expect.objectContaining({
        comments_enabled: 0,
        updated_at: expect.any(String),
      }),
      "tenant_id = ?",
      ["tenant-1"],
    );
  });

  it("inserts when no settings exist", async () => {
    const db = createMockTenantDb({
      queryOne: vi.fn().mockResolvedValue(null),
    });

    await upsertCommentSettings(db, {
      comments_enabled: 1,
      who_can_comment: "grove_members",
    });

    expect(db.insert).toHaveBeenCalledWith(
      "comment_settings",
      expect.objectContaining({
        comments_enabled: 1,
        who_can_comment: "grove_members",
        updated_at: expect.any(String),
      }),
    );
  });

  it("preserves other fields when updating partial settings", async () => {
    const existing: CommentSettingsRecord = {
      tenant_id: "tenant-1",
      comments_enabled: 1,
      public_comments_enabled: 1,
      who_can_comment: "anyone",
      show_comment_count: 1,
      notify_on_reply: 1,
      notify_on_pending: 1,
      notify_on_thread_reply: 0,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const db = createMockTenantDb({
      queryOne: vi.fn().mockResolvedValue(existing),
    });

    await upsertCommentSettings(db, { show_comment_count: 0 });

    // Should only send the changed field + updated_at
    expect(db.update).toHaveBeenCalledWith(
      "comment_settings",
      {
        show_comment_count: 0,
        updated_at: expect.any(String),
      },
      "tenant_id = ?",
      ["tenant-1"],
    );
  });
});
