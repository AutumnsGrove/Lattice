---
aliases: []
date created: Wednesday, January 1st 2026
date modified: Saturday, January 4th 2026
tags:
  - onboarding
  - signup
  - user-experience
type: tech-spec
---

# Plant — Tenant Onboarding

> *Where new growth begins.*

Grove's complete onboarding system from initial signup through payment, interactive tour, and handoff to their own blog. A frictionless, welcoming experience designed to get new users publishing within minutes.

**Public Name:** Plant
**Internal Name:** Seedbed
**Domain:** `plant.grove.place`
**Version:** 1.0 Draft
**Last Updated:** December 2025

A seedbed is where seeds are planted and nurtured until they're ready to grow on their own. It's the starting place: carefully prepared soil, the right conditions, gentle care until roots take hold.

Plant is Grove's onboarding system: the complete flow for new users from initial signup through payment, interactive tour, and handoff to their own blog. A frictionless, welcoming experience that gets users publishing within minutes.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification approved, development pending |
| **Target Phase** | Phase 2 (Multi-tenant Infrastructure) |
| **Prerequisites** | Authentication system, Stripe integration, D1 tenant databases |

---

## Overview

This specification defines the complete onboarding flow for new Grove users, from initial signup through payment, interactive tour, and handoff to their own blog. The goal is a frictionless, welcoming experience that gets users publishing within minutes.

---

## 1. Signup Flow

### 1.1 Information Collected

| Field | Required | Purpose |
|-------|----------|---------|
| **Display Name** | Yes | Shown on blog, comments |
| **Username** | Yes | Subdomain (`username.grove.place`) |
| **Email** | Yes | Verification, notifications, account recovery |
| **Favorite Color** | Optional | Pre-set accent color for theme |
| **Interests** | Optional | Stored for future personalization |

**Email Requirements:**
- Must be verified via Resend
- Must be an external email (Gmail, Proton, etc.)
- Even users with `@grove.place` email need a verified external email

**Interests Options (Multi-select):**
- Writing / Blogging
- Photography
- Art / Design
- Cooking / Food
- Technology
- Travel
- Personal / Journal
- Business / Professional
- Other

*Note: Interests are stored for future use (personalized recommendations, template content). No immediate action on signup.*

### 1.2 Username / Subdomain Selection

The username IS the subdomain. This is selected during initial signup.

**Validation Rules:**
- 3-30 characters
- Lowercase alphanumeric and hyphens only
- Cannot start or end with hyphen
- Cannot contain consecutive hyphens (`--`)
- Cannot be a reserved word (see list below)

**Reserved Words:**

```typescript
const RESERVED_USERNAMES = [
  // System routes
  'admin', 'api', 'app', 'auth', 'login', 'logout', 'signup', 'register',
  'account', 'settings', 'dashboard', 'billing', 'help', 'support',

  // Infrastructure
  'www', 'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ssh', 'cdn',
  'static', 'assets', 'media', 'images', 'files', 'upload', 'uploads',

  // Grove-specific
  'grove', 'groveplace', 'meadow', 'autumn', 'blog', 'blogs', 'post', 'posts',
  'feed', 'rss', 'atom', 'sitemap', 'robots', 'favicon',

  // Legal/official
  'legal', 'terms', 'privacy', 'dmca', 'copyright', 'abuse', 'security',
  'status', 'docs', 'documentation', 'about', 'contact', 'team',

  // Common reserved
  'root', 'null', 'undefined', 'test', 'demo', 'example', 'sample',
  'official', 'verified', 'moderator', 'mod', 'staff', 'employee',
];
```

**Validation Regex:**
```typescript
const USERNAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// Ensures: starts with letter, no consecutive hyphens, no trailing hyphen
```

**Availability Checking:**
- Instant validation as user types (debounced 300ms)
- Visual feedback: Green checkmark (✓) or red X (✗)
- Query internal D1 database for speed
- Response time target: <100ms

**If Username Taken:**
- Show red X immediately
- Display 3 alternative suggestions below the field
- Suggestions based on: `username` + number, `username` + random word, similar available names

```
Example:
Username: autumn [✗ taken]

Suggestions:
  • autumn-writes ✓
  • autumn2025 ✓
  • autumngrove ✓
```

### 1.3 Signup Form UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Welcome to Grove 🌿                         │
│                                                                 │
│  Let's set up your space.                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Display Name                                            │    │
│  │ [Autumn                                             ]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Username                                                │    │
│  │ [autumn              ] .grove.place           ✓         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Email                                                   │    │
│  │ [autumn@example.com                                 ]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Favorite Color (optional)                               │    │
│  │ [    🟣    ] Purple                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  What brings you to Grove? (optional)                           │
│  [ ] Writing    [ ] Photography    [ ] Art                      │
│  [ ] Cooking    [ ] Tech           [ ] Travel                   │
│  [ ] Personal   [ ] Business       [ ] Other                    │
│                                                                 │
│                        [Continue →]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Email Verification

