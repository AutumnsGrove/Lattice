---
aliases:
date created: Friday, November 22nd 2025, 12:00:00 pm
date modified: Saturday, December 14th 2025, 12:00:00 pm
tags:
type: tech-spec
---

# Rings - Grove Analytics Specification

**Project:** Rings (GroveAnalytics) - Writer-First Analytics
**Phase:** Phase 5 Enhancement
**Type:** Analytics System
**Purpose:** Private insights for writers, platform health for admin—no anxiety, no performance metrics

---

## Philosophy

> *Count the rings of a tree and you learn its story. Each ring records a season—growth in plenty, resilience through hardship, the quiet accumulation of years. Rings are internal. Private. You only see them when you look closely at your own tree.*

Rings is analytics for writers, not marketers. Traditional analytics breed anxiety: refresh-checking, comparing yourself to others, optimizing for virality instead of authenticity. Grove takes a different path.

### Core Principles

1. **Private by Default** - Your stats are yours alone. No public view counts, no leaderboards
2. **Delayed by Design** - All stats are 24 hours delayed. No real-time dopamine hits
3. **Quality Over Quantity** - Measure what matters: Did people actually read? Did they come back?
4. **Positive Signals Only** - Show what's working. Silence is neutral, not failure
5. **Writer Wellness** - Tools to step away, not tools that demand attention
6. **Extensible** - System designed to add new metrics and signals over time

### What We Don't Do

- No real-time "someone is reading your post NOW" notifications
- No public follower counts or like counts
- No comparison to other blogs
- No "you're down 20% this week" anxiety triggers
- No heatmaps or session recordings
- No individual visitor tracking

---

## Resonance Indicators

Instead of showing vote scores or engagement numbers, Rings uses **Resonance Indicators**—positive signals that appear only when earned.

### Signal System

| Signal | Icon | Trigger | Appears After |
|--------|------|---------|---------------|
| **Sparked Interest** | 🌱 | Above your personal average engagement | 7 days |
| **Really Resonated** | 🌿 | Significantly above your average (top 25%) | 7 days |
| **Community Favorite** | 🌳 | Top 10% of your posts ever | 7 days |

### Design Principles

- **Relative to YOU** - Signals compare to your own baseline, never to others
- **7-day delay** - Prevents refresh-checking behavior
- **Silence is neutral** - No signal means normal, not bad
- **Nothing negative** - We never show "this underperformed"
- **Extensible architecture** - New signals can be added without schema changes

### Future Signal Examples (Not For Initial Launch)

The system is designed to accommodate custom signals such as:
- "Readers from new countries" (geographic expansion)
- "Sparked conversation" (high comment engagement)
- "Evergreen content" (still getting reads after 6+ months)
- "Gateway post" (many readers explored your blog after this)

### Technical Implementation

```typescript
interface ResonanceSignal {
  id: string;
  signal_type: string;           // 'sparked_interest' | 'really_resonated' | 'community_favorite' | future types
  post_id: string;
  blog_id: string;
  triggered_at: number;          // When the signal was calculated (not shown until 7 days after post)
  visible_after: number;         // Timestamp when signal becomes visible to author
  metadata: Record<string, any>; // Flexible JSON for signal-specific data
}

// Signals table - designed for extensibility
CREATE TABLE resonance_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  post_id TEXT NOT NULL,
  blog_id TEXT NOT NULL,
  triggered_at INTEGER NOT NULL,
  visible_after INTEGER NOT NULL,
  metadata TEXT,                 -- JSON for future signal types
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);

CREATE INDEX idx_signals_post ON resonance_signals(post_id);
CREATE INDEX idx_signals_blog ON resonance_signals(blog_id);
CREATE INDEX idx_signals_visible ON resonance_signals(visible_after);
```

---

## Metrics by Tier

### Seedling (Basic - $8/month)

**Access:** View counts on recent 5 posts only
**Retention:** Rolling 30 days
**Features:**
- Total views per post (delayed 24hrs)
- Simple "X views" display
- No charts, no breakdowns

### Sapling ($12/month)

