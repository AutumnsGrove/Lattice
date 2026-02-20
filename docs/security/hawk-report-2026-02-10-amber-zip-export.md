# HAWK SECURITY ASSESSMENT — Amber Zip Export

## Executive Summary

**Target:** Amber Zip Export System (PR #1054)
**Scope:** ExportDO, API routes (`/api/export/*`), Svelte UI (`/arbor/export`), webhook-cleanup worker, `gw export` CLI
**Date:** 2026-02-10
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** MEDIUM

The zip export system is well-architected with strong foundations: parameterized D1 queries throughout, tenant ownership verification on every API route, UUID validation on path parameters, R2 key path traversal guards, rate limiting, and concurrent export prevention. The Durable Object correctly sanitizes paths and escapes YAML content. Several findings merit attention before production deploy, primarily around the cleanup worker's infrastructure config and the ExportDO's unauthenticated internal fetch surface.

### Key Findings

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 1     |
| Medium   | 3     |
| Low      | 3     |
| Info     | 3     |

### Top 3 Risks

1. **[HIGH] Duplicate R2 binding in webhook-cleanup worker** — will cause deployment failure or wrong-bucket deletion
2. **[MEDIUM] ExportDO accepts unauthenticated requests on `/start`** — relies entirely on being unreachable from the public internet (service binding isolation), but has no internal auth
3. **[MEDIUM] Cleanup worker HTTP handler has no authentication** — anyone who discovers the worker URL can trigger cleanup

---

## Threat Model (STRIDE)

| Component                     | S   | T   | R   | I   | D   | E   | Priority |
| ----------------------------- | --- | --- | --- | --- | --- | --- | -------- |
| POST /api/export/start        | .   | .   | .   | .   | ?   | .   | MEDIUM   |
| GET /api/export/[id]/status   | .   | .   | .   | ?   | .   | .   | LOW      |
| GET /api/export/[id]/download | .   | .   | .   | ?   | .   | ?   | MEDIUM   |
| ExportDO /start               | ?   | .   | .   | .   | .   | ?   | MEDIUM   |
| ExportDO alarm chain          | .   | .   | .   | .   | !   | .   | LOW      |
| /arbor/export UI              | .   | .   | .   | .   | .   | .   | LOW      |
| webhook-cleanup cron          | .   | .   | .   | .   | !   | .   | LOW      |
| webhook-cleanup HTTP          | .   | .   | .   | .   | !   | ?   | MEDIUM   |
| gw export CLI                 | .   | .   | .   | .   | .   | .   | LOW      |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

### Trust Boundaries

```
UNTRUSTED                         TRUST BOUNDARY                         TRUSTED
──────────────────────────────────────┼─────────────────────────────────────────
Browser (Svelte UI)                   │  SvelteKit hooks.server.ts (session)
                                      │
POST /api/export/start                │  getVerifiedTenantId() + CSRF + rate limit
GET  /api/export/[id]/status          │  getVerifiedTenantId() + UUID validation
GET  /api/export/[id]/download        │  getVerifiedTenantId() + UUID + R2 key check
                                      │
Engine Worker (service binding)       │  ExportDO.fetch("/start") — NO internal auth
                                      │
Public internet                       │  webhook-cleanup Worker HTTP — NO auth
                                      │
gw CLI (wrangler d1/r2)              │  Wrangler auth (API tokens)
```

### Data Classification

| Data Type                     | Classification | Storage               | Component                  |
| ----------------------------- | -------------- | --------------------- | -------------------------- |
| Export zip (content + images) | HIGH           | R2 (7-day TTL)        | ExportDO → R2              |
| User email (in export record) | HIGH           | D1                    | storage_exports.user_email |
| Session cookie                | CRITICAL       | Cookie + KV           | Browser → hooks.server.ts  |
| Tenant content (posts, pages) | MEDIUM         | D1 → DO storage → zip | ExportDO phases            |
| R2 keys (file paths)          | MEDIUM         | D1                    | storage_exports.r2_key     |

---

## Findings

### HIGH

#### [HAWK-001] Duplicate R2 Bucket Binding in webhook-cleanup Worker

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| **Severity**   | HIGH                                               |
| **Domain**     | Infrastructure                                     |
| **Location**   | `libs/workers/webhook-cleanup/wrangler.toml:25-34` |
| **Confidence** | HIGH                                               |
| **OWASP**      | A05:2021 Security Misconfiguration                 |

**Description:**
Two `[[r2_buckets]]` blocks both bind to `IMAGES` but reference different bucket names — `grove-images` (line 26-27) and `grove-media` (line 33-34). Wrangler will use whichever comes last, but this is ambiguous and one of them is wrong.

**Evidence:**

```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "grove-images"    # ← This one

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "grove-media"     # ← Or this one?
```

The ExportDO worker uses `grove-media` as its R2 bucket (confirmed in `libs/durable-objects/wrangler.toml:88-89`). The cleanup worker needs to delete from the same bucket.

**Impact:**
If the wrong binding wins, `cleanupExpiredExports()` will attempt to delete R2 objects from the wrong bucket — silently failing to clean up export zips. Expired zips persist indefinitely, consuming R2 storage and leaving downloadable data past its intended expiry window.

**Remediation:**
Remove the `grove-images` binding. Keep only:

```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "grove-media"
```

---

### MEDIUM

#### [HAWK-002] ExportDO Accepts Unauthenticated Internal Requests

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| **Severity**   | MEDIUM                                              |
| **Domain**     | Authentication                                      |
| **Location**   | `libs/durable-objects/src/ExportDO.ts:111-124`      |
| **Confidence** | MEDIUM                                              |
| **OWASP**      | A07:2021 Identification and Authentication Failures |

**Description:**
The ExportDO `fetch()` handler routes `/start`, `/status`, and `/cancel` without any authentication check. It trusts the caller implicitly because it's expected to be reached only via service binding from the engine worker. However, if the DO worker is ever directly exposed (misconfigured route, debugging endpoint, or future refactor), any caller could trigger exports for any tenant.

**Evidence:**

```typescript
async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/start":
        return this.handleStart(request);  // No auth check
      case "/status":
        return this.handleStatus();        // No auth check
      case "/cancel":
        return this.handleCancel();        // No auth check
```

**Impact:**
If the DO becomes externally reachable, an attacker could start exports for arbitrary tenants by constructing the right DO ID name (`export:{tenantId}:{exportId}`). Current risk is LOW because the DO is behind a service binding, but defense-in-depth suggests adding a shared secret or origin check.

**Remediation:**
Add a simple shared header check:

```typescript
const INTERNAL_SECRET = this.env.INTERNAL_API_KEY; // from Worker secrets
if (request.headers.get("X-Internal-Key") !== INTERNAL_SECRET) {
	return new Response("Forbidden", { status: 403 });
}
```

Or validate that the request comes from the service binding by checking the `CF-Worker` header.

**Needs Manual Verification:** Yes — confirm the DO worker is not externally routable via `wrangler.toml` or Cloudflare dashboard.

---

#### [HAWK-003] Cleanup Worker HTTP Handler Has No Authentication

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| **Severity**   | MEDIUM                                              |
| **Domain**     | Authentication                                      |
| **Location**   | `libs/workers/webhook-cleanup/src/index.ts:148-199` |
| **Confidence** | HIGH                                                |
| **OWASP**      | A07:2021 Identification and Authentication Failures |

**Description:**
The HTTP `fetch()` handler in the cleanup worker performs destructive operations (deleting webhook events and R2 objects) without any authentication. Anyone who discovers the worker URL can trigger a cleanup cycle.

**Evidence:**

```typescript
async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    // No auth check — proceeds to delete webhooks and export R2 objects
```

**Impact:**
While cleanup only affects already-expired records (bounded by the `expires_at < now` check), repeated calls could be used for minor DoS against D1 (running batched deletes). More importantly, an attacker who gains access to the R2 bucket state could time their attack to delete zips the moment they expire, before users download them.

**Remediation:**
Add a shared secret check:

```typescript
const authHeader = request.headers.get("Authorization");
if (authHeader !== `Bearer ${env.CLEANUP_API_KEY}`) {
	return new Response("Unauthorized", { status: 401 });
}
```

---

#### [HAWK-004] ExportDO Logs User Email in Plain Text

| Field          | Value                                             |
| -------------- | ------------------------------------------------- |
| **Severity**   | MEDIUM                                            |
| **Domain**     | Data Protection                                   |
| **Location**   | `libs/durable-objects/src/ExportDO.ts:604-606`    |
| **Confidence** | HIGH                                              |
| **OWASP**      | A09:2021 Security Logging and Monitoring Failures |

**Description:**
The notifying phase logs the user's email address in structured JSON logs:

**Evidence:**

```typescript
this.log("Notifying phase complete", {
	email: this.jobState.userEmail,
});
```

Cloudflare Worker logs are retained and potentially visible to anyone with dashboard access.

**Impact:**
PII exposure in logs. Minor in a small team, but sets a pattern that could become a compliance issue at scale.

**Remediation:**
Mask the email in logs:

```typescript
this.log("Notifying phase complete", {
	email: this.jobState.userEmail.replace(/(.{2}).*@/, "$1***@"),
});
```

---

### LOW

#### [HAWK-005] No Maximum Export Size Enforcement Before Processing

| Field          | Value                                          |
| -------------- | ---------------------------------------------- |
| **Severity**   | LOW                                            |
| **Domain**     | Rate Limiting & Resource Controls              |
| **Location**   | `libs/durable-objects/src/ExportDO.ts:250-317` |
| **Confidence** | MEDIUM                                         |
| **OWASP**      | A04:2021 Insecure Design                       |

**Description:**
The `EXPORT_TOO_LARGE` error code exists in `api-errors.ts` (GROVE-API-048) but is never checked — the start endpoint doesn't verify content counts or estimated size before creating the export record and triggering the DO. A tenant with a very large media library could trigger an export that exhausts DO memory or storage.

**Impact:**
Low in practice — Cloudflare DO storage limits will naturally bound this, and the batched image fetching (25/cycle) prevents memory spikes. But a tenant with 10,000+ images could create a very long-running export that consumes DO alarm cycles.

**Remediation:**
Add a pre-flight check in `/api/export/start` that queries content counts and rejects if above a threshold (e.g., 500 images, 10,000 posts). Return `EXPORT_TOO_LARGE` error.

---

#### [HAWK-006] Content-Disposition Header Uses Simple Quoting

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| **Severity**   | LOW                                                              |
| **Domain**     | HTTP Security                                                    |
| **Location**   | `libs/engine/src/routes/api/export/[id]/download/+server.ts:133` |
| **Confidence** | MEDIUM                                                           |
| **OWASP**      | A03:2021 Injection                                               |

**Description:**
The filename in `Content-Disposition` is sanitized via `sanitizeFilename()` but uses simple double-quote wrapping rather than RFC 5987 `filename*` encoding. The comment on line 132 mentions RFC 5987 but the implementation uses basic quoting.

**Evidence:**

```typescript
// Use RFC 5987 encoding for filename to prevent injection
"Content-Disposition": `attachment; filename="${filename}"`,
```

**Impact:**
Low — `sanitizeFilename()` strips special characters, so injection is effectively prevented. But a truly standards-compliant approach would use `filename*=UTF-8''grove-export-...`.

**Remediation:**
Since the filename is generated server-side from a date string (not user input), the current approach is safe. For completeness, consider:

```typescript
`attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
```

---

#### [HAWK-007] gw export CLI Uses SQL String Interpolation

| Field          | Value                                             |
| -------------- | ------------------------------------------------- |
| **Severity**   | LOW                                               |
| **Domain**     | Input Validation                                  |
| **Location**   | `tools/gw/src/gw/commands/export.py` (throughout) |
| **Confidence** | MEDIUM                                            |
| **OWASP**      | A03:2021 Injection                                |

**Description:**
The CLI constructs SQL via f-string interpolation with `_escape_sql()` (single-quote doubling). This is consistent with every other `gw` command module (`tenant.py`, `db.py`) and passes through wrangler's CLI which adds its own quoting layer.

**Impact:**
Very low — the wrangler CLI is the only consumer, and input comes from the terminal operator (not untrusted web input). The `_escape_sql()` function handles the standard SQLite injection vector. This is a systemic pattern across all gw commands, not specific to export.

**Remediation:**
No action needed for this PR. If wrangler ever supports parameterized CLI queries, migrate all commands at once.

---

### INFORMATIONAL

#### [HAWK-008] Dual Email Template Implementations

| Field          | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| **Severity**   | INFO                                                                            |
| **Domain**     | Code Quality                                                                    |
| **Location**   | `ExportDO.ts:811-900` and `libs/engine/src/lib/email/templates/export-ready.ts` |
| **Confidence** | HIGH                                                                            |

**Description:**
Two implementations of the export-ready email exist — inline in the DO and as a separate template file. The DO uses its inline version. The template file appears unused in this changeset.

**Impact:**
No security impact. Maintenance concern only — if a security fix is needed in the email template, it must be applied in both places.

---

#### [HAWK-009] Example Tenant Can Access Export Page

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| **Severity**   | INFO                                                   |
| **Domain**     | Authorization                                          |
| **Location**   | `libs/engine/src/routes/arbor/+layout.server.ts:91-94` |
| **Confidence** | HIGH                                                   |

**Description:**
The arbor layout allows the example tenant (`example-tenant-001`) to bypass authentication. This means the `/arbor/export` page is accessible without login for the example tenant. However, the API routes (`/api/export/start`) still require auth via `getVerifiedTenantId()`, so no actual export can be triggered.

**Impact:**
None — the page renders but the "Start Export" button will fail with a 401. The page server load at `+page.server.ts` also checks `locals.tenantId` and will show data scoped to the example tenant only.

---

#### [HAWK-010] Export Zip Files Served Without X-Content-Type-Options

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | INFO                                                                 |
| **Domain**     | HTTP Security                                                        |
| **Location**   | `libs/engine/src/routes/api/export/[id]/download/+server.ts:128-136` |
| **Confidence** | HIGH                                                                 |

**Description:**
The download response sets `Content-Type: application/zip` but doesn't include `X-Content-Type-Options: nosniff`. Modern browsers handle this well for zip files, but it's a defense-in-depth header.

**Remediation:**
Add to the response headers:

```typescript
"X-Content-Type-Options": "nosniff",
```

---

## Domain Scorecard

| Domain           | Rating  | Findings   | Notes                                                                      |
| ---------------- | ------- | ---------- | -------------------------------------------------------------------------- |
| Authentication   | PARTIAL | 2 findings | API routes excellent; DO and cleanup worker lack internal auth             |
| Authorization    | PASS    | 0 findings | `getVerifiedTenantId()` on every route, tenant_id in all queries           |
| Input Validation | PASS    | 0 findings | UUID validation, `sanitizeFilename`, `sanitizeForPath`, `escapeYamlString` |
| Data Protection  | PARTIAL | 1 finding  | Email logged in plain text                                                 |
| HTTP Security    | PASS    | 1 info     | Missing nosniff header (minor)                                             |
| CSRF Protection  | PASS    | 0 findings | `validateCSRF(request)` on POST, SvelteKit `checkOrigin`                   |
| Session Security | PASS    | 0 findings | Inherited from Heartwood — HttpOnly, Secure, SameSite                      |
| Rate Limiting    | PASS    | 0 findings | 3/day limit on zip-start, applied before DB operations                     |
| Multi-Tenant     | PASS    | 0 findings | All queries scoped by tenant_id, ownership verified                        |
| Infrastructure   | FAIL    | 1 finding  | Duplicate R2 binding will cause wrong-bucket behavior                      |
| Supply Chain     | PASS    | 0 findings | fflate is a well-known, small dependency                                   |

---

## Positive Observations

Strong work on this feature — the security posture is notably good for a first implementation:

- **Parameterized queries everywhere** — All D1 queries in API routes and the DO use `.bind()`. Zero SQL concatenation in the TypeScript code.
- **Tenant isolation is airtight** — Every API route calls `getVerifiedTenantId()` which does ownership verification (email match). Download endpoint includes `AND tenant_id = ?` in the query. The DO only operates on the tenant passed to it at creation.
- **UUID validation at the boundary** — `params.id` validated as UUID before use in queries, preventing injection through path parameters.
- **R2 key path traversal protection** — Download endpoint validates R2 key starts with `exports/{tenantId}/{id}/` and rejects `..` and `//`. ExportDO's `sanitizeForPath()` strips non-alphanumeric characters from usernames.
- **YAML injection prevention** — `escapeYamlString()` handles quotes, backslashes, newlines, carriage returns, and tabs. This prevents exported content from breaking YAML frontmatter parsing.
- **Rate limiting applied early** — The 3/day zip-start limit is checked before the in-progress export check, preventing rate limit bypass via the 409 path.
- **Concurrent export prevention** — Checks for in-progress exports with all active statuses, not just "pending".
- **Graceful error handling** — The DO's `handleError()` stores a user-friendly message in D1 while logging the full internal error separately. Never exposes stack traces.
- **Accessible UI** — Progress bar has `role="progressbar"`, `aria-valuenow`, `aria-live="polite"`. Respects `prefers-reduced-motion`.

---

## Remediation Priority

### Immediate (fix before deploy)

- **HAWK-001**: Remove duplicate R2 binding in webhook-cleanup — this will cause a deployment failure or wrong-bucket behavior

### Short-term (fix within 1 week)

- **HAWK-003**: Add auth to cleanup worker HTTP handler
- **HAWK-004**: Mask email in DO logs

### Medium-term (fix within 1 month)

- **HAWK-002**: Add internal auth header to ExportDO
- **HAWK-005**: Add pre-flight size check using EXPORT_TOO_LARGE error

### Long-term (track and plan)

- **HAWK-006**: RFC 5987 Content-Disposition encoding (very minor)
- **HAWK-010**: Add nosniff header to download response

---

_The hawk has spoken. Every path surveyed, every shadow examined._ 🦅
