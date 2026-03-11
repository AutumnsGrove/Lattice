---
title: Reeds — Comment System
description: Dual-mode comment system with private replies and public comments
category: specs
specCategory: content-community
icon: messagessquare
lastUpdated: '2026-03-11'
aliases: []
date created: Sunday, December 1st 2025
date modified: Tuesday, March 11th 2026
tags:
  - comments
  - social
  - user-interaction
type: tech-spec
---

```
                                                        ·
           ı    ı         ı              ı    ı        ı
          ıı   ıı    ı   ıı    ı   ı    ıı   ıı   ı   ıı
         ıı|  ıı|   ıı  ıı|   ıı  ıı   ıı|  ıı|  ıı  ıı|
        ı|||ı|||  ı||ı ı|||  ı||ı|||  ı|||ı|||ı ı||ı|||
    ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

              Whisper together at the water's edge.
```

> *Whisper together at the water's edge.*

# Reeds: Comment System

Grove's dual-mode comment system supporting both private replies (author-only) and public conversations (author-moderated). Encourages thoughtful engagement while giving blog authors full control over their public-facing content. Built into the engine with graft-gated access, Thorn content moderation, dual-layer rate limiting, and full Arbor admin UI.

**Public Name:** Reeds
**Internal Name:** GroveReeds
**Location:** `libs/engine/` (engine-embedded, not a standalone app)
**Version:** 1.0 (Production)
**Last Updated:** March 2026

Reeds sway together at the water's edge, whispering in the breeze: a gentle murmur of community. Reeds is Grove's comment system, supporting both private replies and public conversations, all flowing naturally beneath your posts.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Production — fully built and deployed |
| **Graft Gate** | `reeds_comments` (Greenhouse-gated) |
| **Admin UI** | `/arbor/reeds` |
| **Public UI** | `ReedsThread` component on `/garden/[slug]` |
| **Database** | 4 tables in `grove-engine-db` |
| **API Routes** | 6 route files, 8 HTTP methods |
| **Test Coverage** | 30+ unit tests in `reeds.test.ts` |

---

## Overview

### What This Is

Reeds is an engine-embedded comment system providing two interaction modes:

- **Replies** — private messages visible only to the blog author
- **Comments** — public messages requiring author approval before display

It's graft-gated behind `reeds_comments`, meaning it's only available to tenants in the Greenhouse beta program with the feature flag enabled.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Meadow (Public Blog)                     │
│  /garden/[slug]                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ReedsThread → ReedsComment + ReedsCommentForm         │ │
│  │  (loads via /api/reeds/[slug])                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    API Layer (Engine)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
/api/reeds/[slug]   /api/reeds/settings   /api/reeds/blocked/[userId]
 GET  (list)         GET  (read)           DELETE (unblock)
 POST (create)       PATCH (update)
    │
    ├── /api/reeds/[slug]/[commentId]
    │    PATCH (edit)
    │    DELETE (delete)
    │
    └── /api/reeds/[slug]/[commentId]/moderate
         POST (approve/reject/spam/block)
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              Reeds Service    Thorn Moderation
              (reeds.ts)       (on_comment hook)
                    │
                    ▼
              grove-engine-db (D1)
              ├── comments
              ├── comment_settings
              ├── comment_rate_limits
              └── blocked_commenters
