---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - infrastructure
  - migration
  - cloudflare
  - contingency
type: implementation-plan
---

```
                    ╭─────────────────╮
                    │  BREAK GLASS    │
                    │                 │
                    │   ╭─────────╮   │
                    │   │ IN CASE │   │
                    │   │   OF    │   │
                    │   │  NEED   │   │
                    │   ╰─────────╯   │
                    │                 │
                    │  🔨             │
                    ╰─────────────────╯

       Not because you will. Because you could.
```

> _Not because you will. Because you could._

# Break Glass: Moving Off Cloudflare

This document exists for one reason: to prove Grove can leave Cloudflare if it ever needs to. Not because a migration is planned. Not because Cloudflare is a bad partner. But because documenting the escape route keeps the dependency honest.

The Server SDK (see `server-sdk-spec.md`) makes this playbook executable. When the SDK is in place, migration becomes "write these adapters, swap the config, deploy." Without the SDK, it's "rewrite the application layer."

---

## When to Break Glass

This playbook activates when any of these conditions are met:

- Cloudflare raises prices beyond sustainability (> 3x current spend)
- Cloudflare changes TOS to claim rights over customer data or code
- Cloudflare is acquired by a hostile entity
- Cloudflare launches a competing blogging/CMS product
- Cloudflare experiences extended outages (> 48 hours cumulative in a quarter)
- Cloudflare is compelled by legal order to compromise user data

If none of these happen, this document stays sealed behind glass. That's the good outcome.

---

## Current Cloudflare Footprint

### Services Used