### 2.1 Verification Flow

1. User submits signup form
2. System sends verification email via Resend
3. User clicks verification link
4. Email marked as verified in database
5. User redirected to plan selection

**Email Template:**
```
Subject: Verify your Grove email

Hey {name}!

Click below to verify your email and continue setting up your Grove blog:

[Verify Email →]

This link expires in 24 hours.

If you didn't create a Grove account, you can ignore this email.

—
Grove
```

### 2.2 Verification States

| State | User Experience |
|-------|-----------------|
| Pending | "Check your email for a verification link" |
| Expired | "Link expired. [Resend verification →]" |
| Verified | Redirect to plan selection |
| Already Verified | Redirect to plan selection |

---

## 3. Plan Selection

### 3.1 Plan Display

After email verification, users see the plan selection page.

**Plans Displayed:**

| Plan | Price | Highlights |
|------|-------|------------|
| **Seedling** | $8/mo | 50 posts, 1GB, 3 themes |
| **Sapling** | $12/mo | 250 posts, 5GB, 10 themes |
| **Oak** | $25/mo | Unlimited, 20GB, theme customizer |
| **Evergreen** | $35/mo | Unlimited, 100GB, domain included |

**UI Elements:**
- Clear feature comparison table
- "Most Popular" badge on Sapling
- "Best Value" badge on Oak
- Yearly pricing toggle (15% discount)
- Links to full pricing page for details

### 3.2 Plan Selection UI

```
┌─────────────────────────────────────────────────────────────────┐
│                     Choose Your Plan                            │
│                                                                 │
│  [Monthly ○] [Yearly ● Save 15%]                                │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Seedling │ │ Sapling  │ │   Oak    │ │Evergreen │            │
│  │   $8/mo  │ │  $12/mo  │ │  $25/mo  │ │  $35/mo  │            │
│  │          │ │ POPULAR  │ │  VALUE   │ │          │            │
│  │ 50 posts │ │250 posts │ │Unlimited │ │Unlimited │            │
│  │   1 GB   │ │   5 GB   │ │  20 GB   │ │  100 GB  │            │
│  │ 3 themes │ │10 themes │ │Customizer│ │ + Fonts  │            │
│  │          │ │          │ │          │ │ + Domain │            │
│  │ [Select] │ │ [Select] │ │ [Select] │ │ [Select] │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                 │
│  All plans include: Meadow, RSS, no ads, data export            │
│                                                                 │
│  [View full comparison →]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Payment

### 4.1 Payment Flow

Payment happens AFTER plan selection, BEFORE the tour.

1. User selects plan
2. Redirect to Stripe Checkout (or embedded checkout)
3. User completes payment
4. Webhook confirms payment
5. Subscription created in database
6. User redirected to interactive tour

**Payment Methods:**
- Credit/debit card (Stripe)
- Future: Apple Pay, Google Pay

### 4.2 Stripe Integration

```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer_email: user.email,
  line_items: [{
    price: PLAN_PRICES[selectedPlan][billingCycle], // monthly or yearly
    quantity: 1,
  }],
  success_url: `${SITE_URL}/onboarding/tour?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${SITE_URL}/onboarding/plans`,
  metadata: {
    user_id: user.id,
    username: user.username,
    plan: selectedPlan,
  },
});
```

### 4.3 Post-Payment Actions

On successful payment webhook:

1. Create subscription record in database
2. Initialize tenant D1 database (empty, no content)
3. Set up Cloudflare bindings
4. Create `username.grove.place` subdomain routing
5. Mark user as active subscriber
6. Redirect to tour

---

## 5. Interactive Tour

### 5.1 Tour Overview

The tour is a fully interactive walkthrough of the Grove platform. Users click around and explore, guided by floating tooltips and arrows.

**Tour Location:** The example site (your live blog, Autumn)

**Duration:** 5-10 minutes

**Skippable:** Yes, with confirmation ("Are you sure? You can always revisit from the Help menu.")

**Revisitable:** Yes, from Help Center menu

### 5.2 Tour Stops

| Stop | Location | What's Highlighted |
|------|----------|-------------------|
| 1 | Homepage | "This is your blog. Let's explore!" |
| 2 | Blog post | "Your posts live here. Rich markdown, images, vines." |
| 3 | Vines (sidebar) | "Add vines to link related content in the margins." |
| 4 | Admin panel | "This is your dashboard. Let's look around." |
| 5 | Post editor | "Write in markdown with live preview." |
| 6 | Media gallery | "Upload images and manage your media here." |
| 7 | Theme settings | "Customize your theme and accent color." |
| 8 | Settings | "Configure your blog title, description, and more." |
| 9 | Completion | "You're ready! Let's go to YOUR blog." |

### 5.3 Tour UI Components

**Floating Tooltip:**
```
┌─────────────────────────────────────────┐
│ 🌿 The Post Editor                      │
│                                         │
│ Write in markdown with live preview.    │
│ Add images, format text, and publish    │
│ when you're ready.                      │
│                                         │
│ [← Back]              [3/9]   [Next →]  │
└─────────────────────────────────────────┘
         ▼ (arrow pointing to editor)
