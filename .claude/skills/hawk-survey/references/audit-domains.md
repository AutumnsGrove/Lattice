# Hawk Survey: Audit Domains

> Loaded by hawk-survey during Phase 3 (ASSESS). See SKILL.md for the full workflow.

---

## How to Work Through This Phase

- For each domain, check every item against the actual code
- Record findings with severity, evidence (file:line), and confidence
- Mark items as PASS, FAIL, PARTIAL, or NEEDS-VERIFICATION (can't assess from code alone)
- Don't stop at the first finding in a domain — complete the full checklist
- A domain can have multiple findings at different severities

---

## Domain 1: Authentication Security

```
AUTH AUDIT:
[ ] Password hashing algorithm (Argon2id preferred, bcrypt acceptable)
[ ] No weak hashing (MD5, SHA-1, SHA-256 for passwords)
[ ] Login doesn't reveal whether username or password was wrong
[ ] Account enumeration prevented on registration and password reset
[ ] Session ID generated with CSPRNG, minimum 128 bits
[ ] Session regenerated after login (prevents fixation)
[ ] Session fully invalidated on logout (server-side)
[ ] All auth cookies cleared on logout (check the full list)
[ ] OAuth uses PKCE flow (not implicit grant)
[ ] OAuth state parameter validated
[ ] OAuth redirect URIs are exact-match
[ ] JWT algorithm explicitly whitelisted (rejects 'none')
[ ] JWT signature always verified
[ ] JWT expiry is short (5-15 min for access tokens)
[ ] JWT claims validated (iss, aud, exp, nbf)
[ ] Refresh tokens are single-use or rotation-enforced
[ ] Brute-force protection (rate limiting, progressive delays, lockout)
[ ] MFA available for sensitive operations
[ ] Password reset tokens are single-use and time-limited
[ ] "Remember me" functionality doesn't weaken session security
```

---

## Domain 2: Authorization & Access Control

```
AUTHZ AUDIT:
[ ] Default deny — all access denied unless explicitly granted
[ ] Authorization checked server-side on every request
[ ] Authorization enforced in server hooks or route handlers, NOT layouts only
[ ] Object-level: User A cannot access User B's resources (IDOR)
[ ] Function-level: Regular users cannot access admin endpoints
[ ] Property-level: Sensitive fields filtered by role
[ ] Horizontal escalation tested: swap tenant/user IDs in requests
[ ] Vertical escalation tested: regular user hitting admin routes
[ ] Direct object references use UUIDs or indirect mapping (not sequential IDs)
[ ] Bulk endpoints enforce per-object authorization (not just list-level)
[ ] GraphQL/API: field-level authorization enforced (if applicable)
```

---

## Domain 3: Input Validation & Injection Prevention

```
INPUT AUDIT:
[ ] All user input validated server-side
[ ] Validation uses allowlists, not blocklists
[ ] Schema validation at API boundaries (Zod, Valibot, etc.)
[ ] All SQL queries use parameterized statements (zero concatenation)
[ ] HTML output uses framework auto-escaping (Svelte default)
[ ] {@html} or equivalent only used with sanitized content (DOMPurify)
[ ] URL parameters validated and typed
[ ] File paths never constructed from user input (path traversal)
[ ] No eval(), new Function(), or dynamic code execution with user input
[ ] HTTP headers constructed from user input are sanitized (CRLF)
[ ] Redirect URLs validated against allowlist (open redirect)
[ ] Regular expressions reviewed for catastrophic backtracking (ReDoS)
[ ] Content-Type validated on incoming requests
[ ] JSON parsing uses JSON.parse() (not custom deserializers)
```

---

## Domain 4: Data Protection

```
DATA AUDIT:
[ ] All traffic over TLS 1.2+ (HSTS enabled)
[ ] Sensitive data at rest encrypted
[ ] Secrets in environment variables or secrets vault (not in code)
[ ] .env files in .gitignore
[ ] No secrets in git history
[ ] PII minimized — only collect what's necessary
[ ] Logging doesn't capture passwords, tokens, PII
[ ] Error messages don't reveal internal details
[ ] Constant-time comparison for secrets/tokens
[ ] Database credentials use least-privilege accounts
[ ] Backup data encrypted and access-controlled
[ ] Data retention policies defined and enforced
[ ] GDPR/privacy: data export and deletion capabilities exist
```

---

## Domain 5: HTTP Security

```
HTTP AUDIT:
[ ] Content-Security-Policy header present and strict
[ ] CSP uses nonce-based or hash-based approach
[ ] CSP does not contain 'unsafe-inline' for scripts
[ ] CSP does not contain 'unsafe-eval'
[ ] Strict-Transport-Security header present (max-age >= 1 year)
[ ] X-Content-Type-Options: nosniff
[ ] X-Frame-Options: DENY (or frame-ancestors in CSP)
[ ] Referrer-Policy set appropriately
[ ] Permissions-Policy restricts unused APIs
[ ] CORS origins validated against exact allowlist
[ ] CORS does not reflect arbitrary origins
[ ] CORS does not allow null origin
[ ] Cache-Control set on sensitive responses (no-store)
[ ] Vary header set appropriately for cached content
[ ] Server/X-Powered-By headers removed
```

---

## Domain 6: CSRF Protection

```
CSRF AUDIT:
[ ] Anti-CSRF tokens on all state-changing requests
[ ] CSRF tokens per-session and cryptographically random
[ ] SameSite cookie attribute set (Strict or Lax)
[ ] State-changing operations use POST/PUT/DELETE (never GET)
[ ] SvelteKit CSRF protection enabled (checkOrigin: true)
[ ] Non-form API endpoints validate Origin header
[ ] Multipart form submissions include CSRF token
[ ] CSRF protection not bypassable via content-type tricks
```

---

## Domain 7: Session & Cookie Security

```
SESSION/COOKIE AUDIT:
[ ] HttpOnly flag on all auth cookies
[ ] Secure flag on all auth cookies
[ ] SameSite attribute set on all auth cookies
[ ] Cookie Domain scoped appropriately
[ ] Cookie Path scoped as narrowly as possible
[ ] Session expiry enforced (idle + absolute)
[ ] Session stored server-side (not just in cookie)
[ ] No sensitive data in cookie values (only session ID)
[ ] Cookie prefixes used where possible (__Host-, __Secure-)
[ ] Concurrent session limits enforced
```

---

## Domain 8: File Upload Security

```
UPLOAD AUDIT:
[ ] File types validated via allowlist (extension AND MIME AND magic bytes)
[ ] Uploaded files renamed to random names (hash + timestamp)
[ ] Original filenames sanitized (no ../, null bytes, special chars)
[ ] File size limits enforced (per-file and per-request)
[ ] Files stored outside web root (R2, not public directory)
[ ] Content-Disposition: attachment on served files
[ ] X-Content-Type-Options: nosniff on served files
[ ] Images re-processed server-side (strip EXIF, re-encode)
[ ] SVGs sanitized (strip scripts, event handlers, foreignObject)
[ ] No user-controlled paths in file operations
[ ] Storage quota enforced per tenant
```

---

## Domain 9: Rate Limiting & Resource Controls

```
RATE LIMIT AUDIT:
[ ] Auth endpoints rate-limited (login, register, password reset)
[ ] API endpoints rate-limited per-user or per-IP
[ ] File upload endpoints rate-limited
[ ] Search/expensive query endpoints rate-limited
[ ] Rate limits applied BEFORE expensive operations
[ ] Rate limit headers returned (X-RateLimit-Remaining, Retry-After)
[ ] Database queries bounded (LIMIT clauses, pagination)
[ ] Request body size limits enforced
[ ] GraphQL/complex queries: depth and complexity limits (if applicable)
[ ] WebSocket connection limits (if applicable)
```

---

## Domain 10: Multi-Tenant Isolation (Grove-Specific)

```
TENANT AUDIT:
[ ] Tenant context resolved at request boundary, before business logic
[ ] EVERY database query includes tenant scoping (WHERE tenant_id = ?)
[ ] Cross-tenant data access tested (swap tenant IDs)
[ ] API responses scoped to authenticated tenant only
[ ] R2 file storage isolated per tenant (prefix or bucket)
[ ] KV keys include tenant ID (no cache pollution)
[ ] Session cannot be used across tenants
[ ] Background jobs carry explicit tenant context
[ ] Resource limits enforced per tenant (storage, API calls)
[ ] Tenant deletion fully purges ALL associated data
[ ] Admin endpoints verify admin role, not just auth
[ ] No shared mutable state between tenants in Workers
```

---

## Domain 11: Cloudflare & Infrastructure Security (Grove-Specific)

```
INFRA AUDIT:
[ ] Secrets stored in Workers Secrets (not env vars or code)
[ ] wrangler.toml doesn't contain secrets or sensitive config
[ ] Service bindings use authenticated calls (not public fetch)
[ ] Worker-to-Worker: platform.env.SERVICE.fetch() (not bare fetch())
[ ] D1 queries parameterized (same as app-level, but verify at infra layer)
[ ] R2 buckets not publicly accessible (served through Workers only)
[ ] KV namespaces not publicly accessible
[ ] DNS records: no dangling CNAMEs (subdomain takeover risk)
[ ] Cloudflare WAF rules configured appropriately
[ ] Workers have appropriate CPU/memory limits
[ ] No debug/dev routes exposed in production
[ ] Deployment pipeline doesn't expose secrets
[ ] Environment separation (dev/staging/prod use different secrets)
```

---

## Domain 12: Heartwood Auth Flow Integrity (Grove-Specific)

```
HEARTWOOD AUDIT:
[ ] PKCE flow implemented correctly (code_verifier + code_challenge)
[ ] Auth callback validates state parameter
[ ] Auth callback validates code with Heartwood (not just trusting it)
[ ] Session created only after successful token exchange
[ ] Access token stored securely (HttpOnly cookie, not localStorage)
[ ] Refresh token rotation enforced
[ ] Token exchange uses service binding (not public internet)
[ ] Cookie domain set correctly (.grove.place for cross-subdomain)
[ ] All auth cookies cleared on logout (full list)
[ ] Session validation on every request (hooks.server.ts)
[ ] CSRF protection covers auth-related endpoints
[ ] Redirect after login validated (no open redirect)
[ ] Error handling in auth flow doesn't leak information
```

---

## Domain 13: Exotic Attack Vectors

```
EXOTIC AUDIT:
[ ] Prototype pollution: no deep merge of user-controlled objects
[ ] Timing attacks: constant-time comparison for secrets
[ ] Race conditions: single-use tokens use atomic operations
[ ] SSRF: user-supplied URLs validated against allowlist + IP blocks
[ ] Unicode attacks: security filters applied after normalization
[ ] Homoglyph attacks: username validation considers lookalike chars
[ ] Second-order injection: DB-retrieved data still treated as untrusted
[ ] Supply chain: lock file committed, dependencies audited
[ ] postMessage: origin validated with exact comparison (if used)
[ ] HTTP request smuggling: HTTP/2 end-to-end where possible
[ ] Cache poisoning: unkeyed headers not reflected in responses
[ ] Open redirects: redirect URLs validated against allowlist
[ ] Verb tampering: routes explicitly define allowed methods
[ ] SVG XSS: user SVGs sanitized or served as attachments
```

---

## Domain 14: Dependency & Supply Chain

```
SUPPLY CHAIN AUDIT:
[ ] pnpm audit shows 0 critical/high vulnerabilities
[ ] Lock file (pnpm-lock.yaml) committed to version control
[ ] No unnecessary dependencies (minimize attack surface)
[ ] Dependencies use fixed versions (not floating ranges in production)
[ ] postinstall scripts reviewed for new dependencies
[ ] No known typosquatting risks
[ ] node_modules not committed to version control
[ ] CI/CD uses lock file for reproducible builds
[ ] Third-party scripts (analytics, CDN) use SRI hashes
```

---

**Phase 3 Output:** Complete findings list organized by domain, each with severity, evidence (file:line), and confidence level. Ready for Phase 4 report compilation.