**Access:** Core metrics + basic insights
**Retention:** Rolling 30 days
**Features:**
- Everything in Seedling
- **Engaged Readers** - spent meaningful time AND reached end
- **Deep Reads** - spent 60%+ of estimated reading time
- **Finish Rate** - percentage who scrolled to bottom
- **Return Readers** - came back for another post within 30 days
- **First Impressions** - this was their entry point to your blog
- Resonance Indicators (🌱🌿🌳)
- Basic trend line (views over time)

### Oak ($25/month)

**Access:** Full insights + wellness tools
**Retention:** 1 year default
**Features:**
- Everything in Sapling
- **Reading Journey** - readers who explored more of your blog
- **Steady Readers** - people who've read 3+ posts total
- **Posting Calendar** - visual dots for each day you published (different colors per post type)
- **Quiet Wins** - resurfaces older posts still getting reads
- **Seasonal Reflection** - after Year 1, choose your frequency (quarterly/bi-annual/annual/never)
- Referrer breakdown (traffic sources)
- Device/browser breakdown
- Country-level geographic data
- Full charts and visualizations
- CSV/JSON export
- **Digest Mode** - disable dashboard, receive weekly email only
- **Focus Periods** - schedule analytics blackouts

### Evergreen ($35/month)

**Access:** Maximum customization
**Retention:** Up to 5 years (customizable)
**Features:**
- Everything in Oak
- Custom retention period (1-5 years)
- **Seasonal Reflection** - continues automatically after Year 1 (all frequency options available)
- Custom digest frequency (weekly/monthly/quarterly)
- Priority data export
- Extended historical analysis

---

## Core Metrics Definitions

### Engaged Readers
The intersection of time AND completion. Someone who:
- Spent at least 60% of the estimated reading time on the page
- AND scrolled to reach the end of the post

This is the "did they actually read it?" metric. More meaningful than raw views.

### Deep Reads
Readers who spent meaningful time (60%+ of estimated reading time) regardless of whether they finished. Captures people who read carefully but may have stopped partway through a long piece.

### Finish Rate
Percentage of readers who scrolled to the bottom of the post. Contextualized internally by post length (a 60% finish rate on a 15-minute read is actually excellent).

### Return Readers
Logged-in readers who came back to read another post on your blog within 30 days. This is the loyalty metric—building real audience vs viral spikes.

**Logged-in users only.** Anonymous visitors can't be reliably tracked (IP addresses change, VPNs, etc.). Since Grove has a free tier, there's always an incentive to log in. This keeps the metric honest—you're seeing real returning people, not fuzzy estimates.

### First Impressions
Posts that were someone's first encounter with your blog. High numbers here indicate good entry points—posts that are bringing in new readers.

### Reading Journey
Readers who explored more of your blog after reading this post. Positive framing of "discovery" rather than cold "bounce rate" language.

### Steady Readers
People who have read 3+ posts on your blog total. Not subscribers (no social pressure), just people who seem to like what you write. Private metric, of course.

**Logged-in users only.** Same as Return Readers—you can only build a reliable picture of loyalty with logged-in users.

---

## Writer Wellness Features

### Digest Mode (Oak+)

Toggle that **completely disables** the analytics dashboard. When enabled:
- Dashboard shows: "You're in Digest Mode. Check your email for weekly updates."
- No charts, no numbers, no way to compulsively check
- Weekly email summary with key metrics
- Can be toggled on/off anytime

**Purpose:** For writers who want insights but not the anxiety of checking.

### Focus Periods (Oak+)

Schedule analytics blackouts:
- **Scheduled:** "Hide my stats every Monday-Thursday"
- **One-time:** "Hide for the next 2 weeks while I finish this project"

During a focus period:
- Dashboard shows: "You're in Focus Mode. Stats return [date]."
- No data is lost, just hidden
- Can be ended early if needed

**Purpose:** Protect creative time from the distraction of metrics.

### 24-Hour Delay (Platform-Wide)

All stats across all tiers are delayed by 24 hours. This is not a limitation—it's a philosophy:
- Publish a post, come back tomorrow to see how it did
- Prevents the "post and obsessively refresh" cycle
- Encourages reflection over reaction

---

## Posting Calendar (Oak+)

