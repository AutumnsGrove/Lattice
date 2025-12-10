# D1 Read Replication Analysis

## Summary

| Metric | Value |
|--------|-------|
| Total D1 queries found | ~45 |
| Read queries | ~25 (56%) |
| Write queries | ~20 (44%) |
| High-frequency reads | 4 (session/user validation per request) |
| Databases in use | 1 shared (`grove-engine-db`) |

## Recommendation: PREPARE for Replication

**Current recommendation**: Adopt D1 Sessions API patterns now, enable replication later.

**Reasoning**:
1. Geographic distribution is uncertain (early stages)
2. Sessions API provides consistency benefits regardless of replication
3. The codebase patterns work with or without replication enabled
4. When you have global users, flipping on replication is a config change

**Enable replication when**:
- You have measurable traffic from outside the US
- You observe D1 latency in Cloudflare analytics
- You approach ~500+ QPS on read-heavy endpoints

---

## Database Inventory

All production applications share a single D1 database:

| Location | Binding | Database Name | Database ID |
|----------|---------|---------------|-------------|
| `domains/wrangler.toml` | `DB` | `grove-engine-db` | `a6394da2-...` |
| `landing/wrangler.toml` | `DB` | `grove-engine-db` | `a6394da2-...` |
| `packages/example-site/wrangler.toml` | `POSTS_DB` | `grove-engine-db` | `a6394da2-...` |

This shared database pattern is fine - replication is configured per-database, not per-worker.

---

## Query Inventory

### Highest Priority: Per-Request Authentication (Every Request)

These queries run on **every authenticated HTTP request** and are the highest-value targets:

| Function | File:Line | Query Type | Impact |
|----------|-----------|------------|--------|
| Session lookup | `landing/src/hooks.server.ts:29` | SELECT | Every request |
| User lookup | `landing/src/hooks.server.ts:41` | SELECT | Every request |
| `getSession()` | `domains/src/lib/server/db.ts:190` | SELECT | Every request |
| `getUserById()` | `domains/src/lib/server/db.ts:108` | SELECT | Every request |

**Current pattern** (without Sessions API):
```typescript
// hooks.server.ts - runs every request
const session = await db
  .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
  .bind(sessionId)
  .first();

const user = await db
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(session.user_id)
  .first();
```

### Read-Heavy: Product Catalog (Public Browsing)

| Function | File:Line | Query Type | Frequency |
|----------|-----------|------------|-----------|
| `getProducts()` | `shop.ts:185` | SELECT | Catalog pages |
| `getProductBySlug()` | `shop.ts:242` | SELECT | Product pages |
| `getProductById()` | `shop.ts:264` | SELECT | Product details |
| `getProductVariants()` | `shop.ts:428` | SELECT | Per product |
| `getVariantById()` | `shop.ts:440` | SELECT | Cart/checkout |

These are excellent replication candidates - many users reading the same catalog.

### Read-Heavy: CDN File Metadata

| Function | File:Line | Query Type | Frequency |
|----------|-----------|------------|-----------|
| `getCdnFile()` | `landing/db.ts:235` | SELECT | Media serving |
| `getCdnFileByKey()` | `landing/db.ts:240` | SELECT | Media lookups |
| `listCdnFiles()` | `landing/db.ts:248` | SELECT + COUNT | Admin browsing |
| `listAllCdnFiles()` | `landing/db.ts:278` | SELECT + COUNT | Admin browsing |
| `getCdnFolders()` | `landing/db.ts:319` | SELECT DISTINCT | Folder nav |

### Read-Heavy: Domain Search (During Active Searches)

| Function | File:Line | Query Type | Frequency |
|----------|-----------|------------|-----------|
| `getSearchJob()` | `domains/db.ts:434` | SELECT | Status polling |
| `listSearchJobs()` | `domains/db.ts:445` | SELECT + COUNT | History page |
| `getJobResults()` | `domains/db.ts:624` | SELECT | Results display |
| `getActiveConfig()` | `domains/db.ts:670` | SELECT | Config load |

### Write Operations (No Replication Benefit)

