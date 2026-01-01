# Grove Ecosystem: Durable Objects Architecture

## Executive Summary

This document outlines the integration of Cloudflare Durable Objects into the Grove ecosystem to solve three critical problems:

1. **Auth coordination** — Eliminate janky handoffs between workers, provide instant session validation
2. **D1 write scaling** — Batch writes to reduce load and costs as user base grows
3. **Real-time features** — Enable live updates, presence, and notifications for Meadow

Durable Objects are not replacing D1. They are a **coordination and caching layer** that sits between your Workers and D1, providing strong consistency, atomic operations, and real-time capabilities.

---

## Core Concepts

### What Durable Objects Are

- **Single-threaded compute instances** with a globally unique ID
- **Persistent storage** (up to 10GB SQLite per DO) that survives hibernation
- **Coordination points** — all requests to the same ID route to the same instance
- **WebSocket capable** — can maintain persistent connections with hibernation

### What Durable Objects Are NOT

- Not a replacement for D1 (D1 remains source of truth)
- Not sharded/replicated (one instance per ID, one location)
- Not always-on (they hibernate when idle, wake on demand)

### Lifecycle

1. Request arrives for DO with ID `session:autumn`
2. If instance exists in memory → routes to it
3. If hibernated → wakes up, loads storage, processes request
4. If never existed → creates new instance
5. After ~10-30 seconds idle → hibernates (storage persists)
6. Storage persists forever until explicitly deleted

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

                           User Request
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Router Worker                                    │
│  - Extract subdomain (tenant)                                           │
│  - Extract path                                                          │
│  - Validate session via SessionDO                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  SessionDO   │ │  TenantDO    │ │  PostDO      │
        │  (per user)  │ │  (per site)  │ │  (per post)  │
        └──────────────┘ └──────────────┘ └──────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         D1 Database                                      │
│  - Source of truth for all persistent data                              │
│  - Receives batched writes from DOs                                     │
│  - Posts, comments, users, settings, analytics                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Durable Object Classes

### 1. SessionDO (Heartwood Auth)

**Purpose:** Centralized session management, token storage, cross-site auth coordination

**ID Pattern:** `session:{userId}`

**Storage Schema:**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,           -- session ID (random UUID)
  device_id TEXT NOT NULL,       -- device fingerprint
  device_name TEXT,              -- "Chrome on MacOS"
  refresh_token TEXT NOT NULL,   -- encrypted refresh token
  access_token_hash TEXT,        -- for validation without storing plaintext
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_device ON sessions(device_id);
```

**In-Memory State:**
```typescript
interface SessionDOState {
  userId: string;
  sessions: Map<string, SessionInfo>;  // Quick lookup cache
  failedAttempts: number;              // Rate limiting
  lockoutUntil: number | null;         // Lockout timestamp
}
```

**Methods:**
```typescript
class SessionDO extends DurableObject {
  // Called after OAuth callback, creates new session
  async createSession(params: {
    deviceId: string;
    deviceName: string;
    refreshToken: string;
    userAgent: string;
    ipAddress: string;
    expiresIn: number;  // seconds
  }): Promise<{ sessionId: string; accessToken: string }>;

  // Called on every authenticated request
  async validateSession(sessionId: string): Promise<{
    valid: boolean;
    userId?: string;
    needsRefresh?: boolean;
  }>;

  // Called when access token expires
  async refreshSession(sessionId: string): Promise<{
    accessToken: string;
    expiresIn: number;
  } | null>;

  // Called on logout
  async revokeSession(sessionId: string): Promise<void>;

  // Called on "log out all devices"
  async revokeAllSessions(exceptSessionId?: string): Promise<number>;

  // Called to list active sessions for user settings page
  async listSessions(): Promise<SessionInfo[]>;