A visual representation of your publishing history:

```
December 2025
┌───┬───┬───┬───┬───┬───┬───┐
│ S │ M │ T │ W │ T │ F │ S │
├───┼───┼───┼───┼───┼───┼───┤
│   │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │
│   │   │ ● │   │   │ ◐ │   │
├───┼───┼───┼───┼───┼───┼───┤
│ 7 │ 8 │ 9 │10 │11 │12 │13 │
│   │ ● │   │   │ ● │   │   │
└───┴───┴───┴───┴───┴───┴───┘

● Blog post  ◐ Page update  ○ Draft saved
```

**Design principles:**
- No streaks, no "you missed X days" guilt
- Different colors/shapes for post types
- Just a quiet visual record
- Click a day to see what you published

---

## Quiet Wins (Oak+)

Weekly or monthly surfacing of older content that's still performing:

> "Your post from March is still finding readers"
> "Composting Basics has been read 47 times this month—6 months after you wrote it"

**Purpose:**
- Celebrates the long tail of content
- Reduces pressure for constant new output
- Shows that good writing has lasting value

---

## Seasonal Reflection

A "wrapped" style reflection, but **not** competitive or braggy. Reflective, not performative.

### How It Works

**Year 1 (All Paid Tiers):**
Every paid user automatically receives their first "Year in the Grove" reflection after 12 months on the platform. This is a celebratory milestone—no opt-in required.

**After Year 1:**
- **Oak+:** You can choose your reflection frequency in preferences:
  - Every 3 months (quarterly)
  - Every 6 months (bi-annual)
  - Every 12 months (annual)
  - Never
- **Evergreen:** Continues automatically (annual by default), with all frequency options available

**Delivery:** Via email, at the end of your chosen period. Private, personal, celebratory.

### Example

```
┌─────────────────────────────────────────────┐
│           Your Year in the Grove            │
│                   2025                       │
├─────────────────────────────────────────────┤
│                                              │
│  You wrote 47 posts this year.              │
│  12 of them really resonated with readers.  │
│                                              │
│  Your readers spent 340 hours               │
│  with your words.                           │
│                                              │
│  23 people became steady readers—           │
│  coming back again and again.               │
│                                              │
│  Your most-loved post:                      │
│  "Why I Garden at Midnight"                 │
│                                              │
│  A post from 2024 that's still growing:     │
│  "Starting Seeds in Winter"                 │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Platform Admin Dashboard

As platform owner, you have access to aggregate data for platform health and business decisions. This is **not** about surveilling individual users—it's about understanding how the forest grows.

### Aggregate Platform Metrics

| Metric | Description |
|--------|-------------|
| Total Users | Count by tier (Free, Seedling, Sapling, Oak, Evergreen) |
| Total Posts | All published posts across platform |
| Posts (24hr) | Published in last 24 hours |
| Active Blogs | Posted at least once in last 30 days |
| Avg Posts/Blog | Posts per active blog |
| Avg Replies/Post | Platform-wide reply average |
| Total Pageviews | Platform-wide, daily/weekly/monthly |

### Revenue Correlation

| Metric | Description |
|--------|-------------|
| Tier Distribution | Pie chart of user counts by tier |
| MRR by Tier | Revenue breakdown |
| Upgrade Rate | % moving to higher tiers |
| Churn by Tier | Cancellation rate per tier |
| LTV by Tier | Lifetime value estimates |
| At-Risk Accounts | Low activity + approaching renewal |

### Content Moderation Stats

Since content moderation is automated, monitoring is crucial:

| Metric | Description |
|--------|-------------|
| Reviews (24hr) | Posts reviewed in last 24 hours |
| Pass Rate | % of posts passing automated review |
| Flag Rate | % flagged for warnings |
| Escalation Rate | % requiring manual review |
| Category Breakdown | Which violation types are most common |
| False Positive Rate | Based on successful appeals |
| Avg Review Latency | Time from publish to review complete |
| Appeal Volume | Appeals submitted/resolved |

### Platform Health

| Metric | Description |
|--------|-------------|
| Error Rate | API errors, failed requests |
| Avg Response Time | API performance |
| Storage Usage | Total R2 usage across tenants |
| Database Size | D1 usage trends |
| Uptime | Worker availability |

### Data Retention

As platform admin, you have **lifetime retention** of aggregate metrics. Individual blog analytics follow tier-based retention rules.

---

## Technical Architecture

### Tech Stack
- **Collection:** Cloudflare Workers (edge-based)
- **Storage:** Cloudflare D1 (per-tenant analytics tables)
- **Caching:** Cloudflare KV (aggregated stats, platform metrics)
- **Dashboard:** SvelteKit components in admin panel
- **Consent:** Custom lightweight banner
- **Scheduling:** Cloudflare Cron Triggers (daily aggregation, signal calculation)

### Data Flow

```
                              ┌─────────────────┐
                              │  24hr Delay     │
                              │  Queue          │
                              └────────┬────────┘
                                       │
