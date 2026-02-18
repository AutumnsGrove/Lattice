---
title: Trace — Inline Feedback
description: Universal feedback component for gathering Wanderer impressions
category: specs
specCategory: platform-services
icon: footprints
lastUpdated: "2026-01-29"
aliases: []
tags:
  - feedback
  - ui-component
  - lattice
  - wanderer-experience
---

# Trace — Inline Feedback

```
                    🌲         🌲         🌲
                      \    .    /
                       \  /|\  /
                        \/   \/
                   ════════════════════
                         soft earth

                      ·  ·  ·  ·  ·
                     ╭─╮        ╭─╮
                     │◦│   →    │◦│
                     ╰─╯        ╰─╯
                   footprints in the path

                  ·  ·  ·  ·  ·  ·  ·  ·

        A Wanderer passed through. They left a trace.

              "I was here. This is what I noticed."
```

> _Leave a trace._

A small, warm invitation for Wanderers to share their impressions. Not a survey. Not a metric. Just a soft way to say "this helped" or "this didn't," with room to add a few words if you want. Every trace travels back to the Wayfinder.

**Public Name:** Trace
**Internal Name:** GroveTrace
**Location:** Integrated inline component (engine)
**Last Updated:** January 2026

---

## Overview

A trace is what remains when something passes through. In the forest, it's the impression of a hoof in soft earth, the path worn smooth by many feet, the faintest evidence that someone walked this way before. You don't need to see the whole journey to know it happened. The trace is enough.

Trace is Grove's inline feedback component. Drop it anywhere: at the bottom of a documentation page, inside a glass card, after a feature demo. Wanderers see a simple prompt, two buttons, and an optional space to say more.

### The Three Feedback Systems

Grove has three distinct ways for Wanderers to share their voice:

| System       | Purpose                        | Interaction              | Location    |
| ------------ | ------------------------------ | ------------------------ | ----------- |
| **Feedback** | Anonymous thoughts, open-ended | One-way, sentiment-based | `/feedback` |
| **Porch**    | Support conversations          | Two-way, threaded        | `/porch`    |
| **Trace**    | Quick inline impressions       | 👍/👎 + optional comment | Anywhere    |

Trace fills the gap: feedback that's too quick for a form, too contextual for a dedicated page. A Wanderer finishes reading a help article. Was it helpful? They don't want to navigate away. They just want to nod.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Any Grove Page                              │
│                                                                     │
│    ┌───────────────────────────────────────────────────────────┐    │
│    │                    Page Content                           │    │
│    │                                                           │    │
│    │    ...documentation, feature, article...                  │    │
│    │                                                           │    │
│    └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│    ┌───────────────────────────────────────────────────────────┐    │
│    │                    <Trace />                               │    │
│    │  ┌─────────────────────────────────────────────────────┐  │    │
│    │  │  Was this helpful?                                  │  │    │
│    │  │                                                     │  │    │
│    │  │      👍            👎                               │  │    │
│    │  │                                                     │  │    │
│    │  │  [Want to say more? ▼]                             │  │    │
│    │  │                                                     │  │    │
│    │  │            Leave a trace.                           │  │    │
│    │  └─────────────────────────────────────────────────────┘  │    │
│    └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST /api/trace
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Endpoint                                │
│                                                                     │
│   1. Validate input (sourcePath, vote, comment?)                    │
│   2. Hash IP for privacy-preserving deduplication                   │
│   3. Check rate limit (10/day per IP)                              │
│   4. Store to D1                                                    │
│   5. Send email notification to Wayfinder                          │
│   6. Return success                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          ┌─────────────────┐             ┌─────────────────┐
          │       D1        │             │     Resend      │
          │                 │             │                 │
          │  trace_feedback │             │  Email to       │
          │  table          │             │  Wayfinder      │
          └─────────────────┘             └─────────────────┘
```

---

## Component Design

### States

```
┌─────────────────────────────────────────────────────────────────┐
│  DEFAULT STATE                                                  │
│                                                                 │
│  Was this helpful?                                              │
│                                                                 │
│     ╭───────╮        ╭───────╮                                  │
│     │  👍   │        │  👎   │                                  │
│     ╰───────╯        ╰───────╯                                  │
│                                                                 │
│  [Want to say more? ▼]                                         │
│                                                                 │
│                    Leave a trace.                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  EXPANDED STATE (after clicking "Want to say more?")            │
│                                                                 │
│  Was this helpful?                                              │
│                                                                 │
│     ╭───────╮        ╭───────╮                                  │
│     │  👍   │        │  👎   │                                  │
│     ╰───────╯        ╰───────╯                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Share a few words (optional)...                         │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                    Leave a trace.                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SUBMITTED STATE                                                │
│                                                                 │
│                         ✓                                       │
│                                                                 │
│               Thanks for leaving a trace.                       │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ALREADY VOTED STATE (same session, can change)                 │
│                                                                 │
│  You left a trace.                                              │
│                                                                 │
│     ╭───────╮        ╭───────╮                                  │
│     │  👍   │        │  👎   │                                  │
│     │ ───── │        ╰───────╯                                  │
│     ╰───────╯  ← currently selected                             │
│                                                                 │
│  [Change your mind?]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Props Interface

