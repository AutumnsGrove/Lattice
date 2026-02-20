# Engine Client Loading Sequence

> Performance audit and optimization documentation for the Lattice engine.
> Related: #633, #631 (performance initiative)

## Current Loading Sequence (Post-Optimization)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REQUEST LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. EDGE (Cloudflare Worker)                                                 │
│     ├── grove-router: Subdomain → Worker routing                            │
│     └── TenantDO: Cached config lookup (~1ms hit, ~100ms miss)              │
│                                                                              │
│  2. SERVER (hooks.server.ts)                                                 │
│     ├── Turnstile verification (if configured)                              │
│     ├── Subdomain routing & context setup                                   │
│     ├── Auth: SessionDO validation (cached) or JWT fallback                 │
│     └── CSRF token generation/validation                                    │
│                                                                              │
│  3. DATA (layout.server.ts)                                                  │
│     └── Parallel D1 queries (Promise.all):                                  │
│         ├── site_settings                                                   │
│         ├── nav_pages                                                       │
│         ├── timeline_curio_config                                           │
│         ├── gallery_curio_config                                            │
│         └── journey_curio_config                                            │
│                                                                              │
│  4. HTML (app.html) ─ CRITICAL PATH                                         │
│     ├── Resource hints (preconnect, preload)   ← NEW                        │
│     ├── Theme detection script (blocking)                                   │
│     └── SvelteKit head injection                                            │
│                                                                              │
│  5. RENDER (+layout.svelte)                                                  │
│     ├── CSS: app.css, tokens.css, vine-pattern.css                          │
│     ├── Font: Lexend only (critical path)      ← OPTIMIZED                  │
│     ├── Optional fonts: Lazy-loaded on demand  ← NEW                        │
│     └── First Paint                                                         │
│                                                                              │
│  6. HYDRATION (Client-side)                                                  │
│     ├── SvelteKit hydration                                                 │
│     ├── Theme sync with localStorage                                        │
│     └── Interactive                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resource Hints

Added to `app.html` for faster first paint:

```html
<!-- Preconnect to CDN (saves ~100-300ms on first font request) -->
<link rel="preconnect" href="https://cdn.grove.place" crossorigin />
<link rel="dns-prefetch" href="https://cdn.grove.place" />

<!-- Preload critical font -->
<link
	rel="preload"
	href="https://cdn.grove.place/fonts/Lexend-Regular.ttf"
	as="font"
	type="font/ttf"
	crossorigin
/>
```

### Why These Hints Matter

1. **preconnect**: Establishes TCP + TLS connection before the font is requested
2. **dns-prefetch**: Fallback for browsers that don't support preconnect
3. **preload**: Tells browser to fetch Lexend with high priority

## Font Loading Strategy

### Before (All fonts loaded eagerly)

- 10 @font-face declarations in critical CSS
- All fonts downloaded regardless of usage
- ~500KB+ potential font downloads

### After (Lazy loading)

- Only Lexend in critical path (~100KB)
- Optional fonts loaded on-demand via dynamic import
- Triggered only when tenant uses non-default font

```typescript
// +layout.svelte
if (selectedFont !== "lexend" && !optionalFontsLoaded) {
	import("$lib/styles/fonts-optional.css");
	optionalFontsLoaded = true;
}
```

### Font Files

| Font                  | Location           | When Loaded      |
| --------------------- | ------------------ | ---------------- |
| Lexend                | Critical CSS       | Always (default) |
| Atkinson Hyperlegible | fonts-optional.css | On demand        |
| OpenDyslexic          | fonts-optional.css | On demand        |
| Quicksand             | fonts-optional.css | On demand        |
| Plus Jakarta Sans     | fonts-optional.css | On demand        |
| IBM Plex Mono         | fonts-optional.css | On demand        |
| Cozette               | fonts-optional.css | On demand        |
| Alagard               | fonts-optional.css | On demand        |
| Calistoga             | fonts-optional.css | On demand        |
| Caveat                | fonts-optional.css | On demand        |

## Performance Characteristics

### What's Render-Blocking

| Resource       | Blocking?         | Notes                         |
| -------------- | ----------------- | ----------------------------- |
| Theme script   | Yes (intentional) | Prevents FOUC                 |
| app.css        | Yes               | Contains Tailwind + variables |
| Lexend font    | No                | Uses font-display: swap       |
| Optional fonts | No                | Lazy-loaded                   |
| Gossamer CSS   | No                | Only loaded with GlassCard    |

### D1 Query Optimization

Layout queries run in parallel (not sequential):

```typescript
// ✅ Current: Parallel execution (~100-300ms total)
const [settings, navPages, timeline, gallery, journey] = await Promise.all([
  db.prepare("SELECT...").bind(tenantId).all().catch(...),
  db.prepare("SELECT...").bind(tenantId).all().catch(...),
  // ... etc
]);

// ❌ Previous: Sequential (~500-1500ms total)
const settings = await db.prepare("SELECT...").all();
const navPages = await db.prepare("SELECT...").all();
// ... etc
```

## Gossamer (ASCII Canvas)

Gossamer components are NOT render-blocking because:

1. CSS is imported only when GlassCard is used
2. Canvas rendering happens after first paint
3. Animation loop runs on requestAnimationFrame

## Future Optimization Opportunities

### Not Yet Implemented

1. **Edge caching for tenant config**: Currently TenantDO caches in-memory, could add KV layer
2. **Critical CSS extraction**: Could inline above-fold CSS
3. **Service Worker**: Could cache fonts and static assets
4. **Image lazy loading**: Could add IntersectionObserver for below-fold images

### Metrics to Track

- **FCP** (First Contentful Paint): Target < 1.5s
- **LCP** (Largest Contentful Paint): Target < 2.5s
- **TBT** (Total Blocking Time): Target < 200ms
- **CLS** (Cumulative Layout Shift): Target < 0.1

## Related Files

- `libs/engine/src/app.html` - Resource hints
- `libs/engine/src/routes/+layout.svelte` - Font loading logic
- `libs/engine/src/routes/+layout.server.ts` - Parallel D1 queries
- `libs/engine/src/hooks.server.ts` - Server-side processing
- `libs/engine/src/lib/styles/fonts-optional.css` - Lazy-loaded fonts

---

_Last updated: 2026-01-30_
_Issue: #633_