```

### Core Philosophy

- **Author ownership:** Blog authors control what appears publicly on their posts
- **Encourage engagement:** Private replies remove the performance anxiety of public commenting
- **Reduce spam:** Public comments require author approval, rate limits on free Wanderers
- **HN-style simplicity:** No reactions on comments, just threaded replies

---

## Two Interaction Modes

### Replies (Private)

**What it is:** A private message to the blog author, visible only to them.

**Use cases:**
- "Thanks for writing this, it helped me!"
- "I think there's a typo in paragraph 3"
- "This resonated with me because..."

| Property | Value |
|----------|-------|
| **Visibility** | Author only (never public) |
| **Moderation** | None — auto-approved on creation |
| **Status on create** | `approved` |
| **Rate limit (Wanderer)** | 50 per day |
| **Rate limit (Paid)** | Unlimited |

### Comments (Public)

**What it is:** A public comment that appears on the post after author approval.

**Use cases:**
- Adding to the discussion
- Sharing related experiences
- Asking questions for community benefit

| Property | Value |
|----------|-------|
| **Visibility** | Public after approval |
| **Moderation** | Required — enters pending queue |
| **Status on create** | `pending` |
| **Rate limit (Wanderer)** | 20 per week |
| **Rate limit (Paid)** | Unlimited |
| **Content moderation** | Thorn AI review (non-blocking) |

---

## Routes

### Admin Route (Arbor)

| Route | File | Purpose |
|-------|------|---------|
| `/arbor/reeds` | `src/routes/arbor/reeds/+page.svelte` | Comment management dashboard |

**Graft gate:** `reeds_comments` — checked via `parent()` data cascade from arbor layout. Returns 404 with `ARBOR_ERRORS.GREENHOUSE_REQUIRED` if disabled.

**Server load (`+page.server.ts`)** fetches in parallel:
- `getPendingComments()` — public comments awaiting approval
- `getAllPrivateReplies()` — private replies across all posts
- `getModeratedComments()` — rejected/spam comments
- `getBlockedCommenters()` — blocked user list
- `getCommentSettings()` — tenant comment configuration
- Posts list (for slug/title lookup map)

### Public Route Integration

| Route | Integration |
|-------|------------|
| `/garden/[slug]` | `ReedsThread` component rendered below post content |

The `+page.server.ts` for `/garden/[slug]` calls `loadComments()` which:
1. Checks `reeds_comments` graft via Greenhouse + feature flag
2. Returns empty data if graft disabled (graceful degradation)
3. Resolves post slug → post ID
4. Fetches approved comments, count, and settings in parallel
5. Builds threaded comment tree via `buildCommentTree()`

### Arbor Layout Integration

The arbor `+layout.server.ts` loads `pendingCommentCount` for the nav badge:
- Only queried when `grafts.reeds_comments` is enabled
- Drives badge count on the "Comments" nav item in Arbor sidebar
- Non-critical — failure silently returns 0

---

## API Endpoints

### Public Endpoints

#### `GET /api/reeds/[slug]` — List approved comments

| Property | Value |
|----------|-------|
| **Auth** | None (public) |
| **Graft Gate** | `reeds_comments` |
| **Cache** | `public, max-age=30, stale-while-revalidate=60` |

**Response:**
```typescript
{
  comments: ThreadedComment[];  // Tree structure
  total: number;                // Approved count
  settings: {
    comments_enabled: number;
    public_comments_enabled: number;
    who_can_comment: string;
    show_comment_count: number;
  };
}
```

#### `POST /api/reeds/[slug]` — Submit comment or reply

| Property | Value |
|----------|-------|
| **Auth** | Required (must be logged in) |
| **Graft Gate** | `reeds_comments` |
| **Burst Limit** | 60/hour via Threshold (KV) |
| **Tier Limit** | Wanderer: 20 public/week, 50 private/day |

**Request:**
```typescript
{
  content: string;       // 1–10,000 characters
  is_public: boolean;    // true = public comment, false = private reply
  parent_id?: string;    // For threaded replies
}
```

**Validation chain:**
1. Auth check → `UNAUTHORIZED`
2. Graft gate → `FEATURE_DISABLED`
3. Threshold burst limit (60/hr) → 429 response
4. Post exists and is published → `RESOURCE_NOT_FOUND`
5. Comment settings enabled → `COMMENTS_DISABLED`
6. `who_can_comment` enforcement → `COMMENTS_DISABLED` / `UNAUTHORIZED`
7. Block list check → `COMMENT_BLOCKED`
8. Content length validation → `MISSING_REQUIRED_FIELDS` / `CONTENT_TOO_LARGE`
9. Public comments setting → `COMMENTS_DISABLED`
10. Per-tier rate limit (Wanderer) → `RATE_LIMITED`
11. Parent comment validation (if threaded) → `VALIDATION_FAILED`

**Post-create:** For public comments, triggers Thorn `moderatePublishedContent()` via `waitUntil()` (non-blocking AI content moderation with `hookPoint: "on_comment"`).

**Response:**
```typescript
{
  success: true;
  comment_id: string;
  status: "pending" | "approved";
  message: string;
}
```

#### `PATCH /api/reeds/[slug]/[commentId]` — Edit own comment

| Property | Value |
|----------|-------|
| **Auth** | Required (must be comment author) |
| **Edit window** | 15 minutes from creation |

**Checks:** Ownership verification, edit window, soft-delete guard (cannot edit `[deleted]` comments).

#### `DELETE /api/reeds/[slug]/[commentId]` — Delete comment

| Property | Value |
|----------|-------|
| **Auth** | Required (comment author OR blog owner) |
| **Soft delete** | If comment has replies → replace content with `[deleted]` |
| **Hard delete** | If no replies → remove entirely |

Blog owner verification uses `getVerifiedTenantId()` for ownership check.

### Author Endpoints (Blog Owner Only)

#### `POST /api/reeds/[slug]/[commentId]/moderate` — Moderate comment

| Property | Value |
|----------|-------|
| **Auth** | Required (blog owner via `getVerifiedTenantId`) |
| **Actions** | `approve`, `reject`, `spam`, `block_user` |

**`block_user` action:** Blocks the commenter AND rejects the comment in a single operation.

Moderation note capped at 500 characters to prevent abuse.

#### `GET /api/reeds/settings` — Get comment settings
#### `PATCH /api/reeds/settings` — Update comment settings

| Property | Value |
|----------|-------|
| **Auth** | Required (blog owner) |
| **Graft Gate** | `reeds_comments` |

**Updatable fields:**
- `comments_enabled` (0/1)
- `public_comments_enabled` (0/1)
- `who_can_comment` (`anyone` | `grove_members` | `paid_only` | `nobody`)
- `show_comment_count` (0/1)

#### `DELETE /api/reeds/blocked/[userId]` — Unblock commenter

| Property | Value |
|----------|-------|
| **Auth** | Required (blog owner) |
| **Graft Gate** | `reeds_comments` |

---

## Database Schema

All 4 tables live in `grove-engine-db` (binding: `DB`). Defined in Drizzle at `libs/engine/src/lib/server/db/schema/engine.ts`.

### `comments` Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ comments                                                            │
├──────────────────┬──────────┬──────────────────────────────────────┤
│ Column           │ Type     │ Details                              │
├──────────────────┼──────────┼──────────────────────────────────────┤
│ id               │ TEXT     │ PK                                   │
│ tenant_id        │ TEXT     │ NOT NULL, FK → tenants(id) CASCADE   │
│ post_id          │ TEXT     │ NOT NULL, FK → posts(id) CASCADE     │
│ author_id        │ TEXT     │ NOT NULL (commenter's user ID)       │
│ author_name      │ TEXT     │ NOT NULL, default ""                 │
│ author_email     │ TEXT     │ NOT NULL, default ""                 │
│ parent_id        │ TEXT     │ NULL = top-level, else parent ID     │
│ content          │ TEXT     │ NOT NULL (raw markdown)              │
│ content_html     │ TEXT     │ Rendered markdown (sanitized)        │
│ is_public        │ INTEGER  │ NOT NULL, default 1 (1=comment,0=reply)│
│ status           │ TEXT     │ NOT NULL, default "pending"          │
│ moderation_note  │ TEXT     │ Internal note from AI or author      │
│ moderated_at     │ TEXT     │ ISO timestamp                        │
│ moderated_by     │ TEXT     │ "ai" or user_id                     │
│ created_at       │ TEXT     │ NOT NULL, default datetime('now')    │
│ updated_at       │ TEXT     │ NOT NULL, default datetime('now')    │
│ edited_at        │ TEXT     │ NULL if never edited                 │
└──────────────────┴──────────┴──────────────────────────────────────┘

Status values: "pending" | "approved" | "rejected" | "spam"
```

