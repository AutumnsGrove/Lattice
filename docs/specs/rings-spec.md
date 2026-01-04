---
aliases: []
date created: Monday, December 29th 2025
date modified: Friday, January 3rd 2026
tags:
  - analytics
  - privacy
  - writer-wellness
  - cloudflare-workers
type: tech-spec
---

# Rings — Private Analytics

> *Count the rings and you learn the story.*

Grove's private analytics system designed for writers, not marketers. Provides meaningful insights without the anxiety of real-time dashboards, featuring 24-hour delayed stats, resonance indicators, and wellness-focused features like Digest Mode and Focus Periods.

**Public Name:** Rings
**Internal Name:** GroveRings
**Phase:** Phase 5 Enhancement
**Last Updated:** December 2025

Count the rings of a tree and you learn its story. Each ring records a season: growth in plenty, resilience through hardship, the quiet accumulation of years. Rings are internal. Private. You only see them when you look closely at your own tree.

Rings is analytics for writers, not marketers. Private insights without the anxiety of real-time dashboards. Your growth reflected back to you, not performed for others.

---

## Philosophy

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

Instead of showing vote scores or engagement numbers, Rings uses **Resonance Indicators**: positive signals that appear only when earned.

### Signal System

| Signal | Icon | Trigger | Appears After |
|--------|------|---------|---------------|
| **Sparked Interest** | 🌱 | Above your personal average engagement | 7 days after publish |
| **Really Resonated** | 🌿 | Significantly above your average (top 25%) | 7 days after publish |
| **Community Favorite** | 🌳 | Top 10% of your posts ever | 7 days after publish |

### Signal Timing

**"7 days after publish"** means 7 days after the post's published_at date. Signals are calculated at that moment using engagement data accumulated up to that point. This creates a consistent evaluation window for all posts.

Example:
- Post published December 1st at 10:00 AM
- Signal calculation runs December 8th at 00:00 UTC
- If triggered, signal appears immediately on December 8th
- Writers can't game signals by posting at specific times—everyone gets 7 days

### Design Principles

- **Relative to YOU** - Signals compare to your own baseline, never to others
- **7-day evaluation window** - Every post gets exactly 7 days to accumulate engagement
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

  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_signals_post ON resonance_signals(post_id);
CREATE INDEX idx_signals_blog ON resonance_signals(blog_id);
CREATE INDEX idx_signals_visible ON resonance_signals(visible_after);
```

---

## Metrics by Tier

### Seedling (Basic - $8/month)

**Access:** View counts on your 5 most recently published posts
**Retention:** Rolling 30 days
**Features:**
- Total views per post (delayed 24hrs)
- Simple "X views" display
- No charts, no breakdowns

**"Recent 5 posts"** = your 5 most recently published posts by publish date, regardless of when you wrote them. Scheduled posts count from their publish date, not their creation date.

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
Every paid user automatically receives their first "Year in the Grove" reflection 12 months after their signup date. This is a celebratory milestone—no opt-in required.

**Important:** Reflections are based on your **signup anniversary**, not the calendar year. If you joined in March, your first reflection arrives the following March.

**Data Retention Note:** Even tiers with 30-day rolling retention (Seedling, Sapling) receive their Year 1 reflection. Key annual metrics (total posts, total engaged readers, resonance signals earned) are stored in a separate `reflection_snapshots` table that persists regardless of tier retention limits. This table only stores aggregate totals—no per-post or per-day granularity.

**After Year 1:**
- **Oak+:** You can choose your reflection frequency in preferences:
  - Every 3 months (quarterly)
  - Every 6 months (bi-annual)
  - Every 12 months (annual)
  - Never
- **Evergreen:** Continues automatically (annual by default), with all frequency options available

**Frequency is signup-anchored, not rolling.** If you signed up March 15th and choose quarterly:
- First reflection: March 15th (Year 1 anniversary)
- Subsequent reflections: June 15th, September 15th, December 15th, March 15th...

This keeps reflections predictable and aligned with your personal Grove timeline, not arbitrary calendar dates.

**Delivery:** Via email, at the end of your chosen period. Private, personal, celebratory.

### Warm Messaging for Non-Posters

Not everyone writes immediately—some users are setting up, some are finding their voice. Reflections adapt:

**If you haven't published yet:**
```
┌─────────────────────────────────────────────┐
│           Your Year in the Grove            │
│                   2025                      │
├─────────────────────────────────────────────┤
│                                             │
│  You've been in the Grove for a year now.   │
│  Your space is ready whenever you are.      │
│                                             │
│  No pressure, no timeline.                  │
│  Some seeds take longer to sprout.          │
│                                             │
│  When you're ready to share,                │
│  we'll be here.                             │
│                                             │
└─────────────────────────────────────────────┘
```

**If you published just a few posts:**
```
│  You wrote 3 posts this year.               │
│  Every one of them found readers.           │
│                                             │
│  Quality over quantity—                     │
│  your words are landing.                    │
```

### Example (Active Writer)

```
┌─────────────────────────────────────────────┐
│           Your Year in the Grove            │
│                   2025                      │
├─────────────────────────────────────────────┤
│                                             │
│  You wrote 47 posts this year.              │
│  12 of them really resonated with readers.  │
│                                             │
│  Your readers spent 340 hours               │
│  with your words.                           │
│                                             │
│  23 people became steady readers,           │
│  coming back again and again.               │
│                                             │
│  Your most-loved post:                      │
│  "Why I Garden at Midnight"                 │
│                                             │
│  A post from 2024 that's still growing:     │
│  "Starting Seeds in Winter"                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Platform Admin Dashboard

