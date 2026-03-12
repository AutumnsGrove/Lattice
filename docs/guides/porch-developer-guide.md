---
title: "Porch Developer Guide"
description: "How to build, extend, and debug Porch, Grove's warm support conversation system."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - porch
  - support
  - conversations
  - contact
---

# Porch Developer Guide

How to work with Porch, Grove's support conversation system. Porch lives inside the landing app as a set of public and admin routes, backed by D1 and Resend email.

## How Porch Works

Porch is a conversation system where Wanderers can start "visits" (support threads). A visit has a subject, a category, and a thread of messages between the Wanderer and Autumn. The whole thing runs on SvelteKit form actions, D1 for persistence, and Resend for email notifications.

The data flow for a new visit:

1. Wanderer fills out the form at `/porch/new` with category, subject, name, email, and message
2. The server action validates input with Zod, verifies Turnstile (guests only), and checks rate limits via KV
3. A visit row is created in `porch_visits`, and the opening message goes into `porch_messages`
4. Two emails fire through Resend: a notification to Autumn and a confirmation to the Wanderer
5. Autumn sees the visit in Arbor at `/arbor/porch/{id}`, replies there, and the reply gets emailed to the Wanderer

Authenticated Wanderers get extra capabilities. The form pre-fills their name and email from `locals.user`, Turnstile verification is skipped, and they can view their visit history at `/porch/visits`. Guest Wanderers provide an email manually, pass Turnstile, and receive everything by email only.

### Visit Lifecycle

Visits move through three statuses:

- **open**: Active conversation. This is the default when a visit is created, and it's restored whenever the Wanderer sends a new reply.
- **pending**: Autumn has replied and is waiting for the Wanderer's response. Set automatically when Autumn replies from Arbor.
- **resolved**: Conversation is done. Set by Autumn through the admin status control. Resolved visits block new replies from the Wanderer.

### Visit Numbering

Visit numbers follow the format `PORCH-{YEAR}-{SEQUENCE}`, padded to five digits. The sequence comes from a two-tier strategy:

1. **KV (preferred)**: Reads the current sequence from `porch:visit_sequence:{year}`, increments it, and writes back. This is fast and globally distributed, though not strictly atomic. For support ticket numbers, that's fine.
2. **D1 fallback**: If KV is unavailable (local dev, KV errors), it counts existing visits for the year with a `SELECT COUNT(*)` query and adds one.

The sequence resets each calendar year. See `generateVisitNumber()` in `apps/landing/src/routes/porch/new/+page.server.ts`.

### Categories

Five categories, validated with a const array and a CHECK constraint in the schema:

| Category | Label | Description |
|----------|-------|-------------|
| `billing` | Billing | Payments, subscriptions, refunds |
| `technical` | Technical | Something isn't working |
| `account` | Account | Login, settings, data |
| `hello` | Just saying hi | No issue, chatting |
| `other` | Other | Anything else |

## Adding or Modifying Porch

### Adding a new visit category

Three places need updating:

1. **Migration/schema**: Add the value to the CHECK constraint on `porch_visits.category`. Write a new migration since `0005_porch.sql` uses `CHECK(category IN (...))`.
2. **Server validation**: Add the category string to `VALID_CATEGORIES` in `apps/landing/src/routes/porch/new/+page.server.ts`.
3. **UI**: Add the category object (with `id`, `label`, `icon`, `description`) to the `categories` array in `apps/landing/src/routes/porch/new/+page.svelte`. Also update the `categoryLabels` records in `visits/+page.svelte`, `visits/[id]/+page.svelte`, `arbor/porch/+page.svelte`, and `arbor/porch/[id]/+page.svelte`. There are four separate copies of this record.

### Adding a new message sender type

The schema constrains `sender_type` to `'visitor'` or `'autumn'`. If you need a third type (for example, a system message), update the CHECK constraint in a new migration, then adjust the role mappings in `apps/landing/src/lib/utils/porch.ts` where `PORCH_VISITOR_ROLES` and `PORCH_ADMIN_ROLES` are defined.

### Customizing the chat UI

The visit detail view (`/porch/visits/[id]`) uses `GlassChat` with a `createConversationalChatController`. The admin view (`/arbor/porch/[id]`) uses `GlassChat` with `createChatController` in read-only mode (the `hideInput` prop). Both consume the same `toChatMessages()` transform from `$lib/utils/porch`.

