# Porch & Feedback Integration Plan

**Created**: January 28, 2026
**Status**: ✅ Implemented
**Priority**: High — core support infrastructure for launch
**Prerequisites**: Feedback system (completed), Waystone (completed)

> **Implementation Complete**: Porch v1 has been built at `grove.place/porch` with user-facing routes, admin panel, and Arbor integration. See [What Was Built](#what-was-built) section below.

---

## Overview

Grove now has three support/help components at various stages:

| Component | Status | Purpose |
|-----------|--------|---------|
| **Waystone** | ✅ Done | Contextual `?` icons linking to KB articles |
| **Feedback** | ✅ Done | Quick, informal thoughts from Wanderers |
| **Porch** | 📋 Spec'd | Full support conversations with threading |

This plan analyzes how to finish the support system by integrating existing components with the Porch spec.

---

## Current State Analysis

### Waystone (Self-Service Layer)
**Location**: `packages/engine/src/lib/ui/components/ui/Waystone.svelte`

Contextual help icons that link to Knowledge Base articles. Already deployed in:
- Admin sidebar (Help Center link)
- Settings pages (Typography, Accent Color)

**Expansion needed**: More Waystones throughout the interface as articles are written.

### Feedback System (Casual Thoughts Layer)
**Location**: `packages/landing/src/routes/feedback/`

What's built:
- Web form at `/feedback` with sentiment selector (😊/😐/😟)
- Admin view at `/admin/feedback` with filters, search, notes
- D1 table `feedback` with migration 0004
- Rate limiting (5/day per IP), Turnstile verification
- Email forwarding to `autumn@grove.place` via Resend
- Footer integration (Connect section links to feedback)

**Not yet configured**: Email webhook for `feedback@grove.place` (requires Cloudflare Email Routing dashboard setup)

### Porch Spec (Conversation Layer)
**Location**: `docs/specs/porch-spec.md`

The spec defines a full-featured support system:
- Visit numbers (PORCH-2026-00001)
- Two-way threading (user ↔ Autumn)
- Categories: billing, technical, account, just saying hi, other
- Priority levels (normal/urgent)
- File attachments (R2 storage)
- User visit history (authenticated users)
- Admin interface with saved responses, internal notes, metrics
- Email threading via Resend (reply-to support)
- Phase 2: Ivy inbox integration

---

## The Three-Tier Support Model

```
┌─────────────────────────────────────────────────────────────────┐
│              GROVE SUPPORT HIERARCHY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   TIER 1: SELF-SERVICE (Waystone → KB)                         │
│   ├─ Contextual ? icons in interface                           │
│   ├─ Links to relevant help articles                           │
│   └─ Goal: Answer 80% of questions without human contact       │
│                                                                 │
│   TIER 2: QUICK FEEDBACK (Feedback Form)                       │
│   ├─ Anonymous OK, no threading                                │
│   ├─ Sentiment indicator for mood tracking                     │
│   ├─ One-way communication                                     │
│   └─ Goal: Capture thoughts, ideas, quick reports              │
│                                                                 │
│   TIER 3: SUPPORT CONVERSATIONS (Porch)                        │
│   ├─ Authenticated or email-verified                           │
│   ├─ Two-way threading with history                            │
│   ├─ Attachments, priorities, categories                       │
│   └─ Goal: Resolve real problems with back-and-forth           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Decision Points

### Decision 1: Package Structure

**Option A: New package `packages/porch`**
- Pro: Matches spec (`porch.grove.place`), clean separation
- Pro: Own D1 database, independent scaling
- Con: More deployment complexity, new wrangler.toml
- Con: Auth needs cross-domain handling

**Option B: Extend landing at `grove.place/porch`** (Recommended)
- Pro: Shares existing D1, Resend, auth infrastructure
- Pro: Admin views consolidated in one place
- Pro: Simpler deployment (already deploying landing)
- Pro: Feedback → Porch escalation is seamless
- Con: Doesn't match spec's `porch.grove.place` domain
- Con: Landing package grows larger

**Recommendation**: Start with Option B. Add porch routes to landing at `/porch/*`. If scale requires separation later, extract to own package. The spec's `porch.grove.place` can be achieved via redirect or grove-router if needed.

### Decision 2: Feedback ↔ Porch Relationship

**Option A: Keep completely separate**
- Feedback = thoughts about Grove itself
- Porch = help with specific problems
- No crossover, separate admin views

**Option B: Merge feedback INTO Porch**
- Remove standalone feedback form
- Porch's "just saying hi" category becomes feedback
- All communication in one system
- Con: Loses anonymous feedback (Porch needs email)

**Option C: Keep separate with escalation path** (Recommended)
- Feedback stays for quick, anonymous thoughts
- Add "Need more help? Start a Porch conversation" CTA on feedback success
- Feedback admin can "escalate to Porch" if reply needed
- Porch links to KB articles via Waystone before submitting

**Recommendation**: Option C. The systems serve different purposes:
- Feedback: "I love this!" / "This button is confusing" (no reply needed)
- Porch: "I can't log in" / "Billing question" (reply needed)

### Decision 3: Porch MVP Scope

Full Porch Phase 1 spec includes:
- [ ] Visit creation with categories/priority
- [ ] Visit history for authenticated users
- [ ] Message threading
- [ ] File attachments (R2)
- [ ] Email threading (Resend inbound webhook)
- [ ] Admin interface with saved responses
- [ ] Internal notes
- [ ] Metrics dashboard

**MVP Option A: Everything in Phase 1**
- Full spec implementation
- 2-3 weeks of development

**MVP Option B: Core conversations only** (Recommended for launch)
- [ ] Visit creation (web form)
- [ ] Visit list for authenticated users
- [ ] Message threading (web only)
- [ ] Admin interface (basic)
- [ ] Email notifications (outbound only)

Defer to post-launch:
- File attachments
- Email threading (inbound replies)
- Saved responses
- Metrics dashboard
- Internal notes

---

## Implementation Plan

Assuming recommendations are accepted (Option B + C + MVP B):

### Phase 1: Foundation (Days 1-2)

**Database setup:**
```sql
-- Add to landing migrations as 0005_porch.sql
CREATE TABLE porch_visits (
  id TEXT PRIMARY KEY,
  visit_number TEXT UNIQUE NOT NULL,
  user_id TEXT,                          -- NULL for guests
  guest_email TEXT,
  guest_name TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT
);

CREATE TABLE porch_messages (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES porch_visits(id),
  sender_type TEXT NOT NULL,             -- 'user' or 'autumn'
  sender_id TEXT,
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_porch_visits_user ON porch_visits(user_id);
CREATE INDEX idx_porch_visits_status ON porch_visits(status);
CREATE INDEX idx_porch_visits_created ON porch_visits(created_at DESC);
CREATE INDEX idx_porch_messages_visit ON porch_messages(visit_id);
```

**KV for visit numbering:**
- Key: `porch:visit_sequence:2026`
- Atomic increment for PORCH-2026-XXXXX

### Phase 2: User-Facing Routes (Days 3-5)

**Routes to create in `packages/landing/src/routes/porch/`:**

```
/porch                    → Landing page ("Have a seat on the porch")
/porch/new               → Start a visit form
/porch/visits            → User's visit history (auth required)
/porch/visits/[id]       → View conversation, add reply
```

**Visit creation flow:**
1. Check auth status (Heartwood)
2. If authenticated: pre-fill email, show visit history link
3. If guest: require email, optional name
4. Category selection (billing, technical, account, hello, other)
5. Subject + message fields
6. Submit → create visit + first message
7. Send confirmation email via Resend
8. Show success with visit number

### Phase 3: Admin Interface (Days 6-7)

**Routes to create in `packages/landing/src/routes/admin/porch/`:**

```
/admin/porch             → All visits dashboard (filters, search)
/admin/porch/[id]        → View/reply to visit
```

**Admin features:**
- Filter by status (open, pending, resolved)
- Filter by category
- Search by subject, email
- Click to expand conversation
- Reply form (creates message with sender_type='autumn')
- Mark as pending/resolved
- Stats summary (open count, today's count)

### Phase 4: Integration (Day 8)

**Cross-linking:**
1. Feedback success message → "Need more help? Start a Porch conversation"
2. KB articles → "Still stuck? Ask on the Porch" CTA
3. Admin sidebar → Add Porch link alongside Feedback
4. Settings pages → Waystone for support article, link to Porch

**Email notifications:**
- User submits visit → Autumn gets email notification
- Autumn replies → User gets email with reply + link to conversation
- Use existing Resend setup from landing

### Phase 5: Polish (Days 9-10)

**UX refinements:**
- Warm copy throughout ("Thanks for stopping by", "We'll figure it out")
- Status badges with Grove colors
- Mobile-responsive conversation view
- Keyboard shortcuts for admin

---

## File Structure

```
packages/landing/
├── migrations/
│   └── 0005_porch.sql                      # NEW
├── src/routes/
│   ├── porch/
│   │   ├── +page.svelte                    # NEW - Porch landing
│   │   ├── +page.server.ts                 # NEW
│   │   ├── new/
│   │   │   ├── +page.svelte               # NEW - Start visit form
│   │   │   └── +page.server.ts            # NEW
│   │   └── visits/
│   │       ├── +page.svelte               # NEW - Visit history
│   │       ├── +page.server.ts            # NEW
│   │       └── [id]/
│   │           ├── +page.svelte           # NEW - Conversation view
│   │           └── +page.server.ts        # NEW
│   ├── admin/
│   │   └── porch/
│   │       ├── +page.svelte               # NEW - Admin dashboard
│   │       ├── +page.server.ts            # NEW
│   │       └── [id]/
│   │           ├── +page.svelte           # NEW - Admin reply view
│   │           └── +page.server.ts        # NEW
│   └── feedback/
│       └── +page.svelte                   # MODIFY - Add Porch CTA
└── src/lib/
    └── server/
        └── porch.ts                       # NEW - Visit numbering, helpers
```

**New files**: ~12 files
**Modified files**: 2-3 files (feedback success, admin nav)

---

## What About Phase 2 (Ivy)?

The Porch spec has Phase 2 for Ivy mail integration. This plan defers it entirely:

- Phase 2 requires Ivy to be production-ready
- Current focus is launch with email-only
- Schema is designed to support Phase 2 later (add `ivy_thread_id` column)
- No Ivy-specific code until Ivy ships

---

## What About Attachments?

File attachments (R2) are explicitly deferred:

- Adds complexity (upload flow, signed URLs, storage management)
- Not critical for support conversations
- Can be added post-launch if needed
- Users can link to images/files hosted elsewhere

---

## What About Email Threading?

Inbound email replies (Resend webhook) are deferred:

- Requires Resend inbound setup + unique reply-to addresses
- Users can click link in email to reply on web
- Simpler for MVP, add later for power users

---

## Integration Points

| System | How Porch Uses It |
|--------|-------------------|
| **Heartwood** | User auth, pre-fill email, visit history access |
| **D1** | Store visits and messages (landing's existing D1) |
| **Resend** | Email notifications (already configured in landing) |
| **KV** | Visit number sequence counter |
| **Waystone** | Link to help articles before/during visit |
| **Feedback** | Escalation path from feedback → porch |

---

## Success Criteria

**Launch ready when:**
- [ ] Wanderers can start visits at `/porch/new`
- [ ] Authenticated users see visit history at `/porch/visits`
- [ ] Users can view conversation and add replies
- [ ] Autumn gets email notifications for new visits
- [ ] Users get email notifications for replies
- [ ] Admin can view, filter, search, and reply to visits
- [ ] Feedback form links to Porch for "need more help"

---

## Open Questions

1. **Visit number format**: PORCH-2026-00001 per spec, or simpler? (e.g., P-00001)

2. **Guest email verification**: Require email confirmation before conversation visible, or trust the email?

3. **Category labels**: billing, technical, account, hello, other — are these right? Add/remove any?

4. **Priority visibility**: Should users see priority options, or is that admin-only?

5. **Rate limiting**: Visits per user/IP? Spec says 5/hour per user, 10/hour per IP.

---

## Related Documents

- `docs/specs/porch-spec.md` — Full specification
- `docs/planning/wanderer-feedback-system-plan.md` — Feedback implementation
- `docs/plans/planned/help-center-article-roadmap.md` — KB articles to write
- `docs/plans/planned/waystone-integration-plan.md` — Waystone expansion

---

## Next Steps

1. **Get decisions** on the three decision points above
2. **Create migration** (0005_porch.sql)
3. **Build user routes** (/porch/*)
4. **Build admin routes** (/admin/porch/*)
5. **Add cross-links** between feedback, KB, and porch
6. **Test end-to-end** flow
7. **Deploy and run migration**

---

## What Was Built

### Implementation Summary (January 28, 2026)

**Decisions Made:**
- ✅ Porch lives in landing at `/porch/*` (not separate package)
- ✅ Feedback remains separate (no merge)
- ✅ MVP scope: Core conversations, no attachments/inbound email

**Files Created:**

```
packages/landing/
├── migrations/
│   └── 0005_porch.sql                      # D1 schema
└── src/routes/
    ├── porch/
    │   ├── +page.svelte                    # Landing page
    │   ├── +page.server.ts
    │   ├── new/
    │   │   ├── +page.svelte               # Start visit form
    │   │   └── +page.server.ts            # Form handler + emails
    │   └── visits/
    │       ├── +page.svelte               # Visit history
    │       ├── +page.server.ts
    │       └── [id]/
    │           ├── +page.svelte           # Conversation view
    │           └── +page.server.ts        # Reply handler
    └── admin/porch/
        ├── +page.svelte                   # Admin dashboard
        ├── +page.server.ts
        └── [id]/
            ├── +page.svelte               # Admin reply view
            └── +page.server.ts            # Reply + status + notes

packages/engine/
└── src/routes/admin/+layout.svelte        # Added Porch link to Arbor
```

**Features Implemented:**
- Visit creation with categories (billing, technical, account, hello, other)
- Visit numbering: PORCH-2026-XXXXX
- Two-way messaging (visitor ↔ Autumn)
- Email notifications via Resend (both directions)
- Visit history for authenticated users
- Admin dashboard with filters and search
- Status management (open, pending, resolved)
- Internal admin notes
- Arbor panel integration (Get Support link)

**Deferred to v2:**
- File attachments (R2)
- Inbound email threading (Resend webhook)
- Saved responses
- Metrics dashboard
- Ivy integration (Phase 2)

**To Deploy:**
1. Run migration: `wrangler d1 execute grove-engine-db --file=packages/landing/migrations/0005_porch.sql --remote`
2. Deploy landing: `cd packages/landing && pnpm deploy`
3. Deploy engine: `cd packages/engine && pnpm deploy`

---

*Have a seat on the porch. We'll figure it out together.*