```typescript
interface TraceProps {
  /** Override auto-detected path. Format: "route:suffix" */
  id?: string;

  /** Show optional comment field (default: true) */
  showComment?: boolean;

  /** Component size variant (default: "md") */
  size?: "sm" | "md";

  /** Custom prompt text (default: "Was this helpful?") */
  prompt?: string;

  /** Additional CSS classes */
  class?: string;
}
```

### Usage Examples

```svelte
<!-- Auto-detect from current route -->
<Trace />
<!-- Path: "workshop" if on /workshop -->

<!-- Explicit identifier for specificity -->
<Trace id="workshop:GlassCard" />
<!-- Path: "workshop:GlassCard" -->

<!-- Minimal version (just thumbs, no comment) -->
<Trace id="vineyard:Charts" showComment={false} size="sm" />

<!-- Custom prompt -->
<Trace prompt="Did this answer your question?" />
```

---

## Path Builder

Trace auto-identifies its location using a hybrid approach:

### Auto-Detection

When no `id` prop is provided, Trace reads `$page.url.pathname` and normalizes it:

```typescript
function buildTracePath(route: string, suffix?: string): string {
  // Clean the route
  let path = route
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+$/, "") // Remove trailing slashes
    .replace(/\//g, "-"); // Replace internal slashes with hyphens

  // Handle empty route (homepage)
  if (!path) path = "home";

  // Add suffix if provided
  if (suffix) {
    path = `${path}:${suffix}`;
  }

  return path;
}
```

### Path Examples

| Route                         | Suffix      | Result                       |
| ----------------------------- | ----------- | ---------------------------- |
| `/workshop`                   | —           | `workshop`                   |
| `/workshop`                   | `GlassCard` | `workshop:GlassCard`         |
| `/vineyard/charts`            | —           | `vineyard-charts`            |
| `/admin/feedback`             | —           | `admin-feedback`             |
| `/`                           | —           | `home`                       |
| `/knowledge/specs/trace-spec` | —           | `knowledge-specs-trace-spec` |

---

## Database Schema

```sql
-- Migration: XXXX_trace_feedback.sql

CREATE TABLE trace_feedback (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  comment TEXT,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch()),

  -- For admin filtering
  read_at INTEGER,
  archived_at INTEGER
);

-- Fast lookup by source (where is feedback coming from?)
CREATE INDEX idx_trace_source ON trace_feedback(source_path);

-- Chronological listing
CREATE INDEX idx_trace_created ON trace_feedback(created_at DESC);

-- Deduplication check (one vote per IP per source per day)
CREATE INDEX idx_trace_dedup ON trace_feedback(source_path, ip_hash, created_at);
```

### Privacy Considerations

- **IP addresses are hashed**: We store `sha256(ip + daily_salt)`, not raw IPs
- **Daily salt rotation**: Salt changes daily, so the same IP produces different hashes across days
- **No user tracking**: We don't link traces to Heartwood accounts
- **Minimal data**: Just the vote, optional comment, and metadata for deduplication

---

## API Endpoint

### POST /api/trace

```typescript
// Request
interface TraceRequest {
  sourcePath: string; // e.g., "workshop:GlassCard"
  vote: "up" | "down";
  comment?: string; // Max 500 characters
}

// Response (success)
interface TraceResponse {
  success: true;
  id: string;
}

// Response (error)
interface TraceErrorResponse {
  success: false;
  error: string;
  code: "RATE_LIMITED" | "INVALID_VOTE" | "COMMENT_TOO_LONG" | "SERVER_ERROR";
}
```

### Implementation