### `comment_settings` Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ comment_settings                                                    │
├──────────────────────────┬──────────┬──────────────────────────────┤
│ Column                   │ Type     │ Details                      │
├──────────────────────────┼──────────┼──────────────────────────────┤
│ tenant_id                │ TEXT     │ PK, FK → tenants(id) CASCADE │
│ comments_enabled         │ INTEGER  │ default 1                    │
│ public_comments_enabled  │ INTEGER  │ default 1                    │
│ who_can_comment          │ TEXT     │ default "anyone"             │
│ show_comment_count       │ INTEGER  │ default 1                    │
│ notify_on_reply          │ INTEGER  │ default 1                    │
│ notify_on_pending        │ INTEGER  │ default 1                    │
│ notify_on_thread_reply   │ INTEGER  │ default 1                    │
│ updated_at               │ TEXT     │ default datetime('now')      │
└──────────────────────────┴──────────┴──────────────────────────────┘

who_can_comment values: "anyone" | "grove_members" | "paid_only" | "nobody"
```

### `comment_rate_limits` Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ comment_rate_limits                                                 │
├──────────────────┬──────────┬──────────────────────────────────────┤
│ Column           │ Type     │ Details                              │
├──────────────────┼──────────┼──────────────────────────────────────┤
│ user_id          │ TEXT     │ NOT NULL                             │
│ limit_type       │ TEXT     │ NOT NULL                             │
│ period_start     │ TEXT     │ NOT NULL (date string)               │
│ count            │ INTEGER  │ NOT NULL, default 0                  │
├──────────────────┴──────────┴──────────────────────────────────────┤
│ UNIQUE INDEX: idx_comment_rate_limits_pk(user_id, limit_type)      │
└────────────────────────────────────────────────────────────────────┘

limit_type values: "public_comment" | "private_reply"
Note: Rate limits are global per-user, NOT per-tenant.
```

