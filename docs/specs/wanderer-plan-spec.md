---
title: Wanderer Plan — Free Blog Tier
description: A free, limited blog tier that lets anyone try Grove before committing
category: specs
specCategory: platform-services
icon: footprints
lastUpdated: "2026-02-09"
aliases: []
tags:
  - pricing
  - free-tier
  - onboarding
  - billing
  - growth
---

# The Wanderer Plan — Come In, Stay a While

```
                    🌲         🌲         🌲
                   ╱  ╲       ╱  ╲       ╱  ╲
                  ╱    ╲     ╱    ╲     ╱    ╲
                 ╱      ╲   ╱      ╲   ╱      ╲
                ╱        ╲ ╱        ╲ ╱        ╲
               ══════════════════════════════════

                         ╭─────────╮
                    ···· │ welcome │ ····
                         ╰────┬────╯
                              │
                         ╭────┴────╮
                         │ 📝 📝 📝 📝 📝 │
                         │ 📝 📝 📝 📝 📝 │
                         │ 📝 📝 📝 📝 📝 │
                         │ 📝 📝 📝 📝 📝 │
                         │ 📝 📝 📝 📝 📝 │
                         ╰─────────────────╯
                             25 blooms

              the gate is open. come write.
```

> _The gate is open. Come write._

A free blog tier for anyone who wants to try Grove. No credit card. No trial countdown. Just a subdomain, twenty-five posts, and room to breathe. If you like it here, take root. If not, no hard feelings.

**Public Name:** Wanderer Plan
**Internal Name:** free tier (`free` in tiers.ts)
**Status:** Proposed
**Last Updated:** February 2026

Every forest has a clearing where travelers can rest. Set down your pack, sit by the fire, look around. The Wanderer Plan is that clearing. You get enough space to write, enough room to see if this place feels like home. Twenty-five blooms. A hundred megabytes. One theme. A `username.grove.place` address that's yours for as long as you're here.

The catch? There isn't one. Just one gentle condition: if you leave and don't come back for a year, we'll reclaim the space for someone who needs it.

---

## Why This Exists

### The Problem

Right now, the only way to try Grove is to pay $8/month. For the people we're building this for (indie creators, queer writers, friends who want their own corner of the internet), that's a real ask before they've even seen what their blog looks like. There's no demo, no sandbox, no "try before you buy."

The result: people who would love Grove never find out, because they can't afford to take a chance on something they've never touched.

### The Insight

You don't need a 14-day trial with a credit card form. You need a front door that's actually open.

Twenty-five blog posts is enough to:

- Feel the editor
- Build a real blog, not just a demo
- Share links with friends and find your voice
- Know whether this is your place

And it costs us almost nothing. Twenty-five text posts in D1 is fractions of a cent. 100MB in R2 is barely measurable. The subdomain routing already works. The rate limiting already exists.

### The Goal

Turn "I've heard of Grove" into "I have a Grove." Remove every barrier between curiosity and a published blog post.

---

## What Wanderers Get

### Included

| Feature              | Wanderer (Free)               | Seedling ($8/mo)       |
| -------------------- | ----------------------------- | ---------------------- |
| Blog                 | Yes                           | Yes                    |
| Published posts      | 25                            | 100                    |
| Drafts               | 100                           | Unlimited              |
| Storage              | 100 MB                        | 1 GB                   |
| Themes               | 1 (default)                   | 3                      |
| Subdomain            | `username.grove.place`        | `username.grove.place` |
| RSS feed             | Yes                           | Yes                    |
| Meadow access        | Browse + reply                | Full participation     |
| Comments/replies     | 20/week (shared reed counter) | Unlimited              |
| Nav pages            | 0                             | 0                      |
| AI features          | No                            | Yes (750 words/mo)     |
| Custom domain        | No                            | No                     |
| Email forwarding     | No                            | No                     |
| Shop                 | No                            | No                     |
| Analytics            | No                            | No                     |
| Credit card required | No                            | Yes                    |

### Drafts

Drafts do **not** count toward the 25-post limit. Only published posts count. Wanderers can have up to **100 drafts**. Paid tiers get unlimited drafts.

This keeps the creative process frictionless. Write as much as you want. The limit is on what's live, not what's in progress. And 100 drafts is generous enough that nobody hits it by accident, but it prevents someone from using Grove as a free infinite note-taking app.

