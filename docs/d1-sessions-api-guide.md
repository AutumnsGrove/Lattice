# D1 Sessions API Guide

This guide explains how GroveEngine uses Cloudflare D1's Sessions API for consistent database reads, and how to enable read replication when ready.

## What We Did

We migrated the authentication hooks and database functions to use D1's Sessions API. This provides:

1. **Consistent reads within a request** - All DB queries in a single HTTP request share the same session
2. **"Read your own writes"** - If you write data, subsequent reads in the same request see that write
3. **Replication-ready** - When enabled, read queries can go to geographically closer replicas

## How It Works

### The Pattern

```typescript
// In hooks.server.ts - create session at request start
if (event.platform?.env?.DB) {
  event.locals.dbSession = event.platform.env.DB.withSession();
}

// Use dbSession for all queries in this request
const session = await getSession(dbSession, sessionId);
const user = await getUserById(dbSession, session.user_id);
```

### Function Signatures

All db.ts functions accept either `D1Database` or `D1DatabaseSession`:

```typescript
type D1DatabaseOrSession = D1Database | D1DatabaseSession;

export async function getSession(
  db: D1DatabaseOrSession,
  sessionId: string
): Promise<Session | null> {
  // Works with either type
}
```

This means:
- Old code passing `D1Database` still works
- New code can pass `D1DatabaseSession` for session consistency
- No breaking changes

## Files Modified

```
domains/
├── src/app.d.ts                    # Added dbSession to Locals
├── src/hooks.server.ts             # Creates and uses dbSession
└── src/lib/server/db.ts            # All functions accept D1DatabaseOrSession

landing/
├── src/app.d.ts                    # Added dbSession to Locals
├── src/hooks.server.ts             # Creates and uses dbSession
└── src/lib/server/db.ts            # All functions accept D1DatabaseOrSession
```

## Enabling Read Replication

When you're ready (global users, latency concerns, or scaling needs), just add this to wrangler.toml:

```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
read_replication = { mode = "auto" }
```

That's it. The Sessions API is already in place, so reads will automatically go to the nearest replica while maintaining consistency.

### When to Enable

- You have users outside the US (or your primary region)
- D1 latency shows up in Cloudflare analytics
- You're approaching ~500+ QPS on read-heavy endpoints

### Monitoring

After enabling, check Cloudflare D1 analytics for:
- `served_by_region` - Shows which replica served each query
- Latency improvements for global users

## Adding New Database Functions

When adding new db.ts functions, follow this pattern:

```typescript
// Use the type alias
export async function myNewFunction(
  db: D1DatabaseOrSession,
  param: string
): Promise<Result> {
  return await db
    .prepare('SELECT * FROM table WHERE col = ?')
    .bind(param)
    .first();
}
```

## Using dbSession in Routes

In SvelteKit routes, access the session from locals:

```typescript
// +page.server.ts or +server.ts
export async function load({ locals, platform }) {
  // Prefer locals.dbSession (has session consistency)
  // Fall back to raw DB if needed (e.g., no auth hook ran)
  const db = locals.dbSession ?? platform?.env?.DB;

  if (!db) throw error(500, 'Database unavailable');

  const data = await someDbFunction(db, params);
  return { data };
}
```

## Consistency Considerations

### When Sessions API Matters Most

1. **Read-then-write patterns** (e.g., `getOrCreateUser`)
   - Without session: Could read stale data from replica, then create duplicate
   - With session: Reads and writes are consistent

2. **Token refresh flows**
   - Need to read latest token state before deciding to refresh

3. **Any flow where you read, make a decision, then write**

### When It Doesn't Matter

- Simple reads with no subsequent writes
- Admin-only operations (low frequency)
- Write-only operations (always go to primary anyway)

## References

- [D1 Read Replication Docs](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Sessions API](https://developers.cloudflare.com/d1/best-practices/read-replication/#sessions-api)
- `docs/D1_REPLICATION_ANALYSIS.md` - Full query inventory and recommendations