### `blocked_commenters` Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ blocked_commenters                                                  │
├──────────────────┬──────────┬──────────────────────────────────────┤
│ Column           │ Type     │ Details                              │
├──────────────────┼──────────┼──────────────────────────────────────┤
│ tenant_id        │ TEXT     │ NOT NULL, FK → tenants(id) CASCADE   │
│ blocked_user_id  │ TEXT     │ NOT NULL                             │
│ reason           │ TEXT     │ Optional                             │
│ created_at       │ TEXT     │ NOT NULL, default datetime('now')    │
├──────────────────┴──────────┴──────────────────────────────────────┤
│ UNIQUE INDEX: idx_blocked_commenters_pk(tenant_id, blocked_user_id)│
└────────────────────────────────────────────────────────────────────┘
```

---

## Components

### `ReedsThread` — Main integration component

**File:** `libs/engine/src/lib/components/reeds/ReedsThread.svelte`
**Used in:** `/garden/[slug]` (public blog post page)

The top-level component that renders the entire comment section on a blog post. Manages:
- Comment list display (threaded)
- Inline reply forms
- Comment editing (via prompt — simple, upgrade path to inline later)
- Delete confirmation via `GlassConfirmDialog`
- Auto-refresh after submit/edit/delete
- Sign-in prompt for unauthenticated visitors

**Props:**
```typescript
interface Props {
  slug: string;
  initialComments?: Comment[];
  initialTotal?: number;
  settings?: CommentSettings;
  currentUserId?: string;
  isOwner?: boolean;
  isLoggedIn?: boolean;
}
```

### `ReedsComment` — Single comment display

**File:** `libs/engine/src/lib/components/reeds/ReedsComment.svelte`

Renders one comment with author info, relative timestamp, content (sanitized HTML), and action buttons. Handles:
- Thread nesting (recursive — renders own replies via self-reference)
- Depth-based indentation (classes: `depth-0`, `depth-1`, `depth-2`)
- `[deleted]` placeholder display for soft-deleted comments
- 15-minute edit window check (client-side derived state)
- Action buttons: Reply, Edit (within window), Delete (author or owner)
- `(edited)` indicator when `edited_at` is set

### `ReedsCommentForm` — Comment submission form

**File:** `libs/engine/src/lib/components/reeds/ReedsCommentForm.svelte`

Dual-mode submission form with glassmorphism styling:
- Radio toggle: Reply (private) / Comment (public)
- Character count (10,000 max, shows near limit at 90%)
- CSRF token injection via `getCSRFToken()`
- Compact mode for inline replies
- Cancel button for nested reply forms
- Context-sensitive hints about privacy

**Props:**
```typescript
interface Props {
  slug: string;
  parentId?: string;
  allowPublic?: boolean;  // Hides public toggle when disabled
  onsubmitted?: () => void;
  oncancel?: () => void;
  compact?: boolean;
}
```

---

## Admin UI (Arbor)

The `/arbor/reeds` page provides a tabbed management interface:

```
┌─────────────────────────────────────────────────────────┐
│  💬 Comments                                             │
│  Reeds and replies on your blooms                        │
├─────────────────────────────────────────────────────────┤
│  [Pending 3]  [Replies 5]  [Moderated]  [Blocked]  [Settings] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tab content: comment cards with moderation actions      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Content | Actions |
|-----|---------|---------|
| **Pending** | Public comments awaiting approval | Approve / Reject / Block User |
| **Replies** | Private replies from readers | Read-only display |
| **Moderated** | Rejected/spam comments | Re-approve |
| **Blocked** | Blocked user list | Unblock |
| **Settings** | Comment configuration toggles | Save Settings |

