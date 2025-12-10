# D1 Sessions API Migration Guide

This document outlines how to adopt Cloudflare D1's Sessions API to prepare for read replication.

## Overview

The Sessions API provides:
- **Sequential consistency** - Monotonic reads/writes, "read your own writes"
- **Bookmark tracking** - Each session tracks database state
- **Replica awareness** - Sessions can read from replicas while maintaining consistency

Without Sessions API, enabling read replication could cause:
- Stale reads after writes
- Race conditions in read-then-write patterns
- Inconsistent user experiences

---

## Sessions API Basics

### Creating a Session

```typescript
// Get a session from the D1 binding
const session = db.withSession();

// Use session for all queries in this request
const user = await session
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first();
```

### Session Constraints

```typescript
// Force read from primary (for consistency-critical reads)
const session = db.withSession({ constraint: 'first_unconditional' });

// Get bookmark for debugging/logging
const bookmark = session.getBookmark();
```

### Passing Sessions Between Functions

```typescript
// In hooks.server.ts
const session = db.withSession();
event.locals.dbSession = session;

// In route handlers
const session = event.locals.dbSession;
const products = await getProducts(session, tenantId);
```

---

## Phase 1: Authentication Hooks (Highest Impact)

**Files:**
- `domains/src/hooks.server.ts`
- `landing/src/hooks.server.ts`

**Current pattern:**
```typescript
// hooks.server.ts
const db = event.platform.env.DB;
const session = await db.prepare('SELECT * FROM sessions...').first();
const user = await db.prepare('SELECT * FROM users...').first();
```

**With Sessions API:**
```typescript
// hooks.server.ts
const db = event.platform.env.DB;
const dbSession = db.withSession();

// Store session for use in route handlers
event.locals.dbSession = dbSession;

const session = await dbSession
  .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
  .bind(sessionId)
  .first();

const user = await dbSession
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(session.user_id)
  .first();
```

**Special case - Token refresh:**
```typescript
// When checking if tokens need refresh, use unconditional constraint
// to ensure we have the latest token state
if (session.access_token && session.refresh_token) {
  const freshSession = db.withSession({ constraint: 'first_unconditional' });
  const latestSession = await freshSession
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first();

  if (isTokenExpiringSoon(latestSession.token_expires_at)) {
    // Proceed with refresh
  }
}
```

**Update db.ts exports:**
```typescript
// db.ts - update functions to accept session or database
export async function getSession(
  db: D1Database | D1Session,
  sessionId: string
): Promise<Session | null> {
  const result = await db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
    .bind(sessionId)
    .first<Session>();
  return result ?? null;
}
```

---

## Phase 2: Shop Product Reads

**Files:**
- `packages/engine/src/lib/payments/shop.ts`

**Functions to update:**
- `getProducts()`
- `getProductBySlug()`
- `getProductById()`
- `getProductVariants()`
- `getVariantById()`

**Pattern:**
```typescript
// Before
export async function getProducts(
  db: D1Database,
  tenantId: string,
  options: GetProductsOptions = {}
): Promise<Product[]> {
  // ...
}

// After - accept D1Database | D1Session
export async function getProducts(
  db: D1Database | D1Session,
  tenantId: string,
  options: GetProductsOptions = {}
): Promise<Product[]> {
  // Implementation unchanged - both types have .prepare()
}
```

**Usage in routes:**
```typescript
// +page.server.ts
export async function load({ locals, platform }) {
  const session = locals.dbSession ?? platform.env.DB.withSession();
  const products = await getProducts(session, tenantId);
  return { products };
}
```

---

## Phase 3: CDN File Operations

**Files:**
- `landing/src/lib/server/db.ts`

**Functions to update:**
- `getCdnFile()`
- `getCdnFileByKey()`
- `listCdnFiles()`
- `listAllCdnFiles()`
- `getCdnFolders()`

Same pattern as Phase 2 - accept `D1Database | D1Session`.

---

