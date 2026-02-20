# Blog Post Optimization Roadmap

> _From direct D1 reads to intelligent caching with hot/warm/cold storage strategy_

**Status:** Planning
**Created:** 2026-01-12
**Owner:** AutumnsGrove
**Goal:** Reduce D1 reads by 95%+, enable scalable blog post storage, prepare for Meadow feed prefetching

---

## Current State (January 2026)

### What We Have

**Storage:**

- All blog posts in D1 (`posts` table)
- Markdown + pre-rendered HTML stored together
- Multi-tenant architecture with `tenant_id` scoping
- Dual-source support (D1 + filesystem fallback)

**Data Access:**

- **ZERO caching** - every page view hits D1 directly
- No Cache-Control headers on blog routes
- No KV caching layer
- Config queries hit D1 on every request

**Durable Objects:**

- **NONE implemented yet**
- Comprehensive Loom pattern designed (see `docs/patterns/loom-durable-objects-pattern.md`)
- No bindings in wrangler.toml

**Cost Impact:**

- Every blog view = 1 D1 read
- Tenant config fetched on every request
- Analytics written individually (no batching)
- At 100K views/month: ~$0.10 in D1 reads (cheap but unnecessary)

### What We Need

1. **Immediate caching** to reduce D1 reads by 90-95%
2. **TenantDO** for config caching and draft sync
3. **Split Post DO** into metadata (hot) and content (warm/cold)
4. **Hot/warm/cold storage strategy** based on usage patterns
5. **R2 migration** for old/inactive posts
6. **Feed prefetching** infrastructure for Meadow

---

## Architecture Vision

### Storage Tiers

```
┌─────────────────────────────────────────────────────────────┐
│  HOT STORAGE (Active Editing + Recent Posts)               │
│  ─────────────────────────────────────────────────────      │
│  Location: D1 (full content)                                │
│  Cache: KV (5 min TTL) + Edge (1 hour)                      │
│  Criteria: - Last edited < 7 days                           │
│            - Created < 30 days AND published                │
│            - Currently being edited (draft state)           │
│  Performance: Sub-100ms, immediate updates                  │
│  Cost: $0.20/GB + negligible reads (cached)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ (after 30 days idle)
┌─────────────────────────────────────────────────────────────┐
│  WARM STORAGE (Published, Occasional Access)               │
│  ─────────────────────────────────────────────────────      │
│  Location: R2 (content) + D1 (metadata)                     │
│  Cache: KV (1 hour TTL) + Edge (24 hours)                   │
│  Criteria: - Published 30-365 days ago                      │
│            - Not edited in last 30 days                     │
│            - Views < 10/day average                         │
│  Performance: 100-300ms (R2 fetch + cache)                  │
│  Cost: $0.015/GB storage + minimal R2 reads                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ (after 1 year OR archived)
┌─────────────────────────────────────────────────────────────┐
│  COLD STORAGE (Archived, Rarely Accessed)                  │
│  ─────────────────────────────────────────────────────      │
│  Location: R2 only (referenced in D1)                       │
│  Cache: KV (24 hour TTL) + Edge (7 days)                    │
│  Criteria: - Status = 'archived'                            │
│            - Published > 1 year ago                         │
│            - Views < 1/day average                          │
│  Performance: 200-500ms (R2 fetch, aggressive cache)        │
│  Cost: $0.015/GB storage only (reads nearly zero)           │
└─────────────────────────────────────────────────────────────┘
```

### Exception: Popular Posts Stay Accessible

**Special Case:** High-traffic posts bypass the standard aging:

- If views > 100/day average (measured over 30 days)
- **Keep metadata in D1** (for fast queries)
- **Move content to R2** (cheaper storage)
- **Aggressive edge caching** (24 hour TTL)
- Result: Fast delivery, low cost, no migration to cold storage

**Rationale:** Popular posts benefit most from edge caching. Even with R2 storage, cache hit rate (95%+) means negligible R2 read costs. Storage savings (93% cheaper) compound over time.

---

## Durable Object Architecture

### Split PostDO into Two DOs

**Current Design (from loom-durable-objects-pattern.md):**

- Single `PostDO` handles content, reactions, comments, presence

**New Design (Optimized):**

#### 1. PostMetaDO (Hot Path - Frequent Reads/Writes)

**ID Pattern:** `post-meta:{tenantId}:{postId}`

**Purpose:**

- Real-time reactions (atomic counters)
- Comment buffering and delivery
- Presence tracking ("X people viewing")
- View count tracking
- Status changes (draft → published → archived)
- Last edited timestamp

**Storage (DO SQLite):**

```sql
CREATE TABLE reactions (
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
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
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  synced_to_d1 INTEGER DEFAULT 0
);

CREATE TABLE presence (
  user_id TEXT PRIMARY KEY,
  connected_at INTEGER NOT NULL
);

CREATE TABLE stats (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
-- Stats: view_count, unique_viewers_30d, last_viewed_at, last_edited_at
```

**Methods:**

```typescript
class PostMetaDO extends DurableObject {
	// Reactions (atomic, instant)
	async toggleReaction(userId: string, type: string): Promise<{ added: boolean; newCount: number }>;
	async getReactionCounts(): Promise<Record<string, number>>;

	// Comments (buffered)
	async addComment(comment: Comment): Promise<void>;
	async getComments(limit: number, cursor?: string): Promise<Comment[]>;

	// Presence
	async getPresence(): Promise<{ count: number; viewers?: string[] }>;
	async trackView(userId?: string): Promise<void>;

	// Stats
	async getStats(): Promise<PostStats>;
	async recordEdit(): Promise<void>;

	// WebSocket for real-time updates
	async fetch(request: Request): Promise<Response>;
}
```

**Flush to D1:**

- Reaction counts: Every 5 minutes (for backup/analytics)
- Comments: Every 30 seconds (batch insert)
- View counts: Every hour (aggregated)

---

#### 2. PostContentDO (Warm Path - Infrequent Writes)

**ID Pattern:** `post-content:{tenantId}:{postId}`

**Purpose:**

- Content caching layer
- Draft auto-save (cross-device sync)
- Content migration coordination
- Storage location tracking

**Storage (DO SQLite):**

```sql
CREATE TABLE content (
  version INTEGER PRIMARY KEY,
  markdown TEXT NOT NULL,
  html TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Metadata: storage_location ('d1'|'r2'|'r2_archived'), r2_key, title, description

CREATE TABLE drafts (
  device_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  last_saved INTEGER NOT NULL
);
```

**Methods:**

```typescript
class PostContentDO extends DurableObject {
	// Content retrieval (checks D1 vs R2)
	async getContent(): Promise<{
		markdown: string;
		html: string;
		version: number;
	}>;

	// Content updates
	async saveContent(markdown: string, html: string, userId: string): Promise<{ version: number }>;

	// Draft sync (cross-device)
	async saveDraft(draft: Draft, deviceId: string): Promise<void>;
	async getDraft(deviceId: string): Promise<Draft | null>;
	async listDrafts(): Promise<Draft[]>;

	// Storage migration
	async getStorageLocation(): Promise<{
		location: "d1" | "r2" | "r2_archived";
		r2Key?: string;
	}>;
	async migrateToR2(r2Key: string): Promise<void>;
	async migrateToD1(): Promise<void>;

	// Version history
	async getVersions(limit: number): Promise<ContentVersion[]>;
}
```

**Why Split?**