### Settings Panel

| Setting | Control | Options | Default |
|---------|---------|---------|---------|
| Comments enabled | Toggle switch | On/Off | On |
| Public comments | Toggle switch | On/Off | On |
| Who can comment | Select dropdown | Anyone / Grove members / Paid only / Nobody | Anyone |
| Show comment count | Toggle switch | On/Off | On |

The admin page uses:
- `GlassCard` for content panels
- `Badge` for tab counts
- `GroveSwap` for Grove terminology
- `toast` for action feedback
- Lucide icons: `MessageSquare`, `Mail`, `Check`, `X`, `Ban`, `Settings`, `ShieldAlert`, `UserX`

---

## Service Layer

**File:** `libs/engine/src/lib/server/services/reeds.ts`

All data access goes through `TenantDb` for automatic tenant isolation (except blocked users and rate limits which use raw D1 for cross-tenant operations).

### Exported Functions

| Function | Purpose | Data Access |
|----------|---------|-------------|
| `getCommentSettings()` | Get settings with defaults fallback | TenantDb |
| `getApprovedComments()` | Public approved comments for a post | TenantDb |
| `getPrivateReplies()` | Private replies for a post | TenantDb |
| `getPendingComments()` | Moderation queue (limit: 100) | TenantDb |
| `getPendingCount()` | Badge count for nav | TenantDb |
| `getModeratedComments()` | Rejected/spam review (limit: 100) | TenantDb |
| `getAllPrivateReplies()` | Author inbox (limit: 100) | TenantDb |
| `getCommentCount()` | Approved public count for a post | TenantDb |
| `getCommentById()` | Single comment lookup | TenantDb |
| `buildCommentTree()` | Flat → threaded tree (max depth: 3) | Pure function |
| `createComment()` | Create comment/reply | TenantDb |
| `editComment()` | Edit with soft-delete guard | TenantDb |
| `deleteComment()` | Soft/hard delete based on replies | TenantDb |
| `moderateComment()` | Approve/reject/spam | TenantDb |
| `isUserBlocked()` | Check block list | Raw D1 |
| `blockCommenter()` | Add to block list (INSERT OR IGNORE) | Raw D1 |
| `unblockCommenter()` | Remove from block list | Raw D1 |
| `getBlockedCommenters()` | List blocked users | Raw D1 |
| `upsertCommentSettings()` | Create or update settings | TenantDb |
| `checkCommentRateLimit()` | Atomic rate limit check+increment | Raw D1 batch |
| `stripControlChars()` | Input sanitization | Pure function |
| `isWithinEditWindow()` | 15-minute edit check | Pure function |

### Threading

- Maximum depth: 3 levels
- Comments beyond max depth are flattened with `depth = MAX_THREAD_DEPTH - 1`
- Orphaned comments (parent not in list) promoted to root level
- Tree built in two passes: create map, then link parent → child

### Content Processing

- User content sanitized via `stripControlChars()` — removes C0/C1 control characters, DEL, Unicode line/paragraph separators while preserving `\n`, `\r`, `\t`
- Markdown rendered via `renderMarkdown()` (engine utility)
- Both raw `content` and `content_html` stored for display flexibility

---

## Rate Limiting

### Dual-Layer Architecture

```
Request
  │
  ▼
Layer 1: Threshold (KV-backed burst protection)
  60 requests/hour per user — global, regardless of tier
  │
  ▼
Layer 2: D1-backed per-tier limits
  Wanderer: 20 public/week OR 50 private/day
  Paid tiers: Unlimited
```

### Per-Tier Limits

