# Fox Optimize — Optimization Patterns Reference

## Diagnosis Decision Tree

```
Is it slow on first load?
├── YES → Where is the time spent?
│   │
│   ├── Server response slow (TTFB > 500ms)?
│   │   ├── Sequential awaits in hooks/middleware? → Parallelize or hoist promises
│   │   ├── Too many DB queries per request? → Batch into Promise.all
│   │   ├── Unnecessary work for guests? → Skip logged-in-only queries
│   │   ├── DO/service cold starts? → Add keepalive crons, cache in KV
│   │   └── No edge caching? → Add Cache-Control + CDN-Cache-Control headers
│   │
│   ├── Client render slow (FCP/LCP high but TTFB ok)?
│   │   ├── Bundle > 200kb? → Code split, tree shake
│   │   ├── Images > 500kb each? → Compress, lazy load
│   │   └── Many HTTP requests? → Combine, preload critical
│   │
│   └── Not sure? → Check Network tab waterfall
│       ├── Long green bar (TTFB)? → Server-side problem
│       └── Long blue bar (content download/parse)? → Client-side problem
│
└── NO → Slow during use?
    ├── Slow API responses?
    │   ├── Check query times → Add indexes, reduce N+1
    │   ├── Check external calls → Cache, parallelize
    │   └── Check computation → Move to worker, memoize
    │
    ├── Janky scrolling/animations?
    │   ├── DevTools shows repaints? → Use transform/opacity only
    │   ├── Long frames (>16ms)? → Reduce work per frame
    │   └── Memory climbing? → Check for leaks
    │
    └── Slow interactions?
        ├── Click delay? → Check event handlers
        ├── Input lag? → Debounce, throttle
        └── Form submit slow? → Check validation, API
```

## Image Optimization

```svelte
<!-- Modern format with fallback -->
<picture>
	<source srcset="image.avif" type="image/avif" />
	<source srcset="image.webp" type="image/webp" />
	<img src="image.jpg" alt="Description" loading="lazy" decoding="async" />
</picture>

<!-- With responsive sizes -->
<img
	src="image.jpg"
	srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
	sizes="(max-width: 800px) 100vw, 800px"
	alt="Description"
	loading="lazy"
	decoding="async"
/>
```

**Quick wins:**

- Convert PNG/JPG to WebP: 25-35% smaller
- Convert WebP to AVIF: another 20-30% smaller
- Add `loading="lazy"` to all below-fold images
- Add `decoding="async"` to prevent main thread blocking
- Specify `width` and `height` to prevent layout shift

## Code Splitting (Lazy Loading)

```typescript
// Before: everything in main bundle
import HeavyChart from './HeavyChart.svelte';
import AdminPanel from './AdminPanel.svelte';

// After: lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart.svelte'));

// In SvelteKit with await
{#await import('./HeavyChart.svelte') then { default: HeavyChart }}
  <HeavyChart data={chartData} />
{/await}

// Tree shaking: import only what you need
import { format } from 'date-fns';          // ✓ Only imports format
import * as dateFns from 'date-fns';         // ✗ Imports everything
```

## Database Query Optimization

### N+1 Query Fix

```typescript
// Before: N+1 query problem (1 query + N queries for authors)
const posts = await db.query.posts.findMany();
for (const post of posts) {
	post.author = await db.query.users.findFirst({
		where: eq(users.id, post.authorId),
	});
}

// After: single query with join
const postsWithAuthors = await db.query.posts.findMany({
	with: {
		author: true,
	},
});
```

### Parallel Queries

```typescript
// Before: sequential (900ms+ for 3 queries)
const settings = await db.prepare("SELECT * FROM settings").bind(id).first();
const posts = await db.prepare("SELECT * FROM posts").bind(id).all();
const config = await db.prepare("SELECT * FROM config").bind(id).first();

// After: parallel (~300ms total)
const [settings, posts, config] = await Promise.all([
	db
		.prepare("SELECT * FROM settings")
		.bind(id)
		.first()
		.catch(() => null),
	db
		.prepare("SELECT * FROM posts")
		.bind(id)
		.all()
		.catch(() => ({ results: [] })),
	db
		.prepare("SELECT * FROM config")
		.bind(id)
		.first()
		.catch(() => null),
]);
```

### Index Creation

```sql
-- Identify the slow query
EXPLAIN QUERY PLAN
SELECT * FROM posts WHERE tenant_id = ? AND status = 'published'
ORDER BY created_at DESC;

-- Add composite index
CREATE INDEX idx_posts_tenant_status_created
ON posts(tenant_id, status, created_at DESC);
```

