# Fox Optimize — Optimization Patterns Reference

## Diagnosis Decision Tree

```
Is it slow on first load?
├── YES → Check bundle size
│   ├── Bundle > 200kb? → Code split, tree shake
│   ├── Images > 500kb each? → Compress, lazy load
│   └── Many HTTP requests? → Combine, preload critical
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

## Caching Strategy

### Server SDK Caching Patterns

Use `GroveKV` from Server SDK instead of raw `platform.env.CACHE` for portable caching:

```typescript
import { GroveKV } from "@autumnsgrove/server-sdk";
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