| Function | File | Type | Frequency |
|----------|------|------|-----------|
| `createSession()` | both db.ts | INSERT | Login only |
| `deleteSession()` | both db.ts | DELETE | Logout |
| `updateSessionTokens()` | domains/db.ts | UPDATE | Token refresh |
| `createMagicCode()` | both db.ts | INSERT | Auth flow |
| `createSearchJob()` | domains/db.ts | INSERT | Search start |
| `updateSearchJobStatus()` | domains/db.ts | UPDATE | Job progress |
| `saveDomainResults()` | domains/db.ts | INSERT (batch) | Search results |
| `createProduct()` | shop.ts | INSERT | Admin only |
| `updateProduct()` | shop.ts | UPDATE | Admin only |
| `deleteProduct()` | shop.ts | DELETE | Admin only |
| `createVariant()` | shop.ts | INSERT | Admin only |
| `updateVariant()` | shop.ts | UPDATE | Admin only |
| `createOrder()` | shop.ts | INSERT | Checkout |
| `updateOrderStatus()` | shop.ts | UPDATE | Fulfillment |
| `createCdnFile()` | landing/db.ts | INSERT | Upload |
| `deleteCdnFile()` | landing/db.ts | DELETE | Admin only |

---

## Consistency Concerns

### Mixed Read-Write Patterns

These functions read then write, which can cause issues with eventual consistency:

| Function | Pattern | Risk | Mitigation |
|----------|---------|------|------------|
| `getOrCreateUser()` | SELECT then INSERT | Duplicate user if replica is stale | Use Sessions API with `first_unconditional` constraint |
| `verifyMagicCode()` | SELECT then UPDATE | Could verify already-used code | Use Sessions API to ensure fresh read |
| `getOrCreateCustomer()` | SELECT then INSERT | Duplicate customer | Use Sessions API with `first_unconditional` constraint |
| `updateConfig()` | SELECT then INSERT/UPDATE | Config race condition | Use Sessions API |

### Token Refresh Race Condition

In `domains/hooks.server.ts:93-135`, there's a pattern where:
1. Read session from D1
2. Check if token needs refresh
3. Refresh token externally
4. Update D1 with new token

With replicas, step 1 could read stale data. This needs Sessions API to ensure we read the latest tokens before deciding to refresh.

---

## Sessions API Implementation Priority

### Phase 1: Authentication Hooks (Highest Impact)

Files to modify:
- `domains/src/hooks.server.ts`
- `landing/src/hooks.server.ts`

These run on every request. Even a small latency improvement here multiplies across all traffic.

### Phase 2: Shop Product Reads

Files to modify:
- `packages/engine/src/lib/payments/shop.ts`

Functions: `getProducts`, `getProductBySlug`, `getProductById`, `getProductVariants`

Public catalog browsing is read-heavy with many users viewing the same data.

### Phase 3: CDN File Metadata

Files to modify:
- `landing/src/lib/server/db.ts`

Functions: `getCdnFile`, `getCdnFileByKey`, `listCdnFiles`

Media serving metadata lookups.

### Phase 4: Remaining Queries

Lower priority - domain search operations, config loading, etc.

---

## What Read Replication Won't Help

1. **Write operations** - All writes go to primary regardless
2. **Admin-only operations** - Low frequency, single user
3. **Domain search job writes** - Mostly INSERTs/UPDATEs during active searches
4. **Order creation** - Write-heavy checkout flow
5. **Auth flows** - Infrequent (login/logout), mostly writes

---

## D1 Limits to Keep in Mind

| Limit | Value | Notes |
|-------|-------|-------|
| Max QPS | ~1000 at 1ms/query | Single-threaded |
| Max query duration | 30 seconds | Individual queries |
| Max database size | 10 GB (paid) | Unlikely to hit |
| Queries per Worker invocation | 1,000 (paid) | Very high limit |

If you approach these limits, read replication can help distribute read load. Monitor in Cloudflare dashboard.

---

## When to Enable Replication

Check these conditions:

1. **Geographic signals**
   - Analytics show significant traffic from outside your primary region
   - Users report latency issues from specific regions

2. **Scale signals**
   - D1 query latency increasing in Cloudflare analytics
   - Approaching ~500 QPS on read endpoints

3. **Ready signals**
   - Sessions API adopted in high-frequency paths
   - Consistency concerns addressed in mixed read-write flows

**To enable**: Set `read_replication = { mode = "auto" }` in wrangler.toml D1 bindings.

---

## Next Steps

See `D1_SESSIONS_MIGRATION.md` for implementation details on adopting the Sessions API pattern.
