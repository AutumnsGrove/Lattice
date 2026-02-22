# Multi-Tenant Architecture Plan

> **Status:** Implemented (original plan: 2025-12-10, live as of early 2026)
> **Goal:** Single deployment serving all tenants, like YouTube/Twitter
>
> This architecture is now live. grove-router handles subdomain routing, Plant serves all tenants from one deployment, D1 stores per-tenant content, and TenantDO coordinates caching. The open questions below have been addressed (search via planned Vectorize, rate limiting via Threshold DO, custom domains via grove-router).

## The Problem

**Current approach (what we're moving away from):**

- Each tenant = separate GitHub repo + separate Pages deployment
- High operational overhead
- Doesn't scale beyond a handful of clients
- Each new tenant requires manual setup

**Target approach (YouTube model):**

- Single `lattice` Pages deployment
- All tenants served from same codebase
- Differentiation happens at runtime via subdomain → D1 lookup
- Content stored in D1/R2, loaded dynamically

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    grove-router Worker                      │
│              (catches *.grove.place requests)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   lattice Pages                         │
│                  (single deployment)                        │
├─────────────────────────────────────────────────────────────┤
│  hooks.server.ts                                            │
│  ├── Extract subdomain from X-Forwarded-Host                │
│  ├── Look up tenant in D1                                   │
│  └── Set context: { type: 'tenant', tenant: {...} }         │
├─────────────────────────────────────────────────────────────┤
│  Routes (all tenant-aware)                                  │
│  ├── / (home) → Load tenant's home page from D1             │
│  ├── /blog → Load tenant's posts from D1                    │
│  ├── /[slug] → Load specific post/page from D1              │
│  └── /admin → Tenant admin (requires auth + ownership)      │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      ┌───────┐      ┌───────┐      ┌───────┐
      │  D1   │      │  R2   │      │  KV   │
      │(data) │      │(media)│      │(cache)│
      └───────┘      └───────┘      └───────┘
```

## Key Design Decisions

### 1. Content Storage: D1 + R2

**Posts & Pages → D1**

- Already have `posts` and `pages` tables with `tenant_id`
- Markdown stored in DB, rendered at request time (or cached)
- No static file generation per tenant

**Media → R2**

- Images/files stored in R2 with tenant prefix: `tenants/{tenant_id}/media/...`
- Served via CDN with proper caching headers

### 2. Caching Strategy (Critical for D1 Limits)

**D1 Limits:**

- 1000 writes/minute (this is the constraint)
- Reads are much more generous

**Caching Layers:**

```
Request → KV Cache → D1 Database
              ↑
        (cache miss = read from D1, store in KV)
```

**What to cache in KV:**

- Tenant config (TTL: 5 min) - rarely changes
- Post list for homepage (TTL: 1 min) - changes on publish
- Individual post content (TTL: 5 min) - rarely changes
- Site settings (TTL: 5 min) - rarely changes

**Cache invalidation:**

- On post create/update/delete → invalidate post list + specific post
- On settings change → invalidate settings cache
- Use `waitUntil()` for async cache updates

### 3. Route Structure

```
(tenant)/                    # Tenant blog routes
├── +layout.server.ts        # Load tenant context
├── +page.svelte             # Home page (load from D1)
├── blog/
│   ├── +page.svelte         # Post list (load from D1)
│   └── [slug]/
│       └── +page.svelte     # Single post (load from D1)
├── about/
│   └── +page.svelte         # About page (load from D1)
└── admin/                   # Tenant admin panel
    ├── +layout.server.ts    # Require auth + tenant ownership
    ├── posts/               # Post management
    ├── pages/               # Page management
    ├── media/               # Media library
    └── settings/            # Tenant settings
```

### 4. Authentication & Authorization

**Flow:**

1. User visits `dave.grove.place`
2. User clicks "Sign In" → redirects to `auth.grove.place`
3. Auth completes → redirect back with session cookie (`.grove.place` domain)
4. `hooks.server.ts` validates session, sets `locals.user`
5. Admin routes check: `user.email === tenant.owner_email`

**Key rule:** Tenants can only edit their OWN content.

### 5. Theming

**Per-tenant themes stored in D1:**

```sql
tenant_settings (tenant_id, setting_key, setting_value)
-- Examples:
-- ('tenant-123', 'theme', 'forest')
-- ('tenant-123', 'primary_color', '#2d5016')
-- ('tenant-123', 'font_family', 'alagard')
```

**Applied at runtime:**

- Layout loads tenant settings
- CSS variables set based on settings
- Theme components render accordingly

## Cost Analysis

### D1 Pricing (as of 2025)

- Reads: $0.001 per million
- Writes: $1.00 per million
- Storage: $0.75/GB/month

### Scenario: 100 tenants, each with 50 posts

**Without caching (worst case):**

- 10,000 page views/day across all tenants
- Each view = ~3 D1 reads (tenant, settings, post)
- 30,000 reads/day = ~$0.03/month

**Writes (the real constraint):**

- 100 tenants × 2 posts/week = 200 writes/week
- Plus settings changes, etc. = ~500 writes/week
- Well under 1000/minute limit

**With KV caching (realistic):**

- 90%+ cache hit rate
- D1 reads drop to ~3,000/day
- Essentially free at this scale

### Scaling Concerns

**At 10,000 tenants:**

- Still fine for reads (KV handles it)
- Writes: 10,000 × 2 posts/week = 20,000 writes/week
- 20,000 / 7 / 24 / 60 = ~2 writes/minute (still fine!)

**Real bottleneck:** R2 storage costs at scale

- Solution: Storage limits per plan (already planned)

## Migration Path

### Phase 1: Runtime Content Loading (Current Priority)

1. [ ] Create tenant-aware page loaders
2. [ ] Load posts/pages from D1 instead of static routes
3. [ ] Implement KV caching layer
4. [ ] Test with Dave's tenant

### Phase 2: Tenant Admin Panel

1. [ ] Build admin routes with tenant isolation
2. [ ] Post editor that writes to D1 (not file system)
3. [ ] Media upload to R2 with tenant prefix
4. [ ] Settings management

### Phase 3: Onboarding Flow

1. [ ] Signup creates tenant in D1
2. [ ] Subdomain reservation
3. [ ] Initial setup wizard
4. [ ] Plan selection + billing

### Phase 4: Remove Static Dependencies

1. [ ] Remove `example-site` package (becomes skeleton only)
2. [ ] All content is dynamic
3. [ ] Autumn's site remains separate repo (special case)

## Open Questions

1. **Pre-rendering?**
   - Could we pre-render popular posts to KV for instant load?
   - Trade-off: complexity vs. latency

   ANSWER: I really like this idea. Yes. How will we determine what is "popular" though?
   Idea. Maybe we could have new posts sent to KV right off the bat?

2. **Full-text search?**
   - D1 has basic LIKE queries
   - For real search: Cloudflare Vectorize or external service?

   ANSWER: Yes. this is essential. Lets trhy and use Cloudflare Vectorize first, and if it doesnt work we will try something like Mileisearch. I've actully started on adding searching to the websites on my autumnsgrove.com domain but the search doesnt actually _work_.

3. **Custom domains (Business plan)?**
   - Need Worker route for custom domains
   - Or: Cloudflare for SaaS?

   ANSWER: Extend the router. Have it route users to their custom domains.
   If that won't work, then we can decide again after more thoruough planning.

4. **Rate limiting per tenant?**
   - Prevent one tenant from hogging resources
   - KV-based rate limiting?

   ANSWER: THis sounds like a really great idea but I am entirely unsure of how to execute such a thing. Lets do some research on it and re-discuss it.

## Files to Create/Modify

| File                                                          | Action | Purpose                      |
| ------------------------------------------------------------- | ------ | ---------------------------- |
| `libs/engine/src/lib/data/posts.ts`                           | CREATE | D1 post queries with caching |
| `libs/engine/src/lib/data/pages.ts`                           | CREATE | D1 page queries with caching |
| `libs/engine/src/lib/data/cache.ts`                           | CREATE | KV caching utilities         |
| `libs/engine/src/routes/(tenant)/+layout.server.ts`           | CREATE | Tenant layout loader         |
| `libs/engine/src/routes/(tenant)/+page.server.ts`             | CREATE | Home page loader             |
| `libs/engine/src/routes/(tenant)/blog/+page.server.ts`        | CREATE | Blog list loader             |
| `libs/engine/src/routes/(tenant)/blog/[slug]/+page.server.ts` | CREATE | Single post loader           |

---

_Created: 2025-12-10_
_Status: Implemented — multi-tenant architecture is live_
