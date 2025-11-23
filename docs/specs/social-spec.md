---
aliases:
date created: Friday, November 21st 2025, 3:01:54 pm
date modified: Friday, November 21st 2025, 3:02:46 pm
tags:
type: tech-spec
---

# Grove Social - Technical Specification

**Project:** Grove Social - Community Feed & Social Features  
**Repository:** `grove-social`  
**Type:** Social Platform  
**Purpose:** Community feed, voting, reactions, and social discovery

---

## Overview

Grove Social is the community layer of the Grove platform. It provides a social feed where users can discover posts from across the Grove network, vote on content, react with emojis, and engage with the community. It's entirely optional - blogs can opt-in to share posts to the feed.

---

## Architecture

### Tech Stack
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (social data, votes, reactions)
- **Cache:** Cloudflare KV (feed caching, session data)
- **Storage:** Cloudflare R2 (emoji assets)
- **Auth:** Shared with Grove Website (magic links - 6-digit email codes)
- **Real-time:** Cloudflare Durable Objects (future)
- **API:** RESTful API with JSON responses

### Project Structure
```
grove-social/
├── src/
│   ├── handlers/
│   │   ├── feed.ts          # Feed generation & caching
│   │   ├── votes.ts         # Voting logic
│   │   ├── reactions.ts     # Emoji reactions
│   │   └── posts.ts         # Post aggregation
│   ├── db/
│   │   ├── schema.sql       # Database schema
│   │   ├── migrations/      # Schema migrations
│   │   └── queries.ts       # SQL queries
│   ├── types/
│   │   ├── feed.ts          # TypeScript types
│   │   ├── votes.ts
│   │   └── reactions.ts
│   ├── utils/
│   │   ├── cache.ts         # KV caching helpers
│   │   ├── auth.ts          # Auth validation
│   │   └── algorithms.ts    # Feed sorting algorithms
│   ├── routes/
│   │   ├── feed.ts          # GET /api/feed
│   │   ├── vote.ts          # POST /api/vote
│   │   ├── reaction.ts      # POST /api/reaction
│   │   └── post.ts          # GET /api/post/:id
│   └── index.ts             # Worker entry point
├── static/
│   └── emojis/              # Emoji Kitchen assets
├── tests/
└── wrangler.toml
```

---

## Core Features

### 1. The Grove Feed

**Feed URL:** `grove.com/feed`

**Feed Types:**
- **All Posts:** Every opt-in post, chronological
- **Popular:** Sorted by net score (upvotes - downvotes)
- **Hot:** Time-decay algorithm (recent + popular)
- **Top:** Best posts from time period (today, week, month, year)