```

**Progress Indicator:**
- Dots or step counter showing progress (3/9)
- Back/Next navigation
- "Skip tour" link (subtle, bottom corner)

### 5.4 Tour Implementation

```typescript
interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'observe'; // Does user need to click or just observe?
  nextTrigger?: string; // Selector that triggers next step when clicked
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Grove!',
    description: 'This is the example blog. Let\'s explore what you can do.',
    target: 'body',
    position: 'center',
    action: 'observe',
  },
  {
    id: 'post',
    title: 'Blog Posts',
    description: 'Your posts live here. Rich markdown, images, and vines.',
    target: '.post-content',
    position: 'right',
    action: 'observe',
  },
  // ... etc
];
```

---

## 6. Handoff

### 6.1 What Happens at Handoff

When the tour completes (or is skipped):

1. **Database Ready:** Tenant D1 database already initialized (from payment step)
2. **Site Live:** `username.grove.place` is accessible
3. **Content:** Empty (no sample posts)
4. **Theme:** Default theme with user's accent color (if provided)
5. **Settings:** Pre-populated with display name

### 6.2 Handoff Timing

- Target: Near-instant (2 minutes max)
- All heavy lifting done during payment processing
- Handoff is just a redirect to their new blog

### 6.3 Handoff Redirect

```typescript
// After tour completion
redirect(302, `https://${user.username}.grove.place/admin?welcome=true`);
```

The `welcome=true` parameter triggers the onboarding checklist display.

---

## 7. Onboarding Checklist

### 7.1 Checklist Items

Displayed in the admin panel sidebar until all items are completed.

| Item | Completion Trigger |
|------|-------------------|
| ✓ Complete the tour | Tour finished or skipped |
| ○ Write your first post | First post published |
| ○ Add a vine to a post | First vine added |
| ○ Customize your theme | Theme or accent color changed |

### 7.2 Checklist UI

```
┌─────────────────────────────────────┐
│ 🌱 Getting Started                  │
│                                     │
│ ✓ Complete the tour                 │
│ ○ Write your first post             │
│ ○ Add a vine to a post              │
│ ○ Customize your theme              │
│                                     │
│ [Dismiss checklist]                 │
└─────────────────────────────────────┘
```

### 7.3 Checklist Behavior

- Appears on first login after signup
- Stays visible until all items completed OR dismissed
- Can be re-accessed from Help menu
- Completing all items shows celebration message
- Dismissing stores preference in user settings

---

## 8. Follow-up Emails

### 8.1 Email Schedule

| Timing | Email | Condition |
|--------|-------|-----------|
| Immediately | Welcome email | Always |
| Day 1 | Checklist reminder | If checklist incomplete |
| Day 3 | Check-in #1 | Always |
| Day 7 | Check-in #2 | Always |
| Day 30 | Check-in #3 | Always |

### 8.2 Email Content

**Welcome Email (Immediate):**
```
Subject: Welcome to Grove, {name}! 🌿

Hey {name}!

Your blog is live at {username}.grove.place

Here's what to do next:
• Write your first post
• Add some vines (sidebar links)
• Customize your theme

Need help? Visit our Help Center or reply to this email.

Happy writing!
—Autumn
```

**Day 3 Check-in:**
```
Subject: How's it going, {name}?

Hey {name}!

You've been on Grove for a few days now. How's it feeling?

{if checklist_incomplete}
I noticed you haven't finished setting up yet. No rush, but if you
need help with anything, just reply to this email.
{/if}

{if has_posts}
I saw you published {post_count} post(s)! That's awesome.
{/if}

—Autumn
```

**Day 7 Check-in:**
```
Subject: One week with Grove

Hey {name}!

It's been a week since you joined Grove. I hope you're finding
your rhythm.

Quick tips:
• Use vines to connect related posts
• Your RSS feed is at {username}.grove.place/rss.xml
• You can export your data anytime from Settings