| Concern              | PostMetaDO                             | PostContentDO              |
| -------------------- | -------------------------------------- | -------------------------- |
| **Read Frequency**   | High (every page view for stats)       | Low (cached aggressively)  |
| **Write Frequency**  | High (reactions, comments, views)      | Low (edits, publishes)     |
| **Data Size**        | Small (<10KB per post)                 | Large (1KB-1MB per post)   |
| **Hibernation**      | Rare (always active for popular posts) | Frequent (most posts idle) |
| **Cache Strategy**   | Short TTL (5 min)                      | Long TTL (1-24 hours)      |
| **Cost Sensitivity** | Request count matters                  | Storage + duration matters |

---

## Phase 1: Immediate Caching (No DO Required)

**Goal:** Reduce D1 reads by 90-95% with simple HTTP + KV caching
**Timeline:** 1-2 hours of work
**Cost Impact:** ~$0.50 → ~$0.05 per 1M views

### Implementation

#### 1.1 Add Cache-Control Headers

**File:** `libs/engine/src/routes/blog/[slug]/+page.server.ts`

```typescript
export async function load({ params, locals, setHeaders }) {
	const { subdomain } = locals;
	const post = await getPostWithCache(params.slug, subdomain);

	if (!post) {
		throw error(404, "Post not found");
	}

	// Public posts: aggressive edge caching
	if (post.status === "published") {
		setHeaders({
			"Cache-Control": "public, max-age=300, s-maxage=300", // Browser: 5 min
			"CDN-Cache-Control": "max-age=3600, stale-while-revalidate=86400", // Edge: 1 hour, stale: 24h
			Vary: "Cookie", // Vary by auth state (owner sees edit buttons)
		});
	} else {
		// Drafts: never cache
		setHeaders({
			"Cache-Control": "private, no-cache, no-store, must-revalidate",
		});
	}

	return { post };
}
```

**File:** `libs/engine/src/routes/blog/+page.server.ts` (blog list)

```typescript
export async function load({ locals, setHeaders }) {
	const { subdomain } = locals;
	const posts = await getPostListWithCache(subdomain);

	setHeaders({
		"Cache-Control": "public, max-age=300, s-maxage=600", // Browser: 5 min, Edge: 10 min
		"CDN-Cache-Control": "max-age=600, stale-while-revalidate=3600",
	});

	return { posts };
}
```

---

#### 1.2 Implement KV Caching Layer

**File:** `libs/engine/src/lib/server/services/posts.ts`

```typescript
import { cache } from "$lib/server/services/cache";

interface CachedPost {
	id: string;
	slug: string;
	title: string;
	html_content: string;
	markdown_content: string;
	description: string;
	tags: string[];
	gutter_content: any;
	published_at: number;
	status: string;
	storage_location: "d1" | "r2" | "r2_archived";
	r2_key?: string;
}

export async function getPostWithCache(slug: string, tenantId: string): Promise<CachedPost | null> {
	const cacheKey = `posts:${tenantId}:${slug}`;

	// Try KV cache first (5 min TTL for published, no cache for drafts)
	const cached = await cache.get<CachedPost>(cacheKey);
	if (cached) {
		console.log(`[Cache HIT] ${cacheKey}`);
		return cached;
	}

	console.log(`[Cache MISS] ${cacheKey}`);

	// Fetch from storage (D1 or R2)
	const post = await fetchPostFromStorage(slug, tenantId);

	if (!post) {
		return null;
	}

	// Cache published posts only (drafts are too volatile)
	if (post.status === "published") {
		await cache.set(cacheKey, post, { ttl: 300 }); // 5 min
	}

	return post;
}

async function fetchPostFromStorage(slug: string, tenantId: string): Promise<CachedPost | null> {
	// Get metadata from D1 (always)
	const meta = await db
		.prepare(
			`
    SELECT
      id, slug, title, description, tags, published_at, status,
      storage_location, r2_key,
      markdown_content, html_content, gutter_content
    FROM posts
    WHERE slug = ? AND tenant_id = ?
  `,
		)
		.bind(slug, tenantId)
		.first();

	if (!meta) {
		return null;
	}

	// If content is in D1, we already have it
	if (meta.storage_location === "d1" || !meta.storage_location) {
		return meta as CachedPost;
	}

	// If content is in R2, fetch it
	if (meta.storage_location === "r2" || meta.storage_location === "r2_archived") {
		const r2Object = await env.IMAGES.get(meta.r2_key);

		if (!r2Object) {
			console.error(`[R2 ERROR] Missing object: ${meta.r2_key}`);
			return null;
		}

		const content = (await r2Object.json()) as {
			markdown: string;
			html: string;
			migratedAt: number;
		};

		return {
			...meta,
			markdown_content: content.markdown,
			html_content: content.html,
		} as CachedPost;
	}

	return meta as CachedPost;
}

export async function getPostListWithCache(
	tenantId: string,
	status: "published" | "all" = "published",
): Promise<CachedPost[]> {
	const cacheKey = `posts:list:${tenantId}:${status}`;

	// Try KV cache first (15 min TTL)
	const cached = await cache.get<CachedPost[]>(cacheKey);
	if (cached) {
		console.log(`[Cache HIT] ${cacheKey}`);
		return cached;
	}

	console.log(`[Cache MISS] ${cacheKey}`);

	// Fetch from D1 (metadata only, no content)
	const query =
		status === "published"
			? `SELECT id, slug, title, description, tags, published_at, status
       FROM posts
       WHERE tenant_id = ? AND status = 'published'
       ORDER BY published_at DESC`
			: `SELECT id, slug, title, description, tags, published_at, status
       FROM posts
       WHERE tenant_id = ?
       ORDER BY published_at DESC`;

	const posts = await db.prepare(query).bind(tenantId).all();

	// Cache for 15 minutes
	await cache.set(cacheKey, posts.results, { ttl: 900 });

	return posts.results as CachedPost[];
}

// Invalidation (call when post is published/updated/deleted)
export async function invalidatePostCache(slug: string, tenantId: string) {
	await cache.del(`posts:${tenantId}:${slug}`);
	await cache.del(`posts:list:${tenantId}:published`);
	await cache.del(`posts:list:${tenantId}:all`);

	// Also purge CDN cache if needed
	// TODO: Implement Cloudflare Cache API purge
}
```

---

#### 1.3 Cache Invalidation on Updates

**File:** `libs/engine/src/routes/api/posts/[slug]/+server.ts`

```typescript
import { invalidatePostCache } from "$lib/server/services/posts";

export async function PUT({ request, params, locals }) {
	const { slug } = params;
	const { subdomain, user } = locals;

	// ... existing update logic ...

	await db
		.prepare(
			`
    UPDATE posts
    SET title = ?, markdown_content = ?, html_content = ?,
        description = ?, tags = ?, updated_at = ?
    WHERE slug = ? AND tenant_id = ?
  `,
		)
		.bind(title, markdown, html, description, JSON.stringify(tags), Date.now(), slug, subdomain)
		.run();

	// Invalidate caches
	await invalidatePostCache(slug, subdomain);

	return json({ success: true });
}

export async function DELETE({ params, locals }) {
	const { slug } = params;
	const { subdomain } = locals;

	await db
		.prepare(`DELETE FROM posts WHERE slug = ? AND tenant_id = ?`)
		.bind(slug, subdomain)
		.run();

	// Invalidate caches
	await invalidatePostCache(slug, subdomain);

	return json({ success: true });
}
```

---

### Phase 1 Expected Results

**Before:**

- 100K views/month = 100K D1 reads
- Cost: ~$0.10

**After:**

- 100K views/month = ~5K D1 reads (95% cache hit rate)
- Cost: ~$0.005 + KV costs (~$0.02) = **~$0.025 total**
- **75% cost reduction**
- **10x faster page loads** (edge caching)

