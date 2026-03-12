---
title: "Grove Email Infrastructure v2 - COMPLETED"
status: completed
category: infra
lastUpdated: "2026-02-22"
---

# Grove Email Infrastructure v2 - COMPLETED

Issue: #453
Completed: 2026-02-01

## Overview

Complete overhaul of Grove's automated email infrastructure. Replaced the outdated landing page email system with a unified, modern approach using React Email for beautiful templates, Resend for delivery with native scheduling, and D1 as the source of truth for audience segmentation.

## What Was Built

| Component | Old | New |
|-----------|-----|-----|
| Templates | Plain HTML tables | React Email component system |
| Scheduling | Cloudflare cron daily | Resend native `scheduled_at` + catch-up cron |
| Segmentation | Single table, no categories | D1 audience types: `wanderer`, `promo`, `rooted` |
| Design system | None | Grove Email Components (warm, colorful, branded) |
| Link handling | Hardcoded URLs | Smart `/go/*` redirects for tenant-agnostic URLs |

## Audience Types (Updated from Plan)

- **Wanderer**: Signed up on landing page (grove.place), just curious
- **Promo**: Signed up via Plant, showing intent but hasn't purchased
- **Rooted**: Purchased a subscription, active member

> Note: Changed from "waitlist/trial/rooted" to "wanderer/promo/rooted" to match Grove's naming philosophy.

## Email Sequences Implemented

| Day | Wanderer | Promo | Rooted |
|-----|----------|-------|--------|
| 0 | "Welcome to the Grove 🌿" | "You found Grove 🌱" | "Welcome home 🏡" |
| 1 | — | — | "Making it yours" |
| 7 | "What makes Grove different" | "Still thinking about it?" | "The blank page" |
| 14 | "Why Grove exists" | — | — |
| 30 | "Still there? 👋" | — | — |
| Ongoing | — | — | Patch notes |

### Voice Guidelines Applied

- "Found your way here" Wanderer metaphor throughout
- Present tense (Grove is launched)
- "I built" not "we built" for authentic voice
- No em-dashes, no AI-isms
- Short promo sequence (2 emails, honest and done)

## Files Created

```
libs/engine/src/lib/email/
├── components/
│   ├── GroveEmail.tsx          # Base wrapper with header/footer
│   ├── GroveButton.tsx         # CTA button (grove-green)
│   ├── GroveDivider.tsx        # Decorative divider with leaf
│   ├── GroveHighlight.tsx      # Callout box
│   ├── GrovePatchNote.tsx      # Feature update block
│   ├── GroveText.tsx           # Typography (Heading, Paragraph, List, Link)
│   ├── styles.ts               # Design tokens
│   └── index.ts
├── sequences/
│   ├── WelcomeEmail.tsx        # Day 0 (all audiences)
│   ├── Day1Email.tsx           # Day 1 (rooted only)
│   ├── Day7Email.tsx           # Day 7 (all audiences)
│   ├── Day14Email.tsx          # Day 14 (wanderer only)
│   ├── Day30Email.tsx          # Day 30 (wanderer only)
│   └── index.ts
├── updates/
│   ├── PatchNotesEmail.tsx     # Feature updates for rooted
│   ├── AnnouncementEmail.tsx   # General announcements
│   └── index.ts
├── lifecycle/
│   ├── RenewalThankYou.tsx     # Subscription renewal thanks
│   ├── GentleNudge.tsx         # Check-in for quiet users
│   └── index.ts
├── seasonal/
│   ├── SeasonalGreeting.tsx    # Season-aware messages
│   └── index.ts
├── urls.ts                     # Smart URL helpers (/go/* links)
├── urls.test.ts                # URL helper tests
├── types.ts                    # Type definitions & sequence config
├── types.test.ts               # Type and sequence tests
├── schedule.ts                 # Resend scheduling functions
├── render.ts                   # @react-email/render wrapper
└── index.ts                    # Main exports
```

## Smart Link System

Created `/go/*` redirect handler for tenant-agnostic email URLs:

```typescript
// URLs that work for any user
GROVE_URLS = {
  ARBOR_PANEL: "https://grove.place/go/admin",
  NEW_POST: "https://grove.place/go/posts/new",
  SETTINGS: "https://grove.place/go/settings",
  // ... etc
}
```

The `/go/*` handler redirects authenticated users to their specific arbor panel.

## Database Migration

Created `apps/landing/migrations/0006_email_audience_segmentation.sql`:

- Added `audience_type` column (default: 'wanderer')
- Added `sequence_stage` column
- Added `last_email_at` column
- Created index for catch-up cron queries
- Migrated existing boolean tracking flags to new schema

## Quality Assurance

### Tests Written (70 tests, 189 assertions)

**types.test.ts:**
- Audience type coverage
- Sequence stage values
- Each audience's sequence configuration
- Cross-sequence consistency
- Template naming conventions

**urls.test.ts:**
- GROVE_URLS constant values
- buildGoUrl function
- buildEmailUrl UTM tracking
- URL safety checks

### Security Audit (🦝 Raccoon)

- ✅ No hardcoded secrets (API keys from env)
- ✅ No dangerous methods (innerHTML, eval)
- ✅ Proper error handling
- ✅ Type-safe props throughout
- ✅ Unsubscribe via Resend token

### Accessibility Audit (🦌 Deer)

- ✅ `lang="en"` on HTML element
- ✅ Alt text on logo image
- ✅ `role="presentation"` on layout tables
- ✅ High contrast colors
- ✅ Good font sizes (16px body)

### Performance (🦊 Fox)

- Module size: 136KB (lightweight)
- ~2630 lines total
- Server-side rendering only
- No client bundle impact

## Commits

1. `feat(email): add /go/* smart link redirect handler`
2. `feat(email): rewrite sequences with Grove voice and audience segmentation`
3. `feat(email): add lifecycle and seasonal templates`
4. `test(email): add comprehensive tests for types and URL helpers`

## Remaining Work

- [ ] Deploy migration to production D1
- [ ] Create email-catchup worker for weekly catch-up cron
- [ ] Create Hummingbird skill for composing emails
- [ ] Update landing page signup to use new scheduling
- [ ] Delete old onboarding-emails worker after verification

## References

- [React Email Documentation](https://react.email/docs)
- [Resend Scheduled Sending](https://resend.com/docs/api-reference/emails/send-email#scheduled-at)
- Issue #453

---

*Gathering feature completed. The forest grows.* 🌲
