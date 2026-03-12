---
title: "Trace Developer Guide"
description: "How to embed, configure, and maintain the inline feedback component across Grove."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - trace
  - feedback
  - analytics
  - inline
---

# Trace Developer Guide

How to embed, configure, and maintain Trace, the inline feedback component that lets Wanderers leave quick impressions anywhere in Grove.

## How Trace Works

Trace is a thumbs-up/thumbs-down widget. Drop it at the bottom of a docs page, inside a glass card, after a feature walkthrough. A Wanderer clicks a thumb, optionally types a few words, and the feedback travels to D1 with an email notification to the Wayfinder.

The data flow:

1. Developer adds `<Trace />` to a Svelte component
2. The component reads `$page.url.pathname` and builds a normalized source path (e.g., `/workshop/glass` becomes `workshop-glass`)
3. Wanderer clicks thumbs up or down. If `showComment` is enabled, they can add up to 500 characters
4. The component POSTs to `/api/trace` with `sourcePath`, `vote`, and optional `comment`
5. The endpoint hashes the Wanderer's IP with a daily-rotating salt, rate-checks via Threshold, inserts into `trace_feedback`, and fires an email notification through Zephyr in a `waitUntil` block

Trace is intentionally *not* tenant-scoped. It collects feedback about Grove itself (help articles, landing pages, documentation) rather than tenant content. All traces land in one table, one dashboard.

## How Trace Differs from Feedback and Porch

Grove has three feedback channels:

| System | When to use it | Interaction style |
|--------|---------------|-------------------|
| **Feedback** (`/feedback`) | Anonymous open-ended thoughts | One-way, sentiment-based |
| **Porch** (`/porch`) | Support conversations | Two-way, threaded |
| **Trace** (inline anywhere) | Quick contextual impressions | Thumbs up/down + optional comment |

Trace fills the space where a Wanderer finishes reading something and wants to nod or shake their head without navigating away.

## Adding Trace to a Page

Import from the feedback barrel:

```svelte
<script>
  import { Trace } from "@autumnsgrove/lattice/ui/feedback";
</script>

<!-- Auto-detects path from current route -->
<Trace />
```

The component auto-reads `$page.url.pathname` to identify itself. If you need more specificity (two Trace widgets on the same page, or tracking a subsection), pass an `id` prop that gets appended as a colon-separated suffix:

```svelte
<!-- On /workshop, this becomes "workshop:GlassCard" -->
<Trace id="GlassCard" />

<!-- Thumbs only, no comment field, compact size -->
<Trace showComment={false} size="sm" />

<!-- Custom prompt text -->
<Trace prompt="Did this answer your question?" />
```

### Props

| Prop | Type | Default | What it does |
|------|------|---------|-------------|
| `id` | `string` | `undefined` | Suffix appended to the auto-detected route path |
| `showComment` | `boolean` | `true` | Whether to show the optional comment field after voting |
| `size` | `"sm" \| "md"` | `"md"` | Controls padding, font size, and icon dimensions |
| `prompt` | `string` | `"Was this helpful?"` | The question displayed above the vote buttons |
| `class` | `string` | `undefined` | Additional CSS classes passed to the container |

### Path Builder

The `buildTracePath` utility in `$lib/utils/trace-path.ts` normalizes routes into trace identifiers:

- Leading and trailing slashes stripped
- Internal slashes become dashes
- Empty route (homepage) becomes `"home"`
- Suffix appended with colon separator

| Route | Suffix | Result |
|-------|--------|--------|
| `/workshop` | none | `workshop` |
| `/workshop` | `GlassCard` | `workshop:GlassCard` |
| `/vineyard/charts` | none | `vineyard-charts` |
| `/` | none | `home` |

Validation (`validateTracePath`) enforces: alphanumeric characters, dashes, underscores, colons only. Length between 1 and 200 characters. Cannot start or end with special characters.

## Modifying Trace Behavior

### Changing the rate limit

Both API endpoints cap at 10 submissions per day per IP. The constants are at the top of each `+server.ts`:

```typescript
const TRACE_RATE_LIMIT = 10;
const TRACE_RATE_WINDOW = 86400; // 24 hours in seconds
```

The engine endpoint uses Threshold (the rate-limiting SDK) with `failMode: "open"`, meaning rate-limit infrastructure failures let requests through rather than blocking them.

The landing endpoint uses `checkRateLimit` from `@autumnsgrove/lattice/server` with KV-backed counting.

### Changing the comment length

`MAX_COMMENT_LENGTH` is 500 in both endpoints. The Svelte component also sets `maxlength={500}` on the textarea. If you change the server limit, change the component too.

### Adding new notification channels

Email notifications go through Zephyr (`sendTraceNotification` in `$lib/server/services/trace-email.ts`). The function builds both HTML and plain text versions. The HTML email uses Grove's warm cream/bark color palette with a "View all traces" CTA linking to `/arbor/traces`.

To add a second channel (Slack webhook, push notification), hook into the same `platform.context.waitUntil` block in the endpoint. Keep it non-blocking.

## Why It Breaks

**"Database not configured"**: The endpoint checks `platform?.env?.DB` before anything else. If D1 isn't bound in `wrangler.toml` for the target environment, every submission fails with a 500.