The role maps control alignment and styling. `PORCH_VISITOR_ROLES` puts Autumn's messages on the left and the Wanderer's on the right. `PORCH_ADMIN_ROLES` flips this so Autumn's messages appear on the right (since Autumn is the local participant in the admin view).

### Changing email templates

Two kinds of emails are sent inline (not through the React Email template system):

- **Notification to Autumn**: Built as raw HTML/text strings in the `submit` action at `/porch/new/+page.server.ts`. Includes visit details and a link to the Arbor admin view.
- **Confirmation to Wanderer**: Also built inline in the same `submit` action. Shows the visit number and echoes back the message.
- **Admin reply to Wanderer**: Built inline in the `reply` action at `/arbor/porch/[id]/+page.server.ts`. Contains the reply text and a link to view the conversation.

There is also a React Email template at `libs/engine/src/lib/email/porch/PorchReplyEmail.tsx`, which provides a more polished reply notification. It exports `PorchReplyEmail` and `PorchReplyEmailProps` from the barrel at `libs/engine/src/lib/email/porch/index.ts`. The inline email approach in the route handlers and the React Email template coexist. The inline versions are what currently runs in production.

### Email addresses

Email configuration lives in `libs/engine/src/lib/config/emails.ts` under `GROVE_EMAILS.porch`:

- `address`: `porch@grove.place`
- `fromSystem`: `"The Porch at Grove <porch@grove.place>"` (used for notification emails to Autumn)
- `fromAutumn`: `"Autumn at Grove <porch@grove.place>"` (used for confirmation and reply emails to Wanderers)

## Why Porch Breaks

### Visits fail to save

If `platform.env.DB` is undefined, the submit action returns a 500 immediately. This happens when the D1 binding is missing from `wrangler.toml` or when running locally without the D1 local database configured. The error message is "Database not available."

### Visit numbers collide or gap

The KV-based sequence isn't truly atomic. Under high concurrency, two requests could read the same sequence value and both write the same incremented number. The `visit_number` column has a `UNIQUE` constraint, so one insert would fail. This is an acceptable tradeoff for a low-volume support system. If it becomes a problem, switch to a D1-based sequence with a dedicated counter table and a transaction.

Gaps in numbering are normal. The D1 fallback counts existing rows, so deleted visits shift the count. KV failures cause a fallback to D1 mid-stream, which may produce a different number than KV would have.

### Emails don't send

Email dispatch is fire-and-forget. If `RESEND_API_KEY` is missing from `platform.env`, the email block is skipped silently. If Resend returns an error, it's logged to `console.error` but the visit is still saved. The Wanderer sees a success message even if no email went out.

Check `RESEND_API_KEY` in the environment bindings. For local development, you need this in your `.dev.vars` file.

### Guest rate limiting fails open

Rate limiting for guests uses the `CACHE` KV namespace. If `platform.env.CACHE` is undefined, the rate limit check is skipped entirely (the `try/catch` around the KV operations catches the error and continues). This means guests can submit unlimited visits when KV is unavailable.

### Admin can't see visits

The admin routes check `parentData.isWayfinder` from the parent layout. If the parent layout's `isWayfinder` flag is false (or the layout auth check redirects first), the admin gets bounced to `/arbor`. The `isWayfinder` check uses `isWayfinder(locals.user.email)` from `@autumnsgrove/lattice/config`.

### Wanderer can't see their visit history

The visits list page at `/porch/visits` returns an empty array if `locals.user` is null. The UI shows a sign-in prompt. If the Wanderer started their visit as a guest (before signing in), their visit is stored with `user_id = null` and won't appear in their history even after authentication, because the query filters on `user_id = ?`.

### Resolved visit blocks replies

When Autumn marks a visit as `resolved`, the Wanderer's detail view disables the chat input and shows a message linking to `/porch/new`. The server action also rejects replies to resolved visits with a 400 error. To reopen, Autumn changes the status back to `open` through the admin status dropdown.

## Architecture Notes

### Why Porch lives in the landing app

Porch is part of the `apps/landing` SvelteKit app rather than a standalone worker or separate app. The spec describes a future `porch.grove.place` domain, but the current implementation uses `/porch/*` routes within the landing app. This keeps things simple: shared auth via `locals.user`, shared layout components (Header, Footer), and no cross-origin concerns.

### The admin lives in Arbor