User Visit → Consent Check → Collect → │ → Aggregate → Calculate Signals → Dashboard
                                       │
                              (events held 24hrs before processing)
```

### Database Schema

#### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  blog_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- 'pageview', 'scroll', 'time', 'complete', 'explore'
  timestamp INTEGER NOT NULL,
  process_after INTEGER NOT NULL,  -- 24hrs after timestamp (delayed visibility)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Visitor (anonymized)
  visitor_hash TEXT NOT NULL,      -- Daily rotating hash (for anonymous visitors)
  session_id TEXT,
  is_logged_in INTEGER DEFAULT 0,  -- For return reader tracking
  user_hash TEXT,                  -- Stable anonymized hash of user ID (logged-in only)

  -- Event data
  data TEXT,                       -- JSON for flexible event properties

  -- Source
  referrer_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,

  -- Device
  device_type TEXT,
  browser_family TEXT,
  country_code TEXT,

  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);

CREATE INDEX idx_events_post ON analytics_events(post_id);
CREATE INDEX idx_events_blog ON analytics_events(blog_id);
CREATE INDEX idx_events_process ON analytics_events(process_after);
CREATE INDEX idx_events_process_blog ON analytics_events(blog_id, process_after);  -- Composite for daily aggregation
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_user ON analytics_events(user_hash);
```

#### Daily Aggregates Table

```sql
CREATE TABLE analytics_daily (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  blog_id TEXT NOT NULL,
  date TEXT NOT NULL,              -- YYYY-MM-DD

  -- Volume
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  logged_in_readers INTEGER DEFAULT 0,

  -- Engagement
  deep_reads INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  engaged_readers INTEGER DEFAULT 0,  -- deep_read AND completion
  avg_time_on_page REAL DEFAULT 0,
  avg_scroll_depth REAL DEFAULT 0,

  -- Discovery
  first_impressions INTEGER DEFAULT 0,  -- First-time blog visitors
  explored_further INTEGER DEFAULT 0,   -- Clicked to another post

  -- Breakdowns (JSON)
  referrer_breakdown TEXT,
  device_breakdown TEXT,
  browser_breakdown TEXT,
  country_breakdown TEXT,

  UNIQUE(post_id, date),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);

CREATE INDEX idx_daily_post ON analytics_daily(post_id);
CREATE INDEX idx_daily_blog ON analytics_daily(blog_id);
CREATE INDEX idx_daily_date ON analytics_daily(date);
```

#### Blog-Level Stats Table

```sql
CREATE TABLE analytics_blog_stats (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  date TEXT NOT NULL,

  -- Totals
  total_pageviews INTEGER DEFAULT 0,
  total_unique_visitors INTEGER DEFAULT 0,
  total_posts_viewed INTEGER DEFAULT 0,

  -- Engagement
  total_engaged_readers INTEGER DEFAULT 0,
  avg_time_on_page REAL DEFAULT 0,
  avg_scroll_depth REAL DEFAULT 0,
  avg_completion_rate REAL DEFAULT 0,

  -- Loyalty
  return_readers INTEGER DEFAULT 0,
  steady_readers INTEGER DEFAULT 0,
  new_readers INTEGER DEFAULT 0,

  -- Content
  posts_published INTEGER DEFAULT 0,
  top_posts TEXT,                  -- JSON array of {post_id, views, engaged}

  UNIQUE(blog_id, date),
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);

CREATE INDEX idx_blog_stats_blog ON analytics_blog_stats(blog_id);
CREATE INDEX idx_blog_stats_date ON analytics_blog_stats(date);
```