## Phase 4: Domain Search Reads

**Files:**
- `domains/src/lib/server/db.ts`

**Functions to update:**
- `getSearchJob()`
- `listSearchJobs()`
- `getJobResults()`
- `getActiveConfig()`

---

## Handling Mixed Read-Write Patterns

### getOrCreateUser Pattern

**Current (problematic with replicas):**
```typescript
export async function getOrCreateUser(db: D1Database, email: string) {
  const existing = await db.prepare('SELECT...').first();  // Could read stale
  if (existing) return existing;
  await db.prepare('INSERT...').run();  // Creates duplicate!
}
```

**With Sessions API:**
```typescript
export async function getOrCreateUser(db: D1Database, email: string) {
  // Use unconditional constraint for read-then-write patterns
  const session = db.withSession({ constraint: 'first_unconditional' });

  const existing = await session
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (existing) return existing;

  // Write goes to primary, session tracks this
  await session
    .prepare('INSERT INTO users...')
    .bind(...)
    .run();
}
```

### verifyMagicCode Pattern

**Current:**
```typescript
export async function verifyMagicCode(db, email, code) {
  const result = await db.prepare('SELECT...').first();  // Could read stale
  if (!result) return false;
  await db.prepare('UPDATE...SET used_at...').run();  // Marks wrong code!
  return true;
}
```

**With Sessions API:**
```typescript
export async function verifyMagicCode(db: D1Database, email: string, code: string) {
  // Force fresh read for security-critical operations
  const session = db.withSession({ constraint: 'first_unconditional' });

  const result = await session
    .prepare('SELECT * FROM magic_codes WHERE email = ? AND code = ? AND expires_at > datetime("now") AND used_at IS NULL')
    .bind(email.toLowerCase(), code.toUpperCase())
    .first();

  if (!result) return false;

  await session
    .prepare('UPDATE magic_codes SET used_at = datetime("now") WHERE id = ?')
    .bind(result.id)
    .run();

  return true;
}
```

---

## TypeScript Types

Add to your types or create `src/lib/server/d1-types.ts`:

```typescript
// D1 Session API types (Cloudflare Workers Types should include these)
interface D1Session {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  getBookmark(): string;
}

interface D1SessionOptions {
  constraint?: 'first_unconditional';
}

// Extend D1Database
interface D1Database {
  withSession(options?: D1SessionOptions): D1Session;
  // ... existing methods
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Functions work with both `D1Database` and `D1Session`
- [ ] `getOrCreateUser` doesn't create duplicates under concurrent calls
- [ ] `verifyMagicCode` correctly validates codes

### Integration Tests
- [ ] Authentication flow works end-to-end
- [ ] Product catalog browsing works
- [ ] Token refresh works correctly
- [ ] Admin operations (writes) still work

### Manual Testing
- [ ] Login/logout flow
- [ ] Session persistence across requests
- [ ] Product page loading
- [ ] CDN file serving
- [ ] Domain search with results

---

## Enabling Replication

Once Sessions API is adopted:

1. **Update wrangler.toml:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
read_replication = { mode = "auto" }
```

2. **Deploy and monitor:**
- Check Cloudflare D1 analytics for `served_by_region`
- Monitor for any consistency issues
- Watch latency metrics for improvements

3. **Rollback if needed:**
Remove `read_replication` config and redeploy.

---

## Migration Order

1. **Phase 1**: Auth hooks (highest traffic)
2. **Phase 2**: Shop products (public browsing)
3. **Phase 3**: CDN files (media serving)
4. **Phase 4**: Domain search (lower priority)
5. **Enable replication**: Once all phases complete

Each phase can be deployed independently. The Sessions API works correctly even without replication enabled.

---

## References

- [D1 Read Replication Docs](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Sessions API](https://developers.cloudflare.com/d1/best-practices/read-replication/#sessions-api)
- [D1 Platform Limits](https://developers.cloudflare.com/d1/platform/limits/)
