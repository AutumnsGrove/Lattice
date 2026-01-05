---
aliases: []
date created: Monday, December 29th 2025
date modified: Thursday, January 2nd 2026
tags:
  - comments
  - social
  - user-interaction
type: tech-spec
---

# Reeds — Comments System

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

Grove's comment system supporting both private replies (author-only) and public conversations (author-moderated). A dual system that encourages thoughtful engagement while giving blog authors full control over their public-facing content.

**Public Name:** Reeds
**Internal Name:** GroveReeds
**Version:** 1.0 Draft
**Last Updated:** December 2025

Reeds sway together at the water's edge, whispering in the breeze: a gentle murmur of community. Reeds is Grove's comment system, supporting both private replies and public conversations, all flowing naturally beneath your posts.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification approved, development pending |
| **Target Phase** | Phase 3 (Comments & Interaction) |
| **Prerequisites** | Authentication system, Content moderation system |

---

## Overview

Grove's comment system supports two distinct interaction modes: **Replies** (private, author-only) and **Comments** (public, author-moderated). This dual system encourages thoughtful engagement while giving blog authors full control over their public-facing content.

### Core Philosophy

- **Author ownership:** Blog authors control what appears publicly on their posts
- **Encourage engagement:** Private replies remove the performance anxiety of public commenting
- **Reduce spam:** Public comments require author approval, rate limits on free users
- **HN-style simplicity:** No reactions on comments, just threaded replies

---

## 1. Two Interaction Modes

### 1.1 Replies (Private)

**What it is:** A private message to the blog author, visible only to them.

**Use cases:**
- "Thanks for writing this, it helped me!"
- "I think there's a typo in paragraph 3"
- "This resonated with me because..."
- Feedback the reader doesn't want public

**Visibility:** Author only (never public)

**Moderation:** None required (no approval queue)

**Rate limits:**
| User Type | Limit |
|-----------|-------|
| Free (Meadow) | Rate limited (see Section 5) |
| Seedling+ | Unlimited |

### 1.2 Comments (Public)

**What it is:** A public comment that appears on the post after author approval.

**Use cases:**
- Adding to the discussion
- Sharing related experiences
- Asking questions for community benefit

**Visibility:** Public (after approval)

**Moderation:** Requires author approval before visible

**Rate limits:**
| User Type | Limit |
|-----------|-------|
| Free (Meadow) | 20 per week |
| Seedling+ | Unlimited |

---

## 2. User Interface

### 2.1 Comment Box UI

```
┌─────────────────────────────────────────────────────────────────┐
│                         Leave a thought                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Write your message...                                  │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Send as:  (●) Reply (private)  (○) Comment (public)            │
│                                                                 │
│  [Submit]                                                       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  💡 Replies are private—only the author sees them.              │
│     Comments are public after the author approves.              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Submission Feedback

**Reply submitted:**
```
✓ Reply sent! Only the author can see this.
```

**Comment submitted:**
```
✓ Comment submitted! It will appear after the author reviews it.
```

### 2.3 Public Comments Display

```
┌─────────────────────────────────────────────────────────────────┐
│ Comments (3)                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Alex · 2 days ago ─────────────────────────────────────┐    │
│  │ This is exactly what I needed to read today. The part   │    │
│  │ about letting go really resonated with me.              │    │
│  │                                                         │    │
│  │ [Reply]                                                 │    │
│  │                                                         │    │
│  │  └─ Author · 1 day ago ────────────────────────────┐    │    │
│  │  │ Thank you, Alex! I'm glad it helped. 💜         │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Jordan · 5 days ago ───────────────────────────────────┐    │
│  │ Have you considered writing more about this topic?      │    │
│  │ I'd love a follow-up post.                              │    │
│  │                                                         │    │
│  │ [Reply]                                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Nesting Depth

- Maximum 2-3 levels of nesting
- Beyond that, replies are flattened with "@username" prefix
- Keeps discussions readable, prevents runaway threads

---

## 3. Author Moderation

### 3.1 Moderation Queue

Blog authors see pending public comments in their admin panel.

```
┌─────────────────────────────────────────────────────────────────┐
│ Comment Moderation                                   [3 pending]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  On: "How I learned to let go"                                  │
│  From: alex@example.com · 2 hours ago                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ This is exactly what I needed to read today. The part    │   │
│  │ about letting go really resonated with me.               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [✓ Approve]  [✗ Reject]  [🚫 Block User]  [⚠️ Flag for Review]  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  On: "How I learned to let go"                                  │
│  From: spammer123@fake.com · 1 hour ago                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Great post! Check out my website for free stuff!!!       │   │
│  │ www.spam-link.com                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [✓ Approve]  [✗ Reject]  [🚫 Block User]  [⚠️ Flag for Review]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Moderation Actions

| Action | Effect |
|--------|--------|
| **Approve** | Comment becomes publicly visible |
| **Reject** | Comment deleted, user not notified |
| **Block User** | User can no longer see or interact with this blog |
| **Flag for Review** | Send to AI content moderation for analysis |

### 3.3 Bulk Actions

- "Approve all" (with confirmation)
- "Reject all from user"
- Filter by: pending, approved, rejected

---

## 4. Blog Author Controls

### 4.1 Per-Blog Settings

```
┌─────────────────────────────────────────────────────────────────┐
│ Comment Settings                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Comments enabled:  [✓] Yes                                     │
│                                                                 │
│  Who can comment:                                               │
│    (○) Anyone (logged in)                                       │
│    (●) Grove members only                                       │
│    (○) Paid Grove members only (Seedling+)                      │
│                                                                 │
│  Public comments:  [✓] Enabled                                  │
│    (When disabled, only private replies are allowed)            │
│                                                                 │
│  Show comment count on posts:  [✓] Yes                          │
│                                                                 │
│  [Save Settings]                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Per-Post Settings