| User Type | Public Comments | Private Replies |
|-----------|-----------------|-----------------|
| **Wanderer** | 20 per week | 50 per day |
| **Seedling** | Unlimited | Unlimited |
| **Sapling** | Unlimited | Unlimited |
| **Oak** | Unlimited | Unlimited |
| **Evergreen** | Unlimited | Unlimited |

### D1 Rate Limit Implementation

Uses atomic D1 batch for check+increment:
1. `INSERT ... ON CONFLICT DO UPDATE` with `WHERE count < limit` guard
2. `SELECT count` to read current value
3. `meta.changes` from write result indicates whether slot was granted

This prevents race condition bypass from concurrent requests. D1 is single-writer SQLite, so batched writes are serialized.

Rate limits are keyed by `user_id` only (not tenant-scoped) — a Wanderer's weekly cap is global across all blogs.

---

## Content Moderation (Thorn Integration)

Public comments trigger async AI content moderation via the Thorn system:

```
User submits public comment
        │
        ▼
    Comment created (status: "pending")
        │
        ▼
    waitUntil(moderatePublishedContent({
      contentType: "comment",
      hookPoint: "on_comment",
      contentRef: commentId
    }))
        │
        ▼
    Thorn AI pipeline (non-blocking)
```

The Thorn integration uses:
- `hookPoint: "on_comment"` → maps to `comments/create` behavioral rate check
- `platform.env.AI` (Cloudflare AI) and `OPENROUTER_API_KEY` for LLM inference
- Non-blocking via `platform.context.waitUntil()` — doesn't delay response

Comments are checked for: spam, malware links, harassment, hate speech, illegal content.

---

## Feature Gating

Reeds is gated behind the `reeds_comments` graft (feature flag):

```typescript
// Graft check pattern (used in all API routes + page loads)
async function isReedsEnabled(db, kv, tenantId): Promise<boolean> {
  1. Check KV available → false if not
  2. isInGreenhouse(tenantId) → false if not in beta
  3. isFeatureEnabled("reeds_comments", ...) → false if flag off
}
```

**Graft type:** `"reeds_comments"` in the `GraftFlag` union type

**Where checked:**
- All 4 API route files (6 handlers)
- `/garden/[slug]` page server load (`loadComments()`)
- `/arbor/reeds` page server load (via parent layout cascade)
- `/arbor` layout (controls sidebar nav item visibility + badge)

When disabled, all endpoints return empty data or 403/404 — the system degrades gracefully.

---

## Signpost Error Codes

| Code | Constant | HTTP | User Message |
|------|----------|------|-------------|
| `GROVE-API-050` | `COMMENTS_DISABLED` | 403 | Comments are closed on this post. |
| `GROVE-API-051` | `COMMENT_NOT_FOUND` | 404 | That comment doesn't exist or has already been removed. |
| `GROVE-API-052` | `COMMENT_EDIT_WINDOW_CLOSED` | 403 | The edit window has closed. Comments can only be edited within 15 minutes. |
| `GROVE-API-053` | `COMMENT_BLOCKED` | 403 | You're unable to comment on this blog. |

Additional generic errors used: `UNAUTHORIZED`, `DB_NOT_CONFIGURED`, `TENANT_CONTEXT_REQUIRED`, `FEATURE_DISABLED`, `RESOURCE_NOT_FOUND`, `MISSING_REQUIRED_FIELDS`, `CONTENT_TOO_LARGE`, `RATE_LIMITED`, `VALIDATION_FAILED`, `FORBIDDEN`, `OPERATION_FAILED`.

---

## Reverie Integration

Reeds settings are registered with the Reverie conversational AI system:

**File:** `libs/engine/src/lib/reverie/schemas/social/comments.ts`

```typescript
// Domain schema for natural language settings control
{
  id: "social.comments",
  name: "Comment Settings",
  group: "social",
  database: "engine",
  // Supports commands like:
  // "Turn off comments on my blog"
  // "Only let registered users comment"
  // "Notify me when someone replies"
}
```

---

## User Capabilities

### Commenter Actions

| Action | Allowed | Details |
|--------|---------|---------|
| Submit reply (private) | Yes | Auto-approved, author-only visibility |
| Submit comment (public) | Yes | Enters pending queue |
| Edit own comment | Yes | Within 15 minutes of posting |
| Delete own comment | Yes | Anytime (soft/hard based on replies) |
| Reply to comments | Yes | Creates nested thread |
| React to comments | No | HN-style, no reactions |