As platform owner, you have access to aggregate data for platform health and business decisions. This is **not** about surveilling individual users. It's about understanding how the forest grows.

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

### GDPR Compliance (Platform Admin)

Platform admin access is designed for GDPR compliance:
- **Aggregates only** - You never see individual user data, only platform-wide totals
- **No individual blog access** - You cannot view a specific blog's analytics without being the blog owner
- **Moderation stats are anonymized** - Category breakdowns show patterns, not specific posts
- **Revenue data is business-critical** - Justifiable for platform operations under legitimate interest
- **No cross-referencing** - Aggregate data cannot be linked back to individual users

---

## Technical Architecture

### Tech Stack
- **Collection:** Cloudflare Workers (edge-based)
- **Storage:** Cloudflare D1 (per-tenant analytics tables)
- **Caching:** Cloudflare KV (aggregated stats, platform metrics)
- **Dashboard:** SvelteKit components in admin panel
- **Consent:** Custom lightweight banner
- **Scheduling:** Cloudflare Cron Triggers (daily aggregation, signal calculation)

### Timezone Handling

**All timestamps are UTC.** This simplifies aggregation and ensures consistent behavior:

- Event timestamps: UTC Unix timestamps
- Daily aggregation dates: `YYYY-MM-DD` in UTC
- Signal evaluation ("7 days after publish"): UTC midnight boundaries
- Visitor hash rotation: UTC midnight
- Seasonal Reflection delivery: Based on signup date at UTC midnight

**Dashboard display:** Convert to user's local timezone in the UI layer only. Store everything as UTC, display as local.

**Post publish times:** A post published at "December 1st 10:00 AM EST" is stored as `2025-12-01T15:00:00Z`. The 7-day signal window evaluates at `2025-12-08T00:00:00Z` UTC, which covers the full 7 days regardless of timezone.

### KV Caching Strategy

Dashboard data is cached in Cloudflare KV to reduce D1 load:

| Cache Key Pattern | TTL | Invalidation |
|-------------------|-----|--------------|
| `rings:blog:{id}:overview` | 1 hour | On new aggregation |
| `rings:blog:{id}:post:{postId}` | 1 hour | On new aggregation |
| `rings:blog:{id}:signals` | 24 hours | On signal calculation |
| `rings:platform:metrics` | 15 minutes | On platform aggregation |
| `rings:rate:{session}:{endpoint}` | 1 hour | Auto-expire |

**Invalidation Triggers:**
- Daily aggregation cron invalidates all `overview` and `post` caches for processed blogs
- Signal calculation cron invalidates `signals` cache for blogs with new signals
- Tier changes immediately invalidate all caches for that blog

**Cache Warming:**
- After aggregation, pre-warm the overview cache for active blogs
- Don't pre-warm individual post caches (on-demand is fine)