Authors can override blog-wide settings on individual posts:

- Disable comments entirely on specific posts
- Disable public comments (replies only) on sensitive posts
- Close comments after a certain date

### 4.3 Settings Summary

| Setting | Options | Default |
|---------|---------|---------|
| Comments enabled | Yes / No | Yes |
| Who can comment | Anyone / Grove members / Paid only | Anyone |
| Public comments enabled | Yes / No | Yes |
| Show comment count | Yes / No | Yes |

---

## 5. Rate Limiting

### 5.1 Rate Limits by User Type

| User Type | Public Comments | Private Replies |
|-----------|-----------------|-----------------|
| **Free (Meadow)** | 20 per week | 50 per day |
| **Seedling** | Unlimited | Unlimited |
| **Sapling** | Unlimited | Unlimited |
| **Oak** | Unlimited | Unlimited |
| **Evergreen** | Unlimited | Unlimited |

### 5.2 Rate Limit Implementation

```typescript
interface RateLimitConfig {
  publicComments: {
    free: { limit: 20, window: 'week' },
    paid: { limit: null }, // unlimited
  },
  privateReplies: {
    free: { limit: 50, window: 'day' },
    paid: { limit: null }, // unlimited
  },
}
```

### 5.3 Rate Limit UX

When limit approached:
```
⚠️ You have 3 public comments remaining this week.
```

When limit reached:
```
You've reached your weekly comment limit (20).
Upgrade to any paid plan for unlimited comments.
[View Plans →]
```

---

## 6. User Capabilities

### 6.1 Commenter Actions

| Action | Allowed |
|--------|---------|
| Edit own comment | Yes (within 15 minutes of posting) |
| Delete own comment | Yes (anytime) |
| React to comments | No (HN-style, no reactions) |
| Reply to comments | Yes (creates nested thread) |

### 6.2 Edit Window

- Comments can be edited within 15 minutes of posting
- After 15 minutes, edit button disappears
- Edit history is NOT shown (no "edited" label)
- Rationale: Prevents manipulation while allowing typo fixes

### 6.3 Deletion

- Users can delete their own comments anytime
- Deletion is immediate and permanent
- If comment has replies, show "[deleted]" placeholder
- If no replies, remove entirely

---

## 7. Content Moderation Integration

### 7.1 Automated Review

All public comments are reviewed by the content moderation system (see `thorn-spec.md`) before entering the author's approval queue.

**Flow:**
```
User submits comment
        ↓
AI content moderation review
        ↓
    ┌───┴───┐
    ↓       ↓
  PASS    FLAG
    ↓       ↓
 Author   Rejected
  queue   (spam/abuse)
```

### 7.2 Moderation Categories

Comments are checked for:
- Spam / malware links
- Harassment
- Hate speech
- Illegal content

### 7.3 Author Override

If AI incorrectly flags a comment:
- Author can manually approve from "Rejected" tab
- Helps train the system (feedback loop)

---

## 8. Notifications

### 8.1 Author Notifications

| Event | Notification |
|-------|--------------|
| New private reply | Email (if enabled) |
| New comment pending approval | Email (if enabled) + badge in admin |
| Comment approved by you was replied to | Email (if enabled) |

### 8.2 Commenter Notifications

| Event | Notification |
|-------|--------------|
| Your comment was approved | Email (if enabled) |
| Someone replied to your comment | Email (if enabled) |
| Author replied to your reply | Email (if enabled) |

### 8.3 Notification Settings

**For Authors:**
```
□ Email me when I receive a private reply
□ Email me when a comment needs approval
□ Email me when someone replies to an approved comment
```

**For Commenters:**
```
□ Email me when my comment is approved
□ Email me when someone replies to my comment
```

---

## 9. Database Schema

### 9.1 Comments Table

```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL, -- The commenter's user ID
  parent_id TEXT, -- For threaded replies (NULL = top-level)

  -- Content
  content TEXT NOT NULL,
  content_html TEXT, -- Rendered markdown

  -- Type
  is_public INTEGER NOT NULL DEFAULT 1, -- 1 = comment, 0 = reply

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' (awaiting approval)
    -- 'approved' (visible)
    -- 'rejected' (hidden)
    -- 'spam' (auto-flagged)
  moderation_note TEXT, -- Internal note from AI or author
  moderated_at INTEGER,
  moderated_by TEXT, -- 'ai' or user_id

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  edited_at INTEGER, -- NULL if never edited

  -- Indexes
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created ON comments(created_at);
```