### Blog Owner Actions

| Action | Allowed | Details |
|--------|---------|---------|
| Approve comment | Yes | Makes publicly visible |
| Reject comment | Yes | Hides from public |
| Mark as spam | Yes | Categorized rejection |
| Block user | Yes | Blocks + rejects current comment |
| Unblock user | Yes | Removes from block list |
| Delete any comment | Yes | Ownership verified via `getVerifiedTenantId` |
| Configure settings | Yes | Via Settings tab or API |

### Edit Window

- Comments editable within **15 minutes** of posting
- After window: edit button disappears (client-side) + API returns `COMMENT_EDIT_WINDOW_CLOSED`
- Soft-deleted comments (`content === "[deleted]"`) cannot be edited (resurrection guard)
- Edit history NOT shown publicly — no "edited" label in spec, but implementation shows `(edited)` indicator when `edited_at` is set

### Deletion

- **Soft delete** (has replies): Content replaced with `[deleted]`, author_name → `[deleted]`, status → `approved`
- **Hard delete** (no replies): Row removed entirely
- Blog owner can delete any comment on their blog
- Delete confirmation via `GlassConfirmDialog` component

---

## Comment Display Flow

### Public (Meadow `/garden/[slug]`)

```
Page Server Load
  │
  ├── loadComments() checks graft → early return if disabled
  │
  ├── Resolve slug → post ID
  │
  ├── Parallel fetch:
  │   ├── getApprovedComments(tenantDb, postId)
  │   ├── getCommentCount(tenantDb, postId)
  │   └── getCommentSettings(tenantDb)
  │
  ├── buildCommentTree(rawComments)
  │
  └── Return { comments, commentTotal, commentSettings }

Client Render
  │
  ├── ReedsThread (wrapper section)
  │   ├── Header with count: "Comments (3)"
  │   ├── Comment list → ReedsComment (recursive)
  │   │   ├── Author · timestamp · (edited)
  │   │   ├── Content (sanitized HTML)
  │   │   ├── Reply / Edit / Delete buttons
  │   │   └── Nested replies (indented)
  │   ├── Inline reply forms (toggled per comment)
  │   └── Main comment form (logged in) OR sign-in prompt
  └── Delete confirmation dialog
```

### Comment count badge

When `commentSettings.show_comment_count` is enabled, a badge appears on the post page linking to `#reeds` anchor.

---

## File Inventory

