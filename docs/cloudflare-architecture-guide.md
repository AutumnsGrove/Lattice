---
aliases:
date created: Friday, November 21st 2025, 3:01:54 pm
date modified: Friday, November 21st 2025, 3:02:46 pm
tags:
type: research
---

# Cloudflare Multi-Tenant Blog Platform: Service Limits and Architecture Guide

**Your subdomain-based blog platform can comfortably support 200 client blogs on Cloudflare's free tier**, with the primary bottleneck being R2 storage (10 GB limit = 200 blogs × 50 MB each). Upgrading to the Workers Paid plan ($5/month) extends capacity to 1,000+ clients before hitting the next critical limit: DNS records. The recommended architecture: **one D1 database per tenant, shared KV namespace with key prefixing, and shared R2 bucket with path isolation**. This provides strong data isolation while maximizing cost efficiency. At 50 clients, your total monthly cost will be approximately $5-7, scaling to just $13.50/month at 1,000 clients.

## Critical Service Constraints

Cloudflare imposes two distinct DNS record limits that directly impact subdomain-based architectures. **Free zones created before September 1, 2024 receive 1,000 DNS records**, while **zones created on or after that date receive only 200 DNS records**. Both limits apply to all record types combined (A, CNAME, MX, TXT). Each custom subdomain you provision (whether through direct DNS records, Pages custom domains, or Workers custom domains) consumes one record toward this total. Paid plans (Pro/Business/Enterprise) increase the limit to 3,500 records but require $20-200/month commitments.

Cloudflare Pages projects support **100 custom domains per project on the free tier**, increasing to 250-500 on paid plans. Workers custom domains are capped at **100 per zone across all plan types**. These limits are independent but both create DNS records that count against your zone's total DNS record limit. Critically, neither Pages custom domains nor Workers custom domains support wildcard patterns: you must configure each subdomain individually.

Wildcard DNS records (*.yourdomain.com) are fully supported on all plan tiers at no additional cost. A single wildcard CNAME can route unlimited subdomains to your Worker, which then handles tenant identification programmatically. This bypasses DNS record limits entirely but adds Worker invocation costs to every request. Wildcards cover multiple levels by default: *.platform.com matches both blog.platform.com and dev.blog.platform.com.

SSL certificates present another consideration. Cloudflare's Universal SSL (free tier) automatically covers the zone apex and first-level wildcard (example.com and *.example.com) with automatic issuance within 15 minutes to 24 hours. This means blog1.platform.com, blog2.platform.com, and all first-level subdomains receive free SSL. However, **second-level subdomains like admin.blog1.platform.com require Advanced Certificate Manager at $10/month** or a Business/Enterprise plan. For blog platforms using only first-level subdomains, Universal SSL provides complete coverage at no cost.

DNS propagation occurs within 5 minutes globally for new subdomains, though SSL issuance adds 15 minutes to 24 hours for first-time certificates. Subsequent changes propagate within minutes.

## Exact Free Tier Service Limits

Workers on the free tier allow **100,000 requests per day** (approximately 3 million per month), resetting at midnight UTC. Each invocation receives **10 milliseconds of CPU time** (not wall-clock duration). You can deploy up to **100 Workers per account**, each with a compressed script size limit of 3 MB. The free tier includes 50 subrequests per request to external services, though internal services (KV, D1, Durable Objects) allow 1,000 operations regardless of plan tier.

The Workers Paid plan costs **$5/month base** plus usage overages: **$0.30 per million requests** and **$0.02 per million CPU milliseconds**. Included allowances jump dramatically: 10 million requests monthly and 30 million CPU milliseconds. CPU time becomes your primary variable cost at scale: a Worker consistently using 15ms per request costs approximately $0.30 per million requests in CPU fees alone, doubling the effective per-request cost.

KV namespaces increased from 200 to **1,000 per account in January 2025**, enabling true per-tenant namespace architectures for up to 1,000 clients. The free tier provides **100,000 reads per day** (3 million monthly), **1,000 writes per day**, and **1 GB total storage** across all namespaces. Keys per namespace are unlimited. Individual values can reach 25 MiB, with key names up to 512 bytes. A critical constraint: you cannot write to the same key more than once per second without triggering 429 rate limit errors.