#### Reader Tracking Table (for Return/Steady Readers)

**Important:** This table only tracks **logged-in users**. Anonymous visitors cannot be reliably tracked for return/steady reader metrics due to IP rotation, VPNs, etc. The `user_hash` is a stable SHA-256 hash of the user's ID combined with a secret salt—it never changes for a given user, enabling accurate loyalty tracking.

```sql
CREATE TABLE reader_history (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  user_hash TEXT NOT NULL,         -- SHA-256(user_id + secret_salt) - stable, logged-in users only
  first_read_at INTEGER NOT NULL,
  last_read_at INTEGER NOT NULL,
  total_posts_read INTEGER DEFAULT 1,
  is_steady INTEGER DEFAULT 0,     -- Set to 1 when total_posts_read >= 3
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  UNIQUE(blog_id, user_hash),
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);

CREATE INDEX idx_reader_blog ON reader_history(blog_id);
CREATE INDEX idx_reader_steady ON reader_history(is_steady);
```

#### User Preferences Table

```sql
CREATE TABLE analytics_preferences (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL UNIQUE,

  -- Wellness settings
  digest_mode INTEGER DEFAULT 0,   -- Dashboard disabled
  digest_frequency TEXT DEFAULT 'weekly',  -- 'weekly', 'monthly', 'quarterly'

  -- Focus periods
  focus_schedule TEXT,             -- JSON: {"days": ["monday", "tuesday"]} or null
  focus_until INTEGER,             -- One-time focus end timestamp

  -- Seasonal Reflection (Oak+)
  reflection_frequency TEXT DEFAULT 'annual',  -- 'quarterly', 'biannual', 'annual', 'never'

  -- Retention
  custom_retention_years INTEGER CHECK(custom_retention_years >= 1 AND custom_retention_years <= 5),  -- Evergreen only

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER,
  FOREIGN KEY (blog_id) REFERENCES tenants(id)
);
```

#### Platform Metrics Table (Admin Only)

```sql
CREATE TABLE platform_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,       -- YYYY-MM-DD

  -- Users
  total_users INTEGER DEFAULT 0,
  users_by_tier TEXT,              -- JSON: {"free": 100, "seedling": 50, ...}
  new_signups INTEGER DEFAULT 0,

  -- Content
  total_posts INTEGER DEFAULT 0,
  posts_published_today INTEGER DEFAULT 0,
  active_blogs INTEGER DEFAULT 0,

  -- Engagement
  total_pageviews INTEGER DEFAULT 0,
  avg_replies_per_post REAL DEFAULT 0,

  -- Revenue
  mrr_total INTEGER DEFAULT 0,     -- In cents
  mrr_by_tier TEXT,                -- JSON
  upgrades INTEGER DEFAULT 0,
  downgrades INTEGER DEFAULT 0,
  churns INTEGER DEFAULT 0,

  -- Moderation
  posts_reviewed INTEGER DEFAULT 0,
  posts_passed INTEGER DEFAULT 0,
  posts_flagged INTEGER DEFAULT 0,
  posts_escalated INTEGER DEFAULT 0,
  moderation_categories TEXT,      -- JSON breakdown
  appeals_submitted INTEGER DEFAULT 0,
  appeals_granted INTEGER DEFAULT 0,
  avg_review_latency_ms INTEGER DEFAULT 0,

  -- Health
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  storage_used_bytes INTEGER DEFAULT 0
);

CREATE INDEX idx_platform_date ON platform_metrics(date);
```

---

## API Endpoints

### Collection API (Public)

**Rate Limiting:**
To prevent abuse and inflated metrics, collection endpoints are rate-limited per session:
- **Pageviews:** 100 per hour per session
- **Reading progress:** 20 per hour per session

Exceeding limits returns `429 Too Many Requests`.

**Track Page View:**
```typescript
POST /api/rings/pageview
Body: {
  post_id: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
}
Response: { success: boolean; session_id: string }
```