**Tier Change Handling:**
- On upgrade: cache is invalidated, new data available immediately
- On downgrade: cache is invalidated, dashboard shows tier-appropriate data only

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

#### Deletion Behavior

All analytics tables use `ON DELETE CASCADE` for foreign keys. When a post or blog is deleted:

**Post Deletion:**
- All `analytics_events` for that post → deleted
- All `analytics_daily` for that post → deleted
- All `resonance_signals` for that post → deleted

**This is intentional.** When a writer deletes a post, they expect all traces removed. Analytics data about a deleted post serves no purpose. The writer can't see it, and retaining it feels invasive.

**Blog/Tenant Deletion:**
- All analytics tables for that blog → cascade deleted
- Platform aggregate metrics are NOT affected (they're already anonymized counts)

**Alternative Considered (Soft Delete):**
We considered `post_deleted_at` soft-delete to preserve platform health metrics, but rejected it:
- Writers expect deletion to mean deletion
- Platform metrics don't need per-post granularity
- Simpler data model, clearer privacy story

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

  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_post ON analytics_events(post_id);
CREATE INDEX idx_events_blog ON analytics_events(blog_id);
CREATE INDEX idx_events_process ON analytics_events(process_after);  -- Platform-wide aggregation queries
CREATE INDEX idx_events_process_blog ON analytics_events(blog_id, process_after);  -- Per-blog daily aggregation
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

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  UNIQUE(post_id, date),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
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

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  UNIQUE(blog_id, date),
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_blog_stats_blog ON analytics_blog_stats(blog_id);
CREATE INDEX idx_blog_stats_date ON analytics_blog_stats(date);
```

#### Reader Tracking Table (for Return/Steady Readers)

**Important:** This table only tracks **logged-in users**. Anonymous visitors cannot be reliably tracked for return/steady reader metrics due to IP rotation, VPNs, etc. The `user_hash` is generated using HMAC-SHA256 (see Security Implementation section).

The `reading_sessions` field stores timestamps of each reading session, enabling accurate "Return Reader" calculations with time windows (e.g., "came back within 30 days").

```sql
CREATE TABLE reader_history (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  user_hash TEXT NOT NULL,         -- HMAC-SHA256(user_id, secret_key) - stable, logged-in users only
  first_read_at INTEGER NOT NULL,
  last_read_at INTEGER NOT NULL,
  total_posts_read INTEGER DEFAULT 1,
  reading_sessions TEXT,           -- JSON array of timestamps: [1702598400, 1703203200, ...]
  is_steady INTEGER DEFAULT 0,     -- Set to 1 when total_posts_read >= 3
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  UNIQUE(blog_id, user_hash),
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_reader_blog ON reader_history(blog_id);
CREATE INDEX idx_reader_steady ON reader_history(is_steady);
CREATE INDEX idx_reader_last_read ON reader_history(last_read_at);
CREATE INDEX idx_reader_user ON reader_history(user_hash);  -- For cross-blog Return Reader queries
```

**Return Reader Calculation:**
A reader qualifies as a "Return Reader" if they have 2+ entries in `reading_sessions` where at least one pair of sessions is within 30 days of each other. This accurately distinguishes someone who read twice in one day vs someone who genuinely returned weeks later.

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
  FOREIGN KEY (blog_id) REFERENCES tenants(id) ON DELETE CASCADE
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

### Durable Objects Architecture (Scale Layer)

> **Full Reference:** See `docs/grove-durable-objects-architecture.md` for complete DO system design.

The base architecture above works well at small scale. For high traffic, Durable Objects provide a coordination layer that dramatically reduces D1 writes while enabling real-time features.

**Key Insight:** DOs aren't replacing D1—they're a *coordination and caching layer* that sits between Workers and D1. D1 remains the source of truth.

### Load Testing Integration

Rings analytics can be leveraged for **load testing validation** via the Sentinel pattern. This provides infrastructure-level validation during stress testing to ensure analytics collection remains reliable under high load.

**Load Testing Validation Workflow:**
1. **Sentinel** executes load tests against Grove infrastructure
2. **Rings Collection** continues capturing analytics events (with rate limiting)
3. **Vista** monitors infrastructure health during tests
4. **Validation Metrics** captured for post-test analysis:
   - Collection latency during peak load
   - Event processing delay consistency (24hr delay maintained)
   - Data accuracy under stress (sampling thresholds)
   - Dashboard availability during tests

**Integration Points:**
- Load test events marked with special metadata for filtering
- Rate limiting temporarily adjusted during planned tests
- Collection endpoints monitored for timeout behavior
- Analytics accuracy validated against baseline metrics

**Validation Metrics:**
- Collection endpoint response times under load
- Event buffer overflow prevention during tests
- Dashboard query performance during peak traffic
- Data retention consistency during stress periods

**Load Test Event Marking:**
```typescript
// Events during load tests include metadata
{
  "event_type": "pageview",
  "post_id": "test_post",
  "metadata": {
    "load_test": true,
    "test_id": "sentinel_2025_01_02_001",
    "phase": "ramp_up"
  }
}
```

This allows post-test analysis to separate load test traffic from real user analytics, ensuring accurate baseline metrics for normal operations.

#### AnalyticsDO Design

**ID Pattern:** `analytics:{tenantId}:{date}` (e.g., `analytics:alice:2025-12-25`)

One DO per tenant per day provides:
- **Per-tenant isolation** — Each tenant's analytics in their own DO
- **Natural partitioning** — No single DO gets too hot
- **Easy cleanup** — Old data naturally isolated
- **Simple date queries** — Date is in the ID

#### DO SQLite Storage

```sql
-- Hourly aggregates (0-23)
CREATE TABLE hourly (
  hour INTEGER PRIMARY KEY,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_time_on_page REAL,
  bounce_rate REAL,
  posts_created INTEGER NOT NULL DEFAULT 0,
  comments_created INTEGER NOT NULL DEFAULT 0,
  reactions_given INTEGER NOT NULL DEFAULT 0
);

-- Per-page stats
CREATE TABLE pages (
  path TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds REAL,
  entries INTEGER NOT NULL DEFAULT 0,
  exits INTEGER NOT NULL DEFAULT 0
);

-- Referrer tracking
CREATE TABLE referrers (
  source TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0
);

-- Unique visitor hashes (for deduplication within day)
CREATE TABLE visitors (
  hash TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 1
);

-- Content performance
CREATE TABLE content (
  post_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  reactions INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  avg_read_time REAL
);
```

#### Event Flow with DOs

```
Event occurs (page view, reaction, etc.)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Source DO (TenantDO, PostDO, SessionDO)                                 │
│  - Captures event with minimal processing                               │
│  - Forwards to AnalyticsDO                                              │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ AnalyticsDO (id: analytics:{tenantId}:{date})                          │
│  - Receives all events for this tenant on this day                     │
│  - Aggregates in memory (page views, unique visitors, etc.)            │
│  - Updates live dashboard via WebSocket                                │
│  - Flushes to D1 every 60 seconds                                      │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (every 60 seconds)
┌─────────────────────────────────────────────────────────────────────────┐
│ D1 Database (rings tables)                                              │
│  - Stores finalized hourly/daily aggregates                            │
│  - Historical data for reporting                                        │
│  - Never receives raw events (only aggregates)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Privacy: Hash Rotation

The visitor hash salt changes daily, ensuring no cross-day tracking:

```typescript
function getVisitorHash(ip: string, userAgent: string, date: string): string {
  const salt = `grove-analytics-${date}`;  // Date-based salt
  return crypto.createHash("sha256")
    .update(`${salt}:${ip}:${userAgent}`)
    .digest("hex")
    .substring(0, 16);
}
```

This means:
- Same visitor on same day = same hash (for unique counting)
- Same visitor on different day = different hash (no cross-day tracking)
- Cannot reverse hash to get IP

#### Flush Strategy

```typescript
class AnalyticsDO extends DurableObject {
  private async scheduleFlush() {
    if (this.pendingFlush) return;
    this.pendingFlush = true;
    await this.ctx.storage.setAlarm(Date.now() + 60_000);  // 60 seconds
  }

  async alarm() {
    await this.flush();
    this.pendingFlush = false;
    if (this.eventBuffer.length > 0 || this.hasUnflushedStats()) {
      await this.scheduleFlush();
    }
  }
}
```

#### Real-Time Dashboard (WebSocket)

AnalyticsDO supports WebSocket connections for live dashboards:

```typescript
// Server -> Client
type ServerMessage =
  | { type: "init"; stats: FullStats }
  | { type: "update"; stats: Partial<Stats> }
  | { type: "event"; event: RecentEvent };
```

#### Write Reduction Analysis

**Before (Direct D1):**
- 10,000 page views/day = 10,000 D1 writes
- 1,000 reactions/day = 1,000 D1 writes
- Total: 11,000 writes/day

**After (With AnalyticsDO):**
- 10,000 page views → buffered in DO → 1,440 writes (once per minute)
- 1,000 reactions → buffered in DO → same flush cycle
- Plus 1 daily summary write
- Total: ~1,441 writes/day

**Reduction: 87%**

At scale (100 tenants, 10K views each):
- Before: 1,100,000 writes/day
- After: ~144,100 writes/day

#### End-of-Day Finalization

At midnight UTC, the AnalyticsDO finalizes:

1. Final flush to D1
2. Calculate daily aggregates
3. Write summary to `daily_stats` table
4. Clear visitor hashes (privacy)
5. Close any remaining WebSocket connections

---

## API Endpoints

### Collection API (Public)

**Rate Limiting:**
To prevent abuse and inflated metrics, collection endpoints are rate-limited:

**Primary (session-based):**
- **Pageviews:** 100 per hour per session
- **Reading progress:** 20 per hour per session

**Fallback (IP-based):**
For users without valid session cookies (bots, scrapers, consent-declined):
- **Pageviews:** 50 per hour per IP
- **Reading progress:** Blocked entirely (no session = no tracking)

IP-based limits use a shortened hash of the IP for privacy. Exceeding limits returns `429 Too Many Requests`.

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

**Export Format Schema:**

JSON export structure:
```json
{
  "exported_at": "2025-12-14T00:00:00Z",
  "blog_id": "blog_123",
  "date_range": { "start": "2025-01-01", "end": "2025-12-14" },
  "summary": {
    "total_views": 12450,
    "total_engaged_readers": 3200,
    "total_return_readers": 890,
    "total_steady_readers": 156
  },
  "posts": [
    {
      "post_id": "post_abc",
      "title": "Why I Garden at Midnight",
      "published_at": "2025-03-15T10:00:00Z",
      "total_views": 1200,
      "engaged_readers": 340,
      "deep_reads": 280,
      "finish_rate": 0.72,
      "first_impressions": 450,
      "signals": ["sparked_interest", "really_resonated"],
      "daily": [
        { "date": "2025-03-15", "views": 89, "engaged": 24 },
        { "date": "2025-03-16", "views": 156, "engaged": 42 }
      ]
    }
  ],
  "reader_stats": {
    "return_readers_count": 890,
    "steady_readers_count": 156
  }
}
```

CSV export columns:
```
date,post_id,post_title,views,engaged_readers,deep_reads,finish_rate,first_impressions,referrer_domain,device_type,country_code
2025-03-15,post_abc,Why I Garden at Midnight,89,24,18,0.68,32,twitter.com,desktop,US
2025-03-16,post_abc,Why I Garden at Midnight,156,42,35,0.74,67,google.com,mobile,GB
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

### API Error Responses

All Rings API endpoints return consistent error responses:

```typescript
// Error response format
{
  error: string;           // Human-readable message
  code: string;            // Machine-readable error code
  details?: object;        // Optional additional context
}
```

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `invalid_date_range` | Date range invalid or exceeds tier maximum |
| 400 | `invalid_format` | Export format not 'csv' or 'json' |
| 400 | `malformed_event` | Event data failed validation |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `tier_insufficient` | Feature requires higher tier |
| 403 | `not_blog_owner` | User doesn't own this blog |
| 404 | `post_not_found` | Post doesn't exist or was deleted |
| 404 | `blog_not_found` | Blog doesn't exist |
| 409 | `outside_retention` | Requested date range outside retention window |
| 429 | `rate_limited` | Too many requests (includes Retry-After header) |
| 500 | `aggregation_error` | Internal error during data processing |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1702598400
Retry-After: 3600  (only on 429)
```

---

## Cookie & Consent Strategy

### Consent Banner

Lightweight, warm, non-intrusive:

```
┌─────────────────────────────────────────────────────────────┐
│  We track reading patterns to help the author understand    │
│  what resonates. No ads, no cross-site tracking.            │
│                                                             │
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

### Tier Change Behavior

**Upgrades (e.g., Sapling → Oak):**
- New retention period applies immediately
- Historical data is preserved if within new retention window
- No backfill—you can only see data from when you had analytics enabled
- Dashboard immediately shows expanded metrics

**Downgrades (e.g., Oak → Sapling):**
- **30-day grace period** before data deletion
- During grace: data still exists but dashboard shows new tier's metrics only
- After grace: data outside new retention window is permanently deleted
- Prevents accidental data loss from billing issues
- Re-upgrading within grace period restores full access

**Cancellation (any tier → Free):**
- Same 30-day grace period
- After grace: all analytics data deleted
- Reader history cleared (user hashes can't be re-linked anyway)
- Platform aggregate contributions remain (anonymized, not attributable)

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

## Security Implementation

### User Hash Generation

For logged-in user tracking (Return Readers, Steady Readers), we use HMAC-SHA256 with a secret key and pepper for additional security:

```typescript
// Generate stable user hash - NEVER changes for a given user
function generateUserHash(userId: string): string {
  const secretKey = env.ANALYTICS_HMAC_KEY;    // 256-bit key in Cloudflare secrets
  const pepper = env.ANALYTICS_PEPPER;          // Additional secret, stored separately

  const message = `${userId}:${pepper}`;
  return hmacSha256(message, secretKey);
}
```

**Key Management:**
- `ANALYTICS_HMAC_KEY`: 256-bit cryptographic key stored in Cloudflare Workers secrets
- `ANALYTICS_PEPPER`: Additional secret stored separately (different secret store or environment)
- Keys are **never rotated** for user hashes (would break reader history linkage)
- If key compromise is suspected: generate new keys, invalidate all reader_history data, start fresh

**Platform-Wide vs Per-Blog Keys:**
Keys are **platform-wide**, not per-blog. Rationale:
- The `user_hash` is scoped to `(blog_id, user_hash)` in the database—same user on different blogs has different records anyway
- Per-blog keys would require key management per tenant (complexity, rotation nightmares)
- Cross-blog tracking is already impossible: we only store which users read which blog, never correlate across blogs
- If an attacker compromises the key, they still can't reverse the hash without the user_id input

**Why HMAC over plain SHA-256:**
- Even if the pepper leaks, attacker needs the HMAC key to generate valid hashes
- HMAC is designed for authentication; SHA-256 alone is vulnerable to length extension attacks
- Two-layer protection: even partial key compromise doesn't expose user IDs

### Visitor Hash Generation (Anonymous)

For anonymous visitors, we use a daily-rotating hash that provides session consistency without long-term tracking:

```typescript
// Generate daily visitor hash - rotates every 24 hours
function generateVisitorHash(ip: string, userAgent: string): string {
  const dailySalt = getDailySalt();  // Rotates at midnight UTC
  const message = `${ip}:${userAgent}:${dailySalt}`;
  return sha256(message).substring(0, 16);  // Truncated for privacy
}

function getDailySalt(): string {
  const today = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
  return hmacSha256(today, env.DAILY_SALT_KEY);
}
```

**Known Limitations:**
- Daily rotation means the same visitor across two days appears as two unique visitors. This is intentional—we prioritize privacy over perfect accuracy.
- **Boundary handling:** At exactly midnight UTC, the salt changes. A visitor active at 23:59:59 and 00:00:01 will have different hashes. This is acceptable—edge cases are rare and the privacy benefit outweighs perfect session continuity.

### Export Security

```typescript
// Export endpoint validation
function validateExportRequest(query: ExportQuery): ValidationResult {
  // Date range validation
  const start = new Date(query.start_date);
  const end = new Date(query.end_date);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
  }

  if (end < start) {
    return { valid: false, error: 'End date must be after start date.' };
  }

  // Max range: 1 year for Oak, 5 years for Evergreen
  const maxDays = user.tier === 'evergreen' ? 1825 : 365;
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > maxDays) {
    return { valid: false, error: `Date range exceeds maximum (${maxDays} days).` };
  }

  // Format validation
  if (!['csv', 'json'].includes(query.format)) {
    return { valid: false, error: 'Invalid format. Use csv or json.' };
  }

  return { valid: true };
}

