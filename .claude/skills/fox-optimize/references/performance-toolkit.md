# Fox Optimize — Performance Toolkit Reference

## Grove-Specific Measurement Commands

### Bundle Size Tracking

```bash
# Quick size check — build and measure output
pnpm --filter @autumnsgrove/lattice build && du -sh libs/engine/dist/

# Per-chunk breakdown (SvelteKit apps)
pnpm --filter grove-landing build && ls -lhS apps/landing/.svelte-kit/output/client/_app/immutable/chunks/ | head -20

# Check total JS payload per app
pnpm --filter grove-plant build && find apps/plant/.svelte-kit/output/client -name "*.js" -exec du -ch {} + | tail -1

# Compare bundle sizes before and after changes
# 1. Save baseline
pnpm --filter @autumnsgrove/lattice build && du -sb libs/engine/dist/ > /tmp/bundle-before.txt
# 2. Make changes, then:
pnpm --filter @autumnsgrove/lattice build && du -sb libs/engine/dist/ > /tmp/bundle-after.txt
# 3. Compare
paste /tmp/bundle-before.txt /tmp/bundle-after.txt | awk '{printf "Before: %d bytes\nAfter:  %d bytes\nDelta:  %d bytes (%.1f%%)\n", $1, $3, $3-$1, ($3-$1)/$1*100}'
```

### Treemap Visualization

```typescript
// Add to vite.config.ts temporarily for visual bundle analysis
import { visualizer } from "rollup-plugin-visualizer";

plugins: [
	visualizer({
		open: true,
		gzipSize: true,
		brotliSize: true,
		filename: "bundle-report.html",
	}),
];
```

### API Route Profiling

```typescript
// Quick timing wrapper for API routes
// Add temporarily to measure, remove after optimization
const start = performance.now();
const result = await expensiveOperation();
const elapsed = performance.now() - start;
console.log(`[perf] ${url.pathname}: ${elapsed.toFixed(1)}ms`);
```

### D1 Query Profiling

```bash
# Profile queries via wrangler d1 execute
# Check for full table scans (SCAN = bad, SEARCH = good)
npx wrangler d1 execute grove-engine-db --local --command "EXPLAIN QUERY PLAN SELECT * FROM posts WHERE tenant_id = 'test' AND status = 'published' ORDER BY created_at DESC"

# Check curios database
npx wrangler d1 execute grove-curios-db --local --command "EXPLAIN QUERY PLAN SELECT * FROM timeline_posts WHERE tenant_id = 'test' ORDER BY posted_at DESC"

# Check observability database
npx wrangler d1 execute grove-observability-db --local --command "EXPLAIN QUERY PLAN SELECT * FROM sentinel_events WHERE tenant_id = 'test' AND event_type = 'error'"
```

### Common Index Patterns for Grove

```sql
-- Multi-tenant queries (most common pattern across all 3 databases)
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);

-- Filtered lists with status
CREATE INDEX idx_{table}_tenant_status ON {table}(tenant_id, status);

-- Time-ordered feeds (posts, timeline, events)
CREATE INDEX idx_{table}_tenant_created ON {table}(tenant_id, created_at DESC);

-- Slug lookups (posts, pages)
CREATE INDEX idx_{table}_tenant_slug ON {table}(tenant_id, slug);

-- Cross-database: curios tables follow the same tenant_id pattern
-- grove-curios-db tables: timeline_posts, gallery_images, guestbook_entries, etc.
-- grove-observability-db tables: sentinel_events, vista_pageviews, etc.
```

## Cloudflare-Specific Performance

### KV Caching with GroveKV

```typescript
import { GroveKV } from "@autumnsgrove/infra";
import { safeJsonParse } from "@autumnsgrove/lattice/server";

// Cache expensive computations in KV
const kv = new GroveKV(platform.env);
const cacheKey = `perf:${tenantId}:popular-posts`;

// Read with validation
const cached = await kv.get(cacheKey);
const data = safeJsonParse(cached, PopularPostsSchema);

if (data) return json(data);

// Compute and cache
const fresh = await computePopularPosts(db, tenantId);
await kv.put(cacheKey, JSON.stringify(fresh), { expirationTtl: 300 }); // 5 min
return json(fresh);
```

### Workers Performance Patterns

```typescript
// Parallelize independent D1 queries (common perf win)
const [settings, posts, config] = await Promise.all([
	db.prepare("SELECT * FROM site_settings WHERE tenant_id = ?").bind(tenantId).first()
		.catch(() => null),
	db.prepare("SELECT * FROM posts WHERE tenant_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 20").bind(tenantId).all()
		.catch(() => ({ results: [] })),
	db.prepare("SELECT * FROM tenant_config WHERE tenant_id = ?").bind(tenantId).first()
		.catch(() => null),
]);

// Cross-database parallelization (when route needs both DB and CURIO_DB)
const [coreData, curioData] = await Promise.all([
	platform.env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(tenantId).first(),
	platform.env.CURIO_DB.prepare("SELECT * FROM timeline_posts WHERE tenant_id = ? ORDER BY posted_at DESC LIMIT 10").bind(tenantId).all(),
]);
```

### Cache-Control Headers for Grove

```typescript
// Static assets (fonts, images with hash): immutable
headers: { "Cache-Control": "public, max-age=31536000, immutable" }

// API responses (feeds, lists): short cache with stale-while-revalidate
headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }

// Personalized content (arbor dashboard): no-store
headers: { "Cache-Control": "private, no-store" }

// Theme/season assets: medium cache (changes seasonally)
headers: { "Cache-Control": "public, max-age=86400" } // 1 day
```

## Performance Report Template

```
╭─────────────────────────────────────────────────────╮
│              Fox Performance Report 🦊               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Target:    [what was slow]                         │
│  Cause:     [what was causing it]                   │
│  Fix:       [what was done]                         │
│                                                     │
│  Metric          Before    After    Improvement     │
│  ─────────────────────────────────────────────      │
│  FCP             ___s      ___s     __% faster      │
│  LCP             ___s      ___s     __% faster      │
│  Bundle size     ___kb     ___kb    __% smaller     │
│  Query time      ___ms     ___ms    __% faster      │
│  Memory usage    ___MB     ___MB    __% less        │
│                                                     │
│  Regression:  [ ] CI passes (gw ci --affected)      │
│  Monitoring:  [ ] Budget added to CI                │
│                                                     │
╰─────────────────────────────────────────────────────╯
```

## Lighthouse CI Budget

```json
{
	"timings": [
		{ "metric": "first-contentful-paint", "budget": 1800 },
		{ "metric": "largest-contentful-paint", "budget": 2500 },
		{ "metric": "interactive", "budget": 3800 }
	],
	"resourceSizes": [
		{ "resourceType": "script", "budget": 150 },
		{ "resourceType": "stylesheet", "budget": 50 },
		{ "resourceType": "image", "budget": 500 }
	]
}
```

## Performance Targets (Quick Reference)

| Metric | Target | Alarm | How to Measure |
|--------|--------|-------|----------------|
| FCP | < 1.8s | > 2.5s | Lighthouse |
| LCP | < 2.5s | > 4.0s | Lighthouse |
| TTI | < 3.8s | > 5.0s | Lighthouse |
| API p95 | < 200ms | > 500ms | Console timing |
| D1 query | < 50ms | > 200ms | EXPLAIN + timing |
| Bundle JS | < 150kb | > 300kb | Build output |
| Animation | 60fps | < 30fps | DevTools Performance |
