# Turtle Harden: Attack Surface Reference

> Loaded by turtle-harden during Phase 1 (WITHDRAW). See SKILL.md for the full workflow.

---

## Map the Attack Surface

### Entry Points — Where Data Comes In

```
ENTRY POINTS:
[ ] URL parameters and query strings
[ ] Form submissions and POST bodies
[ ] HTTP headers (Host, Referer, X-Forwarded-*, custom headers)
[ ] Cookies
[ ] File uploads
[ ] WebSocket messages
[ ] postMessage from iframes/popups
[ ] URL fragments (client-side)
[ ] API request bodies (JSON, XML, multipart)
[ ] Webhooks from external services
[ ] Database reads (second-order injection)
[ ] Environment variables / config files
```

### Exit Points — Where Data Goes Out

```
EXIT POINTS:
[ ] HTML responses (XSS surface)
[ ] HTTP response headers
[ ] JSON API responses (data leakage)
[ ] Database writes (injection surface)
[ ] External API calls (SSRF surface)
[ ] Email content
[ ] Log files (sensitive data leakage)
[ ] Error messages (information disclosure)
[ ] Redirects (open redirect surface)
```

---

## Catalog Data Flows

For each piece of sensitive data (credentials, PII, tokens, payment info):

1. Where does it enter the system?
2. Where is it stored?
3. Where is it transmitted?
4. Where is it displayed/output?
5. When is it deleted?

Work through each data category present in scope:

- User credentials (passwords, MFA secrets)
- Session tokens and API keys
- Personally identifiable information (email, name, address)
- Payment data (card numbers, billing details)
- User-generated content that could carry payloads

---

## Tech Stack Assessment

Check for known vulnerability patterns in the specific stack:

### SvelteKit

- Layout bypass: Authorization checked in `+layout.server.ts` can be bypassed by parallel route loading — always enforce in `hooks.server.ts`
- Server-only module leaks: `$lib/server` imports must never reach client bundles
- CSP nonce handling: SvelteKit's `mode: 'auto'` generates nonces per request — verify it is not disabled
- Form action CSRF: SvelteKit's built-in CSRF check — verify `checkOrigin` is not set to `false`

### Cloudflare Workers

- Secret storage: Secrets must be in Workers Secrets (encrypted), not plain `vars` in `wrangler.toml`
- Subrequest limits: 50 subrequests per invocation — SSRF fetches count
- V8 isolate boundaries: Workers are isolated per request, but shared global state can leak between invocations in the same isolate

### TypeScript / JavaScript

- Prototype pollution: Plain objects `{}` share the `Object.prototype` chain — prefer `Object.create(null)` for dictionaries
- Type coercion: `==` vs `===`, loose comparisons with `null`/`undefined`/`0`/`false` can cause auth bypasses
- `eval` patterns: `eval()`, `new Function()`, `setTimeout(string)`, `setInterval(string)` — all execute arbitrary code

### D1 / SQLite

- SQL injection: String-concatenated queries are the classic path
- Parameter binding: D1's `.bind()` API must be used on every user-supplied value
- Tenant isolation: Every query must carry an explicit `WHERE tenant_id = ?` clause — no exceptions

---

## Output

Complete attack surface map with:

- All entry points catalogued
- All exit points catalogued
- Data flows traced for each sensitive data category
- Tech-specific risks identified for the stack in scope