**Track Reading Progress:**
```typescript
POST /api/rings/reading
Body: {
  session_id: string;
  time_on_page: number;       // Seconds
  scroll_depth: number;       // 0-100
  reached_end: boolean;
  explored_further: boolean;  // Clicked another post
}
Response: { success: boolean }
```

### Dashboard API (Auth Required)

**Get Post Analytics:**
```typescript
GET /api/rings/posts/:postId
Query: { start_date: string; end_date: string }
Auth: Blog owner (Sapling+)
Response: {
  views: number;
  engaged_readers: number;
  deep_reads: number;
  finish_rate: number;
  first_impressions: number;
  reading_journey: number;
  signals: Array<{ type: string; triggered_at: number }>;
  daily_data?: Array<{date, views, engaged}>;  // Oak+
  referrers?: Array<{domain, count}>;          // Oak+
  devices?: {desktop, tablet, mobile};         // Oak+
}
```

**Get Blog Overview:**
```typescript
GET /api/rings/overview
Query: { start_date: string; end_date: string }
Auth: Blog owner (Seedling+)
Response: {
  total_views: number;
  return_readers?: number;      // Sapling+
  steady_readers?: number;      // Oak+
  recent_posts: Array<{post_id, title, views, signals?}>;
  quiet_wins?: Array<{post_id, title, recent_views}>;  // Oak+
  posting_calendar?: Record<string, string[]>;         // Oak+ - date -> post_ids
}
```

**Get Preferences:**
```typescript
GET /api/rings/preferences
Auth: Blog owner (Oak+)
Response: {
  digest_mode: boolean;
  digest_frequency: 'weekly' | 'monthly' | 'quarterly';
  focus_schedule: { days: string[] } | null;
  focus_until: number | null;
  reflection_frequency: 'quarterly' | 'biannual' | 'annual' | 'never';
  custom_retention_years: number | null;  // Evergreen only
}
```

**Update Preferences:**
```typescript
PUT /api/rings/preferences
Auth: Blog owner (Oak+)
Body: {
  digest_mode?: boolean;
  digest_frequency?: 'weekly' | 'monthly' | 'quarterly';
  focus_schedule?: { days: string[] } | null;
  focus_until?: number | null;
  reflection_frequency?: 'quarterly' | 'biannual' | 'annual' | 'never';
  custom_retention_years?: number;  // Evergreen only, 1-5
}
Response: { success: boolean }
```

**Export Analytics:**
```typescript
GET /api/rings/export
Query: { start_date: string; end_date: string; format: 'csv' | 'json' }
Auth: Blog owner (Oak+)
Response: File download

// Validation: format must be exactly 'csv' or 'json'
// Invalid format returns 400: { error: 'Invalid format. Use csv or json.' }
```

### Platform Admin API

**Get Platform Overview:**
```typescript
GET /api/admin/rings/platform
Query: { start_date: string; end_date: string }
Auth: Platform admin only
Response: {
  users: { total, by_tier, new_signups, growth_rate },
  content: { total_posts, today, active_blogs },
  engagement: { pageviews, avg_replies },
  revenue: { mrr, by_tier, upgrades, downgrades, churns },
  moderation: { reviewed, passed, flagged, escalated, categories, appeals },
  health: { errors, response_time, storage }
}
```

---

## Cookie & Consent Strategy

### Consent Banner

Lightweight, warm, non-intrusive:

