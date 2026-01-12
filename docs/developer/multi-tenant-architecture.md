# Multi-Tenant Architecture

> *Single deployment serving all tenants, like YouTube or Twitter.*

Grove uses a multi-tenant architecture where a single codebase serves all users. Each user gets their own subdomain (`username.grove.place`) while sharing underlying infrastructure.

---

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    grove-router Worker                      │
│              (catches *.grove.place requests)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   groveengine Pages                         │
│                  (single deployment)                        │
├─────────────────────────────────────────────────────────────┤
│  hooks.server.ts                                            │
│  ├── Extract subdomain from X-Forwarded-Host                │
│  ├── Look up tenant in D1                                   │
│  └── Set context: { type: 'tenant', tenant: {...} }         │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      ┌───────┐      ┌───────┐      ┌───────┐
      │  D1   │      │  R2   │      │  KV   │
      │(data) │      │(media)│      │(cache)│
      └───────┘      └───────┘      └───────┘
```

---

## Key Design Decisions

### Content Storage

| Data Type | Storage | Pattern |
|-----------|---------|---------|
| Posts & Pages | D1 | `tenant_id` column, markdown stored in DB |
| Media | R2 | Tenant prefix: `tenants/{tenant_id}/media/...` |
| Config/Cache | KV | Key prefix: `tenant:{tenant_id}:...` |

### Caching Strategy

D1 has write limits (1000/minute), so caching is critical:

```
Request → KV Cache → D1 Database
              ↑
        (cache miss = read from D1, store in KV)
```

**Cache TTLs:**
- Tenant config: 5 minutes
- Post list: 1 minute
- Individual post: 5 minutes
- Site settings: 5 minutes

### Route Structure

```
(tenant)/
├── +layout.server.ts        # Load tenant context
├── +page.svelte             # Home (load from D1)
├── blog/
│   ├── +page.svelte         # Post list
│   └── [slug]/+page.svelte  # Single post
└── admin/                   # Tenant admin panel
    ├── +layout.server.ts    # Require auth + ownership
    ├── posts/               # Post management
    └── settings/            # Tenant settings
```

### Authentication Flow

1. User visits `dave.grove.place`
2. Clicks "Sign In" → redirects to `auth.grove.place` (Heartwood)
3. Auth completes → redirect back with session cookie (`.grove.place` domain)
4. `hooks.server.ts` validates session, sets `locals.user`
5. Admin routes check: `user.email === tenant.owner_email`

**Key rule:** Tenants can only edit their OWN content.

---

## Data Isolation

Grove uses a **shared database with tenant_id columns** pattern:

- Every table has a `tenant_id` column
- Every query MUST filter by `tenant_id`
- KV keys prefixed: `tenant:{id}:{resource}:{key}`
- R2 paths prefixed: `tenants/{id}/...`

### Why Not Per-Tenant Databases?

- Simpler schema management
- Straightforward cross-tenant analytics
- D1's 10GB limit is plenty for shared use
- Migration complexity not worth isolation benefits at current scale

---

## Cost Analysis

### At 100 Tenants

| Service | Usage | Cost |
|---------|-------|------|
| D1 reads | ~3,000/day (with KV cache) | ~$0.003/mo |
| D1 writes | ~500/week | Free |
| KV reads | 90%+ cache hit | Minimal |
| R2 storage | 5GB | Free |

**Total: ~$5/month** (Workers Paid base)

### Scaling

D1 writes: Even at 10,000 tenants × 2 posts/week = ~2 writes/minute (well under 1000/min limit)

**Real bottleneck:** R2 storage costs at scale → solved with per-plan storage limits

---

## Theming

Per-tenant themes stored in D1:

```sql
tenant_settings (tenant_id, setting_key, setting_value)
-- ('tenant-123', 'theme', 'forest')
-- ('tenant-123', 'primary_color', '#2d5016')
```

Applied at runtime via CSS variables.

---

*The full architecture doc is at `docs/multi-tenant-architecture.md`.*
