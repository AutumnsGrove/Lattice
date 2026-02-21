# Grove-Specific Debugging Patterns

> **When to load:** Debugging SvelteKit + Cloudflare Workers issues in the Grove stack

---

## SvelteKit / Cloudflare Boundary Map

```
Browser → Form Action / fetch()
                ↓
SvelteKit Route (+page.server.ts / +server.ts)
                ↓
Service Layer (libs/engine/src/lib/server/services/)
                ↓
Database (D1) / Cache (KV) / Storage (R2)
                ↓
Response → Browser
```

Instrument each boundary. What goes in? What comes out? Where does the data change shape?

---

## Route Loading Issues

```bash
gf --agent search "+server.ts"            # API routes
gf --agent search "+page.server.ts"       # Page loads
gf --agent search "export function POST"  # Specific method handler
```

Common causes:
- Hook runs on wrong path pattern (check `hooks.server.ts` matchers)
- `locals.tenant` not populated for API routes outside `/app/*`
- Form action vs API endpoint confusion

## D1 Database Issues

```bash
gf --agent search "CREATE TABLE"
gf --agent search "ALTER TABLE"
gf --agent search "platform.env.DB"
gf --agent search "wrangler.toml"
```

Common causes:
- Schema migration applied in production but not locally (or vice versa)
- Column renamed/added but queries not updated
- Missing tenant_id scope in multi-tenant queries
- D1 returning `null` for `first()` when no row matches (not an error)

## KV Cache Issues

```bash
gf --agent search "CACHE.get"
gf --agent search "CACHE.put"
gf --agent search "cache.delete"
```

Common causes:
- Cache not invalidated after write (stale reads)
- Cache key mismatch between write and read
- TTL too long for frequently changing data
- KV eventual consistency (writes visible after ~60s globally)

## Auth / Session Issues

```bash
gf --agent search "validateSession"
gf --agent search "getSession"
gf --agent func "requireAuth"
```

Common causes:
- Session cookie not sent (SameSite, Secure flags, cross-origin)
- Token expired but refresh not triggered
- CSRF mismatch behind proxy (`Origin` vs `Host` header — see AGENT.md)
- `locals.user` null in routes that expect authentication

## Build / Deploy Issues

```bash
gf --agent search "svelte.config"
gf --agent search "vite.config"
gf --agent changed
gf diff-summary
```

Common causes:
- Import from server module in client code (`$lib/server/` in `.svelte`)
- Missing dependency in `package.json` (works with hoisted `node_modules`, fails in production)
- Environment variable missing in production (set in `.dev.vars` but not in Cloudflare Dashboard)

---

## Example Debugging Session

**User:** "The posts API returns 500 intermittently for tenant 'autumn'. Works fine for other tenants."

**Mole flow:**

1. **FEEL** — "Reproducing. POST /api/posts with tenant autumn. Got 500 on third attempt. Intermittent. Minimal repro: happens when post title contains an apostrophe."

2. **DIG** — "Tracing data flow. Instrumented route entry, service layer, D1 query. D1 throws: `SQLITE_ERROR: unrecognized token`. Apostrophe not escaped."

3. **TUNNEL** — "Hypothesis: Raw string interpolation in SQL instead of parameterized binding. Checked `posts.service.ts` line 47. CONFIRMED: `WHERE title = '${title}'` instead of `WHERE title = ?`."

4. **SURFACE** — "Failing test written: 'should handle apostrophes in post titles.' Fix: parameterized query. Test passes. CI passes."

5. **SEAL** — "Searched for other raw interpolation: found 2 more in comments and pages services. Fixed both. Regression tests added. MOLE instrumentation removed."
