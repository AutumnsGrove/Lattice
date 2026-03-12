---
title: "Reeds Developer Guide"
description: "How the dual-mode comment system works: threading, moderation, rate limiting, and the code that ties it together"
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - reeds
  - comments
  - moderation
  - thorn
  - threading
  - rate-limiting
---

# Reeds Developer Guide

Reeds is Grove's comment system. It supports two modes: private replies (visible only to the blog author) and public comments (visible to everyone after the author approves them). The name comes from reeds swaying at the water's edge, whispering in the breeze.

This guide covers how the system works from an implementation perspective. If you want the original design rationale, read `docs/specs/reeds-spec.md`.

## How Reeds Works

A visitor reads a blog post. At the bottom, they see a form with a toggle: Reply (private) or Comment (public). They write something and submit.

If it's a private reply, the comment is immediately stored with `status: "approved"` and `is_public: 0`. Only the blog author ever sees it, in their Replies inbox at `/arbor/reeds`.

If it's a public comment, the comment is stored with `status: "pending"` and `is_public: 1`. It enters the moderation queue. The blog author reviews it in Arbor and either approves, rejects, or blocks the commenter. Approved comments show up on the post as a threaded conversation.

The entire system is gated behind the `reeds_comments` feature flag, which is greenhouse-only. The flag is defined in migration 052 and checked on every API request.

## Reply vs Comment

The `is_public` field on the `comments` table is the dividing line. It's a SQLite integer: `1` for public comment, `0` for private reply.

Private replies skip moderation entirely. They're auto-approved on creation and never appear in the public thread. The service handles this in `createComment`:

```typescript
const status = data.isPublic ? "pending" : "approved";
```

Public comments always start as `"pending"`. They only become visible after the blog author approves them through the moderation endpoint.

This distinction carries through to rate limiting too. Free-tier users get different caps for each mode: 20 public comments per week, 50 private replies per day.

## Moderation Flow

Public comments pass through three layers before reaching readers.

**Layer 1: Input validation and rate checks.** The API route at `/api/reeds/[slug]` validates content length (1 to 10,000 characters), checks whether the user is blocked, and enforces rate limits. The KV burst limiter (Threshold) caps all users at 60 comment submissions per hour regardless of tier.

**Layer 2: Thorn content moderation.** After the comment is created, the route fires an async Thorn check using `waitUntil`. This is non-blocking. The comment gets saved to the database first, then Thorn analyzes it in the background:

```typescript
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
```

If Thorn flags the content, it updates the comment status to `"spam"` directly in the database. The comment never reaches the author's approval queue.

**Layer 3: Author moderation.** The blog author sees pending comments in their Arbor dashboard (`/arbor/reeds`). They can approve, reject, mark as spam, or block the commenter entirely. Blocking a user also rejects their pending comment in a single action.

The moderation endpoint at `/api/reeds/[slug]/[commentId]/moderate` requires tenant ownership verification through `getVerifiedTenantId`. Only the blog owner can moderate.

### Moderation statuses

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting author approval (public comments only) |
| `approved` | Visible to everyone (public) or delivered (private) |
| `rejected` | Hidden by author |
| `spam` | Auto-flagged by Thorn |

Authors can re-approve rejected or spam-flagged comments from the Moderated tab. This acts as a feedback mechanism if Thorn gets it wrong.

## Rate Limiting

Reeds uses two layers of rate limiting.

**KV burst limiter (Threshold).** Every comment submission, regardless of user tier, hits a Threshold check: 60 per hour, keyed by user ID. This is the fast path that catches abuse bursts. It runs before any database work and fails open if KV is unavailable.

```typescript
const denied = await thresholdCheck(threshold, {
  key: `comments/create:${locals.user.id}`,
  limit: 60,
  windowSeconds: 3600,
  failMode: "open",
});
```

**D1 durable limiter.** Free-tier ("wanderer") users also hit per-tier caps tracked in the `comment_rate_limits` table. These limits are global across all tenants, not per-blog.

| Mode | Free-tier limit | Window |
|------|----------------|--------|
| Public comment | 20 | Week (Monday reset) |
| Private reply | 50 | Day |