Admin routes sit under `/arbor/porch/` and inherit the Arbor layout's auth. Arbor is the admin dashboard for Grove. The parent layout provides `isWayfinder` (admin role check), so individual porch admin routes only need to verify that flag rather than implementing their own auth.

### Chat rendering with GlassChat

Both the Wanderer's visit detail view and the admin view use the `GlassChat` component from `@autumnsgrove/lattice/ui`. The key difference:

- **Wanderer view** uses `createConversationalChatController`, which provides an `onSend` callback that posts a form action via `fetch` and calls `invalidateAll()` to refresh messages from the server.
- **Admin view** uses `createChatController` (read-only) with `hideInput` on GlassChat. Admin replies go through a separate HTML form below the chat, not through the GlassChat input.

Both views sync server messages into the controller via `$effect(() => { chat.messages = toChatMessages(data.messages); })`.

### No attachments yet

The spec describes file attachments stored in R2, but the current implementation doesn't include attachment support. The form has no file input, the message schema has no `attachments` column, and there's no R2 upload endpoint. This is planned for a later iteration.

### No inbound email processing

The spec describes inbound email processing via Resend webhooks so Wanderers can reply by email. This isn't implemented. Replies only work through the web UI at `/porch/visits/[id]` (for authenticated Wanderers) or by starting a new visit.

### Phase 2 (Ivy integration) is unbuilt

The spec outlines a future phase where Wanderers with Ivy email accounts can receive porch updates in their `@grove.place` inbox. None of this exists in code. The `porch_visits` table has no `ivy_thread_id` or `notification_channel` columns.

## Key Files

| File | What it does |
|------|-------------|
| `apps/landing/src/routes/porch/+page.svelte` | Landing page with "Start a Visit" CTA and visit history link |
| `apps/landing/src/routes/porch/+page.server.ts` | Passes `locals.user` to the landing page |
| `apps/landing/src/routes/porch/new/+page.svelte` | Visit submission form with category picker, Turnstile, and validation |
| `apps/landing/src/routes/porch/new/+page.server.ts` | Core logic: validation, rate limiting, visit creation, email dispatch |
| `apps/landing/src/routes/porch/visits/+page.server.ts` | Loads authenticated Wanderer's visit history (last 50, newest first) |
| `apps/landing/src/routes/porch/visits/+page.svelte` | Visit list with status badges and date formatting |
| `apps/landing/src/routes/porch/visits/[id]/+page.server.ts` | Loads a single visit with messages, handles Wanderer replies |
| `apps/landing/src/routes/porch/visits/[id]/+page.svelte` | Chat-style visit detail view using GlassChat |
| `apps/landing/src/routes/arbor/porch/+page.server.ts` | Admin visit list with message counts and status stats |
| `apps/landing/src/routes/arbor/porch/+page.svelte` | Admin dashboard with search, status filter, and visit cards |
| `apps/landing/src/routes/arbor/porch/[id]/+page.server.ts` | Admin visit detail: reply, status update, notes (three form actions) |
| `apps/landing/src/routes/arbor/porch/[id]/+page.svelte` | Admin view with chat display, reply form, status control, and internal notes |
| `apps/landing/src/lib/utils/porch.ts` | `toChatMessages()` transform and role maps for GlassChat |
| `apps/landing/migrations/0005_porch.sql` | D1 schema: `porch_visits`, `porch_messages`, and indexes |
| `libs/engine/src/lib/email/porch/PorchReplyEmail.tsx` | React Email template for reply notifications |
| `libs/engine/src/lib/email/porch/index.ts` | Barrel export for porch email templates |
| `libs/engine/src/lib/config/emails.ts` | `GROVE_EMAILS.porch` address configuration |

## Quick Checklist

Working on Porch? Run through this:

- [ ] D1 binding (`DB`) is configured in `wrangler.toml` and available in local dev
- [ ] `RESEND_API_KEY` is set in `.dev.vars` (or production secrets) for email delivery
- [ ] `CACHE` KV namespace is bound for guest rate limiting
- [ ] `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set for guest bot protection
- [ ] Any new category is added to the schema CHECK constraint, `VALID_CATEGORIES`, the form's `categories` array, and all four `categoryLabels` records
- [ ] New sender types update the schema CHECK constraint and both role maps in `$lib/utils/porch.ts`
- [ ] Email changes are tested with both the Autumn notification and Wanderer confirmation paths
- [ ] Admin routes are tested with a Wayfinder-authorized account
- [ ] Resolved visits correctly block replies in both the UI and server action