---

## Phase 2: TenantDO Implementation

**Goal:** Centralize tenant config, enable draft sync, batch analytics
**Timeline:** 4-8 hours of work
**Cost Impact:** Eliminate 90% of config queries, enable cross-device drafts

### 2.1 Create TenantDO Class

**File:** `libs/engine/src/lib/durable-objects/TenantDO.ts`

```typescript
export class TenantDO extends DurableObject {
	private config: TenantConfig | null = null;
	private configLoadedAt: number = 0;
	private analyticsBuffer: AnalyticsEvent[] = [];
	private drafts: Map<string, Draft> = new Map();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			await this.initializeStorage();
		});
	}

	async initializeStorage() {
		// Create tables if they don't exist
		await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS drafts (
        slug TEXT PRIMARY KEY,
        markdown TEXT NOT NULL,
        metadata TEXT NOT NULL,  -- JSON
        last_saved INTEGER NOT NULL,
        device_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp INTEGER NOT NULL
      );
    `);

		// Load config into memory
		await this.refreshConfig();
	}

	async refreshConfig() {
		// Load from DO storage first (fastest)
		const stored = await this.ctx.storage.sql
			.exec("SELECT value FROM config WHERE key = 'tenant_config'")
			.one();

		if (stored) {
			this.config = JSON.parse(stored.value as string);
			this.configLoadedAt = Date.now();
			return;
		}

		// If not in DO storage, load from D1 and cache
		const tenantId = this.getTenantIdFromObjectId();
		const row = await this.env.DB.prepare(
			`
      SELECT subdomain, display_name, theme, tier, limits
      FROM tenants
      WHERE subdomain = ?
    `,
		)
			.bind(tenantId)
			.first();

		if (row) {
			this.config = row as unknown as TenantConfig;

			// Store in DO for next time
			await this.ctx.storage.sql.exec(
				"INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
				"tenant_config",
				JSON.stringify(this.config),
				Date.now(),
			);

			this.configLoadedAt = Date.now();
		}
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// API routing
		if (path === "/config") {
			return this.handleGetConfig();
		}

		if (path === "/config/update" && request.method === "POST") {
			return this.handleUpdateConfig(request);
		}

		if (path.startsWith("/drafts/")) {
			const slug = path.split("/").pop();

			if (request.method === "GET") {
				return this.handleGetDraft(slug!);
			}

			if (request.method === "PUT") {
				return this.handleSaveDraft(slug!, request);
			}

			if (request.method === "DELETE") {
				return this.handleDeleteDraft(slug!);
			}
		}

		if (path === "/drafts" && request.method === "GET") {
			return this.handleListDrafts();
		}

		if (path === "/analytics" && request.method === "POST") {
			return this.handleRecordEvent(request);
		}

		return new Response("Not found", { status: 404 });
	}

	async handleGetConfig(): Promise<Response> {
		// Refresh if stale (older than 5 minutes)
		if (Date.now() - this.configLoadedAt > 300000) {
			await this.refreshConfig();
		}

		if (!this.config) {
			return new Response("Tenant not found", { status: 404 });
		}

		return Response.json(this.config);
	}

	async handleUpdateConfig(request: Request): Promise<Response> {
		const updates = await request.json();

		// Merge with existing config
		this.config = { ...this.config, ...updates };

		// Update DO storage
		await this.ctx.storage.sql.exec(
			"INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
			"tenant_config",
			JSON.stringify(this.config),
			Date.now(),
		);

		// Update D1 (source of truth)
		const tenantId = this.getTenantIdFromObjectId();
		await this.env.DB.prepare(
			`
      UPDATE tenants
      SET display_name = ?, theme = ?, updated_at = ?
      WHERE subdomain = ?
    `,
		)
			.bind(this.config.display_name, JSON.stringify(this.config.theme), Date.now(), tenantId)
			.run();

		this.configLoadedAt = Date.now();

		return Response.json({ success: true });
	}

	async handleSaveDraft(slug: string, request: Request): Promise<Response> {
		const draft = (await request.json()) as Draft;

		// Save to DO storage
		await this.ctx.storage.sql.exec(
			`
      INSERT OR REPLACE INTO drafts (slug, markdown, metadata, last_saved, device_id)
      VALUES (?, ?, ?, ?, ?)
    `,
			slug,
			draft.content,
			JSON.stringify(draft.metadata),
			Date.now(),
			draft.deviceId,
		);

		// Update in-memory cache
		this.drafts.set(slug, draft);

		return Response.json({ success: true, lastSaved: Date.now() });
	}

	async handleGetDraft(slug: string): Promise<Response> {
		// Check memory first
		if (this.drafts.has(slug)) {
			return Response.json(this.drafts.get(slug));
		}

		// Check storage
		const row = await this.ctx.storage.sql.exec("SELECT * FROM drafts WHERE slug = ?", slug).one();

		if (!row) {
			return new Response("Draft not found", { status: 404 });
		}

		const draft = {
			content: row.markdown,
			metadata: JSON.parse(row.metadata as string),
			lastSaved: row.last_saved,
			deviceId: row.device_id,
		};

		this.drafts.set(slug, draft);

		return Response.json(draft);
	}

	async handleListDrafts(): Promise<Response> {
		const rows = await this.ctx.storage.sql
			.exec("SELECT slug, last_saved, device_id FROM drafts ORDER BY last_saved DESC")
			.toArray();

		return Response.json(rows);
	}

	async handleDeleteDraft(slug: string): Promise<Response> {
		await this.ctx.storage.sql.exec("DELETE FROM drafts WHERE slug = ?", slug);
		this.drafts.delete(slug);

		return Response.json({ success: true });
	}

	async handleRecordEvent(request: Request): Promise<Response> {
		const event = (await request.json()) as AnalyticsEvent;

		// Buffer in memory
		this.analyticsBuffer.push(event);

		// If buffer is large, flush immediately
		if (this.analyticsBuffer.length >= 100) {
			await this.flushAnalytics();
		} else {
			// Otherwise, schedule flush via alarm
			const alarmTime = await this.ctx.storage.getAlarm();
			if (!alarmTime) {
				await this.ctx.storage.setAlarm(Date.now() + 60000); // 1 min
			}
		}

		return Response.json({ success: true });
	}

	async alarm() {
		// Flush analytics buffer to D1
		await this.flushAnalytics();
	}

	async flushAnalytics() {
		if (this.analyticsBuffer.length === 0) return;

		const events = this.analyticsBuffer.splice(0, this.analyticsBuffer.length);

		// Batch insert to D1
		const tenantId = this.getTenantIdFromObjectId();

		// TODO: Implement analytics table and batch insert
		console.log(`[TenantDO] Flushing ${events.length} analytics events for ${tenantId}`);

		// For now, just log (implement analytics table in Phase 3)
	}

	private getTenantIdFromObjectId(): string {
		// Extract tenant ID from DO object ID
		// Format: tenant:{subdomain}
		const idString = this.ctx.id.toString();
		return idString.replace("tenant:", "");
	}
}

interface TenantConfig {
	subdomain: string;
	display_name: string;
	theme: any;
	tier: "seedling" | "sapling" | "oak" | "evergreen";
	limits: any;
}

interface Draft {
	content: string;
	metadata: any;
	lastSaved: number;
	deviceId: string;
}

interface AnalyticsEvent {
	type: string;
	data: any;
	timestamp: number;
}
```

---

### 2.2 Update wrangler.toml

**File:** `libs/engine/wrangler.toml`

```toml
# ... existing config ...

# =============================================================================
# Durable Objects - Loom Pattern
# =============================================================================
[[durable_objects.bindings]]
name = "TENANTS"
class_name = "TenantDO"
script_name = "lattice"