**Post Display:**
- Title (clickable to full post on user's blog)
- Excerpt (first 200 characters)
- Author (blog subdomain + optional name)
- Timestamp (relative, e.g., "3 hours ago")
- Upvote button (▲)
- Downvote button (▼) - may be hidden initially
- Top 5 emoji reactions (size-scaled)
- Comment count (if comments enabled)

**Feed Features:**
- Infinite scroll pagination (20 posts per page)
- Filter by tag (if tags are shared across network)
- Search posts (title + content)
- Bookmark posts (requires account)
- Share post (copy link, Twitter, etc.)

**Performance:**
- Feed cached in KV for 5 minutes
- Background job updates cache
- Client-side caching of viewed posts
- Lazy load images

### 2. Voting System (Hacker News Style)

**User Actions:**
- Upvote post (▲)
- Downvote post (▼) - optional, may add later
- Change vote (up → down or vice versa)
- Remove vote (click again)

**Public Display:**
- **NO SCORE SHOWN** - No "42 points" displayed
- Buttons grayed out if user has voted
- Post position in feed determined by score (but hidden)
- Prevents vote brigading mentality

**Internal Tracking:**
```typescript
// Votes table stores separate counts
{
  post_id: string,
  upvote_count: number,    // COUNT of upvotes
  downvote_count: number,  // COUNT of downvotes
  net_score: number,       // upvote_count - downvote_count
  updated_at: timestamp
}
```

**User Votes:**
```typescript
// User votes stored separately
{
  vote_id: string,
  post_id: string,
  user_id: string,
  vote_type: 'upvote' | 'downvote',
  created_at: timestamp
}
```

**Business Logic:**
- One vote per user per post
- Recalculate net_score on every vote change
- Update feed sort order (cached, refresh every 5 min)
- Rate limiting: max 100 votes per hour per user
- Prevent voting on own posts
- Prevent voting if not logged in

**API Endpoints:**
```typescript
// Cast or change vote
POST /api/vote
Body: { post_id: string, vote_type: 'upvote' | 'downvote' }
Response: { success: boolean; post_stats: PostStats }

// Remove vote
DELETE /api/vote
Body: { post_id: string }
Response: { success: boolean; post_stats: PostStats }

// Get post stats (for author dashboard)
GET /api/post-stats/:postId
Auth: Required (must be post author)
Response: { upvotes: number; downvotes: number; net_score: number }
```

### 3. Emoji Reaction System

**Emoji Library:**
- **Generic Emojis (5):** ❤️ 😂 😮 😢 😡 (like Facebook)
- **Emoji Kitchen (100):** Custom hybrid emojis
  - Examples: 😂+❤️ = 😂❤️, 🤔+🔥 = 🤔🔥
  - Curated list of fun, expressive combos
  - Hosted on R2 with CDN delivery

**User Actions:**
- Click emoji to add reaction
- Click again to remove reaction
- Can add multiple different emojis per post
- No limit on reactions per post (within reason)

**Display on Feed:**
- Top 5 most-used emojis shown
- Size scaling based on reaction count:
  - Formula: `base_size + (reaction_count * scale_factor)`
  - Base size: 20px
  - Scale factor: 2px per reaction
  - Max size: 40px
  - Less popular emojis shown at base size or smaller

**Display on Post Page:**
- All emojis shown (not just top 5)
- Sorted by reaction count (most popular first)
- Show count next to each emoji
- Click to see list of users who reacted (future)

**Data Model:**
```typescript
// Reactions table
{
  reaction_id: string,
  post_id: string,
  user_id: string,
  emoji_id: string,
  created_at: timestamp
}

// Emoji library (seeded data)
{
  emoji_id: string,
  emoji_image_url: string, // R2/CDN URL
  emoji_name: string, // "heart-fire", "laugh-cry"
  category: 'generic' | 'custom',
  tags: string[] // For search: ["happy", "love", "funny"]
}

// Aggregated post reactions (cached)
{
  post_id: string,
  reactions: {
    emoji_id: string,
    count: number,
    emoji_url: string
  }[],
  updated_at: timestamp
}
```

**API Endpoints:**
```typescript
// Add reaction
POST /api/reaction
Body: { post_id: string, emoji_id: string }
Response: { success: boolean; reactions: Reaction[] }

// Remove reaction
DELETE /api/reaction
Body: { post_id: string, emoji_id: string }
Response: { success: boolean; reactions: Reaction[] }

// Get reactions for post
GET /api/reactions/:postId
Response: { reactions: Reaction[] }
```

**Performance:**
- Emoji images preloaded (top 20 most popular)
- Lazy load remaining on demand
- Cache reaction counts (5 minute TTL)
- Use Workers for fast edge processing

### 4. Feed Opt-In/Opt-Out

**Default:** Opt-out (posts are private by default)

**Admin Panel Setting:**
- Checkbox: "Share my posts on Grove feed"
- Clear warning: "Posts shared to Grove feed are public to anyone"
- Default: unchecked

**Behavior:**
- When enabled: all published posts appear on feed
- When disabled: posts removed from feed immediately
- Posts stay on user's blog regardless
- Per-post override (future): "Share this specific post"

**Technical Implementation:**
```typescript
// In blog config
{
  feed_opt_in: boolean, // default: false
  feed_included_tags: string[] // optional: only share posts with these tags
}

// In post metadata
{
  feed_visible: boolean, // calculated: published && blog.feed_opt_in
  shared_at: timestamp // when first shared to feed
}
```

**API for Opt-In:**
```typescript
// Update blog feed settings
PUT /api/blog/:id/feed-settings
Auth: Required
Body: { feed_opt_in: boolean; feed_included_tags?: string[] }
Response: { success: boolean; blog: Blog }
```

### 5. User Accounts for Social Features

**Separate from Blog Admin:**
- Blog admin login = access to post management
- Social account = access to voting, reactions, feed personalization
- Can be same email, but separate sessions
- One social account can follow multiple blogs

**Registration:**
- Magic links (6-digit email codes) - simple, passwordless
- Email verification built into signup flow
- Welcome email with feed introduction

**Profile (Minimal):**
- Username (unique, can be different from blog subdomain)
- Display name
- Avatar (Gravatar or upload)
- Bio (optional, 160 chars)
- Joined date

**Privacy:**
- Username public on feed
- Votes are private (not shown to other users)
- Reactions are public (emoji shown, but not who reacted)
- Can make profile private (hide from user lists)

**API Endpoints:**
```typescript
// Request login code
POST /api/auth/request-code
Body: { email: string }
Response: { success: boolean; message: string }

// Verify code & login/register
POST /api/auth/verify-code
Body: { email: string; code: string; username?: string }
Response: { success: boolean; user: User; session: Session; isNewUser: boolean }

// Get current user
GET /api/auth/me
Auth: Required
Response: User

// Update profile
PUT /api/auth/profile
Auth: Required
Body: Partial<User>
Response: { success: boolean; user: User }
```

---

## Database Schema

### Users Table (Social)
```sql
CREATE TABLE social_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  
  -- Profile
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- Auth (magic links - no password storage needed)
  email_verified BOOLEAN DEFAULT TRUE, -- Verified via 6-digit code on signup
  
  -- Privacy
  profile_public BOOLEAN DEFAULT TRUE,
  show_votes BOOLEAN DEFAULT FALSE, -- Show voting history on profile
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Metadata
  last_login_at INTEGER,
  login_count INTEGER DEFAULT 0
);

CREATE INDEX idx_social_users_email ON social_users(email);
CREATE INDEX idx_social_users_username ON social_users(username);
CREATE INDEX idx_social_users_created ON social_users(created_at DESC);
```

### Feed Posts Table
```sql
CREATE TABLE feed_posts (
  id TEXT PRIMARY KEY,
  
  -- Source
  blog_id TEXT NOT NULL,
  blog_subdomain TEXT NOT NULL,
  original_post_id TEXT NOT NULL, -- ID in blog's D1
  
  -- Content
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  slug TEXT NOT NULL,
  
  -- URLs
  post_url TEXT NOT NULL, -- Full URL to post on user's blog
  blog_url TEXT NOT NULL, -- User's blog homepage
  
  -- Metadata
  created_at INTEGER NOT NULL,
  shared_at INTEGER NOT NULL, -- When added to feed
  tags TEXT, -- JSON array of tags
  
  -- Stats (cached, updated periodically)
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Visibility
  visible BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);

CREATE INDEX idx_feed_posts_blog ON feed_posts(blog_id);
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_shared ON feed_posts(shared_at DESC);
CREATE INDEX idx_feed_posts_score ON feed_posts(net_score DESC);
CREATE INDEX idx_feed_posts_visible ON feed_posts(visible);
```

### Votes Table
```sql
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL, -- 'upvote' or 'downvote'
  created_at INTEGER NOT NULL,
  
  UNIQUE(post_id, user_id), -- One vote per user per post
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES social_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_votes_post ON votes(post_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_created ON votes(created_at DESC);
```

### Reactions Table
```sql
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  
  -- User can react with same emoji only once
  UNIQUE(post_id, user_id, emoji_id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES social_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);
CREATE INDEX idx_reactions_emoji ON reactions(emoji_id);
CREATE INDEX idx_reactions_created ON reactions(created_at DESC);
```

### Emoji Library Table
```sql
CREATE TABLE emojis (
  id TEXT PRIMARY KEY,
  emoji_name TEXT NOT NULL, -- "heart-fire", "laugh-cry"
  image_url TEXT NOT NULL, -- R2/CDN URL
  category TEXT NOT NULL, -- 'generic' or 'custom'
  tags TEXT, -- JSON array for search
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_emojis_category ON emojis(category);
CREATE INDEX idx_emojis_name ON emojis(emoji_name);
```

### User Activity Table
```sql
CREATE TABLE user_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'vote', 'reaction', 'bookmark'
  post_id TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES social_users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_created ON user_activity(created_at DESC);
```

---

## Feed Algorithms

### 1. Chronological (Default)
```typescript
// Simple: newest first
SELECT * FROM feed_posts 
WHERE visible = TRUE 
ORDER BY shared_at DESC 
LIMIT 20 OFFSET :offset
```

### 2. Popular
```typescript
// Highest net score first
SELECT * FROM feed_posts 
WHERE visible = TRUE 
ORDER BY net_score DESC, shared_at DESC 
LIMIT 20 OFFSET :offset
```

### 3. Hot (Time-Decay)
```typescript
// Hacker News style algorithm
// score = net_score / (hours + 2)^1.5

SELECT 
  *,
  net_score / POWER((strftime('%s', 'now') - shared_at) / 3600.0 + 2, 1.5) as hot_score
FROM feed_posts 
WHERE visible = TRUE 
ORDER BY hot_score DESC 
LIMIT 20 OFFSET :offset
```

### 4. Top (Time Period)
```typescript
// Best posts from specific time range
SELECT * FROM feed_posts 
WHERE visible = TRUE 
  AND shared_at >= :start_time
ORDER BY net_score DESC 
LIMIT 20 OFFSET :offset
```

**Time Periods:**
- Today (last 24 hours)
- This Week (last 7 days)
- This Month (last 30 days)
- This Year (last 365 days)
- All Time

---

## Performance & Caching

### Feed Caching Strategy

**KV Cache Keys:**
```
feed:chronological:page:1 → JSON of posts
feed:popular:page:1 → JSON of posts
feed:hot:page:1 → JSON of posts
feed:post:[id]:stats → { upvotes, downvotes, reactions }
```

**Cache TTL:**
- Feed pages: 5 minutes
- Post stats: 1 minute
- User votes: No cache (real-time)

**Cache Invalidation:**
- New post shared → Invalidate all feed caches
- Vote cast → Invalidate post stats cache
- Reaction added → Invalidate post reactions cache
- Post hidden → Invalidate all caches

### Background Jobs (Cron Triggers)

**Every 5 minutes:**
- Update feed caches
- Recalculate hot scores
- Aggregate reaction counts

**Every hour:**
- Clean up old user activity logs (keep 30 days)
- Update user statistics
- Generate trending posts list

**Every day:**
- Calculate daily active users
- Generate engagement reports
- Clean up expired sessions

---

## API Rate Limiting

**Per User (by IP + user ID):**
- Vote: 100 per hour
- Reaction: 200 per hour
- Feed views: 1000 per hour
- Post sharing: 10 per hour (per blog)

**Per IP (anonymous):**
- Feed views: 100 per hour
- No voting/reactions without account

**Implementation:**
- Use Cloudflare Rate Limiting
- Return 429 status with Retry-After header
- Exponential backoff on client side

---

## Moderation

**Content Moderation:**
- Report post button (requires account)
- Report reasons: Spam, Harassment, Misinformation, Other
- Auto-hide post after 3 reports
- Manual review queue for you
- Ban blog from feed if repeated violations

**User Moderation:**
- Ban user from voting/reactions (spam)
- Shadow ban (user sees their votes, but they don't count)
- Full ban (account disabled)
- IP ban (extreme cases)

**Your Moderation Tools:**
- Hide/unhide posts from feed
- Reset vote counts (if brigading detected)
- Disable reactions on specific post
- Ban/unban blogs from feed
- View report queue

---

## Privacy & Data

**Public Data:**
- Feed posts (title, excerpt, blog URL)
- Reaction emojis (counts only, not who)
- Blog subdomain and public info

**Private Data:**
- Individual votes (not shown publicly)
- User email and profile (only if they choose)
- User activity history

**Data Export:**
- Users can export their votes and reactions
- Blogs can export their feed performance data
- GDPR compliant deletion

---

## Future Enhancements

See `TODOS.md` for full roadmap including:
- Real-time updates (WebSockets)
- User profiles & following
- Direct messaging
- Community events
- Advanced personalization
- Trending topics
- Weekly digest emails
- Mobile app for feed

---

## Success Metrics

**Launch Goals (Month 6):**
- [ ] 5 blogs opted into feed
- [ ] 50 posts shared to feed
- [ ] 20 registered social users
- [ ] 100 total votes cast
- [ ] 200 total reactions added
- [ ] Average 10 votes per post

**Growth Goals (Month 9):**
- [ ] 15 blogs opted into feed
- [ ] 200 posts shared to feed
- [ ] 100 registered social users
- [ ] 1000 total votes cast
- [ ] 2000 total reactions added
- [ ] Average 15 votes per post
- [ ] No moderation incidents

**Scale Goals (Month 12):**
- [ ] 30 blogs opted into feed
- [ ] 500 posts shared to feed
- [ ] 300 registered social users
- [ ] 5000 total votes cast
- [ ] 10000 total reactions added
- [ ] Average 20 votes per post
- [ ] < 1% of posts reported

---

*Last Updated: November 2025*