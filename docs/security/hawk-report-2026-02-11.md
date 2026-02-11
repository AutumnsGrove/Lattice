# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** Upload Gate Redesign (image_uploads + uploads_suspended two-flag system)
**Scope:** All files created/modified in the upload gate redesign — gate function, admin functions, endpoints, UI components, admin panel, migration
**Date:** 2026-02-11
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** LOW

### Key Findings

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 1     |
| Medium   | 1     |
| Low      | 1     |
| Info     | 2     |

### Top 3 Risks
1. **Avatar endpoint fail-open** — Silently allows uploads when KV binding is unavailable, unlike the main upload endpoint which denies
2. **No tenant existence validation** — Admin actions accept arbitrary tenant IDs without verifying they exist in the tenants table
3. **No audit logging** — Admin suspension changes are not logged with the acting Wayfinder's identity

---

## Threat Model

### Scope & Trust Boundaries

```
UNTRUSTED                    TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser (upload attempt)         │  upload/+server.ts (gate check)
                                 │
Browser (avatar upload)          │  avatar/+server.ts (gate check)
                                 │
Browser (gallery page)           │  gallery/+page.server.ts (gate)
                                 │
Wayfinder browser                │  arbor/uploads/+page.server.ts
  (admin panel)                  │    (isWayfinder check)
                                 │
Flag evaluation engine           │  D1 feature_flags + flag_rules
                                 │
KV cache                         │  Flag results (60s TTL)
```

### STRIDE Analysis

| Component | S | T | R | I | D | E | Priority |
|-----------|---|---|---|---|---|---|----------|
| canUploadImages() | . | . | . | . | . | . | LOW |
| Upload endpoint gate | . | . | . | . | . | . | LOW |
| Avatar endpoint gate | . | . | . | . | ? | . | MEDIUM |
| Gallery page gate | . | . | . | . | . | . | LOW |
| Root layout nav check | . | . | . | . | . | . | LOW |
| Admin page (load) | . | . | ? | . | . | . | MEDIUM |
| Admin actions | . | . | ? | . | . | ? | MEDIUM |
| Migration | . | . | . | . | . | . | LOW |
| UI flag references | . | . | . | . | . | . | LOW |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

---

## Findings

### HIGH

#### [HAWK-001] Avatar Endpoint Fail-Open When KV Unavailable

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Domain** | Authorization & Access Control |
| **Location** | `packages/engine/src/routes/api/settings/avatar/+server.ts:55` |
| **Confidence** | HIGH |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
The avatar upload endpoint wraps the upload gate check inside `if (flagsEnv)`, meaning it silently **allows** uploads when the KV binding is unavailable. The main image upload endpoint at `api/images/upload/+server.ts` correctly **denies** uploads when `flagsEnv` is null.

**Evidence:**
```typescript
// Avatar endpoint (FAIL-OPEN):
if (flagsEnv) {
  const uploadGate = await canUploadImages(...);
  if (!uploadGate.allowed) {
    throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
  }
}
// Falls through to allow upload if flagsEnv is null

// Main upload endpoint (FAIL-CLOSED):
if (!flagsEnv) {
  return json({ error: ... }, { status: 403 });
}
```

**Impact:**
If the KV binding is temporarily unavailable (misconfiguration, binding error), all tenants — including suspended ones — could upload avatar images.

**Remediation:**
Change the avatar gate to fail-closed: deny the upload when `flagsEnv` is null, matching the main upload endpoint's behavior.

---

### MEDIUM

#### [HAWK-002] No Tenant Existence Validation in Admin Actions

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Domain** | Input Validation |
| **Location** | `packages/landing/src/routes/arbor/uploads/+page.server.ts:74,103` |
| **Confidence** | MEDIUM |
| **OWASP** | A03:2021 Injection (indirect) |

**Description:**
The `unsuspend` and `suspend` actions accept a `tenantId` from form data and pass it directly to `setUploadSuspension()` without verifying the tenant exists in the `tenants` table. A Wayfinder could create orphan flag_rules rows for non-existent tenant IDs.

**Impact:**
Low practical impact (only Wayfinders have access), but creates data integrity risk — orphan rules in `flag_rules` that reference non-existent tenants.

**Remediation:**
Validate tenant existence before calling `setUploadSuspension()`, or accept the risk given the Wayfinder-only access. The greenhouse admin page has the same pattern (no existence check), so this is a systemic choice.

