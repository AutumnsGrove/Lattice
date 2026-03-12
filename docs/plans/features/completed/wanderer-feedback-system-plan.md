# Implementation Plan: Wanderer Feedback System

## Overview

Build a warm, personal feedback system where Wanderers can share thoughts via:

- **Web form** at `grove.place/feedback`
- **Email** to `feedback@grove.place`

Both channels save to D1 and forward to `autumn@grove.place`. Admin view in landing site provides centralized inbox.

---

## Architecture Summary

**Database:** Global `feedback` table in landing D1 (not tenant-scoped - feedback is about Grove itself)

**Web Form Flow:**

```
User submits → Validate + rate limit → Save to D1 → Forward email → Success message
```

**Email Flow:**

```
feedback@grove.place → Cloudflare Email Routing → Webhook → Save to D1 → Forward email
```

**Admin View:** Landing site admin (`grove.place/admin/feedback`) - follows existing subscribers pattern

---

## Key Design Decisions

1. **Global, not tenant-scoped** - Feedback is about Grove platform, not individual blogs
2. **Landing package** - Has existing admin panel (subscribers, CDN), migrations, email sending
3. **IP rate limiting** - 5 submissions/day prevents spam while allowing anonymous feedback
4. **Cloudflare Email Routing** - Webhook handler for inbound email (simplest approach)
5. **Warm UX** - "Share your thoughts" not "Submit ticket #1234"

---

## Database Schema

**Migration:** `apps/landing/migrations/0004_feedback.sql`

```sql
CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK(source IN ('web', 'email')),

    -- Sender info (all optional for anonymous submissions)
    name TEXT,
    email TEXT,

    -- Content
    subject TEXT,
    message TEXT NOT NULL,
    sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral', NULL)),

    -- Metadata for rate limiting and debugging
    ip_address TEXT,
    user_agent TEXT,

    -- Admin status tracking
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'archived')),
    read_at INTEGER,
    archived_at INTEGER,
    admin_notes TEXT,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_feedback_status ON feedback(status, created_at DESC);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX idx_feedback_source ON feedback(source);
CREATE INDEX idx_feedback_ip ON feedback(ip_address, created_at);
```

**Key features:**

- UUID primary key (better for distributed inserts)
- All sender fields optional (anonymous welcome)
- Unix timestamps (consistent with Grove patterns)
- Indexes for admin view filtering and rate limiting

---

## Implementation Files

### 1. Web Form

**Route:** `apps/landing/src/routes/feedback/+page.svelte`

**UX Requirements:**

- Warm, personal tone ("Share your thoughts" not "Submit feedback")
- Optional name/email (anonymous welcome)
- Optional sentiment selector: 😊 Positive | 😐 Neutral | 😟 Concern
- Required message field (10-2000 chars)
- Turnstile bot verification
- Success message: "Thank you for sharing! I read everything personally. —Autumn"

**Components to use:**

- `GlassCard` wrapper
- Turnstile component (already in landing)
- Form with `use:enhance` for progressive enhancement

---

**Server:** `apps/landing/src/routes/feedback/+page.server.ts`

**Key logic:**

```typescript
export const actions: Actions = {
	submit: async ({ request, platform, getClientAddress }) => {
		// 1. Verify Turnstile token
		// 2. Validate message (10-2000 chars)
		// 3. Rate limit check: 5/day per IP via KV (key: `feedback:ip:{ip}`)
		// 4. Insert to D1 with source='web'
		// 5. Forward to autumn@grove.place via Resend
		// 6. Return success
	},
};
```

**Rate limiting:**

- Key pattern: `feedback:ip:{ip_address}`
- Limit: 5 submissions per 24 hours
- Storage: KV (CACHE binding)
- Use existing `rateLimit()` helper if available, or implement simple counter

**Email forwarding format:**

```
Subject: Grove Feedback: {subject || "New feedback"}

From: {name || "Anonymous Wanderer"}
Email: {email || "No reply email provided"}
Sentiment: {emoji} {label}

---

{message}

---
View in Arbor: https://grove.place/admin/feedback/{id}
Feedback ID: {id}
```

---

### 2. Email Webhook

**Route:** `apps/landing/src/routes/api/webhooks/email-feedback/+server.ts`

**Cloudflare Email Routing setup (manual in dashboard):**

1. Email Routing → Add Email Worker destination
2. Add routing rule: `feedback@grove.place` → Email Worker
3. Point worker to webhook: `https://grove.place/api/webhooks/email-feedback`

**Webhook handler logic:**

```typescript
export const POST: RequestHandler = async ({ request, platform }) => {
	// 1. Parse Cloudflare Email Worker payload
	// 2. Extract: from (name + email), subject, text/html body
	// 3. Insert to D1 with source='email'
	// 4. Forward to autumn@grove.place via Resend
	// 5. Return json({ received: true, id })
};
```