Questions? I'm here.

—Autumn
```

**Day 30 Check-in:**
```
Subject: One month! 🎉

Hey {name}!

You've been growing with Grove for a whole month now.

{if has_posts}
You've published {post_count} posts! That's {word_count} words
of your voice out in the world.
{/if}

Thanks for being part of this. I'd love to hear how it's going:
what's working, what could be better. Just hit reply.

—Autumn
```

### 8.3 Email System

- All emails templated in admin Settings panel (editable by platform owner)
- Emails adjust based on user progress (checklist status, post count)
- Users can unsubscribe from check-in emails (not transactional)
- Sent via Resend

---

## 9. Database Schema

### 9.1 Onboarding Tables

```sql
-- User onboarding state
CREATE TABLE user_onboarding (
  user_id TEXT PRIMARY KEY,

  -- Signup data
  favorite_color TEXT,
  interests TEXT, -- JSON array

  -- Progress tracking
  email_verified_at INTEGER,
  plan_selected_at INTEGER,
  payment_completed_at INTEGER,
  tour_completed_at INTEGER,
  tour_skipped INTEGER DEFAULT 0,

  -- Checklist
  checklist_dismissed INTEGER DEFAULT 0,
  first_post_at INTEGER,
  first_vine_at INTEGER,
  theme_customized_at INTEGER,

  -- Emails
  welcome_email_sent INTEGER DEFAULT 0,
  day1_email_sent INTEGER DEFAULT 0,
  day3_email_sent INTEGER DEFAULT 0,
  day7_email_sent INTEGER DEFAULT 0,
  day30_email_sent INTEGER DEFAULT 0,
  checkin_emails_unsubscribed INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Reserved usernames
CREATE TABLE reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT, -- 'system', 'trademark', 'offensive', etc.
  created_at INTEGER DEFAULT (unixepoch())
);

-- Insert system reserved names
INSERT INTO reserved_usernames (username, reason) VALUES
  ('admin', 'system'),
  ('api', 'system'),
  ('www', 'system'),
  ('mail', 'system'),
  ('email', 'system'),
  ('support', 'system'),
  ('help', 'system'),
  ('billing', 'system'),
  ('account', 'system'),
  ('settings', 'system'),
  ('login', 'system'),
  ('signup', 'system'),
  ('register', 'system'),
  ('grove', 'trademark'),
  ('meadow', 'trademark'),
  ('acorn', 'trademark'),
  ('heartwood', 'trademark');
```

---

## 10. Error Handling

### 10.1 Signup Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| Username taken | "That username is taken. Try one of these:" | Show suggestions |
| Email already registered | "This email is already registered. [Log in →]" | Link to login |
| Invalid email format | "Please enter a valid email address" | Inline validation |
| Verification expired | "Link expired. [Resend verification →]" | Resend button |

### 10.2 Payment Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| Card declined | "Payment failed. Please try another card." | Retry with different card |
| Network error | "Something went wrong. Your card wasn't charged." | Retry button |
| Webhook failed | (Silent) Retry webhook, alert admin if persistent | Admin notification |

### 10.3 Tour Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| Tour won't load | "Tour unavailable. [Skip to your blog →]" | Skip link |
| Step not found | Gracefully skip to next step | Auto-advance |

---

## 11. Analytics & Tracking

### 11.1 Funnel Metrics

Track conversion at each step:

1. Signup started → Signup completed
2. Signup completed → Email verified
3. Email verified → Plan selected
4. Plan selected → Payment completed
5. Payment completed → Tour started
6. Tour started → Tour completed (vs skipped)
7. Tour completed → First post published

### 11.2 Time Metrics

- Time from signup start to payment complete
- Time spent on tour
- Time from payment to first post

### 11.3 Checklist Metrics

- Checklist completion rate
- Which items are completed most/least
- Average time to complete checklist

---

## 12. Implementation Checklist

- [ ] Build signup form with username availability checker
- [ ] Set up email verification flow via Resend
- [ ] Create plan selection page
- [ ] Integrate Stripe checkout
- [ ] Build webhook handler for payment confirmation
- [ ] Create tenant provisioning system (D1, subdomain)
- [ ] Build interactive tour component
- [ ] Create tour content for all 9 stops
- [ ] Build onboarding checklist component
- [ ] Create email templates (welcome, day 1/3/7/30)
- [ ] Set up scheduled email job (check-ins)
- [ ] Add reserved username table and validation
- [ ] Build analytics tracking for funnel
- [ ] Test full flow end-to-end

---

*This specification prioritizes a welcoming, low-friction onboarding experience that gets users publishing quickly while ensuring they understand Grove's key features.*