### Meadow Access

Wanderers can **browse and reply** in Meadow, but cannot **start** new posts in the feed. Starting posts requires Seedling. Replies and comments share the same 20/week reed counter.

### Not Included

- **AI writing assistance** (Seedling and up)
- **Multiple themes** (Seedling: 3, Sapling: 10. Note: Foliage theme system is not yet integrated, so at launch all accounts use the default theme.)
- **Starting Meadow posts** (posting to feed requires Seedling. Browsing and replying is free.)
- **Email forwarding, shop, analytics, custom domains** (higher tiers)

### Rate Limits

```
  Requests:     60/minute     (Seedling: 100/min)
  Writes:       20/hour       (Seedling: 50/hr)
  Uploads:       5/day        (Seedling: 10/day)
  AI:            0/day        (Seedling: 25/day)
```

---

## The Upgrade Path

The Wanderer Plan is designed to make upgrading feel natural, never forced.

```
  ╭──────────────────────────────────────────────────────────╮
  │                    Wanderer (Free)                       │
  │                                                          │
  │    📝 📝 📝 ...      ← "You've used 25 of 25 blooms"    │
  │                                                          │
  │    ┌──────────────────────────────────────────────┐      │
  │    │  🌱 Ready to grow?                           │      │
  │    │                                              │      │
  │    │  You've filled your garden. Take root      │      │
  │    │  and get room to keep writing.               │      │
  │    │                                              │      │
  │    │  Seedling: $8/mo · 100 posts · 1 GB · AI    │      │
  │    │                                              │      │
  │    │        [ Take Root ]    [ Maybe Later ]      │      │
  │    └──────────────────────────────────────────────┘      │
  ╰──────────────────────────────────────────────────────────╯
```

### Upgrade Triggers (Gentle, Never Pushy)

1. **Post limit reached (25/25):** Soft banner in the editor. "You've filled your garden. Take root and get room to keep writing." They can still edit existing posts. They just can't create new ones.

2. **Storage limit approaching (80/100 MB):** Subtle notice. "Your storage is getting cozy. Seedling gives you 1 GB to spread out."

3. **Theme browsing:** When they look at other themes, show them locked with a warm "Available with Seedling" label. Let them preview but not apply.

4. **AI features:** If they encounter Wisp or Fireside, show a gentle "AI features come with Seedling" message.

### What Carries Over on Upgrade

Everything. All posts, all uploaded images, their subdomain, their theme settings. Nothing is lost. Taking root means growing from where you already are.

---

## Inactivity & Anti-Squatting

### The Problem

Free accounts without expiration attract squatters. Someone grabs `coolname.grove.place`, writes nothing, and disappears. Now a paying Wanderer who actually wants that name can't have it. We need a policy that's fair to active users and fair to the community.

### The Policy: 1 Year of Inactivity

If a free-tier account has **no activity for 365 consecutive days**, the account enters a reclamation process.

**What counts as "activity":**

- Logging in
- Creating or editing a post
- Uploading media
- Changing settings
- Receiving a comment (someone visited, your blog matters)

**What does NOT count:**

- Automated crawlers hitting the subdomain
- RSS feed fetches
- Password reset emails sent but not acted on

### Reclamation Timeline

```
  Day 0                    Day 275              Day 335          Day 365
  │                           │                    │                │
  ▼                           ▼                    ▼                ▼
  Last                      Email 1              Email 2          Account
  Activity                  "We miss you"        "Final notice"   Reclaimed

  ├─── 9 months silence ───►├── 2 months ────────►├── 1 month ───►│
                             "Your grove is        "Log in by       Username
                              getting quiet.        [date] to       released.
                              Come back and         keep your       Content
                              tend it?"             grove."         archived
                                                                   30 days.
```

### Email 1: "We Miss You" (9 months)

Sent when the account has been inactive for ~275 days.

Tone: warm, no urgency. Just a friendly nudge.

> Subject: Your grove is getting quiet
>
> Hey [name],
>
> It's been a while since you visited your grove at [username].grove.place.
> Your posts are still there, waiting. Come back and write something new,
> or just stop by to say hi.
>
> If you're done with Grove, that's okay too. We'll keep your space for
> a few more months before opening it up for someone new.
>
> — Grove

### Email 2: "Final Notice" (11 months)