Paid users (seedling+) skip the D1 limiter entirely.

The D1 rate check uses an atomic upsert pattern. The `INSERT ... ON CONFLICT DO UPDATE` with a `WHERE` clause ensures the count only increments when below the limit. D1's single-writer SQLite model serializes batched writes, preventing race conditions from concurrent requests.

```typescript
const rateCheck = await checkCommentRateLimit(
  platform.env.DB,
  locals.user.id,
  limitType,  // "public_comment" or "private_reply"
  limit,      // 20 or 50
  window,     // "week" or "day"
);
```

The function returns `{ allowed: boolean; remaining: number }`.

## Threading

Comments support threaded replies up to 3 levels deep. The `parent_id` column on the `comments` table creates the tree structure. Top-level comments have `parent_id: null`.

The `buildCommentTree` function in `reeds.ts` converts a flat list of approved comments into a nested tree. It runs in two passes:

1. Create a map of all comments as `ThreadedComment` nodes (with `replies: []` and `depth: 0`)
2. Walk the list again, attaching each child to its parent

```typescript
const MAX_THREAD_DEPTH = 3;
```

When a reply's depth would reach `MAX_THREAD_DEPTH` or beyond, the function clamps it to `MAX_THREAD_DEPTH - 1` and attaches it to the parent at that level. This prevents runaway nesting while keeping the reply visible.

The `ReedsComment.svelte` component is self-recursive. It renders its own replies by including itself:

```svelte
{#each comment.replies as reply (reply.id)}
  <ReedsComment comment={reply} {currentUserId} {isOwner} {onreply} {onedit} {ondelete} />
{/each}
```

Thread indentation uses CSS margins and a left border. Depth 2+ gets tighter indentation to prevent horizontal overflow.

When submitting a threaded reply, the API validates that the `parent_id` references an existing comment on the same post. Cross-post parent references are rejected.

## Edit and Delete Rules

**Editing.** Users can edit their own comments within 15 minutes of posting. The `isWithinEditWindow` function compares `created_at` against `Date.now() - 15 * 60 * 1000`. After the window closes, the edit button disappears from the UI. The `EDIT_WINDOW_MS` constant is mirrored in `ReedsComment.svelte` for client-side display logic.

Edited comments get an `edited_at` timestamp. The component shows "(edited)" next to the time.

Soft-deleted comments (content = `"[deleted]"`) cannot be edited, even within the window. The `editComment` service function checks for this explicitly.

**Deleting.** Users can delete their own comments at any time. Blog owners can also delete any comment on their posts. The delete endpoint verifies either comment authorship or tenant ownership.

Deletion behavior depends on whether the comment has replies:

- **Has replies:** Soft delete. Content becomes `"[deleted]"`, author name becomes `"[deleted]"`, status stays `"approved"`. The thread structure is preserved.
- **No replies:** Hard delete. The row is removed entirely.

The `ReedsComment` component renders soft-deleted comments with reduced opacity and the text "[This comment has been removed]".

## Input Sanitization

All comment content passes through `stripControlChars` before storage and markdown rendering. This strips C0 control characters (`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`), DEL (`\x7F`), C1 characters (`\x80-\x9F`), and Unicode line/paragraph separators (`U+2028`, `U+2029`). Newlines, carriage returns, and tabs are preserved for markdown formatting.

Content is then rendered to HTML through `renderMarkdown`, which uses DOMPurify for sanitization. The rendered HTML is stored in `content_html` for display.

## Admin UI

The Arbor admin page at `/arbor/reeds` has five tabs:

**Pending.** Shows public comments awaiting approval. Each card displays the commenter name, timestamp, post title (linked), and the comment content. Action buttons: Approve, Reject, Block.

**Replies.** Private replies inbox. Read-only, newest first. Each reply links back to its source post.

**Moderated.** Previously rejected or spam-flagged comments. Authors can re-approve from here if Thorn or a previous decision was wrong.

**Blocked.** List of blocked commenters with their block reason and date. Authors can unblock from here.