  // Rate limiting for login attempts
  async recordLoginAttempt(success: boolean): Promise<{
    allowed: boolean;
    lockoutRemaining?: number;
  }>;
}
```

**Alarms:**
- Every hour: Clean up expired sessions from storage
- On lockout: Clear lockout after duration

**Integration with Heartwood:**
```typescript
// In Heartwood auth callback worker
async function handleOAuthCallback(request: Request, env: Env) {
  const { code } = parseCallback(request);
  const tokens = await exchangeCodeForTokens(code);
  const userInfo = await getUserInfo(tokens.access_token);
  
  // Get or create user in D1
  const user = await env.DB.prepare(
    "INSERT INTO users (id, email, name) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = ?"
  ).bind(userId, userInfo.email, userInfo.name, userInfo.name).run();

  // Create session in SessionDO
  const sessionDO = env.SESSIONS.get(env.SESSIONS.idFromName(`session:${user.id}`));
  const session = await sessionDO.createSession({
    deviceId: getDeviceId(request),
    deviceName: parseUserAgent(request.headers.get("user-agent")),
    refreshToken: tokens.refresh_token,
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("cf-connecting-ip"),
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
  });

  // Set cookie and redirect
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/",
      "Set-Cookie": `grove_session=${session.sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}

// In any worker that needs auth
async function validateAuth(request: Request, env: Env): Promise<User | null> {
  const sessionId = getCookie(request, "grove_session");
  if (!sessionId) return null;

  // We need to know which user's SessionDO to check
  // Option 1: Encode userId in session cookie (signed)
  // Option 2: Use a global session lookup DO
  // Option 3: Store session->user mapping in D1 (cached)
  
  const userId = await lookupUserIdFromSession(sessionId, env);
  if (!userId) return null;

  const sessionDO = env.SESSIONS.get(env.SESSIONS.idFromName(`session:${userId}`));
  const result = await sessionDO.validateSession(sessionId);
  
  if (!result.valid) return null;
  
  // Optionally refresh if needed
  if (result.needsRefresh) {
    await sessionDO.refreshSession(sessionId);
  }

  return { id: userId, ...cachedUserData };
}
```

---

### 2. TenantDO (Per-Subdomain Coordination)

**Purpose:** Cache tenant config, rate limit per-tenant, aggregate analytics, coordinate tenant-wide operations

**ID Pattern:** `tenant:{subdomain}` (e.g., `tenant:alice`)

**Storage Schema:**
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE analytics_buffer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_data TEXT,  -- JSON
  timestamp INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,  -- e.g., "api", "upload", "comment"
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
```

**In-Memory State:**
```typescript
interface TenantDOState {
  config: TenantConfig | null;       // Cached from D1
  configLoadedAt: number;
  activeUsers: Set<string>;          // Currently connected WebSocket users
  analyticsBuffer: AnalyticsEvent[]; // Pending flush to D1
  rateLimits: Map<string, { count: number; windowStart: number }>;
}

interface TenantConfig {
  subdomain: string;
  displayName: string;
  theme: ThemeConfig;
  features: FeatureFlags;
  tier: "free" | "pro" | "enterprise";
  limits: TierLimits;
}
```

**Methods:**
```typescript
class TenantDO extends DurableObject {
  // Called on every request to this tenant's site
  async getConfig(): Promise<TenantConfig>;

  // Called when tenant updates settings
  async updateConfig(updates: Partial<TenantConfig>): Promise<void>;

  // Called on every request for rate limiting
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;

  // Called to record analytics events
  async recordEvent(event: AnalyticsEvent): Promise<void>;

  // Called via alarm to flush analytics to D1
  async flushAnalytics(): Promise<void>;

  // WebSocket for real-time tenant dashboard
  async fetch(request: Request): Promise<Response>;  // WebSocket upgrade
}
```

**Alarms:**
- Every 60 seconds: Flush analytics buffer to D1
- Every 5 minutes: Refresh config from D1 (or on-demand invalidation)

**Integration:**
```typescript
// In router worker
async function handleRequest(request: Request, env: Env) {
  const subdomain = extractSubdomain(request);
  const tenantDO = env.TENANTS.get(env.TENANTS.idFromName(`tenant:${subdomain}`));
  
  // Get cached config (fast, no D1 hit)
  const config = await tenantDO.getConfig();
  
  if (!config) {
    return new Response("Site not found", { status: 404 });
  }

  // Check rate limit
  const rateCheck = await tenantDO.checkRateLimit("requests", config.limits.requestsPerMinute, 60);
  if (!rateCheck.allowed) {
    return new Response("Rate limited", {
      status: 429,
      headers: { "Retry-After": String(rateCheck.resetAt - Date.now() / 1000) },
    });
  }

  // Record page view
  await tenantDO.recordEvent({
    type: "page_view",
    path: new URL(request.url).pathname,
    timestamp: Date.now(),
  });

  // Continue to handle request with config...
}
```

---

### 3. PostDO (Per-Post Coordination)

**Purpose:** Real-time comments, atomic reaction counts, presence, WebSocket updates

**ID Pattern:** `post:{tenantId}:{postId}` (e.g., `post:alice:abc123`)

**Storage Schema:**
```sql
CREATE TABLE reactions (
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,  -- 'like', 'love', 'insightful', etc.
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, reaction_type)
);