Sent when the account has been inactive for ~335 days.

Tone: clear, direct, still warm. Tells them exactly what happens and when.

> Subject: Your grove will be reclaimed on [date]
>
> Hey [name],
>
> Your grove at [username].grove.place has been quiet for almost a year.
> We're going to open up your username for other wanderers on [date].
>
> To keep your grove: just log in before [date]. That's it.
>
> If you've moved on, we understand. Your content will be archived for
> 30 days after reclamation, just in case you change your mind.
>
> — Grove

### After Reclamation

1. **Username released** back to the pool (available for new signups)
2. **Content archived** in cold storage for 30 days
3. **After 30 days:** content permanently deleted
4. **The person can sign up again** with a new (or the same, if unclaimed) username

### Paid Accounts Are Exempt

This policy applies ONLY to free-tier accounts. Paid accounts (Seedling and up) are never subject to inactivity reclamation, even if they don't log in for years. You paid for your space. It's yours.

Comped accounts are also exempt (they're treated as paid).

---

## Anti-Abuse Measures

Free tiers attract abuse. Here's how we handle it.

### Account Creation Limits

- **IP-based:** Max 3 free accounts per IP address per 30 days
- **Email-based:** One account per email address (enforced by Heartwood)
- **Rate limiting:** Auth endpoint limits already exist (5 logins/5min, 3 password resets/hour)

### Content Abuse

- **Spam detection:** Same content policies as paid tiers
- **Reporting:** Community reporting (when Meadow launches)
- **Manual review:** Flag accounts with suspicious patterns (many accounts from same IP, no real content, SEO-spam-looking posts)

### What We're NOT Worried About

- **Someone happily using 25 posts forever:** That's fine. Their blog existing at `username.grove.place` is free advertising. Every free blog is a potential referral. The cost to us is effectively zero.
- **Lots of free accounts:** Good. That means people are trying Grove. Most will either upgrade or leave. Both are fine outcomes.

---

## Implementation

### Config Change (tiers.ts)

The free tier already exists in `packages/engine/src/lib/config/tiers.ts` with `status: "coming_soon"`. The primary change is enabling blog access and setting limits.

```
  Current Free Tier          Wanderer Plan (Proposed)
  ─────────────────          ────────────────────────
  blog: false          →     blog: true
  posts: 0             →     posts: 25
  storage: 0           →     storage: 100 MB
  themes: 0            →     themes: 1
  status: coming_soon  →     status: available
  uploads: 0/day       →     uploads: 5/day
  writes: 20/hr        →     writes: 20/hr (unchanged)
  requests: 50/min     →     requests: 60/min
```

### Display Strings

```
  Name:         "Wanderer"
  Tagline:      "Just passing through?"
  Description:  "A quiet clearing to try your hand at writing.
                 No commitment, no credit card."
  Icon:         footprints
  Best For:     "The curious"
  Feature List:
    - "25 blooms"
    - "100 MB storage"
    - "Your own grove.place address"
    - "RSS feed"
    - "No credit card needed"
```

### Database Changes

**New columns on `tenants` table (or `platform_billing`):**

```sql
-- Track last activity for inactivity reclamation
ALTER TABLE tenants ADD COLUMN last_activity_at INTEGER;

-- Track reclamation warning state
-- null = no warnings sent
-- 'first_warning' = 9-month email sent
-- 'final_warning' = 11-month email sent
-- 'reclaimed' = account reclaimed
ALTER TABLE tenants ADD COLUMN reclamation_status TEXT;
```

**New table for archived/reclaimed content:**

```sql
CREATE TABLE reclaimed_accounts (
  id TEXT PRIMARY KEY,
  original_tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  content_archive_key TEXT,  -- R2 key for archived content
  reclaimed_at INTEGER NOT NULL,
  archive_expires_at INTEGER NOT NULL,  -- 30 days after reclamation
  created_at INTEGER DEFAULT (unixepoch())
);
```

### Activity Tracking

Update `last_activity_at` on these events (lightweight, one UPDATE per action):

- Login success
- Post create/update
- Media upload
- Settings change

Don't track on every page view. Too noisy, too expensive.

### Reclamation Cron

A scheduled Worker (Cloudflare Cron Trigger) runs daily:

```
  Daily Cron (midnight UTC)
  │
  ├── Find free accounts where last_activity_at < (now - 275 days)
  │   └── Send "We miss you" email, set reclamation_status = 'first_warning'
  │
  ├── Find free accounts where last_activity_at < (now - 335 days)
  │   └── Send "Final notice" email, set reclamation_status = 'final_warning'
  │
  ├── Find free accounts where last_activity_at < (now - 365 days)
  │   └── Archive content to R2
  │   └── Release username
  │   └── Mark tenant inactive, set reclamation_status = 'reclaimed'
  │
  └── Find reclaimed_accounts where archive_expires_at < now
      └── Delete R2 archive
      └── Remove reclaimed_accounts row
```

### Onboarding Flow Changes

The current onboarding flow assumes payment. For Wanderers:

```
  Current Flow (Paid):
  ┌────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
  │ Sign Up│ → │ Pick   │ → │ Checkout │ → │ Your     │
  │        │   │ Plan   │   │ (Stripe) │   │ Garden   │
  └────────┘   └────────┘   └──────────┘   └──────────┘

  Wanderer Flow (Free):
  ┌────────┐   ┌────────┐   ┌──────────┐
  │ Sign Up│ → │ Pick   │ → │ Your     │
  │        │   │ Username│   │ Garden   │
  └────────┘   └────────┘   └──────────┘
               (skip payment entirely)
```

The plans page shows the Wanderer Plan as the first option, clearly marked "Free" with a "Start Writing" button. Paid plans show below with their pricing.

---

## Metrics to Watch

Once launched, track:

- **Free signups per week** — Are people finding us?
- **Free → Seedling conversion rate** — Is the upgrade path working?
- **Time to first post** — How quickly do Wanderers start writing?
- **Posts per Wanderer** — Are they using their 5 posts?
- **Inactivity rate** — What % go dormant within 3, 6, 12 months?
- **Reclamation rate** — How many accounts actually get reclaimed?

---

## Decisions

All open questions have been resolved:

| Question          | Decision                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Canopy visibility | Yes, with 1+ published post. Account age icons shown (see `docs/plans/planned/account-age-icons.md`). |
| Meadow access     | Browse + reply. Cannot start new feed posts. Replies share the 20/week reed counter.                  |
| Drafts vs. limit  | Drafts don't count. Only published posts. Max 100 drafts (unlimited for paid).                        |
| Theme             | 1 default theme (Foliage not yet integrated). Can preview others, can't apply.                        |
| Receive comments  | Yes, 20/week via reed counter.                                                                        |
| Auth method       | Identical to all other Grove login points. Same Heartwood flow, no restrictions.                      |

---

## Implementation Checklist

### Tier Config & Limits

- [ ] Update free tier config in `tiers.ts` (blog: true, posts: 25, storage: 100MB, themes: 1, status: available)
- [ ] Update free tier display strings (name: "Wanderer", tagline, description, feature list)
- [ ] Update rate limits for free tier (uploads: 5/day, requests: 60/min)
- [ ] Add draft limit enforcement (100 drafts for free tier, unlimited for paid)
- [ ] Update post limit enforcement to handle 25-post limit (published only, drafts excluded)

### Database & Infra

- [ ] Add `last_activity_at` column to tenants table (migration)
- [ ] Add `reclamation_status` column to tenants table (migration)
- [ ] Create `reclaimed_accounts` table (migration)
- [ ] Implement activity tracking (update `last_activity_at` on key events)
- [ ] Build reclamation cron worker (daily check, email triggers, archive, release)
- [ ] Write "We miss you" and "Final notice" email templates

### Onboarding & Plans

- [ ] Update onboarding flow to support free signups (skip payment, same Heartwood auth)
- [ ] Update plans page to show Wanderer Plan first
- [ ] Add IP-based free account creation limits (3 per IP per 30 days)

### Upgrade Experience

- [ ] Add upgrade prompts (post limit reached, storage warning, theme preview)
- [ ] Add draft limit upgrade prompt (approaching 100 drafts)
- [ ] Test free → Seedling upgrade path (content preservation)

### Community Integration

- [ ] Update Canopy to show Wanderers with 1+ published post
- [ ] Meadow: allow browse + reply for free tier, block starting new feed posts
- [ ] Ensure reed counter is shared across blog comments and Meadow replies

---

_The gate is open. Come write._