[[migrations]]
tag = "v1"
new_classes = ["TenantDO"]
```

**File:** `libs/engine/src/app.d.ts`

```typescript
declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				CACHE_KV: KVNamespace;
				IMAGES: R2Bucket;
				AUTH: Fetcher;
				TENANTS: DurableObjectNamespace; // Add this
			};
		}
	}
}
```

---

### 2.3 Integrate TenantDO into Routes

**File:** `libs/engine/src/hooks.server.ts`

```typescript
export async function handle({ event, resolve }) {
	const subdomain = extractSubdomain(event.request);

	if (!subdomain) {
		return new Response("Invalid subdomain", { status: 400 });
	}

	// Get TenantDO
	const tenantDO = event.platform.env.TENANTS.get(
		event.platform.env.TENANTS.idFromName(`tenant:${subdomain}`),
	);

	// Fetch config from DO (cached, fast)
	const configResponse = await tenantDO.fetch("https://do/config");

	if (!configResponse.ok) {
		return new Response("Tenant not found", { status: 404 });
	}

	const config = await configResponse.json();

	// Attach to locals
	event.locals.subdomain = subdomain;
	event.locals.tenantConfig = config;
	event.locals.tenantDO = tenantDO;

	return resolve(event);
}
```

---

### 2.4 Draft Auto-Save API

**File:** `libs/engine/src/routes/api/drafts/[slug]/+server.ts`

```typescript
export async function GET({ params, locals }) {
	const { slug } = params;
	const { tenantDO } = locals;

	const response = await tenantDO.fetch(`https://do/drafts/${slug}`);

	if (!response.ok) {
		throw error(404, "Draft not found");
	}

	const draft = await response.json();
	return json(draft);
}

export async function PUT({ params, request, locals }) {
	const { slug } = params;
	const { tenantDO } = locals;

	const draft = await request.json();

	const response = await tenantDO.fetch(`https://do/drafts/${slug}`, {
		method: "PUT",
		body: JSON.stringify(draft),
	});

	const result = await response.json();
	return json(result);
}

export async function DELETE({ params, locals }) {
	const { slug } = params;
	const { tenantDO } = locals;

	await tenantDO.fetch(`https://do/drafts/${slug}`, {
		method: "DELETE",
	});

	return json({ success: true });
}
```

**File:** `libs/engine/src/routes/admin/blog/new/+page.svelte` (client-side)

```typescript
let draftSyncInterval: number;

onMount(async () => {
	// Load draft from localStorage first (instant)
	const localDraft = localStorage.getItem(`draft-${slug}`);
	if (localDraft) {
		const parsed = JSON.parse(localDraft);
		content = parsed.content;
	}

	// Then check server for newer version
	try {
		const response = await fetch(`/api/drafts/${slug}`);
		if (response.ok) {
			const serverDraft = await response.json();

			if (!localDraft || serverDraft.lastSaved > JSON.parse(localDraft).lastSaved) {
				// Server version is newer
				if (localDraft && content !== serverDraft.content) {
					// Show conflict dialog
					showDraftConflict(localDraft, serverDraft);
				} else {
					content = serverDraft.content;
				}
			}
		}
	} catch (err) {
		console.error("Failed to load server draft:", err);
	}

	// Auto-save to server every 30 seconds
	draftSyncInterval = setInterval(async () => {
		if (content && contentChanged) {
			await saveDraftToServer();
		}
	}, 30000);
});

onDestroy(() => {
	clearInterval(draftSyncInterval);
});