CREATE TABLE reaction_counts (
  reaction_type TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE comments_buffer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT,  -- for nested comments
  created_at INTEGER NOT NULL,
  synced_to_d1 INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE presence (
  user_id TEXT PRIMARY KEY,
  connected_at INTEGER NOT NULL
);
```

**In-Memory State:**
```typescript
interface PostDOState {
  postId: string;
  tenantId: string;
  reactionCounts: Map<string, number>;  // Quick lookup
  activeViewers: Map<string, WebSocket>; // userId -> WebSocket
  pendingComments: Comment[];            // Not yet flushed to D1
  lastActivity: number;
}
```

**Methods:**
```typescript
class PostDO extends DurableObject {
  // Add/remove reaction (atomic, no race conditions)
  async toggleReaction(userId: string, reactionType: string): Promise<{
    added: boolean;
    newCount: number;
  }>;

  // Get all reaction counts (for post author only in Meadow)
  async getReactionCounts(): Promise<Record<string, number>>;

  // Add comment (buffered, flushed to D1 periodically)
  async addComment(comment: {
    id: string;
    userId: string;
    content: string;
    parentId?: string;
  }): Promise<void>;

  // Get recent comments (from buffer + D1)
  async getRecentComments(limit: number): Promise<Comment[]>;

  // WebSocket connection for real-time updates
  async fetch(request: Request): Promise<Response>;

  // Get current viewer count
  async getPresence(): Promise<{ count: number; viewers?: string[] }>;

  // Flush pending data to D1
  async flush(): Promise<void>;
}
```

**WebSocket Messages:**
```typescript
// Server -> Client
type ServerMessage =
  | { type: "reaction"; reactionType: string; count: number }
  | { type: "comment"; comment: Comment }
  | { type: "presence"; count: number }
  | { type: "typing"; userId: string };

// Client -> Server
type ClientMessage =
  | { type: "react"; reactionType: string }
  | { type: "comment"; content: string; parentId?: string }
  | { type: "typing" };
```

**Alarms:**
- Every 30 seconds: Flush pending comments to D1
- Every 5 minutes: Sync reaction counts to D1 (for backup/reporting)

---

### 4. FeedDO (Per-User Feed Aggregation)

**Purpose:** Pre-compute personalized feed, reduce D1 queries on feed load

**ID Pattern:** `feed:{userId}` (e.g., `feed:autumn`)

**Storage Schema:**
```sql
CREATE TABLE feed_items (
  post_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  score REAL NOT NULL,           -- Relevance score
  created_at INTEGER NOT NULL,
  cached_preview TEXT,           -- JSON with title, excerpt, author name
  reaction_counts TEXT,          -- JSON with cached counts
  added_at INTEGER NOT NULL
);

CREATE INDEX idx_feed_score ON feed_items(score DESC);
CREATE INDEX idx_feed_created ON feed_items(created_at DESC);

CREATE TABLE following (
  user_id TEXT PRIMARY KEY,
  followed_at INTEGER NOT NULL
);
```

**Methods:**
```typescript
class FeedDO extends DurableObject {
  // Called when user loads their feed
  async getFeed(params: {
    cursor?: string;
    limit: number;
    sortBy: "recent" | "relevance";
  }): Promise<{ items: FeedItem[]; nextCursor?: string }>;

  // Called when someone user follows creates a post
  async addToFeed(post: {
    postId: string;
    tenantId: string;
    authorId: string;
    preview: PostPreview;
  }): Promise<void>;

  // Called when user follows/unfollows someone
  async updateFollowing(userId: string, action: "follow" | "unfollow"): Promise<void>;

  // Called periodically to refresh feed from D1
  async rebuildFeed(): Promise<void>;

  // Called when a post's reaction counts change (to update cached counts)
  async updatePostMetadata(postId: string, metadata: Partial<PostPreview>): Promise<void>;
}
```

**Alarms:**
- Every hour: Prune old feed items (keep last 500)
- On-demand: Rebuild feed when following changes significantly

---

### 5. NotificationDO (Per-User Notifications)

**Purpose:** Collect, deduplicate, and deliver notifications

**ID Pattern:** `notifications:{userId}`

**Storage Schema:**
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'reaction', 'comment', 'follow', 'mention'
  actor_id TEXT NOT NULL,
  target_type TEXT NOT NULL,    -- 'post', 'comment', 'profile'
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  aggregation_key TEXT          -- For grouping "X and 5 others liked your post"
);

CREATE TABLE aggregated (
  aggregation_key TEXT PRIMARY KEY,
  notification_ids TEXT NOT NULL,  -- JSON array
  actor_ids TEXT NOT NULL,         -- JSON array
  count INTEGER NOT NULL,
  last_updated INTEGER NOT NULL
);

CREATE INDEX idx_notifications_unread ON notifications(read_at) WHERE read_at IS NULL;
```

**Methods:**
```typescript
class NotificationDO extends DurableObject {
  // Add notification (handles aggregation automatically)
  async addNotification(notification: {
    type: NotificationType;
    actorId: string;
    targetType: string;
    targetId: string;
  }): Promise<void>;

  // Get notifications for display
  async getNotifications(params: {
    limit: number;
    cursor?: string;
    unreadOnly?: boolean;
  }): Promise<{ notifications: Notification[]; unreadCount: number }>;

  // Mark as read
  async markRead(notificationIds: string[] | "all"): Promise<void>;

  // WebSocket for push notifications
  async fetch(request: Request): Promise<Response>;

  // Get unread count (for badge)
  async getUnreadCount(): Promise<number>;
}
```

**Aggregation Logic:**
When "User B likes Post X", check if there's already a notification for "someone liked Post X" in the last hour. If so, add User B to the aggregation instead of creating a new notification. Display as "User B and 3 others liked your post."

---

### 6. AnalyticsDO (Per-Tenant Analytics Aggregation)

**Purpose:** Aggregate analytics before D1 writes, provide real-time dashboard data

**ID Pattern:** `analytics:{tenantId}:{date}` (e.g., `analytics:alice:2025-12-25`)

**Storage Schema:**
```sql
CREATE TABLE hourly_stats (
  hour INTEGER PRIMARY KEY,  -- 0-23
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  comments_created INTEGER NOT NULL DEFAULT 0,
  reactions_given INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE page_stats (
  path TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE visitor_hashes (
  hash TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL
);
```

**Methods:**
```typescript
class AnalyticsDO extends DurableObject {
  // Called by TenantDO when it flushes events
  async recordEvents(events: AnalyticsEvent[]): Promise<void>;

  // Called for real-time dashboard
  async getStats(): Promise<DailyStats>;

  // Called at end of day to persist to D1 history
  async finalize(): Promise<void>;
}
```

**Alarms:**
- At midnight: Finalize stats, persist to D1, create next day's DO

---

## Wrangler Configuration

```toml
# wrangler.toml

name = "grove-lattice"

[[durable_objects.bindings]]
name = "SESSIONS"
class_name = "SessionDO"

[[durable_objects.bindings]]
name = "TENANTS"
class_name = "TenantDO"

[[durable_objects.bindings]]
name = "POSTS"
class_name = "PostDO"

[[durable_objects.bindings]]
name = "FEEDS"
class_name = "FeedDO"

[[durable_objects.bindings]]
name = "NOTIFICATIONS"
class_name = "NotificationDO"

[[durable_objects.bindings]]
name = "ANALYTICS"
class_name = "AnalyticsDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SessionDO", "TenantDO", "PostDO", "FeedDO", "NotificationDO", "AnalyticsDO"]
```

---

## Implementation Priority

### Phase 1: Auth (Heartwood) — HIGHEST PRIORITY
1. Implement `SessionDO`
2. Update Heartwood OAuth flow to use SessionDO
3. Update auth middleware in all workers to validate via SessionDO
4. Add "manage sessions" UI showing active devices
5. Test cross-subdomain auth

**Expected improvements:**
- Login time: 15 seconds → 2-3 seconds
- Session validation: D1 query → DO call (sub-millisecond if cached)
- "Log out all devices" becomes trivial

### Phase 2: Tenant Coordination
1. Implement `TenantDO`
2. Migrate config loading from D1 to TenantDO
3. Add per-tenant rate limiting
4. Set up analytics buffering

**Expected improvements:**
- Config load: D1 query per request → cached in DO
- Rate limiting: Works correctly (currently IP-based only)
- D1 writes: Reduced by ~90% for analytics

### Phase 3: Content Coordination
1. Implement `PostDO`
2. Add real-time reactions
3. Add comment WebSocket
4. Add presence indicators

**Expected improvements:**
- Reactions: Atomic, no lost updates
- Comments: Real-time, no polling
- "X people viewing" feature unlocked

### Phase 4: Meadow Social
1. Implement `FeedDO`
2. Implement `NotificationDO`
3. Add follow/unfollow with feed updates
4. Add push notifications via WebSocket

**Expected improvements:**
- Feed load: Pre-computed, instant
- Notifications: Real-time push
- Social features become viable at scale

---

## Patterns and Anti-Patterns

### DO: Use Deterministic IDs
```typescript
// GOOD: Predictable ID from known data
const sessionDO = env.SESSIONS.get(env.SESSIONS.idFromName(`session:${userId}`));
const tenantDO = env.TENANTS.get(env.TENANTS.idFromName(`tenant:${subdomain}`));

// BAD: Random ID means you can't find it later
const randomDO = env.SESSIONS.get(env.SESSIONS.newUniqueId());
```

### DO: Batch D1 Writes
```typescript
// GOOD: Buffer in memory, flush periodically
async recordEvent(event: AnalyticsEvent) {
  this.buffer.push(event);
  if (!this.flushScheduled) {
    this.ctx.storage.setAlarm(Date.now() + 30000);
    this.flushScheduled = true;
  }
}

// BAD: Write to D1 on every event
async recordEvent(event: AnalyticsEvent) {
  await this.env.DB.prepare("INSERT INTO events ...").run();
}
```

### DO: Use SQLite Storage Over KV Storage
```typescript
// GOOD: SQLite (new, recommended)
const sessions = await this.ctx.storage.sql
  .exec("SELECT * FROM sessions WHERE expires_at > ?", Date.now())
  .toArray();

// LESS GOOD: KV storage (legacy)
const sessions = await this.ctx.storage.list({ prefix: "session:" });
```

### DON'T: Put Everything in One DO
```typescript
// BAD: Global DO becomes bottleneck
const globalDO = env.GLOBAL.get(env.GLOBAL.idFromName("global"));

// GOOD: Sharded by natural boundaries
const tenantDO = env.TENANTS.get(env.TENANTS.idFromName(`tenant:${subdomain}`));
const postDO = env.POSTS.get(env.POSTS.idFromName(`post:${tenantId}:${postId}`));
```

### DON'T: Store Large Blobs
```typescript
// BAD: Store file content in DO
await this.ctx.storage.put("file", largeFileBuffer);

// GOOD: Store reference, file lives in R2/Amber
await this.ctx.storage.sql.exec(
  "INSERT INTO files (id, r2_key, size) VALUES (?, ?, ?)",
  fileId, r2Key, size
);
```

---

## Monitoring and Debugging

### Tail Logs
```bash
wrangler tail grove-lattice --format=pretty
```

### DO-Specific Logging
```typescript
class SessionDO extends DurableObject {
  private log(message: string, data?: object) {
    console.log(JSON.stringify({
      do: "SessionDO",
      id: this.ctx.id.toString(),
      message,
      ...data,
      timestamp: new Date().toISOString(),
    }));
  }

  async createSession(params: CreateSessionParams) {
    this.log("Creating session", { deviceId: params.deviceId });
    // ...
  }
}
```

### Error Handling
```typescript
// Always handle DO errors gracefully
async function validateAuth(request: Request, env: Env) {
  try {
    const sessionDO = env.SESSIONS.get(env.SESSIONS.idFromName(`session:${userId}`));
    return await sessionDO.validateSession(sessionId);
  } catch (error) {
    console.error("SessionDO error:", error);
    // Fall back to D1 validation or deny access
    return { valid: false };
  }
}
```

---

## Cost Considerations

### Durable Objects Pricing (Workers Paid Plan)
- **Requests:** $0.15 per million
- **Duration:** $12.50 per million GB-seconds
- **Storage:** $0.20 per GB-month (SQLite)

### Optimization Strategies
1. **WebSocket Hibernation:** Use `acceptWebSocket()` with hibernation to avoid paying for idle connections
2. **Batch Operations:** Multiple operations in one request instead of multiple requests
3. **Alarm Coalescing:** One alarm every 30s instead of per-event alarms
4. **Smart Caching:** Cache in DO memory to reduce storage reads

### Comparison: Before and After

**Before (D1 for everything):**
- 10,000 page views → 10,000 D1 reads for config
- 1,000 reactions → 1,000 D1 writes
- Session validation → D1 read every request

**After (with DOs):**
- 10,000 page views → 1 DO call (cached config), 1 D1 write (batched analytics)
- 1,000 reactions → 1,000 DO calls, 10 D1 writes (batched)
- Session validation → DO call (sub-ms, often cached in memory)

---

## Admin Panel Integration

The admin panel can leverage DOs to reduce D1 costs and enable real-time features.

### TenantDO Extensions for Admin

The TenantDO already handles per-tenant config caching. Extend it for admin panel:

```typescript
interface TenantDOAdminState {
  // Existing config
  config: TenantConfig;

  // Admin extensions
  adminConfig: AdminConfig;
  draftBuffer: Map<string, Draft>;
  customSections: AdminSection[];
  recentPosts: PostSummary[];      // Cached for dashboard
  stats: DashboardStats;           // Word count, post count, etc.
}

interface AdminConfig {
  font: string;                    // User's preferred font
  theme: ThemeConfig;              // Custom theme settings
  customSections: AdminSection[];  // Extensible admin pages
  editorPreferences: EditorPrefs;  // Auto-save interval, zen mode defaults
}

interface AdminSection {
  id: string;
  label: string;
  icon: string;                    // Lucide icon name
  href: string;
  enabled: boolean;
  tier: 'seedling' | 'sapling' | 'oak' | 'evergreen';  // Minimum tier
  sortOrder: number;
}

interface Draft {
  slug: string;                    // Post slug or 'new'
  content: string;
  metadata: PostMetadata;
  lastSaved: number;
  deviceId: string;
}
```

**New TenantDO Methods for Admin:**

```typescript
class TenantDO extends DurableObject {
  // ... existing methods ...

  // Draft Management (cross-device sync)
  async saveDraft(draft: Draft): Promise<void>;
  async getDraft(slug: string): Promise<Draft | null>;
  async listDrafts(): Promise<Draft[]>;
  async deleteDraft(slug: string): Promise<void>;

  // Admin Config
  async getAdminConfig(): Promise<AdminConfig>;
  async updateAdminConfig(updates: Partial<AdminConfig>): Promise<void>;

  // Custom Sections (tier-gated extensibility)
  async getCustomSections(): Promise<AdminSection[]>;
  async addSection(section: AdminSection): Promise<void>;
  async updateSection(id: string, updates: Partial<AdminSection>): Promise<void>;
  async removeSection(id: string): Promise<void>;
  async reorderSections(ids: string[]): Promise<void>;

  // Dashboard Stats (cached, updated hourly)
  async getDashboardStats(): Promise<DashboardStats>;
  async refreshDashboardStats(): Promise<void>;
}

interface DashboardStats {
  postCount: number;
  totalWords: number;
  draftCount: number;
  publishedThisMonth: number;
  topTags: Array<{ tag: string; count: number }>;
  accountAge: number;               // Days since creation
  storageUsed: number;              // Bytes
  lastActivity: number;             // Timestamp
}
```

### Draft Auto-Save Flow

Current: localStorage (single-device only)

With DO:
1. Editor saves to localStorage immediately (fast, offline-capable)
2. Every 30 seconds, if draft changed, save to TenantDO
3. On page load, check TenantDO for newer draft than localStorage
4. Conflict resolution: Show dialog if versions differ

```typescript
// In MarkdownEditor
async function syncDraft() {
  const localDraft = localStorage.getItem(`draft-${slug}`);
  const remoteDraft = await fetch(`/api/drafts/${slug}`).then(r => r.json());

  if (!remoteDraft) {
    // No remote draft, save local
    await saveDraftToServer(localDraft);
  } else if (!localDraft) {
    // No local draft, use remote
    loadDraft(remoteDraft);
  } else if (remoteDraft.lastSaved > localDraft.lastSaved) {
    // Remote is newer
    showConflictDialog(localDraft, remoteDraft);
  } else {
    // Local is newer, save to remote
    await saveDraftToServer(localDraft);
  }
}
```

### Custom Admin Sections (Tier-Gated)

Extensibility for users to add their own admin pages:

| Tier | Custom Sections | Icon Selection |
|------|-----------------|----------------|
| Seedling | 0 | N/A |
| Sapling | 2 | Limited set (10 icons) |
| Oak | 10 | Full Lucide library |
| Evergreen | Unlimited | Full + custom upload |

**Default Sections (always present):**
- Dashboard
- Blog Posts
- Pages
- Images
- Settings

**Optional Built-in Sections (can be hidden):**
- Analytics (when Rings is ready)
- Timeline (for sites with timeline content)
- Trails (when enabled)

**Custom Sections (user-created):**
- Recipes
- Portfolio
- Events
- Products (future)

### API Endpoints for Admin Config

```
GET  /api/admin/config              # Get full admin config
PUT  /api/admin/config              # Update admin config

GET  /api/admin/drafts              # List all drafts
GET  /api/admin/drafts/:slug        # Get specific draft
PUT  /api/admin/drafts/:slug        # Save draft
DELETE /api/admin/drafts/:slug      # Delete draft

GET  /api/admin/sections            # List custom sections
POST /api/admin/sections            # Add section
PUT  /api/admin/sections/:id        # Update section
DELETE /api/admin/sections/:id      # Delete section
POST /api/admin/sections/reorder    # Reorder sections

GET  /api/admin/stats               # Get dashboard stats (cached)
POST /api/admin/stats/refresh       # Force refresh stats
```

### Batching Strategy

TenantDO batches writes to D1:
- Admin config changes: Immediate flush (rare, user expects save)
- Draft saves: Batch every 5 minutes
- Stats refresh: Hourly alarm
- Section changes: Immediate flush

---

## Trails Integration with DOs

Trails can leverage TenantDO for caching:

```typescript
interface TenantDOTrailsState {
  trails: Trail[];                  // Cached trail metadata
  trailCache: Map<string, TrailWithWaypoints>;  // Full trail data
  trailCacheExpiry: Map<string, number>;
}

// TenantDO methods for Trails
class TenantDO {
  async getTrail(slug: string): Promise<TrailWithWaypoints | null>;
  async setTrail(slug: string, trail: TrailWithWaypoints): Promise<void>;
  async invalidateTrail(slug: string): Promise<void>;

  // Batch waypoint status updates (reduces D1 writes)
  async queueWaypointUpdate(waypointId: string, status: WaypointStatus): Promise<void>;
  async flushWaypointUpdates(): Promise<void>;  // Called by alarm every 5 min
}
```

---

## Next Steps

1. Create a new `durables/` directory in Lattice
2. Implement `SessionDO` as the first class
3. Update Heartwood to use SessionDO
4. Test auth flow end-to-end
5. Gradually add other DO classes
6. **Add admin panel extensions to TenantDO** (Phase 2.5)

The key insight: Start with auth because it's the most painful and will give you immediate, tangible improvements. Everything else builds on having reliable auth.