Paid tier KV includes 10 million reads monthly, 1 million writes, 1 GB storage, then charges **$0.50 per million reads**, **$5.00 per million writes**, and **$0.50/GB storage**. Write operations cost 10x more than reads, making KV primarily suited for read-heavy workloads like configuration caching and session management.

D1 databases provide **10 databases maximum on the free tier**, each capped at **500 MB storage** for a total of 5 GB across your account. Daily limits allow **5 million rows read** and **100,000 rows written**. The paid plan increases limits to 50,000 databases per account, 10 GB per database, and 25 billion rows read monthly (first 50 million writes included). Storage costs just **$0.20/GB-month** with row operations at **$0.001 per million rows read** and **$1.00 per million rows written**.

The **10 GB per-database hard limit cannot be increased**. This is D1's fundamental architectural constraint. When a single database approaches this threshold, you must either implement sharding (Cloudflare's recommended approach) or migrate to an external database. D1's single-threaded architecture processes queries sequentially, limiting throughput to roughly 1,000 queries per second per database assuming 1ms average query time. You can open 6 concurrent connections per Worker invocation.

R2 object storage includes **10 GB storage monthly**, **1 million Class A operations** (writes, lists), and **10 million Class B operations** (reads) on the free tier. R2's defining feature is **zero egress fees**: unlimited data transfer to the internet at no cost, compared to AWS S3's $0.09/GB egress charges. Paid tier pricing: **$0.015/GB-month storage**, **$4.50 per million Class A operations**, **$0.36 per million Class B operations**. You can create up to 1 million buckets per account, with individual objects reaching 5 TiB.

Cloudflare Pages free tier allows **500 builds per month** across all projects with **1 concurrent build** at a time. Each build times out after 20 minutes. The platform supports up to 100 projects per account (soft limit, raisable via support). Bandwidth is unlimited: static asset delivery incurs no charges. Pages Functions (dynamic server-side code) count as Worker requests, sharing the 100,000 daily request limit.

Cloudflare Images offers two operational modes. **Transformations-only (free tier available)** provides **5,000 unique transformations per month** at no cost, requiring you to store images elsewhere (R2, origin server). Each unique combination of image + parameters counts as one transformation, tracked in a 30-day sliding window. The format=auto parameter intelligently counts as a single transformation even when serving different formats (WebP, AVIF) to different browsers. After exceeding 5,000 transformations, new requests return a 9422 error. No charges accrue, but you must upgrade to continue creating variants.

Full Cloudflare Images storage charges **$5 per 100,000 images stored per month** plus **$1 per 100,000 images delivered**. For blog platforms, **R2 storage + Images transformations provides 90% cost savings** versus full Images storage: 50 images (100 MB) costs $0 on free tier versus $5 minimum for Images storage.

## Multi-tenant Data Isolation Strategies

Cloudflare explicitly recommends **one D1 database per tenant** in their official documentation, stating "D1 is designed for horizontal scale out across multiple, smaller (10 GB) databases, such as per-user, per-tenant or per-entity databases." This architecture provides complete data isolation, zero cross-tenant data leakage risk, independent scaling, simplified compliance, and granular backup/migration control. The paid plan supports binding up to 5,000 D1 databases to a single Worker script, with account limits reaching 50,000 databases (increasable to millions on request). Critically, D1 has no per-database fees: you only pay for query operations and storage consumed.

Per-tenant databases require dynamic binding selection at runtime. Your Worker extracts the tenant identifier from the hostname or path, then accesses the corresponding database binding (e.g., `env[DB_${tenantId}]`). Schema migrations must be applied across all tenant databases, necessitating automation scripts. Cross-tenant analytics become challenging since you cannot query across databases directly: you must aggregate results in your application layer or maintain a separate analytics database.

Shared D1 database with tenant_id columns offers simpler management: single schema, single migration path, straightforward cross-tenant queries. However, every query MUST include tenant_id filtering to prevent data leakage. Query bugs can expose tenant data. One tenant's heavy queries impact others since D1 processes queries single-threaded. The 10 GB hard limit becomes a hard scaling wall: you cannot exceed this per-database maximum regardless of payment tier.