async function saveDraftToServer() {
	try {
		await fetch(`/api/drafts/${slug}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content,
				metadata: { title, description, tags },
				deviceId: getDeviceId(),
			}),
		});

		console.log("[Draft] Synced to server");
	} catch (err) {
		console.error("[Draft] Server sync failed:", err);
	}
}
```

---

### Phase 2 Expected Results

**Benefits:**

- **Config queries:** D1 → TenantDO (99% reduction in D1 reads)
- **Cross-device drafts:** Works seamlessly across devices
- **Analytics batching:** 100 events = 1 D1 write (vs 100 writes before)
- **Real-time admin:** Foundation for live dashboard stats

**Cost Impact:**

- Config queries: ~$0.05/month → ~$0.001/month (D1)
- Added DO costs: ~$0.05/month (request count)
- Net savings: ~$0.04/month per tenant (small but compounds at scale)

---

## Phase 3: PostMetaDO + PostContentDO

**Goal:** Split post data into hot (metadata) and warm (content) layers
**Timeline:** 8-12 hours of work
**Enables:** Real-time reactions, comments, presence, optimized content delivery

### 3.1 Create PostMetaDO

**File:** `libs/engine/src/lib/durable-objects/PostMetaDO.ts`

```typescript
export class PostMetaDO extends DurableObject {
	private reactionCounts: Map<string, number> = new Map();
	private activeViewers: Map<string, WebSocket> = new Map();
	private stats: PostStats = {
		viewCount: 0,
		uniqueViewers30d: 0,
		lastViewedAt: 0,
		lastEditedAt: 0,
	};

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			await this.initializeStorage();
		});
	}

	async initializeStorage() {
		await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS reactions (
        user_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, reaction_type)
      );

      CREATE TABLE IF NOT EXISTS reaction_counts (
        reaction_type TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS comments_buffer (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        created_at INTEGER NOT NULL,
        synced_to_d1 INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);

		// Load reaction counts into memory
		const counts = await this.ctx.storage.sql
			.exec("SELECT reaction_type, count FROM reaction_counts")
			.toArray();

		counts.forEach((row) => {
			this.reactionCounts.set(row.reaction_type as string, row.count as number);
		});

		// Load stats
		const statsRows = await this.ctx.storage.sql.exec("SELECT key, value FROM stats").toArray();

		statsRows.forEach((row) => {
			this.stats[row.key as keyof PostStats] = row.value as number;
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// WebSocket upgrade for real-time updates
		if (url.pathname === "/ws") {
			const upgradeHeader = request.headers.get("Upgrade");
			if (upgradeHeader !== "websocket") {
				return new Response("Expected websocket", { status: 426 });
			}

			const webSocketPair = new WebSocketPair();
			const [client, server] = Object.values(webSocketPair);

			this.ctx.acceptWebSocket(server);

			// Track presence
			const userId = url.searchParams.get("userId") || "anonymous";
			this.activeViewers.set(userId, server);

			// Broadcast presence update
			this.broadcastPresence();

			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}

		// API routing
		if (path === "/reactions" && request.method === "POST") {
			return this.handleToggleReaction(request);
		}

		if (path === "/reactions" && request.method === "GET") {
			return this.handleGetReactions();
		}

		if (path === "/view" && request.method === "POST") {
			return this.handleTrackView(request);
		}

		if (path === "/stats" && request.method === "GET") {
			return this.handleGetStats();
		}

		return new Response("Not found", { status: 404 });
	}

	async handleToggleReaction(request: Request): Promise<Response> {
		const { userId, reactionType } = await request.json();

		// Check if user already reacted
		const existing = await this.ctx.storage.sql
			.exec("SELECT 1 FROM reactions WHERE user_id = ? AND reaction_type = ?", userId, reactionType)
			.one();

		let added: boolean;

		if (existing) {
			// Remove reaction
			await this.ctx.storage.sql.exec(
				"DELETE FROM reactions WHERE user_id = ? AND reaction_type = ?",
				userId,
				reactionType,
			);

			// Decrement count
			const currentCount = this.reactionCounts.get(reactionType) || 0;
			const newCount = Math.max(0, currentCount - 1);
			this.reactionCounts.set(reactionType, newCount);

			await this.ctx.storage.sql.exec(
				"UPDATE reaction_counts SET count = ? WHERE reaction_type = ?",
				newCount,
				reactionType,
			);

			added = false;
		} else {
			// Add reaction
			await this.ctx.storage.sql.exec(
				"INSERT INTO reactions (user_id, reaction_type, created_at) VALUES (?, ?, ?)",
				userId,
				reactionType,
				Date.now(),
			);

			// Increment count
			const currentCount = this.reactionCounts.get(reactionType) || 0;
			const newCount = currentCount + 1;
			this.reactionCounts.set(reactionType, newCount);

			await this.ctx.storage.sql.exec(
				"INSERT OR REPLACE INTO reaction_counts (reaction_type, count) VALUES (?, ?)",
				reactionType,
				newCount,
			);

			added = true;
		}

		const newCount = this.reactionCounts.get(reactionType) || 0;

		// Broadcast to all connected viewers
		this.broadcast({
			type: "reaction",
			reactionType,
			count: newCount,
			added,
		});

		return Response.json({ added, newCount });
	}

	async handleGetReactions(): Promise<Response> {
		const counts = Object.fromEntries(this.reactionCounts);
		return Response.json(counts);
	}

	async handleTrackView(request: Request): Promise<Response> {
		const { userId } = await request.json();

		this.stats.viewCount += 1;
		this.stats.lastViewedAt = Date.now();

		await this.ctx.storage.sql.exec(
			"INSERT OR REPLACE INTO stats (key, value) VALUES ('viewCount', ?)",
			this.stats.viewCount,
		);

		await this.ctx.storage.sql.exec(
			"INSERT OR REPLACE INTO stats (key, value) VALUES ('lastViewedAt', ?)",
			this.stats.lastViewedAt,
		);

		return Response.json({ success: true });
	}

	async handleGetStats(): Promise<Response> {
		return Response.json(this.stats);
	}

	webSocketMessage(ws: WebSocket, message: string) {
		try {
			const data = JSON.parse(message);

			if (data.type === "typing") {
				// Broadcast typing indicator
				this.broadcast({ type: "typing", userId: data.userId }, ws);
			}
		} catch (err) {
			console.error("[PostMetaDO] WebSocket message error:", err);
		}
	}

	webSocketClose(ws: WebSocket, code: number, reason: string) {
		// Remove from active viewers
		for (const [userId, socket] of this.activeViewers.entries()) {
			if (socket === ws) {
				this.activeViewers.delete(userId);
				break;
			}
		}

		this.broadcastPresence();
	}

	broadcast(message: any, exclude?: WebSocket) {
		const serialized = JSON.stringify(message);

		for (const [userId, ws] of this.activeViewers.entries()) {
			if (ws !== exclude) {
				try {
					ws.send(serialized);
				} catch (err) {
					console.error(`[PostMetaDO] Failed to send to ${userId}:`, err);
				}
			}
		}
	}

	broadcastPresence() {
		this.broadcast({
			type: "presence",
			count: this.activeViewers.size,
		});
	}

	async alarm() {
		// Flush stats to D1 periodically (every hour)
		console.log("[PostMetaDO] Flushing stats to D1");

		const postId = this.getPostIdFromObjectId();

		// TODO: Implement D1 stats table and flush
	}

	private getPostIdFromObjectId(): { tenantId: string; postId: string } {
		// Format: post-meta:{tenantId}:{postId}
		const idString = this.ctx.id.toString();
		const [_, tenantId, postId] = idString.split(":");
		return { tenantId, postId };
	}
}

interface PostStats {
	viewCount: number;
	uniqueViewers30d: number;
	lastViewedAt: number;
	lastEditedAt: number;
}
```

---

### 3.2 Create PostContentDO

**File:** `libs/engine/src/lib/durable-objects/PostContentDO.ts`

```typescript
export class PostContentDO extends DurableObject {
	private cachedContent: { markdown: string; html: string } | null = null;
	private storageLocation: "d1" | "r2" | "r2_archived" = "d1";
	private r2Key: string | null = null;

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === "/content" && request.method === "GET") {
			return this.handleGetContent();
		}

		if (path === "/content" && request.method === "PUT") {
			return this.handleSaveContent(request);
		}

		if (path === "/migrate/r2" && request.method === "POST") {
			return this.handleMigrateToR2(request);
		}

		if (path === "/migrate/d1" && request.method === "POST") {
			return this.handleMigrateToD1();
		}

		return new Response("Not found", { status: 404 });
	}

	async handleGetContent(): Promise<Response> {
		// Check cache first
		if (this.cachedContent) {
			return Response.json(this.cachedContent);
		}

		const { tenantId, postId } = this.getPostIdFromObjectId();

		// Get metadata from D1
		const meta = await this.env.DB.prepare(
			`
      SELECT storage_location, r2_key, markdown_content, html_content
      FROM posts
      WHERE id = ? AND tenant_id = ?
    `,
		)
			.bind(postId, tenantId)
			.first();

		if (!meta) {
			return new Response("Post not found", { status: 404 });
		}

		this.storageLocation = meta.storage_location || "d1";
		this.r2Key = meta.r2_key;

		if (this.storageLocation === "d1") {
			this.cachedContent = {
				markdown: meta.markdown_content,
				html: meta.html_content,
			};
		} else {
			// Fetch from R2
			const r2Object = await this.env.IMAGES.get(this.r2Key!);

			if (!r2Object) {
				return new Response("Content not found in R2", { status: 404 });
			}

			const content = await r2Object.json();
			this.cachedContent = {
				markdown: content.markdown,
				html: content.html,
			};
		}

		return Response.json(this.cachedContent);
	}

	async handleSaveContent(request: Request): Promise<Response> {
		const { markdown, html, userId } = await request.json();

		const { tenantId, postId } = this.getPostIdFromObjectId();

		// Save to D1
		await this.env.DB.prepare(
			`
      UPDATE posts
      SET markdown_content = ?, html_content = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `,
		)
			.bind(markdown, html, Date.now(), postId, tenantId)
			.run();

		// Update cache
		this.cachedContent = { markdown, html };

		// Invalidate KV cache
		await this.env.CACHE_KV.delete(`posts:${tenantId}:${postId}`);

		return Response.json({ success: true });
	}

	async handleMigrateToR2(request: Request): Promise<Response> {
		const { r2Key } = await request.json();

		if (!this.cachedContent) {
			await this.handleGetContent();
		}

		if (!this.cachedContent) {
			return new Response("No content to migrate", { status: 400 });
		}

		const { tenantId, postId } = this.getPostIdFromObjectId();

		// Upload to R2
		await this.env.IMAGES.put(
			r2Key,
			JSON.stringify({
				markdown: this.cachedContent.markdown,
				html: this.cachedContent.html,
				migratedAt: Date.now(),
			}),
			{
				httpMetadata: {
					contentType: "application/json",
					cacheControl: "public, max-age=31536000, immutable",
				},
			},
		);

		// Update D1 metadata
		await this.env.DB.prepare(
			`
      UPDATE posts
      SET storage_location = 'r2',
          r2_key = ?,
          markdown_content = NULL,
          html_content = NULL
      WHERE id = ? AND tenant_id = ?
    `,
		)
			.bind(r2Key, postId, tenantId)
			.run();

		this.storageLocation = "r2";
		this.r2Key = r2Key;

		console.log(`[PostContentDO] Migrated ${postId} to R2: ${r2Key}`);

		return Response.json({ success: true, r2Key });
	}

	async handleMigrateToD1(): Promise<Response> {
		if (!this.cachedContent) {
			await this.handleGetContent();
		}

		if (!this.cachedContent) {
			return new Response("No content to migrate", { status: 400 });
		}

		const { tenantId, postId } = this.getPostIdFromObjectId();

		// Move content back to D1
		await this.env.DB.prepare(
			`
      UPDATE posts
      SET storage_location = 'd1',
          markdown_content = ?,
          html_content = ?,
          r2_key = NULL
      WHERE id = ? AND tenant_id = ?
    `,
		)
			.bind(this.cachedContent.markdown, this.cachedContent.html, postId, tenantId)
			.run();

		this.storageLocation = "d1";
		this.r2Key = null;

		console.log(`[PostContentDO] Migrated ${postId} back to D1`);

		return Response.json({ success: true });
	}

	private getPostIdFromObjectId(): { tenantId: string; postId: string } {
		// Format: post-content:{tenantId}:{postId}
		const idString = this.ctx.id.toString();
		const [_, tenantId, postId] = idString.split(":");
		return { tenantId, postId };
	}
}
```

---

### 3.3 Update D1 Schema

**File:** `libs/engine/migrations/006_post_storage.sql`

```sql
-- Add storage location tracking
ALTER TABLE posts ADD COLUMN storage_location TEXT DEFAULT 'd1';
ALTER TABLE posts ADD COLUMN r2_key TEXT;
ALTER TABLE posts ADD COLUMN last_accessed_at INTEGER;

-- Add view tracking
ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN unique_viewers_30d INTEGER DEFAULT 0;

-- Index for migration queries
CREATE INDEX idx_posts_storage ON posts(storage_location, last_accessed_at);
CREATE INDEX idx_posts_published_age ON posts(published_at, storage_location);
```

---

### Phase 3 Expected Results

**Benefits:**

- **Real-time reactions:** Atomic counters, no race conditions
- **Presence indicators:** "X people viewing this post"
- **WebSocket support:** Live updates without polling
- **Content migration:** Easy movement between D1 and R2
- **Optimized caching:** Metadata vs content cached separately

---

## Phase 4: Hot/Warm/Cold Migration Strategy

**Goal:** Automatically migrate posts between storage tiers based on usage
**Timeline:** 4-6 hours of work
**Cost Impact:** 90%+ storage cost reduction for large catalogs

### 4.1 Create Migration Worker

**File:** `libs/engine/src/lib/workers/post-migrator.ts`

```typescript
/**
 * Post Migration Worker
 *
 * Runs daily to migrate posts between storage tiers:
 * - HOT (D1): Active editing, recent posts
 * - WARM (R2): Published, occasional access
 * - COLD (R2): Archived, rare access
 */

export async function migratePostsToTiers(env: Env) {
	console.log("[Migrator] Starting post tier migration...");

	const now = Date.now();
	const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
	const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

	// =============================================
	// WARM TIER: Move posts older than 30 days to R2
	// =============================================

	const warmCandidates = await env.DB.prepare(
		`
    SELECT id, tenant_id, slug
    FROM posts
    WHERE storage_location = 'd1'
      AND status = 'published'
      AND published_at < ?
      AND (last_accessed_at IS NULL OR last_accessed_at < ?)
      AND view_count < 100  -- Not popular posts
    ORDER BY published_at ASC
    LIMIT 100  -- Batch size
  `,
	)
		.bind(thirtyDaysAgo, thirtyDaysAgo)
		.all();

	console.log(`[Migrator] Found ${warmCandidates.results.length} posts for WARM migration`);

	for (const post of warmCandidates.results) {
		await migratePostToR2(env, post, "r2");
	}

	// =============================================
	// COLD TIER: Move archived or 1+ year old posts
	// =============================================

	const coldCandidates = await env.DB.prepare(
		`
    SELECT id, tenant_id, slug
    FROM posts
    WHERE storage_location IN ('d1', 'r2')
      AND (
        status = 'archived'
        OR (published_at < ? AND view_count < 10)
      )
    ORDER BY published_at ASC
    LIMIT 100
  `,
	)
		.bind(oneYearAgo)
		.all();

	console.log(`[Migrator] Found ${coldCandidates.results.length} posts for COLD migration`);

	for (const post of coldCandidates.results) {
		await migratePostToR2(env, post, "r2_archived");
	}

	// =============================================
	// HOT TIER: Move popular posts back to D1
	// =============================================

	const hotCandidates = await env.DB.prepare(
		`
    SELECT id, tenant_id, slug
    FROM posts
    WHERE storage_location = 'r2'
      AND status = 'published'
      AND view_count > 100  -- Popular posts
      AND last_accessed_at > ?  -- Recent activity
    LIMIT 50
  `,
	)
		.bind(thirtyDaysAgo)
		.all();

	console.log(`[Migrator] Found ${hotCandidates.results.length} posts for HOT migration`);

	for (const post of hotCandidates.results) {
		await migratePostToD1(env, post);
	}

	console.log("[Migrator] Migration complete");
}

async function migratePostToR2(
	env: Env,
	post: { id: string; tenant_id: string; slug: string },
	tier: "r2" | "r2_archived",
) {
	// Get PostContentDO
	const contentDO = env.POST_CONTENT.get(
		env.POST_CONTENT.idFromName(`post-content:${post.tenant_id}:${post.id}`),
	);

	const r2Key = `posts/${post.tenant_id}/${tier === "r2_archived" ? "archived/" : ""}${post.slug}.json`;

	// Trigger migration
	const response = await contentDO.fetch("https://do/migrate/r2", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ r2Key }),
	});

	if (response.ok) {
		console.log(`[Migrator] ✓ Migrated ${post.slug} to ${tier}`);
	} else {
		console.error(`[Migrator] ✗ Failed to migrate ${post.slug}:`, await response.text());
	}
}

async function migratePostToD1(env: Env, post: { id: string; tenant_id: string; slug: string }) {
	// Get PostContentDO
	const contentDO = env.POST_CONTENT.get(
		env.POST_CONTENT.idFromName(`post-content:${post.tenant_id}:${post.id}`),
	);

	// Trigger migration
	const response = await contentDO.fetch("https://do/migrate/d1", {
		method: "POST",
	});

	if (response.ok) {
		console.log(`[Migrator] ✓ Moved ${post.slug} back to HOT (D1)`);
	} else {
		console.error(`[Migrator] ✗ Failed to move ${post.slug} to D1:`, await response.text());
	}
}
```

---

### 4.2 Create Cron Trigger (Scheduled Worker)

**Note:** Cloudflare Pages doesn't support cron triggers. You need a separate Worker for this.

**File:** `workers/post-migrator/wrangler.toml`

```toml
name = "grove-post-migrator"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Run daily at 2 AM UTC
[triggers]
crons = ["0 2 * * *"]

# Bindings (same as main app)
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "grove-media"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "514e91e81cc44d128a82ec6f668303e4"

[[durable_objects.bindings]]
name = "POST_CONTENT"
class_name = "PostContentDO"
script_name = "lattice"
```

**File:** `workers/post-migrator/src/index.ts`

```typescript
import { migratePostsToTiers } from "../../engine/src/lib/workers/post-migrator";

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log("[Cron] Starting scheduled post migration");

		ctx.waitUntil(migratePostsToTiers(env));
	},
};
```

---

### 4.3 Update Post Access to Track Views

**File:** `libs/engine/src/lib/server/services/posts.ts`

```typescript
export async function getPostWithCache(slug: string, tenantId: string): Promise<CachedPost | null> {
	const cacheKey = `posts:${tenantId}:${slug}`;

	// ... existing cache logic ...

	const post = await fetchPostFromStorage(slug, tenantId);

	if (!post) {
		return null;
	}

	// Track access time (async, don't await)
	trackPostAccess(post.id, tenantId).catch((err) => {
		console.error("[Posts] Failed to track access:", err);
	});

	// ... rest of function ...

	return post;
}

async function trackPostAccess(postId: string, tenantId: string) {
	// Update last_accessed_at in D1
	await db
		.prepare(
			`
    UPDATE posts
    SET last_accessed_at = ?
    WHERE id = ? AND tenant_id = ?
  `,
		)
		.bind(Date.now(), postId, tenantId)
		.run();

	// Also track view in PostMetaDO (for real-time stats)
	const metaDO = env.POST_META.get(env.POST_META.idFromName(`post-meta:${tenantId}:${postId}`));

	await metaDO.fetch("https://do/view", {
		method: "POST",
		body: JSON.stringify({ userId: "anonymous" }),
	});
}
```

---

### Phase 4 Expected Results

**Storage Optimization:**

| Scenario                      | Before             | After                   | Savings |
| ----------------------------- | ------------------ | ----------------------- | ------- |
| 10,000 posts (all in D1)      | $0.20/month        | $0.03/month             | 85%     |
| 100,000 posts (all in D1)     | $2.00/month        | $0.25/month             | 87%     |
| Popular post (1000 views/day) | D1 storage + reads | R2 storage + cache hits | 93%     |

**Migration Flow Example:**

```
Day 0: Post published → HOT (D1)
Day 30: No edits → WARM (R2)
Day 365: Low traffic → COLD (R2 archived)

Exception: Post goes viral on Day 100
→ 1000+ views/day → Moved back to WARM (R2) with aggressive caching
→ Not moved to HOT (D1) because content is static
```

---

## Phase 5: Feed Prefetching with FeedDO

**Goal:** Enable Meadow to prefetch 100s of posts before user sees them
**Timeline:** 6-10 hours of work
**Enables:** Instant feed loads, personalized content, low D1 load

### 5.1 Create FeedDO

**File:** `libs/engine/src/lib/durable-objects/FeedDO.ts`

```typescript
export class FeedDO extends DurableObject {
	private feedItems: FeedItem[] = [];
	private following: Set<string> = new Set();

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === "/feed" && request.method === "GET") {
			return this.handleGetFeed(url.searchParams);
		}

		if (path === "/prefetch" && request.method === "POST") {
			return this.handlePrefetchFeed(request);
		}

		if (path === "/following" && request.method === "PUT") {
			return this.handleUpdateFollowing(request);
		}

		return new Response("Not found", { status: 404 });
	}

	async handleGetFeed(params: URLSearchParams): Promise<Response> {
		const limit = parseInt(params.get("limit") || "50");
		const cursor = params.get("cursor");
		const sortBy = params.get("sortBy") || "recent";

		// Load from DO storage if empty
		if (this.feedItems.length === 0) {
			await this.loadFeedFromStorage();
		}

		// Paginate
		let items = this.feedItems;

		if (sortBy === "relevance") {
			items = [...items].sort((a, b) => b.score - a.score);
		} else {
			items = [...items].sort((a, b) => b.created_at - a.created_at);
		}

		const startIndex = cursor ? parseInt(cursor) : 0;
		const endIndex = startIndex + limit;
		const page = items.slice(startIndex, endIndex);

		return Response.json({
			items: page,
			nextCursor: endIndex < items.length ? String(endIndex) : null,
		});
	}

	async handlePrefetchFeed(request: Request): Promise<Response> {
		const { postIds } = (await request.json()) as { postIds: string[] };

		console.log(`[FeedDO] Prefetching ${postIds.length} posts`);

		// Batch fetch post metadata and content
		const posts = await this.batchFetchPosts(postIds);

		// Store in feed
		for (const post of posts) {
			this.feedItems.push({
				post_id: post.id,
				tenant_id: post.tenant_id,
				author_id: post.author_id,
				score: this.calculateRelevanceScore(post),
				created_at: post.published_at,
				cached_preview: {
					title: post.title,
					description: post.description,
					author_name: post.author_name,
					tags: post.tags,
				},
				reaction_counts: post.reaction_counts || {},
				added_at: Date.now(),
			});
		}

		// Persist to DO storage
		await this.saveFeedToStorage();

		return Response.json({ prefetched: posts.length });
	}

	async batchFetchPosts(postIds: string[]): Promise<any[]> {
		// TODO: Implement batch fetch from D1 + PostContentDO
		// For now, stub
		return [];
	}

	calculateRelevanceScore(post: any): number {
		// Simple scoring algorithm
		let score = 0;

		// Recency (0-100)
		const age = Date.now() - post.published_at;
		const daysSincePublished = age / (24 * 60 * 60 * 1000);
		score += Math.max(0, 100 - daysSincePublished);

		// Engagement (0-100)
		const totalReactions = Object.values(post.reaction_counts || {}).reduce(
			(sum: number, count: any) => sum + (count as number),
			0,
		);
		score += Math.min(100, totalReactions);

		// TODO: Add personalization based on user interests

		return score;
	}

	async loadFeedFromStorage() {
		const rows = await this.ctx.storage.sql
			.exec("SELECT * FROM feed_items ORDER BY created_at DESC LIMIT 500")
			.toArray();

		this.feedItems = rows.map((row) => ({
			post_id: row.post_id as string,
			tenant_id: row.tenant_id as string,
			author_id: row.author_id as string,
			score: row.score as number,
			created_at: row.created_at as number,
			cached_preview: JSON.parse(row.cached_preview as string),
			reaction_counts: JSON.parse(row.reaction_counts as string),
			added_at: row.added_at as number,
		}));
	}

	async saveFeedToStorage() {
		// Truncate to last 500 items
		const itemsToSave = this.feedItems.slice(0, 500);

		await this.ctx.storage.sql.exec("DELETE FROM feed_items");

		for (const item of itemsToSave) {
			await this.ctx.storage.sql.exec(
				`
        INSERT INTO feed_items (
          post_id, tenant_id, author_id, score, created_at,
          cached_preview, reaction_counts, added_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
				item.post_id,
				item.tenant_id,
				item.author_id,
				item.score,
				item.created_at,
				JSON.stringify(item.cached_preview),
				JSON.stringify(item.reaction_counts),
				item.added_at,
			);
		}
	}

	async handleUpdateFollowing(request: Request): Promise<Response> {
		const { userId, action } = await request.json();

		if (action === "follow") {
			this.following.add(userId);
		} else {
			this.following.delete(userId);
		}

		// TODO: Rebuild feed based on new following list

		return Response.json({ success: true });
	}
}