**Silent email failures**: Zephyr notifications are wrapped in `.catch()` inside `waitUntil`. If `ZEPHYR_API_KEY` or `ZEPHYR_URL` is missing, or if the first admin email in `ALLOWED_ADMIN_EMAILS` (engine) / `ADMIN_EMAILS` (landing) is empty, the email silently skips. Traces still save to the database.

**Validation rejects valid-looking paths**: `validateTracePath` is strict. Paths cannot start or end with dashes, colons, or underscores. A path like `-workshop` or `workshop:` fails validation. The regex requires alphanumeric characters at the boundaries.

**Rate limit discrepancies between engine and landing**: The engine uses Threshold with KV-backed `thresholdCheck`. The landing uses `checkRateLimit` from a different adapter. Both key on `trace/submit:{ipHash}`, but they use different KV namespaces (`CACHE_KV` vs `CACHE`). A Wanderer hitting the engine and landing endpoints separately gets separate rate-limit pools.

**IP hash rotation**: The daily salt is `new Date().toISOString().split("T")[0]` in UTC. Near midnight UTC, a Wanderer can submit up to 20 traces in a short window (10 under the old salt, 10 under the new one). This is by design for privacy.

**Comment field doesn't appear**: If `showComment` is `false` or the Wanderer hasn't voted yet, the comment area stays hidden. The comment section only renders when `showComment && vote` is truthy.

## Architecture Notes

### Privacy model

Trace never stores raw IP addresses. The `hashIP` function concatenates the IP with the current UTC date and a static salt (`trace-salt-v1`), then runs SHA-256 and truncates to 32 hex characters. The daily rotation means the same Wanderer produces a different hash each day. No long-term tracking is possible from stored hashes alone.

Traces are not linked to Heartwood accounts. There is no user ID column in the schema.

### Database schema

Migration `037_trace_feedback.sql` creates one table with five indexes:

- `idx_trace_source` on `source_path` for admin filtering by location
- `idx_trace_created` on `created_at DESC` for chronological listing
- `idx_trace_dedup` on `(source_path, ip_hash, created_at)` for dedup checks
- `idx_trace_unread` partial index where `read_at IS NULL` for the admin dashboard
- `idx_trace_active_vote` partial index on `vote` where `archived_at IS NULL` for vote filtering

The `read_at` and `archived_at` columns support admin triage workflows. Both are nullable INTEGER (unix epoch).

### Two API endpoints

Trace has two `POST /api/trace` routes:

- **Engine** (`libs/engine/src/routes/api/trace/+server.ts`): Uses engine-internal imports (`$lib/utils/trace-path`, `$lib/threshold/factory`, `$lib/errors`). Rate limits via Threshold SDK.
- **Landing** (`apps/landing/src/routes/api/trace/+server.ts`): Imports from engine package paths (`@autumnsgrove/lattice/utils`, `@autumnsgrove/lattice/server`, `@autumnsgrove/lattice/services`). Rate limits via `checkRateLimit` helper.

Both write to the same `trace_feedback` table in D1. The landing endpoint exists so Trace widgets on the landing site can submit without CORS. Both share identical insert SQL and `hashIP` logic.

### Component states

The Svelte component (`Trace.svelte`) tracks five state variables: `vote`, `comment`, `showCommentField`, `isSubmitting`, and `hasSubmitted`. The flow:

1. **Default**: Prompt text, two vote buttons
2. **Voted** (when `showComment` is true): Submit button appears alongside "Add a comment" link
3. **Comment expanded**: Textarea with character counter and "Send Feedback" button
4. **Submitting**: Active button shows a spinner, both buttons disabled
5. **Submitted**: Everything replaced with a check icon and "Thanks for your feedback!"

When `showComment` is `false`, clicking a thumb submits immediately with no intermediate step.

## Key Files

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/ui/components/feedback/Trace.svelte` | The Svelte component |
| `libs/engine/src/lib/ui/components/feedback/index.ts` | Barrel export for the component |
| `libs/engine/src/lib/utils/trace-path.ts` | `buildTracePath` and `validateTracePath` |
| `libs/engine/src/routes/api/trace/+server.ts` | Engine API endpoint |
| `apps/landing/src/routes/api/trace/+server.ts` | Landing API endpoint |
| `libs/engine/src/lib/server/services/trace-email.ts` | Zephyr email notification builder |
| `libs/engine/migrations/037_trace_feedback.sql` | D1 migration for the `trace_feedback` table |
| `docs/specs/trace-spec.md` | Full specification |

## Checklist

When adding Trace to a new page:

- [ ] Import `Trace` from `@autumnsgrove/lattice/ui/feedback`
- [ ] Decide if you need a custom `id` (multiple Trace widgets on the same route need distinct suffixes)
- [ ] Verify the target app has `/api/trace` wired up, or the POST will 404
- [ ] Confirm D1 binding exists in the deployment environment

When modifying Trace:

- [ ] Changes to path validation in `trace-path.ts` affect both engine and landing (landing imports from the engine package)
- [ ] Changes to `hashIP` must be mirrored in both endpoint files (the function is duplicated)
- [ ] Changes to the comment max length need updates in both `+server.ts` files and `Trace.svelte`
- [ ] Email template changes go in `trace-email.ts` only (both endpoints import from engine services)
- [ ] Test with `ZEPHYR_API_KEY` unset to confirm traces still save without email