**Settings.** Blog-wide comment configuration:
- Comments enabled (on/off)
- Public comments enabled (on/off, when off only private replies are accepted)
- Who can comment: anyone (signed in), Grove members only, paid subscribers only, or nobody
- Show comment count on posts (on/off)

Settings are persisted to the `comment_settings` table through the `/api/reeds/settings` endpoint.

The page server loads all five data sources in parallel using `Promise.all`, with individual `.catch` handlers so one failure does not break the entire page.

## Database Schema

Four tables, all created in migration 051:

**`comments`** stores both replies and public comments. Key columns: `tenant_id`, `post_id`, `author_id`, `parent_id` (nullable, for threading), `is_public` (0 or 1), `status` (pending/approved/rejected/spam), `content`, `content_html`. Foreign key on `parent_id` uses `ON DELETE SET NULL` to preserve thread structure when a parent is hard-deleted.

**`comment_rate_limits`** tracks per-user rate limit counts. Composite primary key on `(user_id, limit_type)`. The `period_start` column resets the count when a new window begins.

**`blocked_commenters`** records per-tenant user blocks. Composite primary key on `(tenant_id, blocked_user_id)`.

**`comment_settings`** stores per-tenant configuration. Primary key on `tenant_id`. Defaults are applied in code through `DEFAULT_SETTINGS` when no row exists.

Migration 052 creates the `reeds_comments` feature flag in the `feature_flags` table and adds a tenant-specific rule for the primary grove.

## Key Files

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/server/services/reeds.ts` | Core service: CRUD, threading, rate limiting, blocking |
| `libs/engine/src/routes/api/reeds/[slug]/+server.ts` | GET (list comments) and POST (submit) |
| `libs/engine/src/routes/api/reeds/[slug]/[commentId]/+server.ts` | PATCH (edit) and DELETE |
| `libs/engine/src/routes/api/reeds/[slug]/[commentId]/moderate/+server.ts` | POST (approve/reject/spam/block) |
| `libs/engine/src/routes/api/reeds/settings/+server.ts` | GET and PATCH for comment settings |
| `libs/engine/src/routes/api/reeds/blocked/[userId]/+server.ts` | DELETE (unblock commenter) |
| `libs/engine/src/lib/components/reeds/ReedsThread.svelte` | Top-level component for post comment sections |
| `libs/engine/src/lib/components/reeds/ReedsCommentForm.svelte` | Submission form with reply/comment toggle |
| `libs/engine/src/lib/components/reeds/ReedsComment.svelte` | Single comment display (self-recursive for nesting) |
| `libs/engine/src/routes/arbor/reeds/+page.svelte` | Admin moderation UI |
| `libs/engine/src/routes/arbor/reeds/+page.server.ts` | Admin data loader |
| `libs/engine/migrations/051_reeds_comments.sql` | Schema: comments, rate limits, blocked, settings |
| `libs/engine/migrations/052_reeds_comments_graft.sql` | Feature flag definition |
| `libs/engine/src/lib/thorn/hooks.ts` | `moderatePublishedContent` (async content moderation) |

## Quick Checklist

When working on Reeds, keep these in mind:

- The feature is greenhouse-only. Every API route checks `isReedsEnabled` before proceeding.
- Private replies are never moderated and never shown publicly. The `is_public = 0` filter is applied consistently.
- The edit window is 15 minutes, enforced in both the service layer and the component.
- Soft-deleted comments cannot be edited (prevents resurrection within the edit window).
- Rate limits are global per user, not per blog. A wanderer's 20 public comments per week spans all tenants.
- The Thorn moderation call is async (`waitUntil`). The comment is saved first, then moderation runs in the background.
- Blog owners can delete any comment on their posts, regardless of who wrote it.
- `buildCommentTree` expects a flat list of approved comments sorted by `created_at ASC`. Passing unsorted or mixed-status lists will produce unexpected trees.
- The GET endpoint returns a 30-second cache with 60-second stale-while-revalidate. Keep this in mind when testing approval flows.
- All content goes through `stripControlChars` then `renderMarkdown` (DOMPurify). Raw user input is never rendered directly.