**Email parsing:**

- Parse `from` field: "Name <email@example.com>" → extract name and email
- Use plain text body if available, fallback to HTML
- Store original subject

**Cloudflare payload format:** https://developers.cloudflare.com/email-routing/email-workers/

---

### 3. Admin View

**Route:** `apps/landing/src/routes/admin/feedback/+page.svelte`

**Reference pattern:** `apps/landing/src/routes/admin/subscribers/+page.svelte`

**Features:**

- GlassCard table layout
- Filters: Status (all/new/read/archived), Source (all/web/email), Sentiment
- Search: name, email, message content
- Table columns: Source icon, Sentiment emoji, Name, Subject preview, Message preview (100 chars), Timestamp (relative), Status badge
- Click row → expand detail view inline
- Actions: Mark as read, Archive, Save admin notes

**Detail view (expanded):**

```
From: {name} ({email})
Source: {web/email}
Subject: {subject}
Sentiment: {emoji} {label}
Submitted: {full timestamp}

{full message}

Admin Notes:
[Textarea]

[Mark as Read] [Archive] [Save Notes]
```

---

**Server:** `apps/landing/src/routes/admin/feedback/+page.server.ts`

**Load function:**

```typescript
export const load: PageServerLoad = async ({ locals, platform, url }) => {
	// Auth check: locals.user required
	// Build filtered query based on URL params (status, source, sentiment, search)
	// Run parallel queries: feedback list + stats
	// Return { feedback, stats, filters }
};
```

**Form actions:**

- `markRead` - Update status to 'read', set read_at timestamp
- `archive` - Update status to 'archived', set archived_at timestamp
- `saveNotes` - Update admin_notes field

**Stats query:**

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
  SUM(CASE WHEN source = 'web' THEN 1 ELSE 0 END) as web_count,
  SUM(CASE WHEN source = 'email' THEN 1 ELSE 0 END) as email_count
FROM feedback
```

---

### 4. Helper Function (Optional)

**File:** `apps/landing/src/lib/server/feedback.ts`

Create shared helper for sending feedback notification emails to reduce duplication between web form and email webhook:

```typescript
export async function forwardFeedback(params: {
	id: string;
	source: "web" | "email";
	name: string | null;
	email: string | null;
	subject: string | null;
	message: string;
	sentiment: string | null;
	resendApiKey: string;
}): Promise<void>;
```

---

## Email Sending Pattern

**Reference:** `apps/landing/src/lib/email/send.ts`

**Pattern to follow:**

```typescript
import { Resend } from "resend";