```typescript
// routes/api/trace/+server.ts

export const POST: RequestHandler = async ({
  request,
  platform,
  getClientAddress,
}) => {
  const { sourcePath, vote, comment } = await request.json();

  // 1. Validate
  if (!["up", "down"].includes(vote)) {
    return json(
      { success: false, error: "Invalid vote", code: "INVALID_VOTE" },
      { status: 400 },
    );
  }

  if (comment && comment.length > 500) {
    return json(
      { success: false, error: "Comment too long", code: "COMMENT_TOO_LONG" },
      { status: 400 },
    );
  }

  // 2. Hash IP for privacy
  const ip = getClientAddress();
  const dailySalt = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const ipHash = await hashIP(ip, dailySalt);

  // 3. Check rate limit (10/day per IP)
  const todayStart =
    Math.floor(Date.now() / 1000) - ((Date.now() / 1000) % 86400);
  const countToday = await platform.env.DB.prepare(
    `
    SELECT COUNT(*) as count FROM trace_feedback
    WHERE ip_hash = ? AND created_at >= ?
  `,
  )
    .bind(ipHash, todayStart)
    .first<{ count: number }>();

  if (countToday && countToday.count >= 10) {
    return json(
      { success: false, error: "Rate limited", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  // 4. Insert
  const id = crypto.randomUUID();
  await platform.env.DB.prepare(
    `
    INSERT INTO trace_feedback (id, source_path, vote, comment, ip_hash, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  )
    .bind(
      id,
      sourcePath,
      vote,
      comment || null,
      ipHash,
      request.headers.get("user-agent"),
    )
    .run();

  // 5. Send email notification
  await sendTraceNotification(platform.env.RESEND_API_KEY, {
    sourcePath,
    vote,
    comment,
  });

  return json({ success: true, id });
};
```

---

## Email Notification

When a trace is left, the Wayfinder receives an email:

```
┌─────────────────────────────────────────────────────────────────┐
│  From: trace@grove.place                                        │
│  To: autumn@grove.place                                         │
│  Subject: [Trace] 👍 workshop:GlassCard                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  A Wanderer left a trace.                                       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Location: workshop:GlassCard                                   │
│  Vote: 👍 Helpful                                               │
│  Comment: "This example really cleared things up!"              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  View all traces: https://grove.place/admin/traces              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

For negative feedback, the subject uses 👎 and the body says "Didn't help" instead of "Helpful."

---

## Admin View

A simple admin page to see incoming traces:

```
┌─────────────────────────────────────────────────────────────────┐
│  Traces                                         [ All ▼ ] [ ↻ ] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stats:  47 total  ·  38 👍  ·  9 👎  ·  12 with comments       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  👎  workshop:GlassCard                              2 min ago  │
│      "The code example doesn't work in Firefox"                 │
│      [ Mark read ]                                              │
│                                                                 │
│  👍  vineyard:Charts                                 15 min ago │
│      (no comment)                                               │
│      [ Mark read ]                                              │
│                                                                 │
│  👍  knowledge-specs-trace-spec                      1 hour ago │
│      "Meta! I'm leaving feedback on the feedback system."       │
│      [ Mark read ]                                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  By location:                                                   │
│  ├── workshop              12 traces (10 👍, 2 👎)              │
│  ├── workshop:GlassCard     8 traces (6 👍, 2 👎)               │
│  ├── vineyard-charts        5 traces (5 👍, 0 👎)               │
│  └── knowledge-*           22 traces (17 👍, 5 👎)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Styling

Trace uses Grove's glassmorphism design language:

```css
.trace-container {
  /* Glass effect */
  @apply bg-grove-glass/30 backdrop-blur-sm;
  @apply border border-grove-glass-border;
  @apply rounded-xl p-4;

  /* Subtle presence */
  @apply text-center;
}

.trace-button {
  /* Soft, inviting buttons */
  @apply px-6 py-3 rounded-lg;
  @apply bg-grove-glass/50 hover:bg-grove-glass/70;
  @apply border border-grove-glass-border;
  @apply transition-all duration-200;
  @apply text-2xl; /* For emoji */
}

.trace-button:hover {
  @apply scale-105;
}

.trace-button.selected {
  @apply bg-grove-accent/20 border-grove-accent;
}

.trace-tagline {
  @apply text-sm text-foreground-muted italic mt-3;
}
```

---

## Accessibility

- **Keyboard navigation**: Tab between buttons, Enter/Space to select
- **ARIA labels**: "Vote helpful" / "Vote not helpful" on buttons
- **Focus indicators**: Visible focus rings on all interactive elements
- **Screen reader**: Announces vote state and submission confirmation
- **Reduced motion**: Respects `prefers-reduced-motion`, disables scale animation

---

## Implementation Checklist

### Phase 1: Core Component

- [ ] Create `packages/engine/src/lib/ui/feedback/Trace.svelte`
- [ ] Implement path builder utility in `packages/engine/src/lib/utils/trace-path.ts`
- [ ] Add glassmorphism styling
- [ ] Handle all states (default, expanded, submitted, already voted)
- [ ] Export from `@autumnsgrove/lattice/ui/feedback`

### Phase 2: Backend

- [ ] Create D1 migration for `trace_feedback` table
- [ ] Implement `POST /api/trace` endpoint
- [ ] Add IP hashing for privacy
- [ ] Add rate limiting (10/day per IP)
- [ ] Integrate Resend for email notifications

### Phase 3: Admin

- [ ] Create `/admin/traces` page
- [ ] Show traces by location with stats
- [ ] Add mark-read functionality
- [ ] Add filtering by vote type

### Phase 4: Polish

- [ ] Add to Workshop for demo
- [ ] Write help article for usage
- [ ] Add Trace to bottom of key documentation pages
- [ ] Monitor feedback patterns

---

## Related Specifications

- [Feedback System](/feedback) — Anonymous thoughts page
- [Porch](/porch) — Support conversations
- [Lattice](./lattice-spec.md) — Core UI component library

---

_The path becomes clear by walking it. Leave your trace._