**Needs Manual Verification:** No — code-level assessment is sufficient.

---

### LOW

#### [HAWK-003] No Audit Logging for Upload Suspension Changes

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Domain** | Repudiation / Data Protection |
| **Location** | `packages/landing/src/routes/arbor/uploads/+page.server.ts:62-119` |
| **Confidence** | HIGH |
| **OWASP** | A09:2021 Security Logging and Monitoring Failures |

**Description:**
When a Wayfinder suspends or unsuspends a tenant, no audit log records who made the change. The greenhouse admin page has the same pattern — so this is consistent with existing behavior, but worth noting.

**Remediation:**
Add `console.log(`[UploadAdmin] ${locals.user.email} ${action} tenant ${tenantId}`)` to each action, or defer to a future audit logging system.

---

### INFORMATIONAL

#### [HAWK-004] UI Flag Defaults Are Intentionally Permissive

| Field | Value |
|-------|-------|
| **Severity** | INFO |
| **Domain** | Defense in Depth |
| **Location** | `arbor/images/+page.svelte:31`, `MarkdownEditor.svelte:74` |
| **Confidence** | HIGH |

**Description:**
Both UI components default `image_uploads` to `true` (`data.grafts?.image_uploads ?? true`), meaning the upload button renders even when the graft hasn't loaded. This is **intentional and safe** — the server-side gate (`canUploadImages()`) enforces the actual access control. The UI default only controls button visibility, not upload permission.

#### [HAWK-005] LIKE Pattern in SQL is Safe but Fragile

| Field | Value |
|-------|-------|
| **Severity** | INFO |
| **Domain** | Input Validation |
| **Location** | `packages/engine/src/lib/feature-flags/upload-admin.ts:46,98,109` |
| **Confidence** | HIGH |

**Description:**
The `json_extract(fr.rule_value, '$.tenantIds') LIKE '%' || ? || '%'` pattern is safe because D1 parameterization protects against injection. However, it's a string-match heuristic for searching JSON arrays — a tenant ID that's a substring of another ID could false-match. In practice, tenant IDs are UUIDs so collisions are astronomically unlikely.

---

## Domain Scorecard

| Domain | Rating | Findings | Notes |
|--------|--------|----------|-------|
| Authentication | PASS | 0 | All endpoints require auth before gate |
| Authorization | PARTIAL | 1 | Avatar fail-open (HAWK-001) |
| Input Validation | PASS | 1 | Tenant existence check optional (HAWK-002) |
| Data Protection | PASS | 0 | No secrets exposed |
| HTTP Security | PASS | 0 | Correct status codes, no info leakage |
| CSRF Protection | PASS | 0 | SvelteKit forms auto-protected |
| Session Security | N/A | 0 | Not in scope |
| File Uploads | PASS | 0 | Gate correctly placed before upload logic |
| Rate Limiting | PASS | 0 | Pre-existing rate limits preserved |
| Multi-Tenant | PASS | 0 | Tenant scoping correct throughout |
| Infrastructure | PASS | 0 | Proper binding checks |
| Audit Logging | PARTIAL | 1 | No admin action logging (HAWK-003) |

---

## Remediation Priority

### Immediate (fix before shipping)
- **HAWK-001**: Avatar endpoint fail-open — change to fail-closed

### Accept Risk (consistent with existing patterns)
- **HAWK-002**: No tenant existence validation — matches greenhouse pattern
- **HAWK-003**: No audit logging — matches greenhouse pattern

### No Action Needed
- **HAWK-004**: UI defaults are intentional
- **HAWK-005**: SQL pattern is safe for UUID tenant IDs

---

## Positive Observations

- **Fail-closed default**: `canUploadImages()` assumes suspended on error — correct security posture
- **Two-flag separation**: Master switch (`image_uploads`) is independent from per-tenant suspension — clean kill switch
- **Centralized gate**: Single function replaces 15+ scattered checks — reduces surface area for bugs
- **Cache invalidation**: `setUploadSuspension()` properly invalidates KV cache after changes
- **Consistent error responses**: Gate denials use standard `API_ERRORS.FEATURE_DISABLED` — no info leakage about *why* access was denied
- **Migration safety**: `INSERT OR IGNORE` prevents duplicate flag creation; soft-retire preserves `photo_gallery` data

---

*The hawk has spoken. Every path surveyed, every shadow examined.*