## Server-Side Request Lifecycle (SSR / Middleware)

The most impactful perf wins in multi-tenant SSR apps often aren't in the database
or the client — they're in the **middleware chain** where sequential awaits compound.

### Sequential Await Chain Detection

Look for this pattern in hooks, middleware, or layout load functions:

```typescript
// BAD: Each await blocks the next — total time = sum of all
const tenant = await getTenantConfig(subdomain);    // 150ms
const user = await validateSession(cookies);         // 200ms
const rateOk = await checkRateLimit(identifier);     // 50ms
const csrf = await generateCSRF(session);            // 30ms
// Total: ~430ms — and that's BEFORE layout/page loads even start
```

**Ask:** Do these depend on each other's results? If not, they can overlap.

### Promise Hoisting

Start a fetch **before** you need its result. Await it later when you do.
This is different from `Promise.all` — it works when operations are in
separate code sections that can't easily be wrapped in one call.

```typescript
// GOOD: Start auth fetch early, await it after routing completes
const authPromise = sessionCookie
    ? authService.fetch("/session/validate", {
        method: "POST",
        headers: { Cookie: cookieHeader },
      }).catch(() => null)
    : Promise.resolve(null);

// Subdomain routing runs while auth fetch is in flight
const tenant = await getTenantConfig(subdomain);
setTenantContext(tenant);

// Auth response likely already arrived — near-zero extra wait
const authResponse = await authPromise;
if (authResponse?.ok) { /* set user */ }
```

**Key insight:** The auth fetch and tenant lookup are independent — auth needs
cookies (available immediately), tenant needs the subdomain (also available
immediately). There's no reason to wait for one before starting the other.

### Batch Consolidation (Merge Promise.all Layers)

Multiple sequential `Promise.all` calls are a hidden waterfall:

```typescript
// BAD: 3 sequential await layers
const [settings, nav, curios] = await Promise.all([/* 5 queries */]);
// ^^^ must complete before vvv starts
const [greenhouse, homeGrove] = await Promise.all([/* 2 queries */]);
// ^^^ must complete before vvv starts
const lantern = await isFeatureEnabled("lantern", { greenhouse });

// GOOD: merge independent queries into one batch
const [settings, nav, curios, greenhouse, homeGrove] =
    await Promise.all([/* all 7 queries */]);
// Only the truly dependent call stays sequential
const lantern = await isFeatureEnabled("lantern", { greenhouse });
```

**Rule:** If query B doesn't need the result of query A, they belong in the
same `Promise.all`. Only keep things sequential when there's a real data
dependency.

### Conditional Work Skipping

Don't load data nobody will use:

```typescript
// BAD: Runs greenhouse + home grove check for every visitor
const greenhouse = await isInGreenhouse(tenantId);
const homeGrove = await getUserHomeGrove(db, email);

// GOOD: Only for logged-in users who actually need it
const greenhouse = locals.user
    ? await isInGreenhouse(tenantId).catch(() => false)
    : false;
const homeGrove = locals.user
    ? await getUserHomeGrove(db, locals.user.email).catch(() => null)
    : null;
```

**Common skippable work:**
- Greenhouse/feature flag checks → only for logged-in users
- Upload gate checks → only for tenant owners
- Admin UI data → only when `isOwner` is true
- Lantern/social features → only when user is authenticated

### Edge Caching for SSR Pages

Most SSR pages are the same for all anonymous visitors. Let the CDN serve them:

```typescript
// In +page.server.ts load function
if (tenantId) {
    setHeaders({
        "Cache-Control": "public, max-age=60, s-maxage=120",
        "CDN-Cache-Control": "max-age=300, stale-while-revalidate=3600",
        Vary: "Cookie",  // Different cache for logged-in vs anonymous
    });
}
```

**TTL guidance for Grove:**
| Content type | s-maxage | stale-while-revalidate | Why |
|-------------|----------|----------------------|-----|
| Home page | 120s | 3600s | Settings change occasionally |
| Blog post | 300s | 86400s | Published content is stable |
| Blog list | 300-600s | 3600s | New posts are infrequent |
| API feeds | 60s | 300s | More dynamic |
| Admin pages | no-store | — | Always personalized |

### Durable Object Cold Start Awareness

DOs add latency on first request after eviction (~200-500ms). Mitigations:

- **Keepalive crons** on critical-path DOs (grove-router already does this)
- **KV fallback** for config data that doesn't need real-time freshness
- **Staleness thresholds** in DO config (TenantDO uses 5-min; consider longer for rarely-changed config)
- **Never put a DO in the critical path of a cold-start chain** — if the router AND the tenant DO AND the auth DO all cold-start simultaneously, you get ~1.5s before any app code runs