**For blog platforms expecting growth beyond 100 tenants, implement per-tenant D1 databases from day one.** The upfront complexity investment pays dividends when scaling. For platforms with many small tenants (under 100 MB each) and limited growth expectations, a shared database can work initially, but plan the migration path.

KV namespaces scale to 1,000 per account, theoretically supporting one namespace per tenant up to that limit. However, the **shared KV namespace with key prefixing pattern provides unlimited scale** and simpler binding management. Structure keys as `tenant:{tenantId}:{resource}:{id}` (e.g., `tenant:acme:post:123`). This approach prevents key collisions through consistent prefixing, allows unlimited tenant growth, and simplifies Worker code with a single KV binding.

Per-tenant KV namespaces provide stronger isolation and independent TTL/purging control but hit the 1,000 namespace wall. Reserve this pattern for high-value enterprise customers requiring contractual data isolation guarantees while using shared namespaces for standard tiers.

R2 bucket strategies mirror KV considerations. **Shared R2 bucket with path prefixes** (e.g., `tenants/{tenantId}/media/{year}/{month}/{filename}`) provides unlimited scale, simpler management, and cost optimization. Your Worker must validate all paths to prevent cross-tenant access through path traversal attacks. Always verify the tenant_id from the authenticated session matches the tenant_id in the requested object path before executing R2 operations.

Per-tenant R2 buckets deliver complete isolation and bucket-scoped access tokens. Cloudflare supports 1 million buckets per account, making this approach viable even at scale. The management overhead increases: you must provision buckets via API, track bucket assignments, and handle cleanup. Reserve per-tenant buckets for enterprise customers or when regulatory compliance requires physical data separation.

## Domain Structure: Subdomain Vs Path-based Routing

The subdomain approach (username.yourblog.com) provides the most professional, scalable architecture for multi-tenant blog platforms. Each tenant receives a distinct URL namespace, enabling complete cookie isolation, simplified custom domain mapping, and superior SEO through separate domain authority. Cloudflare automatically manages SSL certificates for all first-level subdomains under Universal SSL at no cost.

Implementation requires either individual DNS records (hitting the 200-1,000 record limit) or a wildcard CNAME (*.yourblog.com) pointing to your Worker endpoint. The wildcard approach bypasses DNS limits entirely: your Worker receives all subdomain requests and extracts the tenant identifier from the hostname. Custom domain mapping (blog.customerdomain.com → tenant123.yourblog.com) works seamlessly through Cloudflare for SaaS at **$0.10 per custom domain per month**, including automated SSL provisioning and domain validation.