### Service & Logic

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/server/services/reeds.ts` | Service layer (all CRUD, threading, rate limits, moderation) |
| `libs/engine/src/lib/server/services/reeds.test.ts` | 30+ unit tests (pure functions + mocked service layer) |
| `libs/engine/src/lib/server/db/schema/engine.ts` | Drizzle schema (4 tables: comments, comment_settings, comment_rate_limits, blocked_commenters) |

### API Routes

| File | Methods |
|------|---------|
| `src/routes/api/reeds/[slug]/+server.ts` | `GET` (list), `POST` (create) |
| `src/routes/api/reeds/[slug]/[commentId]/+server.ts` | `PATCH` (edit), `DELETE` (delete) |
| `src/routes/api/reeds/[slug]/[commentId]/moderate/+server.ts` | `POST` (moderate) |
| `src/routes/api/reeds/settings/+server.ts` | `GET` (read), `PATCH` (update) |
| `src/routes/api/reeds/blocked/[userId]/+server.ts` | `DELETE` (unblock) |

### Pages

| File | Purpose |
|------|---------|
| `src/routes/arbor/reeds/+page.server.ts` | Admin data loader |
| `src/routes/arbor/reeds/+page.svelte` | Admin UI (1037 lines, tabbed interface) |

### Components

| File | Purpose |
|------|---------|
| `src/lib/components/reeds/ReedsThread.svelte` | Main comment section (327 lines) |
| `src/lib/components/reeds/ReedsComment.svelte` | Single comment display (260 lines, recursive) |
| `src/lib/components/reeds/ReedsCommentForm.svelte` | Submission form (375 lines, glassmorphism) |

### Integration Points

| File | Integration |
|------|-------------|
| `src/routes/garden/[slug]/+page.server.ts` | `loadComments()` function loads Reeds data |
| `src/routes/garden/[slug]/+page.svelte` | Renders `ReedsThread` below post content |
| `src/routes/arbor/+layout.server.ts` | Loads `pendingCommentCount` for nav badge |
| `src/routes/arbor/+layout.svelte` | Shows Reeds nav item when graft enabled |
| `src/lib/feature-flags/grafts.ts` | Defines `reeds_comments` graft type |
| `src/lib/thorn/hooks.ts` | `moderatePublishedContent()` for AI review |
| `src/lib/thorn/types.ts` | `on_comment` hook point |
| `src/lib/reverie/schemas/social/comments.ts` | Reverie conversational AI schema |
| `src/lib/ui/components/nature/water/Reeds.svelte` | Decorative reeds visual component |

---

## Test Coverage

**File:** `libs/engine/src/lib/server/services/reeds.test.ts`

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| `stripControlChars` | 8 | C0/C1, DEL, Unicode separators, markdown preservation |
| `isWithinEditWindow` | 4 | Just created, 14min, 16min, hours ago |
| `buildCommentTree` | 6 | Empty, flat, nested, 3-level, deep flatten, orphans |
| `getCommentSettings` | 2 | Stored settings, defaults fallback |
| `getApprovedComments` | 1 | Correct filter query |
| `getCommentCount` | 1 | Approved public count |
| `getPendingComments` | 1 | Pending filter with limit |
| `getPendingCount` | 2 | With/without pending |
| `getModeratedComments` | 2 | Query filters, returned data |
| `getCommentById` | 2 | Found, not found |
| `createComment` | 5 | Public/private, parent, control char strip, ID return |
| `editComment` | 4 | Update, control chars, not found, soft-delete guard |
| `deleteComment` | 3 | Soft delete, hard delete, reply check |
| `moderateComment` | 3 | Approve, reject with note, spam |
| `isUserBlocked` | 3 | Blocked, not blocked, parameterized query |
| `blockCommenter` | 2 | With reason, without reason |
| `unblockCommenter` | 1 | Delete record |
| `getBlockedCommenters` | 3 | With data, empty, parameterized query |
| `upsertCommentSettings` | 3 | Update existing, insert new, partial update |
| `checkCommentRateLimit` | 5 | Under limit, at limit, over limit, atomic batch, parameterized |

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **XSS via comment content** | `renderMarkdown()` sanitizes HTML (DOMPurify); `stripControlChars()` removes control characters |
| **CSRF** | Token injected via `getCSRFToken()` in form component |
| **Rate limit bypass** | Dual-layer: KV burst (60/hr) + D1 atomic (tier-based). D1 uses `WHERE count < limit` in UPSERT to prevent concurrent bypass |
| **Ownership verification** | `getVerifiedTenantId()` for blog owner actions; `author_id` check for commenter actions |
| **Input validation** | Content: 1–10,000 chars; `sanitizeObject()` on all JSON input; moderation note capped at 500 chars |
| **Block evasion** | Block check happens before content validation (early exit) |
| **Soft-delete resurrection** | `editComment()` checks `content === "[deleted]"` before allowing edits |
| **Graft gating** | Triple check: KV available → Greenhouse → feature flag. All API routes and page loads gated |
| **SQL injection** | All queries parameterized (TenantDb + raw D1 `.bind()`) |

---

## Future Considerations

- **Anonymous replies:** Allow non-logged-in visitors to send private replies (with email verification)
- **Comment highlighting:** Authors can "pin" or highlight exceptional comments
- **Commenter profiles:** Link to commenter's Grove blog if they have one
- **Email replies:** Reply to notification email to respond (parse incoming email)
- **Inline editing:** Upgrade from `prompt()` to inline edit UI in `ReedsThread`
- **Bulk moderation:** "Approve all" / "Reject all from user" batch actions
- **Notification delivery:** Email notifications currently defined in settings schema but not yet wired to Zephyr email delivery

---

*Reeds sways at the water's edge — a comment system that prioritizes author control and thoughtful engagement over volume. The dual reply/comment architecture encourages interaction while the Greenhouse graft gate, Thorn moderation, and dual-layer rate limiting protect authors from spam and unwanted discourse.*