## Caching Strategy

### Server SDK Caching Patterns

Use `GroveKV` from Server SDK instead of raw `platform.env.CACHE` for portable caching:

```typescript
import { GroveKV } from "@autumnsgrove/infra";
import { safeJsonParse } from "@autumnsgrove/lattice/server";

// Validated cache read with Rootwork
const kv = new GroveKV(platform.env);
const raw = await kv.get(cacheKey);
const data = safeJsonParse(raw, MySchema) ?? defaultValue;
```

For repeated cache reads with the same service, use `createTypedCacheReader()`:

```typescript
import { createTypedCacheReader } from "@autumnsgrove/lattice/server";

const typedCache = createTypedCacheReader(cache);
const stats = await typedCache.get("stats", tenantId, StatsSchema, defaultStats);
```

**Amber SDK storage:** Use `QuotaManager.canUpload()` before writes to prevent quota-exceeded failures.

### KV Cache for API Routes

```typescript
export const GET: RequestHandler = async ({ platform }) => {
	const cache = platform?.env?.CACHE;
	const cacheKey = "popular-posts";

	// Check cache first
	const cached = await cache?.get(cacheKey);
	if (cached) {
		return json(JSON.parse(cached));
	}

	// Fetch fresh
	const data = await fetchPopularPosts();

	// Cache for 5 minutes
	await cache?.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 });

	return json(data);
};
```

### Cache Invalidation

```typescript
// When a post is published, invalidate relevant caches
async function invalidatePostCaches(tenantId: string) {
	const kv = platform.env.CACHE;
	await Promise.all([
		kv.delete(`feed:${tenantId}:chronological`),
		kv.delete(`feed:${tenantId}:recent`),
		// Don't invalidate popular — let it age out
	]);
}
```

### Cache-Control Headers

```typescript
// Static assets: long cache
return new Response(body, {
	headers: {
		"Cache-Control": "public, max-age=31536000, immutable", // 1 year
	},
});

// API responses: short cache or no-store
return json(data, {
	headers: {
		"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
	},
});
```

## Memoization

```svelte
<script>
	import { memoize } from "$lib/utils/memoize";

	// Expensive computation — only recalculates when data changes
	const calculateStats = memoize((data) => {
		return data.reduce(/* complex aggregation */);
	});

	// Svelte 5: use $derived
	let stats = $derived(calculateStats(data));
</script>
```

## Virtual Scrolling (Long Lists)

```svelte
<!-- Only renders visible items, handles 10k+ items smoothly -->
<VirtualList items={largeArray} let:item itemHeight={60}>
	<ListItem {item} />
</VirtualList>
```

## Animation Performance

```css
/* Bad: triggers layout recalculation */
.element {
	transition:
		width 0.3s,
		height 0.3s,
		top 0.3s,
		left 0.3s;
}

/* Good: only affects compositing, no layout */
.element {
	transition:
		transform 0.3s,
		opacity 0.3s;
}

/* Use transform for position, not top/left */
.moving {
	transform: translateX(100px);
} /* ✓ */
.moving {
	left: 100px;
} /* ✗ */
```

## Memory Leaks

```svelte
<script>
	import { onDestroy } from "svelte";

	// Bad: listener never removed
	window.addEventListener("resize", handleResize);

	// Good: cleanup on component destroy
	onDestroy(() => {
		window.removeEventListener("resize", handleResize);
		clearInterval(pollingInterval);
		subscription?.unsubscribe();
	});
</script>
```

## Performance Budget in CI

```bash
# Add Lighthouse CI to GitHub Actions
- name: Performance Budget Check
  run: |
    npm run build
    npx bundlesize
```

```json
// package.json
{
	"bundlesize": [{ "path": "./build/client/**/*.js", "maxSize": "150kb" }]
}
```

## Common Bottleneck → Fix Table

| Symptom           | Likely Cause         | Quick Fix                           |
| ----------------- | -------------------- | ----------------------------------- |
| Slow initial load | Large JS bundle      | Code splitting, tree shaking        |
| Images slow       | Unoptimized formats  | WebP/AVIF, lazy loading             |
| Janky scrolling   | Layout thrashing     | Use transform, avoid layout changes |
| API slow          | Missing DB indexes   | Add indexes, implement caching      |
| Memory growing    | Leaking listeners    | Proper cleanup in onDestroy         |
| Slow interactions | Blocking main thread | Move work to web workers            |
| Everything slow   | No caching           | KV cache for expensive reads        |