```
┌─────────────────────────────────────────────────────────────┐
│  We track reading patterns to help the author understand    │
│  what resonates. No ads, no cross-site tracking.           │
│                                                              │
│  [That's fine]  [No thanks]  [Learn more]                   │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Appears on first visit only
- Choice stored in localStorage
- Remembered for 1 year
- "Learn more" links to privacy policy

### With Consent

- `grove_visitor` cookie (session only, Secure, SameSite=Strict)
- Full reading behavior tracked
- More accurate unique visitor counts

### Without Consent

- No cookies set
- Basic pageview still counted (via IP hash)
- No reading behavior tracked
- Unique visitors estimated (less accurate)

---

## Data Retention

| Tier | Retention | Notes |
|------|-----------|-------|
| Seedling | 30 days rolling | Recent 5 posts only |
| Sapling | 30 days rolling | Full metrics |
| Oak | 1 year | Default, full access |
| Evergreen | 1-5 years | Customizable |
| Platform Admin | Lifetime | Aggregate only |

### Automatic Cleanup

Daily cron job removes:
- Raw events older than tier retention
- Daily aggregates older than tier retention
- Reader history entries with no activity in 2 years

---

## Privacy Compliance

### GDPR Requirements

1. **Lawful Basis:** Consent (via banner)
2. **Data Minimization:** Only collect what's needed
3. **Purpose Limitation:** Only for analytics, never advertising
4. **Storage Limitation:** Tier-based retention, then deletion
5. **Right to Access:** Export function
6. **Right to Erasure:** Delete on account closure
7. **Data Processing Agreement:** Cloudflare as processor

### Technical Privacy Measures

1. **IP Anonymization:** Hash with daily rotating salt
2. **24-Hour Delay:** No real-time individual tracking
3. **Session Cookies Only:** No persistent tracking
4. **No Cross-Site Tracking:** SameSite=Strict
5. **Aggregation:** Individual sessions not visible to admin
6. **Automatic Expiry:** Data deleted per retention schedule
7. **Encryption:** HTTPS only, encrypted at rest

---

## Implementation Phases

### Phase 5a: Core Collection & Basic Dashboard

**Scope:**
- Event collection with 24hr delay
- Consent banner
- Basic view counts (Seedling)
- Engaged Readers metric (Sapling)
- Simple dashboard UI

**Deliverables:**
- [ ] Collection Worker with delay queue
- [ ] Consent banner component
- [ ] Daily aggregation cron job
- [ ] Seedling dashboard (view counts)
- [ ] Sapling metrics calculations

### Phase 5b: Resonance Indicators & Insights

**Scope:**
- Signal calculation system
- Return/Steady reader tracking
- Reading Journey metric
- Posting Calendar

**Deliverables:**
- [ ] Resonance signal calculator
- [ ] Reader history tracking
- [ ] First Impressions calculation
- [ ] Posting Calendar component
- [ ] Signal display on posts

### Phase 5c: Wellness Features & Export

**Scope:**
- Digest Mode
- Focus Periods
- Export functionality
- Quiet Wins

**Deliverables:**
- [ ] Preferences API
- [ ] Digest email system
- [ ] Focus mode UI
- [ ] Export endpoints
- [ ] Quiet Wins algorithm

### Phase 5d: Platform Admin & Evergreen

**Scope:**
- Platform admin dashboard
- Content moderation integration
- Seasonal Reflection
- Custom retention

**Deliverables:**
- [ ] Platform metrics collection
- [ ] Admin dashboard UI
- [ ] Moderation stats integration
- [ ] Seasonal Reflection email
- [ ] Evergreen customization

---

## Success Metrics

### Technical Goals

- [ ] < 50ms collection latency
- [ ] < 1KB tracking script
- [ ] > 60% consent acceptance rate
- [ ] < 5% impact on page load
- [ ] Zero PII in database
- [ ] 24hr delay consistently enforced

### Writer Wellness Goals

- [ ] < 50% of Oak+ users check dashboard daily (less obsessive checking is good)
- [ ] > 20% of Oak+ users enable Digest Mode or Focus Periods
- [ ] Positive qualitative feedback on anxiety reduction
- [ ] No support tickets about "why are my stats low"

### Platform Goals

- [ ] Analytics as upgrade incentive: 15%+ of upgrades mention analytics
- [ ] Admin dashboard used weekly for platform health checks
- [ ] Content moderation stats provide actionable insights

---

## Future Enhancements

- **Writing prompts:** AI-powered suggestions based on what resonates with your readers
- **A/B testing:** Test titles/images (Evergreen only, privacy-respecting)
- **Collaborative stats:** Aggregate anonymous insights across willing Grove blogs
- **Goal setting:** Personal goals, not competitive metrics ("I want to write 2x/week")
- **Reading recommendations:** "Readers who liked this also read..." to help you understand your audience

---

*Last Updated: December 2025*
