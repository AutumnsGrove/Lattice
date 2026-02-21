# Fox Optimize — Measurement Tools Reference

## The Rule: Measure Before Optimizing

80% of performance problems come from:
1. Unoptimized images
2. Missing database indexes
3. No caching
4. Too much JavaScript upfront

Check these first before diving deeper.

## Performance Targets

| Metric | Target | Alarm |
|--------|--------|-------|
| First Contentful Paint (FCP) | < 1.8s | > 2.5s |
| Largest Contentful Paint (LCP) | < 2.5s | > 4.0s |
| Time to Interactive (TTI) | < 3.8s | > 5.0s |
| API response (p95) | < 200ms | > 500ms |
| Animation | 60fps | < 30fps |

## Lighthouse

```bash
# Install globally
npm install -g lighthouse

# Run audit
lighthouse https://yoursite.com --output=json --output-path=report.json

# View HTML report
lighthouse https://yoursite.com --view

# CI mode (returns non-zero if below thresholds)
lighthouse https://yoursite.com --budget-path=budget.json
```

**What Lighthouse flags:**
- Unused JavaScript (code splitting opportunity)
- Render-blocking resources (defer/async candidates)
- Unoptimized images (format, size, lazy loading)
- Third-party scripts (impact on TTI)
- Missing compression (Brotli/gzip)

## Bundle Analysis

```bash
# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({ open: true, gzipSize: true })
]

# Build and view
npm run build  # Opens treemap visualization automatically
```

**What to look for:**
- Large dependencies (can you tree-shake or lazy-load?)
- Duplicate modules (same library included multiple times)
- Unnecessary polyfills (target modern browsers)
- Entire libraries imported when only one function is needed

**Quick size check:**
```bash
npm run build && du -sh build/
# or
ls -lh build/client/_app/immutable/chunks/
```

**Budget enforcement:**
```json
// package.json
{
  "bundlesize": [
    { "path": "./build/client/**/*.js", "maxSize": "150kb" },
    { "path": "./build/client/**/*.css", "maxSize": "50kb" }
  ]
}
```

## Database Query Profiling

```sql
-- Check for missing indexes (SQLite)
EXPLAIN QUERY PLAN
SELECT * FROM posts WHERE tenant_id = 'x' AND status = 'published';
-- "SCAN" = bad (full table scan)
-- "SEARCH" = good (index used)

-- Add the index
CREATE INDEX idx_posts_tenant_status ON posts(tenant_id, status);

-- Verify it helps
EXPLAIN QUERY PLAN
SELECT * FROM posts WHERE tenant_id = 'x' AND status = 'published';
-- Should now show SEARCH
```

**Common index patterns for Grove:**
```sql
-- Multi-tenant queries (most common)
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);

-- Filtered list queries
CREATE INDEX idx_{table}_tenant_status ON {table}(tenant_id, status);

-- Time-ordered feeds
CREATE INDEX idx_{table}_tenant_created ON {table}(tenant_id, created_at DESC);

-- Slug lookups
CREATE INDEX idx_{table}_slug ON {table}(slug);
```

## Chrome DevTools

**Performance tab:**
- Record → page load → look for Long Tasks (>50ms in red)
- Layout thrashing = repeated read/write cycles causing forced reflows
- Memory leaks = heap size growing during user interactions

**Network tab:**
- Slow 3G preset simulates real user conditions
- Look for: large resources, waterfall bottlenecks, uncompressed responses
- "Initiator" column shows what caused each request

**Memory tab:**
- Heap snapshot before and after user actions
- Compare snapshots to find retained objects
- Growing heap with no user action = leak

## Performance Monitoring in Production

```bash
# Add to CI pipeline
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://yoursite.com
    budgetPath: ./budget.json
    uploadArtifacts: true
```

**Alert thresholds:**
```json
// budget.json
{
  "timings": [
    { "metric": "first-contentful-paint", "budget": 1800 },
    { "metric": "interactive", "budget": 3800 }
  ],
  "resourceSizes": [
    { "resourceType": "script", "budget": 150 },
    { "resourceType": "image", "budget": 500 }
  ]
}
```

## Before/After Comparison Template

```
Metric          Before    After    Improvement
─────────────────────────────────────────────
FCP             2.4s      1.1s     54% faster
Bundle size     340kb     180kb    47% smaller
Query time      450ms     85ms     81% faster
Memory usage    180MB     95MB     47% less
```