const resend = new Resend(apiKey);
await resend.emails.send({
	from: "Grove <hello@grove.place>",
	to: "autumn@grove.place",
	subject: "...",
	text: "...",
	html: "...",
});
```

**Environment variable:** `RESEND_API_KEY` (already configured in `apps/landing/wrangler.toml`)

---

## File Structure

```
apps/landing/
├── migrations/
│   └── 0004_feedback.sql                          # NEW
├── src/
│   ├── routes/
│   │   ├── feedback/
│   │   │   ├── +page.svelte                       # NEW - Web form
│   │   │   └── +page.server.ts                    # NEW - Form action
│   │   ├── admin/
│   │   │   ├── feedback/
│   │   │   │   ├── +page.svelte                   # NEW - Admin view
│   │   │   │   └── +page.server.ts                # NEW - Admin load/actions
│   │   │   └── +page.svelte                       # MODIFY - Add feedback link
│   │   └── api/
│   │       └── webhooks/
│   │           └── email-feedback/
│   │               └── +server.ts                  # NEW - Email webhook
│   └── lib/
│       └── server/
│           └── feedback.ts                         # NEW (optional) - Shared helper
└── wrangler.toml                                   # EXISTS - Has RESEND_API_KEY
```

**Files to create:** 6-7 new files
**Files to modify:** 1 file (admin landing page to add feedback nav link)

---

## Implementation Sequence

### Step 1: Database Setup

1. Create `apps/landing/migrations/0004_feedback.sql`
2. Run migration locally: `wrangler d1 execute grove-engine-db --local --file=apps/landing/migrations/0004_feedback.sql`
3. Verify: `wrangler d1 execute grove-engine-db --local --command="SELECT * FROM feedback LIMIT 1"`

### Step 2: Web Form (Core Feature)

1. Create `feedback/+page.svelte` - Warm UX with GlassCard
2. Create `feedback/+page.server.ts` - Form action with validation
3. Implement rate limiting (IP-based, 5/day)
4. Add Turnstile verification
5. Add email forwarding to `autumn@grove.place`
6. Test locally: Submit form → Check D1 → Check console for email send

### Step 3: Admin View

1. Create `admin/feedback/+page.svelte` - Table layout like subscribers
2. Create `admin/feedback/+page.server.ts` - Load function with filters
3. Add form actions: markRead, archive, saveNotes
4. Test with sample data inserted directly into D1

### Step 4: Email Webhook (Requires Cloudflare config)

1. Create `api/webhooks/email-feedback/+server.ts`
2. Test locally with mock payload
3. **Production only:** Configure Cloudflare Email Routing dashboard
   - Add Email Worker destination
   - Route `feedback@grove.place` → webhook URL
4. Test with real email sent to `feedback@grove.place`

### Step 5: Polish

1. Add "Feedback" link to admin navigation in `admin/+page.svelte`
2. Test full flows end-to-end
3. Deploy to production
4. Run migration on production D1

---

## Testing Strategy

### Manual Testing (Critical Path)

**Web form flow:**

1. Visit `grove.place/feedback`
2. Submit with all fields filled → Check D1 + forwarded email
3. Submit anonymous (no name/email) → Verify works
4. Submit 6 times rapidly → Verify rate limit blocks 6th
5. Submit with invalid Turnstile → Verify blocked
6. Check admin view shows submission

**Email flow:**

1. Send email to `feedback@grove.place`
2. Check webhook logs (Cloudflare dashboard)
3. Check D1 for saved entry with source='email'
4. Check forwarded email arrives at `autumn@grove.place`
5. Check admin view shows email submission

**Admin view:**

1. Filter by status (new/read/archived)
2. Filter by source (web/email)
3. Search by message content
4. Mark as read → Verify status updated
5. Archive → Verify status updated
6. Add admin notes → Verify saved

---

## Security Checklist

- [x] CSRF protection (SvelteKit built-in)
- [x] Turnstile bot verification on web form
- [x] Rate limiting (5/day per IP)
- [x] Input validation (message length 10-2000 chars)
- [x] No HTML storage (plain text only)
- [x] Admin auth check (`locals.user` required)
- [x] Cloudflare Email Routing spam filtering (built-in)
- [ ] TODO: Verify webhook signature if Cloudflare provides one

---

## Deployment Checklist

### Pre-deployment

- [ ] Migration file created
- [ ] All routes tested locally
- [ ] Rate limiting tested (6 submissions)
- [ ] Turnstile working

### Deployment

- [ ] Deploy landing site to Cloudflare Pages
- [ ] Run migration on production D1: `wrangler d1 execute grove-engine-db --file=apps/landing/migrations/0004_feedback.sql`
- [ ] Configure Cloudflare Email Routing (manual in dashboard)
- [ ] Verify RESEND_API_KEY in production env

### Post-deployment

- [ ] Test web form on production
- [ ] Send test email to `feedback@grove.place`
- [ ] Verify forwarded emails arrive
- [ ] Check admin view accessible and functional

---

## Critical Files Reference

**Existing patterns to follow:**

1. **Email sending:** `apps/landing/src/lib/email/send.ts`
   - Shows Resend integration pattern

2. **Admin table view:** `apps/landing/src/routes/admin/subscribers/+page.svelte`
   - GlassCard + table layout
   - Export functionality
   - Status management

3. **Admin auth:** `libs/engine/src/routes/admin/+layout.server.ts`
   - `locals.user` check pattern
   - Redirect to login if not authenticated

4. **Form actions:** `libs/engine/src/routes/admin/reserved-usernames/+page.server.ts`
   - SvelteKit form actions with validation
   - Success/error handling

5. **Webhook handler:** `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts`
   - POST handler pattern
   - JSON payload parsing
   - Database insert

---

## UX Copy Reference

**Form page title:** "Share Your Thoughts"

**Intro paragraph:**

> "Grove is built for you. Whether it's a bug, an idea, or just a hello—your voice matters here. I read everything personally."

**Submit button:** "Send your thoughts"

**Success message:**

> "Thank you for sharing your thoughts! Your feedback means a lot. I read everything personally. —Autumn"

**Rate limit error:**

> "You've reached the daily feedback limit. Please try again tomorrow, or email feedback@grove.place directly."

---

## Future Enhancements (Out of Scope)

- Reply from admin panel
- Auto-categorization with AI
- Public feedback board
- Slack notifications for new feedback
- Email threading for multi-message conversations
- Export to CSV

---

**Estimated implementation time:** 3-4 hours

**Complexity:** Medium - Requires Cloudflare dashboard config for email routing

**Dependencies:**

- Cloudflare Email Routing (for email webhook)
- Resend API (already configured)
- Turnstile (already integrated in landing)