Real-world implementation pattern:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Check custom domain mapping first
    const customDomainMapping = await env.KV.get(`customdomain:${hostname}`);
    const tenantId = customDomainMapping || hostname.split('.')[0];
    
    // Validate tenant exists
    const tenantConfig = await env.KV.get(`tenant:${tenantId}:config`, 'json');
    if (!tenantConfig) {
      return new Response('Tenant not found', { status: 404 });
    }
    
    // Route to tenant-specific database
    const tenantDb = env[`DB_${tenantId}`];
    return handleTenantRequest(tenantId, tenantDb, request, env);
  }
};
```

The path-based approach (yourblog.com/username) eliminates DNS record requirements, works immediately without DNS setup, and simplifies local development. However, it suffers from SEO challenges (all content under a single domain), cookie scope issues (cookies shared across all tenants), less professional appearance, and difficult custom domain mapping requiring complex URL rewriting. Path-based routing works best for preview environments or platforms where branding through subdomains is not critical.

**Recommended hybrid strategy**: Use subdomain routing as your primary architecture (username.yourblog.com), offer custom domain mapping as a premium feature (blog.customer.com via Cloudflare for SaaS), and implement path-based routing for previews and testing (yourblog.com/preview/username). This provides professional URLs for production, enterprise white-labeling capabilities, and flexible development workflows.

## Precise Scaling Thresholds and Cost Breakpoints

Assuming a typical blog with 5,000 pageviews per month, 100 images (50 MB storage), 3 KV reads per page load, and 2 D1 queries (20 rows read) per page:

**Workers/Pages requests**: 5,000 pageviews per blog  
**KV operations**: 15,000 reads per blog  
**D1 operations**: 200,000 rows read per blog  
**R2 storage**: 50 MB per blog  
**R2 Class B reads**: 25,000 per blog (5 images per page × 5,000 views)

**R2 storage hits capacity first at 200 clients** (10 GB ÷ 50 MB = 200 blogs). However, the free tier remains viable since you can upgrade just R2 while keeping other services free. At 200 clients:

- Workers: 1 million requests/month (within 100M free daily limit)
- KV: 3 million reads/month (at daily free limit boundary)
- D1: 40 million rows read/month (well within 150M monthly free)
- R2 storage: 10 GB (at free tier limit)
- R2 operations: 5 million Class B reads (within 10M free)

**KV reads become constrained at 200 clients as well** (3 million reads/month = 100,000 daily limit). This represents a natural inflection point where upgrading to Workers Paid ($5/month) becomes necessary.

Workers Paid plan dramatically expands capacity:

- **10 million requests/month** included = supports 2,000 blogs
- **10 million KV reads/month** included = supports 667 blogs  
- **25 billion D1 rows read/month** included = supports 125,000 blogs
- **10M R2 Class B operations/month** included = supports 400 blogs

With Workers Paid activated, **R2 storage remains the limiting factor until 667 clients** (10 GB free tier exhausted around 200 clients, but storage only costs $0.015/GB beyond that). By 667 clients, you'll have 33 GB R2 storage costing approximately $0.35/month in overage charges.

**Cost projections by client count:**

**50 clients**: $5/month total ($0.10 per client)
- Workers Paid base: $5
- All services within included limits
- No overage charges

**100 clients**: $5/month total ($0.05 per client)
- All services within Workers Paid included limits
- R2 storage: 5 GB (within free tier)

**200 clients**: $5/month total ($0.025 per client)
- Workers: 1M requests (within 10M)
- KV: 3M reads (within 10M)  
- D1: 40M rows (within 25B)
- R2 storage: 10 GB (at free tier edge)
- R2 operations: 5M (within 10M)

**500 clients**: $6.13/month total ($0.012 per client)
- Workers: 2.5M requests (within 10M)
- R2 storage: 25 GB (15 GB over) = 15 × $0.015 = $0.23
- R2 Class B operations: 12.5M (2.5M over) = 2.5 × $0.36 = $0.90

**1,000 clients**: $13.50/month total ($0.0135 per client)
- Workers: 5M requests (within 10M)
- KV reads: 15M (5M over) = 5 × $0.50 = $2.50
- D1: 200M rows read (within 25B)
- R2 storage: 50 GB (40 GB over) = 40 × $0.015 = $0.60
- R2 Class B operations: 25M (15M over) = 15 × $0.36 = $5.40

**Critical insight**: Cloudflare's cost structure exhibits strong economies of scale. Cost per client drops from $0.50 at 10 clients to $0.0135 at 1,000 clients, a 97% reduction. Most competitors (Vercel, Netlify, Cloudinary) charge $50-100/month at 500-client scale where Cloudflare costs $6.13/month.

## Media Hosting: R2 + Images Transformations

**Use R2 object storage paired with Cloudflare Images transformations** for maximum cost efficiency. This combination delivers zero egress fees, automatic format optimization, responsive image serving, and 90-97% cost savings versus traditional image CDNs.

Store original, high-quality images in R2. Serve them through Cloudflare's `/cdn-cgi/image/` transformation endpoint with parameters for width, format, quality:

```html
<img 
  src="https://yourdomain.com/cdn-cgi/image/width=800,format=auto,quality=85/photo.jpg"
  srcset="
    https://yourdomain.com/cdn-cgi/image/width=400,format=auto/photo.jpg 400w,
    https://yourdomain.com/cdn-cgi/image/width=800,format=auto/photo.jpg 800w,
    https://yourdomain.com/cdn-cgi/image/width=1200,format=auto/photo.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  loading="lazy"
  alt="Blog post image">