interface FeedItem {
	post_id: string;
	tenant_id: string;
	author_id: string;
	score: number;
	created_at: number;
	cached_preview: {
		title: string;
		description: string;
		author_name: string;
		tags: string[];
	};
	reaction_counts: Record<string, number>;
	added_at: number;
}
```

---

### 5.2 Meadow Feed Endpoint

**File:** `libs/engine/src/routes/api/meadow/feed/+server.ts`

```typescript
export async function GET({ locals, url }) {
	const { user } = locals;

	if (!user) {
		throw error(401, "Unauthorized");
	}

	// Get user's FeedDO
	const feedDO = locals.platform.env.FEEDS.get(
		locals.platform.env.FEEDS.idFromName(`feed:${user.id}`),
	);

	const limit = url.searchParams.get("limit") || "50";
	const cursor = url.searchParams.get("cursor") || "";
	const sortBy = url.searchParams.get("sortBy") || "recent";

	const response = await feedDO.fetch(
		`https://do/feed?limit=${limit}&cursor=${cursor}&sortBy=${sortBy}`,
	);

	const feed = await response.json();

	return json(feed);
}
```

---

### Phase 5 Expected Results

**Feed Performance:**

| Metric              | Without FeedDO                  | With FeedDO         | Improvement    |
| ------------------- | ------------------------------- | ------------------- | -------------- |
| Initial load time   | 2-5 seconds (D1 queries)        | 100-300ms (cached)  | 10-50x faster  |
| D1 queries per load | 50-100 (joins, filters)         | 0 (pre-computed)    | 100% reduction |
| Personalization     | Expensive (compute per request) | Pre-scored          | Instant        |
| Concurrent users    | Limited (D1 bottleneck)         | Scales horizontally | Unlimited      |

**Prefetch Strategy:**

When user follows someone:

1. FeedDO fetches that user's recent 50 posts
2. Calculates relevance scores
3. Caches preview data
4. Ready to serve instantly

When user opens Meadow:

1. FeedDO has 500 posts already scored and cached
2. No D1 queries needed
3. Pagination is instant (in-memory)
4. New posts added via WebSocket push

---

## Cost Projections

### Current State (No Optimization)

**100K users, 10 posts each, 1M views/month:**

```
D1 Storage: 1GB × $0.20 = $0.20/month
D1 Reads: 1M views × 1 read = $0.001/month
Config Queries: 1M requests × 1 read = $0.001/month
TOTAL: $0.202/month
```

**Scale: Cheap but inefficient**

---

### After Full Implementation

**Same scenario (100K users, 10 posts each, 1M views/month):**

```
D1 Storage: 0.1GB (hot posts) × $0.20 = $0.02/month
R2 Storage: 0.9GB (warm/cold) × $0.015 = $0.0135/month
D1 Reads: 50K (5% cache miss) × $0.001/M = $0.00005/month
R2 Reads: 45K (cached at 95%) × $0.36/M = $0.016/month
KV Operations: 1M reads × $0.50/10M = $0.05/month
DO Requests: 1M (TenantDO config) × $0.15/M = $0.15/month
DO Duration: minimal (hibernation)
TOTAL: $0.24/month
```

**Similar cost, but:**

- 95% reduction in D1 load (future-proof)
- Real-time features enabled (reactions, presence)
- Cross-device draft sync
- Feed prefetching (Meadow ready)
- Scales to 10M+ views without cost explosion

---

## Implementation Timeline

### Week 1: Caching Foundation

- **Day 1-2:** Phase 1 (HTTP + KV caching)
  - Add Cache-Control headers
  - Implement KV caching layer
  - Add cache invalidation

- **Day 3-4:** Testing & monitoring
  - Cache hit rate measurement
  - Performance benchmarks
  - Edge case handling

- **Day 5:** Deploy to production, monitor

**Deliverables:**

- 90% reduction in D1 reads
- 10x faster page loads
- Foundation for DO integration

---

### Week 2: TenantDO

- **Day 1-2:** Implement TenantDO class
  - Config caching
  - Draft sync storage
  - Analytics buffering

- **Day 3:** Update wrangler.toml, deploy DO

- **Day 4:** Integrate TenantDO into routes
  - Update hooks.server.ts
  - Create draft API endpoints
  - Update admin panel

- **Day 5:** Testing & cross-device validation

**Deliverables:**

- Tenant config cached in DO
- Cross-device draft sync working
- Analytics batched

---

### Week 3: Post DOs + Storage Tiers

- **Day 1-2:** Implement PostMetaDO
  - Reactions
  - Comments buffering
  - Presence tracking

- **Day 3:** Implement PostContentDO
  - Content caching
  - Storage location tracking
  - Migration methods

- **Day 4:** Update D1 schema, integrate into routes

- **Day 5:** Testing real-time features

**Deliverables:**

- Real-time reactions working
- WebSocket presence indicators
- Foundation for migration

---

### Week 4: Migration Worker + FeedDO

- **Day 1-2:** Create migration worker
  - Hot/warm/cold logic
  - Batch migration process
  - Cron scheduling

- **Day 3:** Implement FeedDO
  - Feed prefetching
  - Relevance scoring
  - Batch post fetching

- **Day 4-5:** Testing & tuning
  - Migration thresholds
  - Feed performance
  - Cost validation

**Deliverables:**

- Automated post migration working
- Feed prefetching ready for Meadow
- Complete optimization stack deployed

---

## Success Metrics

### Performance

- [ ] Blog page load time < 200ms (95th percentile)
- [ ] Cache hit rate > 90%
- [ ] Feed load time < 300ms
- [ ] Real-time reactions < 100ms latency

### Cost

- [ ] D1 read operations reduced by 95%
- [ ] Storage costs reduced by 85%
- [ ] Total infrastructure cost < $1/month per 10K users

### Features

- [ ] Cross-device draft sync working
- [ ] Real-time reactions functional
- [ ] Presence indicators showing
- [ ] Feed prefetching delivering instant loads

---

## Rollback Plan

Each phase is independently deployable and reversible:

**Phase 1 Rollback:** Remove Cache-Control headers, disable KV caching
**Phase 2 Rollback:** Fall back to D1 config queries, disable draft sync
**Phase 3 Rollback:** Remove DO bindings, revert to direct D1 access
**Phase 4 Rollback:** Stop cron worker, keep all posts in D1

**No data loss:** All DOs write to D1 as source of truth. DOs are caching/coordination layer only.

---

## Future Enhancements

### Beyond This Roadmap

1. **Content Versioning**
   - Store edit history in R2
   - Diff viewer in admin panel
   - Restore previous versions

2. **Collaborative Editing**
   - Multi-user draft editing
   - CRDTs for conflict-free merges
   - Live cursor positions

3. **Advanced Feed Algorithms**
   - Machine learning for relevance
   - User interest profiling
   - Topic clustering

4. **Media Optimization**
   - Automatic image resizing
   - WebP/AVIF conversion
   - CDN optimization

5. **Analytics Dashboard**
   - Real-time view counts
   - Engagement heatmaps
   - Reader retention metrics

---

## Questions & Decisions

### Open Questions

1. **Popular post threshold:** 100 views/day or different metric?
2. **Migration cadence:** Daily, weekly, or triggered by storage limits?
3. **Draft retention:** Keep drafts forever or expire after 90 days?
4. **Feed size:** 500 items or configurable per tier?

### Decisions Made

- ✓ Split PostDO into PostMetaDO + PostContentDO (better hibernation)
- ✓ Use R2 for warm/cold storage (93% cheaper than D1)
- ✓ Keep metadata in D1 always (fast queries)
- ✓ Popular posts stay in R2 but with aggressive caching
- ✓ Editing moves posts back to hot tier temporarily

---

## Next Steps

**Immediate (This Session):**

1. Review this plan
2. Validate technical approach
3. Identify any gaps or concerns

**Next Session:**

1. Start Phase 1: Implement caching layer
2. Test cache hit rates
3. Deploy to production
4. Monitor performance

**Future Sessions:** 2. Phase 2: TenantDO implementation 3. Phase 3: PostMetaDO + PostContentDO 4. Phase 4: Migration worker 5. Phase 5: FeedDO for Meadow

---

_This is your roadmap to a scalable, cost-effective, real-time blog platform. Each phase builds on the last, and you can pause after any phase with a working system. The architecture is designed to grow with your vision—from personal blogs to Meadow's social feed to whatever comes next in the Grove ecosystem._

_Let's build something that feels like home._ 🌲