| Service | Count | What It Does | Portability |
|---------|-------|-------------|-------------|
| Workers | 14+ | Application runtime | Medium |
| D1 (SQLite) | 9 | Primary databases | High (SQLite is universal) |
| R2 | 6 buckets | Object storage (media, exports) | High (S3-compatible API) |
| KV | 7 namespaces | Caching, rate limiting, sessions | High (simple get/set) |
| Durable Objects | 5+ classes | Real-time coordination, exports | Low (nothing like it exists) |
| Service Bindings | 30+ | Inter-worker communication | Medium (becomes HTTP) |
| Cron Triggers | 10+ | Scheduled tasks | High (standard cron) |
| Pages | 2 | Static sites | High (any static host) |
| DNS | All domains | Domain management | High (standard DNS) |
| SSL | All domains | TLS certificates | High (Let's Encrypt) |
| Turnstile | 1 | Bot verification | Medium (hCaptcha, reCAPTCHA) |

### Wrangler Configuration

32 `wrangler.toml` files across the monorepo. Each defines bindings, routes, compatibility dates, and DO configurations. These files are Cloudflare-specific and have no equivalent elsewhere.

---

## Migration Map

### Tier 1: High Portability (Days, Not Weeks)

These services have direct, well-established equivalents.

#### D1 → SQLite Alternatives

| Target | Type | Latency | Cost | Notes |
|--------|------|---------|------|-------|
| Turso (LibSQL) | Hosted SQLite | ~5ms edge | Free tier, $29/mo+ | Closest D1 replacement. Edge replicas. |
| PlanetScale | MySQL (Vitess) | ~10ms | Free tier, $39/mo+ | Not SQLite. Schema changes needed. |
| Neon | PostgreSQL | ~10ms | Free tier, $19/mo+ | Not SQLite. Full rewrite of queries. |
| Raw SQLite | Self-hosted | Varies | Server cost | Simplest. Single-server limitation. |

**Recommended: Turso.** LibSQL is SQLite-compatible. Most queries work unchanged. Edge replicas match D1's latency model.

**Migration steps:**
1. Export all D1 databases: `wrangler d1 export <db> --output <file>.sql`
2. Import into Turso: `turso db shell <db> < file.sql`
3. Swap Server SDK adapter: `CloudflareDatabase` → `TursoDatabase`
4. Test all queries (some D1-specific SQL may need adjustment)

#### R2 → S3-Compatible Storage

| Target | Compatibility | Cost | Notes |
|--------|--------------|------|-------|
| AWS S3 | Full S3 API | $0.023/GB/mo | Industry standard |
| Backblaze B2 | S3-compatible API | $0.006/GB/mo | Cheapest option |
| Google Cloud Storage | S3-compatible mode | $0.020/GB/mo | Good if using GCP |
| MinIO | S3-compatible (self-hosted) | Server cost | Full control |

**Recommended: Backblaze B2.** Cheapest S3-compatible storage. Works with existing R2 code via S3 API.

**Migration steps:**
1. Use `rclone` to copy all R2 buckets: `rclone sync r2:bucket b2:bucket`
2. Swap Server SDK adapter: `CloudflareStorage` → `S3Storage`
3. Update presigned URL generation for new provider
4. Verify media serving works (may need CDN in front)

#### KV → Key-Value Alternatives

| Target | Type | Latency | Cost | Notes |
|--------|------|---------|------|-------|
| Upstash Redis | Serverless Redis | ~2ms | Free tier, $10/mo+ | Best serverless KV |
| Redis (hosted) | Managed Redis | ~1ms | $15/mo+ | More features, requires server |
| DynamoDB | AWS key-value | ~5ms | Pay-per-request | Scalable, more complex |

**Recommended: Upstash.** Serverless Redis with HTTP API. Works from edge functions.

**Migration steps:**
1. KV data is ephemeral (caches, rate limits). No migration needed.
2. Swap Server SDK adapter: `CloudflareKV` → `UpstashKV`
3. Rate limit counters reset (acceptable, they're short-lived)
4. Cache rebuilds on first access (expected behavior)

#### Cron Triggers → Scheduler Alternatives

| Target | Type | Notes |
|--------|------|-------|
| GitHub Actions scheduled | Free (public repos) | Simple, limited frequency |
| Inngest | Serverless cron | Reliable, integrates with serverless |
| BullMQ + Redis | Self-hosted | Full control, requires server |
| System cron | Traditional | Requires a server |

**Migration steps:**
1. Map each cron trigger to its handler function
2. Deploy handlers as serverless functions or long-running processes
3. Configure scheduler to hit the handler endpoints

---

### Tier 2: Medium Portability (Weeks)

These require architectural changes.

#### Workers → Runtime Alternatives

| Target | Type | Cold Start | Notes |
|--------|------|-----------|-------|
| Deno Deploy | Edge serverless | ~50ms | Closest to Workers. Web APIs. |
| AWS Lambda@Edge | Edge serverless | ~100ms | More complex. Node.js. |
| Fly.io | Container edge | ~200ms | Full server, not serverless |
| Vercel Edge Functions | Edge serverless | ~50ms | SvelteKit support |
| Railway | Container hosting | ~500ms | Simple deploy, not edge |

**Recommended: Deno Deploy or Fly.io.** Deno Deploy is closest to the Workers model (Web APIs, edge deployment). Fly.io provides more flexibility at the cost of managing containers.

**Migration steps (with Server SDK):**
1. Each Worker becomes a standalone service (Deno Deploy function or Fly.io app)
2. Service bindings become HTTP calls via `GroveServiceBus`
3. Environment variables/secrets migrate to the new runtime's secret management
4. SvelteKit apps (Engine, Amber, Plant, etc.) deploy to the new runtime's SvelteKit adapter

**Migration steps (without Server SDK):**
1. Every `env.DB`, `env.IMAGES`, `env.CACHE_KV`, `env.AUTH` reference must be rewritten
2. Every service binding call must become an HTTP request
3. Every Worker-specific API (`waitUntil`, `scheduled`, `durableObjects`) must be replaced
4. This is the "painful" path. The Server SDK exists to avoid it.

#### Service Bindings → HTTP/gRPC

Service bindings provide zero-latency inter-worker communication. Without them, services talk over HTTP.

**Impact:**
- Latency increases from ~0ms to ~10-50ms per inter-service call
- Need to add authentication between services (service bindings are implicitly trusted)
- Need to handle network failures and retries

**Migration steps:**
1. Each service gets a public or internal URL
2. `CloudflareServiceBus` → `HttpServiceBus`
3. Add service-to-service authentication (shared secrets, mTLS, or JWT)
4. Add retry logic for transient failures

#### Turnstile → Bot Verification Alternatives

| Target | Free Tier | Notes |
|--------|-----------|-------|
| hCaptcha | Yes | Privacy-focused, similar UX |
| reCAPTCHA v3 | Yes | Google-dependent |
| Friendly Captcha | Yes | EU-based, privacy-first |

**Migration steps:**
1. Swap Turnstile widget for alternative
2. Update server-side verification endpoint
3. Update `grove_verified` cookie logic

---

### Tier 3: Hard to Migrate (Months)

#### Durable Objects → Stateful Alternatives

This is the hardest migration. Durable Objects provide a unique combination that no other platform offers: single-threaded execution, persistent state, WebSocket support, global uniqueness, and hibernation-based billing.

**Current DO usage in Grove:**
- `SessionDO` — Session validation and caching (Loom)
- `TenantDO` — Per-tenant state and rate limiting (Loom)
- `PostDO` — Per-post coordination (Loom)
- `ExportJobV2` — Long-running export processing (Amber)
- `Queen` — CI runner coordination (Firefly)

**Possible replacements:**

| Pattern | Target | Tradeoffs |
|---------|--------|-----------|
| SessionDO | Redis + short-lived processes | Loses single-instance guarantee. Needs distributed locking. |
| TenantDO | Fly.io machines | Each tenant gets a machine. Expensive at scale. No hibernation. |
| PostDO | PostgreSQL advisory locks | Loses in-memory state. Higher latency. |
| ExportJobV2 | Background job queue (BullMQ) | Works well. Most straightforward migration. |
| Queen | Dedicated coordinator server | Full server instead of DO. More ops overhead. |

**The honest assessment:**
- `ExportJobV2` is easy to migrate (it's a job queue, any job system works)
- `SessionDO` and `TenantDO` are medium (Redis can approximate the behavior, but loses consistency guarantees)
- `Queen` is medium (a small server with a job queue handles this)
- The real-time features (WebSocket coordination, Meadow presence) are hard. No serverless equivalent exists.

**Mitigation (already in place):**
The Loom SDK wraps all DO interactions behind clean interfaces. If migration is needed, only the Loom implementation changes. Application code that imports from `@autumnsgrove/lattice/loom` doesn't need to change.

---

## Migration Order

If migration is needed, do it in this order. Each phase is independently valuable.

```
Phase 1: Data (Week 1-2)
  D1 → Turso
  R2 → Backblaze B2
  KV → Upstash
  DNS → Cloudflare can stay even if compute moves

Phase 2: Static (Week 2)
  Pages → Netlify/Vercel
  Cron → Inngest or GitHub Actions

Phase 3: Compute (Week 3-6)
  Workers → Deno Deploy or Fly.io
  Service Bindings → HTTP
  Turnstile → hCaptcha

Phase 4: Stateful (Week 6-12)
  Durable Objects → Redis + Fly.io machines
  Real-time features → Socket.io on Fly.io
```

### Data Safety at Each Phase

At every phase boundary, verify:

- [ ] All Wanderer content is accessible
- [ ] Exports produce valid `.grove` files
- [ ] Automated backups continue running
- [ ] Custom domains resolve correctly
- [ ] Media (images, fonts) loads properly

---

## Cost Comparison

Approximate monthly costs for Grove's current workload.

| Service | Cloudflare | Alternative | Notes |
|---------|-----------|-------------|-------|
| Compute (14 Workers) | $25/mo (Workers Paid) | ~$50-100/mo (Fly.io/Deno) | Workers is cheap for edge compute |
| Database (9 D1s) | $5/mo | ~$30/mo (Turso) | D1 is very cheap |
| Storage (6 R2 buckets, ~50GB) | $0.75/mo | ~$0.30/mo (B2) | B2 is cheaper per GB |
| KV (7 namespaces) | Included | ~$10/mo (Upstash) | KV is free with Workers Paid |
| DOs | Included | ~$30-50/mo (Redis + Fly) | DOs are included with Workers Paid |
| **Total** | **~$30/mo** | **~$120-190/mo** | CF is 4-6x cheaper |

This is the honest tradeoff. Cloudflare is genuinely cheap for what Grove uses. Migration would increase costs. The trade is between cost and independence.

---

## The Server SDK Makes This Real

Without the Server SDK, this playbook is aspirational. With it, each phase becomes:

1. Write the adapter (e.g., `TursoDatabase implements GroveDatabase`)
2. Pass conformance tests (the SDK includes interface test suites)
3. Swap the adapter in `createContext()`
4. Deploy

The playbook doesn't require the SDK to start. But the SDK makes it finish.

```
Without SDK:  "Rewrite everything that touches env.DB, env.IMAGES, env.CACHE_KV..."
With SDK:     "Write a new adapter class. Pass the tests. Swap the config."
```

---

## Dead Man's Switch

If Grove ceases operation entirely (founder incapacitated, company dissolved), the Dead Man's Switch activates:

1. **Pre-funded infrastructure** keeps running for 180 days
2. **Automated exports** trigger for all active Wanderers
3. **Email notification** sent with download links
4. **DNS reverts** custom domains to a static "Grove has closed" page with export instructions
5. **Source code** released under open license

This is documented in `docs/legal/data-portability-separation.md`. The Break Glass playbook is for planned migration. The Dead Man's Switch is for unplanned endings.

---

## Monitoring the Relationship

Keep an eye on these signals. None of them alone trigger the playbook, but patterns matter.

| Signal | Check Frequency | Action Threshold |
|--------|----------------|------------------|
| CF monthly spend | Monthly | > 3x baseline for 2 consecutive months |
| CF TOS changes | When announced | Any claim on customer data or code |
| CF acquisition rumors | Quarterly | Credible reports from multiple sources |
| CF competitive moves | Quarterly | Launch of blogging/CMS/creator product |
| CF outage duration | Per incident | > 48 hours cumulative per quarter |
| CF pricing changes | When announced | > 50% increase on any service used |
| CF legal demands | When reported | Government backdoor requirements |

---

## Checklist: Keeping the Escape Route Clear

These aren't migration tasks. They're ongoing hygiene that ensures migration stays possible.

- [ ] Monthly: Verify D1 exports produce valid SQLite files
- [ ] Monthly: Verify R2 data is accessible via S3 API (not just R2 API)
- [ ] Monthly: Verify `.grove` exports include all content and media
- [ ] Quarterly: Test a full D1 → Turso migration in staging
- [ ] Quarterly: Review CF spend trends
- [ ] Quarterly: Check CF TOS for changes
- [ ] Yearly: Full migration drill in staging (all tiers)
- [ ] Ongoing: Keep Loom DO interfaces clean and documented
- [ ] Ongoing: Avoid CF-specific APIs when a standard alternative exists

---

*Not because you will. Because you could.*