```

The `format=auto` parameter automatically serves AVIF to supporting browsers (50%+ smaller than JPEG), WebP to others (26% smaller than PNG), falling back to original format for older browsers. This single parameter counts as one transformation regardless of output format, critical for staying within the 5,000 free monthly transformation limit.

**Cost comparison for 50 blogs (2,500 images, 500,000 monthly views):**

**R2 + Transformations**: $2.58/month
- Storage: 5 GB × $0.015 = $0.075 (free tier)
- Transformations: 10,000 unique (5,000 free + 5,000 paid) = $2.50
- R2 operations: $0.03

**Cloudflare Images Storage**: $30/month
- Storage: 2,500 images = $12.50 (minimum $15)
- Delivery: 1.5M deliveries ÷ 100K × $1 = $15

**Cloudinary Plus Plan**: $99/month
- Required for this scale
- Includes 225 GB storage, 225 GB bandwidth

**imgix**: Estimated $150-200/month
- Credit-based pricing
- Complex calculation without trial

**Savings: R2 + Transformations costs 91-97% less** than alternatives while delivering equivalent performance through Cloudflare's 330+ global edge locations.

Transformation caching occurs automatically. First request: 500-1500ms (transform + cache at edge). Subsequent requests: 20-50ms (served from edge cache). Transformations remain cached for 30 days; identical requests within this window don't count toward your transformation quota.

Set aggressive cache headers for images served from R2:

```
Cache-Control: public, max-age=31536000, immutable
CDN-Cache-Control: public, max-age=31536000
```

This instructs browsers and Cloudflare's edge to cache images for one year. The `immutable` directive prevents revalidation even on hard refresh. For frequently updated images, use versioned filenames (photo-v2.jpg) instead of cache purging to avoid the 60-second global propagation delay.

Configure R2 bucket for public access with custom domain (images.yourblog.com) pointing to your bucket. This enables clean URLs while maintaining R2's zero-egress advantage. All images served through Cloudflare's CDN inherit DDoS protection and global edge caching automatically.

Image optimization checklist for blog platforms:

- Store originals at reasonable resolution (≤2000px width for blog photos)
- Use `format=auto,quality=85` for most images
- Lower quality for thumbnails (quality=70)
- Implement 3-4 srcset breakpoints (400px, 800px, 1200px)
- Add `loading="lazy"` for below-fold images
- Limit responsive sizes to 4 per image to minimize transformation count
- Share R2 bucket across all tenant blogs with path prefixes

## DNS Record Limit Workarounds and Alternatives

When subdomain provisioning hits the 200-1,000 DNS record limit, three architectural patterns bypass this constraint:

**Wildcard DNS with Worker routing** (Recommended for 100-1000+ tenants): Create a single wildcard CNAME record (*.yourblog.com → worker.yourblog.com). Your Worker receives all subdomain requests and identifies tenants programmatically from the hostname. This consumes one DNS record total, supporting unlimited subdomains. DNS propagation for new tenants is instant since the wildcard record already exists. The tradeoff: every request invokes your Worker, adding $0.30/million requests plus CPU time costs even for cached static assets.

**Cloudflare for SaaS** (Enterprise solution for 1000+ tenants): Manage custom domains programmatically through Cloudflare's Custom Hostnames API. Charges $0.10 per custom domain per month, including automatic SSL provisioning, domain validation, and certificate renewal. First 100 custom domains included. This enables professional white-label hosting (blog.customerdomain.com) without consuming your DNS record quota. Implementation requires API integration to provision hostnames when customers add custom domains.

**Path-based multi-tenancy** (Budget fallback): Route all tenants through a single domain (yourblog.com/tenant1, yourblog.com/tenant2). No DNS limits, immediate tenant provisioning, single SSL certificate. Sacrifice professional URLs, SEO benefits, and cookie isolation. Best suited for internal tools or preview environments rather than production customer-facing blogs.

**Recommended tiered approach:**

- **Tier 1 (Free/Starter)**: Path-based routing (yourblog.com/username)
- **Tier 2 (Pro)**: Wildcard subdomain (username.yourblog.com)  
- **Tier 3 (Enterprise)**: Custom domain (blog.clientdomain.com via Cloudflare for SaaS)

This monetizes the infrastructure while managing costs: free users consume no DNS records, pro users share wildcard infrastructure, enterprise users justify the $0.10/month custom domain fee.

## D1 Database Migration Paths

D1's **10 GB per-database hard limit cannot be increased**. When approaching 8 GB in any database, migrate immediately. Two paths forward:

**Path 1: D1 sharding (Cloudflare's recommended approach)**  
Implement per-tenant databases from the start. Provision new D1 databases via Cloudflare API as tenants onboard. Store the database binding name in KV (e.g., `tenant:acme:db_binding` → `DB_ACME_123`). At runtime, dynamically select the appropriate database: `const db = env[tenantConfig.db_binding]`. This scales to 50,000 databases on Workers Paid (increasable to millions), provides complete tenant isolation, and only costs for actual query/storage usage (no per-database fees).

**Path 2: External Postgres with Hyperdrive**  
Migrate to Neon, Turso, or Supabase when D1's constraints become limiting:

**Neon** ($19/month for 10 GB): Serverless Postgres with instant branching, automatic scaling, and strong Cloudflare Workers integration via Hyperdrive. Connection pooling through Hyperdrive eliminates the 6+ round-trips for connection establishment, reducing query latency from 100ms to 10-20ms. Free tier: 0.5 GB storage, 3 GB transfer.

**Turso** ($29/month for 50 GB): SQLite at the edge with global replication. Sub-millisecond reads through 35+ edge locations. Best for read-heavy workloads requiring global low latency. Free tier: 9 GB storage, 500 databases. Can implement per-tenant databases similar to D1.

**Supabase** ($25/month for 8 GB): Postgres plus authentication, storage, and real-time subscriptions. Built-in Row Level Security (RLS) simplifies multi-tenant security. Free tier: 500 MB database, 1 GB file storage. Slower API latency (~50-100ms) than Neon without direct TCP connections.

**Migration trigger points:**

- 5-8 GB in single D1 database: Plan migration immediately
- 1,000+ write queries per second sustained: D1's single-threaded architecture becomes bottleneck  
- Need for features D1 lacks: stored procedures, triggers, materialized views, full-text search beyond basic
- Cross-tenant analytics requirements: External warehouse better suited than D1 sharding

**Hybrid approach for maximum flexibility**: Keep small/medium tenants on per-tenant D1 databases ($0 additional cost). Migrate large enterprise tenants (>8 GB data) to dedicated Neon/Turso databases ($19-29/month each). Route queries based on tenant size classification.

## Cost Comparison: Cloudflare Vs Alternatives

For a blog platform with 10,000 tenants, 10 million requests per month, 50 GB database storage, and 1 TB media storage:

**Cloudflare**: $185-235/month
- Workers: $5 base + $15 requests + $100 CPU ≈ $120
- D1 sharded or Neon: $50-100
- R2: 1 TB × $0.015 = $15
- Zero egress fees

**Vercel**: $400-800/month
- Function invocations: $50-150
- Bandwidth charges: $100-300
- Database (Neon): $100
- Storage: $50-150

**Netlify**: $300-600/month  
- Build minutes: $50
- Bandwidth: $100-200
- Functions: $50-150
- External database: $100-200

**Railway**: $200-400/month
- Compute: $100-200
- Managed Postgres: $100-150
- Egress: $20-50

**AWS (Lambda + RDS + S3)**: $500-1000/month
- Lambda invocations: $50-100
- RDS Postgres: $200-400
- S3 storage + egress: $150-300 (egress alone costs ~$90 for 1TB)
- Data transfer charges across services: $100-200

**Cloudflare delivers 50-80% cost savings** versus competitors at this scale, primarily through zero egress fees, generous included allowances, and low per-unit pricing. Cost advantage increases with scale: platforms exceeding 100 million requests monthly save thousands per month versus alternatives.

## Go/no-go Thresholds and Recommendations

**Free tier viability (indefinite operation at $0/month):**

✅ Support **up to 50-100 client blogs** entirely free
- Constraint: 100,000 requests/day combined (3M/month)
- Storage: 10 GB R2 (200 blogs at 50 MB each)  
- Database: 5 GB D1 total (500 MB × 10 databases or shared)
- Transformations: 5,000/month (sufficient for 10-25 blogs at 4 sizes/image)

**Workers Paid upgrade threshold ($5/month):**

✅ Upgrade when **consistently hitting 100,000 requests/day**
✅ Upgrade when **planning to exceed 50 active client blogs**
✅ Upgrade when **R2 storage approaches 10 GB**

After upgrade, you can comfortably serve:

- **200-500 client blogs** at $5-6/month total
- Up to 10 million requests monthly included
- 25 billion D1 rows read monthly (effectively unlimited for blogs)
- Only pay overages for R2 storage ($0.015/GB) and operations

**Critical limit: DNS records**

⚠️ **Hard stop at 200-1,000 DNS records** (depending on account age)  
- Mitigation: Implement wildcard DNS + Worker routing before hitting limit
- Cost: Adds ~$0.30/million requests in Worker invocation fees
- Benefit: Unlimited subdomain scale

**Critical limit: D1 10 GB per database**

⚠️ **Plan migration at 5 GB, execute at 8 GB per database**
- Mitigation 1: Per-tenant databases (Cloudflare's recommendation)
- Mitigation 2: Migrate to Neon/Turso ($19-29/month)
- Can maintain D1 for small tenants while migrating large ones

**Architecture decision framework:**

**For 10-50 client blogs (6-month horizon):**
- ✅ Cloudflare Workers + Pages (start free, upgrade to $5/month when needed)
- ✅ Per-tenant D1 databases from day one (plan for scale)
- ✅ Shared KV namespace with key prefixing
- ✅ Shared R2 bucket with path prefixes (`tenants/{id}/media/`)
- ✅ Subdomain routing with wildcard DNS
- ✅ R2 + Images transformations for media
- **Expected cost: $0-5/month for 6 months**

**For 50-500 client blogs:**
- ✅ Workers Paid ($5/month base)
- ✅ Per-tenant D1 databases (50,000 limit on paid plan)
- ✅ Wildcard DNS routing (bypasses DNS record limits)
- ✅ Consider Cloudflare for SaaS for custom domain feature ($0.10/domain/month)
- **Expected cost: $5-15/month**

**For 500+ client blogs:**
- ✅ Workers Paid with optimized CPU usage
- ✅ Per-tenant D1 OR external Postgres (Neon/Turso) for larger tenants
- ✅ Cloudflare for SaaS for white-label custom domains
- ✅ Consider hybrid: D1 for small tenants, Postgres for enterprise
- **Expected cost: $50-200/month**

**When to reconsider Cloudflare entirely:**

❌ Monthly Workers costs exceed $1,500 for CPU time alone  
❌ Team has zero JavaScript/TypeScript expertise (6+ month learning curve)
❌ Require specific AWS/GCP services with no Cloudflare equivalent
❌ Need traditional long-running servers (>30 second processes)

For your specific scenario (10-50 client blogs, 6-month horizon, media-heavy, 1K-10K pageviews/month with occasional 100K spikes):

**Definitive recommendation**: Cloudflare Workers + Pages with per-tenant D1 databases, shared R2 storage, and R2 + Images transformations for media. Expect $0-5/month costs for the first 6 months. Implement wildcard DNS routing from day one to avoid DNS record limit issues. Budget $5-15/month if growth exceeds 50 clients or traffic consistently hits 100K+ requests daily.

This architecture delivers enterprise-grade global performance, 99.99% uptime, automatic DDoS protection, zero egress fees, and scales to 1,000+ clients at $15-50/month. Costs that would reach $500-2,000/month on competing platforms.

---

## Related Documentation

- [AI Gateway Integration Guide](grove-ai-gateway-integration.md) - Cloudflare AI Gateway for per-tenant AI quotas, observability, and cost attribution
- [Multi-Tenant Architecture](multi-tenant-architecture.md) - Core multi-tenant design patterns
- [Durable Objects Architecture](patterns/grove-durable-objects-architecture.md) - DO coordination for sessions, tenants, and posts
