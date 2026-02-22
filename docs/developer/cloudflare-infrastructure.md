# Cloudflare Infrastructure

> *Workers for compute, D1 for databases, KV for caching, R2 for storage.*

Grove is built entirely on Cloudflare's edge infrastructure. This guide covers the key services, their limits, and how we use them.

---

## The Stack

| Service | Purpose | Grove Usage |
|---------|---------|-------------|
| **Workers** | Compute | API routes, server-side rendering |
| **Pages** | Static hosting + Workers | Main site deployment |
| **D1** | SQLite database | 3 databases: core (posts, users), curios (widgets), observability (metrics) |
| **KV** | Key-value cache | Config, sessions, content cache |
| **R2** | Object storage | Images, media uploads |
| **Durable Objects** | Stateful coordination | Rate limiting, real-time features |

---

## Critical Limits

### Free Tier

| Service | Limit | Notes |
|---------|-------|-------|
| Workers | 100K requests/day | Resets at midnight UTC |
| D1 | 5M rows read/day, 100K writes/day | 500 MB per database |
| KV | 100K reads/day, 1K writes/day | 1 GB total storage |
| R2 | 10 GB storage | Zero egress fees |
| DNS | 200-1000 records | Depends on zone creation date |

### Workers Paid ($5/month)

| Service | Included | Overage |
|---------|----------|---------|
| Workers | 10M requests/month | $0.30/million |
| D1 reads | 25B rows/month | $0.001/million |
| D1 writes | 50M rows/month | $1.00/million |
| KV reads | 10M/month | $0.50/million |
| R2 storage | 10 GB | $0.015/GB |

---

## Architecture Patterns

### Wildcard Routing

A single wildcard CNAME (`*.grove.place`) routes all subdomains to one Worker:

```javascript
export default {
  async fetch(request, env) {
    const hostname = new URL(request.url).hostname;
    const tenantId = hostname.split('.')[0]; // username.grove.place → username

    const tenantConfig = await env.KV.get(`tenant:${tenantId}:config`, 'json');
    if (!tenantConfig) return new Response('Not found', { status: 404 });

    return handleTenantRequest(tenantId, request, env);
  }
};
```

### KV Caching

Cache D1 queries to stay within limits:

```typescript
async function getTenantConfig(env, tenantId: string) {
  const cacheKey = `tenant:${tenantId}:config`;

  // Try cache first
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) return cached;

  // Miss: query D1
  const result = await env.DB.prepare(
    'SELECT * FROM tenants WHERE id = ?'
  ).bind(tenantId).first();

  // Store in cache (5 min TTL)
  await env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });

  return result;
}
```

### R2 Media Storage

Tenant-prefixed paths for isolation:

```typescript
async function uploadMedia(env, tenantId: string, file: File) {
  const key = `tenants/${tenantId}/media/${Date.now()}-${file.name}`;
  await env.R2_BUCKET.put(key, file.stream());
  return `https://media.grove.place/${key}`;
}
```

---

## Cost Projections

Assuming typical blog: 5,000 pageviews/month, 100 images (50 MB), 3 KV reads per page, 2 D1 queries per page.

| Tenants | Monthly Cost | Per Tenant |
|---------|-------------|------------|
| 50 | $5.00 | $0.10 |
| 100 | $5.00 | $0.05 |
| 200 | $5.00 | $0.025 |
| 500 | $6.13 | $0.012 |
| 1,000 | $13.50 | $0.0135 |

**Key insight:** Cloudflare exhibits strong economies of scale. Cost per tenant drops 97% from 10 to 1,000 clients.

---

## Data Isolation

### D1: Shared Databases + tenant_id

Every table has a `tenant_id` column. Every query filters by it.

```sql
SELECT * FROM posts WHERE tenant_id = ? AND slug = ?
```

### KV: Key Prefixing

```
tenant:{tenantId}:{resource}:{id}
tenant:dave:post:123
tenant:dave:settings
```

### R2: Path Prefixing

```
tenants/{tenantId}/media/{year}/{month}/{filename}
tenants/dave/media/2026/01/photo.jpg
```

---

## Multiple D1 Databases

As of February 2026, Grove uses three D1 databases with clear ownership boundaries:

| Database | Binding | Tables | Purpose |
|----------|---------|--------|---------|
| `grove-engine-db` | `DB` | 78 | Core platform: tenants, posts, pages, auth, social, billing, sentinel |
| `grove-curios-db` | `CURIO_DB` | 45 | Curio widgets: timeline, gallery, guestbook, polls, mood ring, etc. |
| `grove-observability-db` | `OBS_DB` | 16 | Platform monitoring: metrics, health checks, costs, alerts |

### Binding Pattern

Most routes use a single database. Cross-concern routes use dual bindings:

```typescript
// Simple curio route — single binding
const curioDb = platform?.env?.CURIO_DB;
const gallery = await curioDb.prepare('SELECT * FROM gallery_images WHERE tenant_id = ?')
  .bind(tenantId).all();

// Timeline generate — dual binding (needs secrets from core DB + curio tables)
const db = platform?.env?.DB;         // SecretsManager reads tenant_secrets, tenants
const curioDb = platform?.env?.CURIO_DB; // Timeline tables
const config = await curioDb.prepare('SELECT * FROM timeline_curio_config WHERE tenant_id = ?')
  .bind(tenantId).first();
const token = await getTimelineToken({ DB: db, ... }, tenantId, ...);
```

### Which Apps Bind Which Databases

| App / Worker | `DB` | `CURIO_DB` | `OBS_DB` | Notes |
|---|:---:|:---:|:---:|---|
| `apps/landing` | Yes | Yes | Yes | Serves curio routes + vista dashboard |
| `workers/timeline-sync` | Yes | Yes | — | SecretsManager (DB) + timeline tables (CURIO_DB) |
| `workers/vista-collector` | — | — | Yes | Only needs observability tables |
| `apps/domains` | Yes | — | — | Core DB only |
| `apps/plant` | Yes | — | — | Core DB only |

### Cost Implications

D1 databases are free to create on Cloudflare. The paid tier charges per-row read/write across all databases combined, so splitting tables across databases has zero cost impact. The benefit is organizational: each database has a clear owner and can be managed independently.

---

## SSL & Domains

### Automatic SSL

Universal SSL (free) covers:
- `grove.place`
- `*.grove.place` (all first-level subdomains)

**Second-level subdomains** (like `admin.dave.grove.place`) require Advanced Certificate Manager ($10/month) or Business plan.

### Custom Domains

Cloudflare for SaaS: $0.10/month per custom domain

- Automated SSL provisioning
- Domain validation
- CNAME flattening

---

## Performance Tips

1. **Cache aggressively** — KV reads are much cheaper than D1 queries
2. **Use `waitUntil()`** — For async cache updates after response
3. **Minimize D1 writes** — 1000/minute limit is the real constraint
4. **R2 egress is free** — Serve media directly from R2, not through Workers
5. **Use Durable Objects sparingly** — They have per-request costs

---

## Local Development

```bash
# Start local dev with all bindings
wrangler pages dev --d1=DB --kv=KV --r2=R2_BUCKET

# Seed local D1
wrangler d1 execute DB --local --file=./schema.sql
```

---

*The full infrastructure guide is at `docs/cloudflare-architecture-guide.md`.*