### 9.2 Comment Rate Limits Table

```sql
CREATE TABLE comment_rate_limits (
  user_id TEXT NOT NULL,
  limit_type TEXT NOT NULL, -- 'public_comment' or 'private_reply'
  period_start INTEGER NOT NULL, -- Start of current window
  count INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, limit_type),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 9.3 Blocked Users Table

```sql
CREATE TABLE blocked_users (
  blog_id TEXT NOT NULL, -- The blog doing the blocking
  blocked_user_id TEXT NOT NULL, -- The user being blocked
  reason TEXT,
  created_at INTEGER DEFAULT (unixepoch()),

  PRIMARY KEY (blog_id, blocked_user_id)
);
```

### 9.4 Comment Settings Table

```sql
CREATE TABLE comment_settings (
  blog_id TEXT PRIMARY KEY,

  comments_enabled INTEGER DEFAULT 1,
  public_comments_enabled INTEGER DEFAULT 1,
  who_can_comment TEXT DEFAULT 'anyone', -- 'anyone', 'grove_members', 'paid_only'
  show_comment_count INTEGER DEFAULT 1,

  -- Notification preferences (author)
  notify_on_reply INTEGER DEFAULT 1,
  notify_on_pending INTEGER DEFAULT 1,
  notify_on_thread_reply INTEGER DEFAULT 1,

  updated_at INTEGER DEFAULT (unixepoch())
);
```

---

## 10. API Endpoints

### 10.1 Public Endpoints

```typescript
// Submit a comment or reply
POST /api/posts/:postId/comments
Body: {
  content: string;
  is_public: boolean;
  parent_id?: string;
}
Response: { success: boolean; comment_id: string; status: string }

// Get approved comments for a post
GET /api/posts/:postId/comments
Response: { comments: Comment[]; total: number }

// Edit own comment (within 15 min)
PATCH /api/comments/:commentId
Body: { content: string }
Response: { success: boolean }

// Delete own comment
DELETE /api/comments/:commentId
Response: { success: boolean }
```

### 10.2 Author Endpoints (Authenticated)

```typescript
// Get moderation queue
GET /api/admin/comments/pending
Response: { comments: Comment[]; total: number }

// Get all comments (with filters)
GET /api/admin/comments?status=pending|approved|rejected
Response: { comments: Comment[]; total: number }

// Get private replies
GET /api/admin/replies
Response: { replies: Comment[]; total: number }

// Moderate a comment
POST /api/admin/comments/:commentId/moderate
Body: { action: 'approve' | 'reject' | 'block_user' | 'flag' }
Response: { success: boolean }

// Update comment settings
PUT /api/admin/settings/comments
Body: CommentSettings
Response: { success: boolean }
```

---

## 11. Data Export

Comments are included in user data exports (see `data-portability-separation.md`).

**Export format:**
```
grove-export-username-YYYY-MM-DD.zip
├── posts/
├── media/
├── comments/
│   ├── received-replies.json    # Private replies received
│   ├── received-comments.json   # Public comments on your posts
│   └── your-comments.json       # Comments you made on other blogs
└── config/
```

**JSON format:**
```json
{
  "comments": [
    {
      "id": "abc123",
      "post_title": "How I learned to let go",
      "post_url": "https://autumn.grove.place/blog/letting-go",
      "author_name": "Alex",
      "content": "This really resonated with me...",
      "is_public": true,
      "status": "approved",
      "created_at": "2025-12-01T10:30:00Z"
    }
  ]
}
```

---

## 12. Implementation Checklist

- [ ] Create comments database schema
- [ ] Build comment submission form (reply vs comment toggle)
- [ ] Implement rate limiting for free users
- [ ] Build moderation queue UI for authors
- [ ] Implement approve/reject/block actions
- [ ] Integrate with content moderation AI
- [ ] Build nested comment display (2-3 levels)
- [ ] Implement edit window (15 minutes)
- [ ] Implement comment deletion
- [ ] Build notification system (email preferences)
- [ ] Add comment settings to blog settings
- [ ] Add per-post comment controls
- [ ] Include comments in data export
- [ ] Build blocked users management UI
- [ ] Add comment count to post display

---

## 13. Future Considerations

- **Anonymous replies:** Allow non-logged-in users to send private replies (with email verification)
- **Comment highlighting:** Authors can "pin" or highlight exceptional comments
- **Commenter profiles:** Link to commenter's Grove blog if they have one
- **Email replies:** Reply to notification email to respond (parse incoming email)

---

*This specification prioritizes author control and thoughtful engagement over volume. The dual reply/comment system encourages interaction while protecting authors from spam and unwanted public discourse.*