// File size limit: 50MB max export
const MAX_EXPORT_SIZE_BYTES = 50 * 1024 * 1024;
```

---

## Scaling & Performance

### D1 Database Limits

Cloudflare D1 has row limits:
- **Free tier:** 100,000 rows per database
- **Paid tier:** 25,000,000 rows per database

**Estimated Row Counts (per blog, per year):**
- `analytics_events`: ~100-10,000 rows/day (depends on traffic) → **deleted after aggregation**
- `analytics_daily`: 365 rows/year per post → ~3,650 rows for 10 posts
- `analytics_blog_stats`: 365 rows/year
- `reader_history`: ~1-1,000 rows (steady readers accumulate slowly)

**Scaling Strategy:**

1. **Aggressive Event Cleanup:** Raw events are deleted immediately after daily aggregation. Only aggregated data is retained. This keeps `analytics_events` small (only holds ~48hrs of data at any time).

2. **High-Volume Sampling:** For posts exceeding 1,000 pageviews/day, we sample events instead of recording all:
   ```typescript
   // Sample 10% of events for high-volume posts
   function shouldRecordEvent(postId: string, dailyCount: number): boolean {
     if (dailyCount < 1000) return true;
     return Math.random() < 0.1;  // 10% sampling
   }
   ```
   Sampling is noted in `analytics_daily.metadata` so dashboard can show "~10,000 views (estimated)".

3. **Retention Enforcement:** Daily cron strictly enforces tier-based retention. Old data is permanently deleted.

### Cron Schedule & Timing

**Daily Aggregation Cron:** Runs once per day at 00:00 UTC.

**Delay Variability:**
- Event at 23:59 UTC → processed at 00:00 UTC next day (~1 minute delay)
- Event at 00:01 UTC → processed at 00:00 UTC next day (~24 hour delay)

**Effective delay: 24-48 hours** depending on when the event occurred. This variability is acceptable—the goal is "not real-time," not precise 24-hour delays.

### D1 Batching Strategy

Cloudflare D1 has a **30-second hard timeout** per request. Daily aggregation must batch operations to avoid timeouts:

```typescript
// Process blogs in batches to avoid D1 timeouts
async function runDailyAggregation(db: D1Database): Promise<void> {
  const BATCH_SIZE = 50;  // Process 50 blogs at a time
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const blogs = await db.prepare(
      `SELECT id FROM tenants WHERE analytics_enabled = 1
       ORDER BY id LIMIT ? OFFSET ?`
    ).bind(BATCH_SIZE, offset).all();

    if (blogs.results.length === 0) {
      hasMore = false;
      break;
    }

    for (const blog of blogs.results) {
      await aggregateBlogEvents(db, blog.id);
    }

    offset += BATCH_SIZE;

    // Yield to event loop between batches
    await scheduler.wait(100);  // 100ms pause
  }
}
```

**Batch size tuning:**
- Start with 50 blogs per batch
- Monitor execution time and adjust
- If individual blogs have massive event counts, reduce batch size
- Log batch completion for observability

### Reading Time Estimation

Engaged Readers and Deep Reads metrics depend on accurate reading time estimates:

```typescript
// Estimate reading time for a post
function estimateReadingTime(post: Post): number {
  const WORDS_PER_MINUTE = 200;  // Average adult reading speed

  // Count words in markdown content (strip formatting)
  const plainText = stripMarkdown(post.markdown_content);
  const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;

  // Add time for images (10 seconds each)
  const imageCount = (post.markdown_content.match(/!\[/g) || []).length;
  const imageSeconds = imageCount * 10;

  // Calculate total seconds
  const readingSeconds = (wordCount / WORDS_PER_MINUTE) * 60;
  return Math.round(readingSeconds + imageSeconds);
}

// A "Deep Read" = spent 60%+ of estimated reading time
function isDeepRead(timeOnPage: number, estimatedTime: number): boolean {
  return timeOnPage >= estimatedTime * 0.6;
}
```

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
