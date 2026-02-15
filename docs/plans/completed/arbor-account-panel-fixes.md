# Arbor Account Panel — Three Broken Features

> **Status:** Planned
> **Filed:** 2026-02-10
> **Discovered by:** Claude investigation session
> **Affects:** All tenants using the Account page in Arbor

---

## Overview

Three features on the Arbor Account page (`/arbor/account`) are completely non-functional
in production. Each has a distinct root cause. Two require local environment/infra fixes,
one is a code bug that can be fixed in a PR.

---

## Issue 1: Payment Method — "Payment service is temporarily unavailable."

**Error code:** `GROVE-API-004` (`PAYMENT_PROVIDER_NOT_CONFIGURED`)
**Severity:** Critical — ALL billing operations are broken

### What Happens

User clicks "Manage Payment Method" → API returns 500 → error message displayed inline.

### Root Cause

`STRIPE_SECRET_KEY` is not set (or is undefined) in the Cloudflare Worker environment.

### Trace

1. `PaymentMethodCard.svelte:29` → `api.put("/api/billing", {})`
2. `api/billing/+server.ts:817` — PUT handler guards: `if (!platform?.env?.STRIPE_SECRET_KEY)`
3. Throws `PAYMENT_PROVIDER_NOT_CONFIGURED`
4. Client displays `userMessage`: "Payment service is temporarily unavailable."

### Blast Radius

This isn't just the payment method button. The same guard exists on:
- **POST** `/api/billing` (checkout) — line 402
- **PATCH** `/api/billing` (cancel/resume/change plan) — line 595
- **PUT** `/api/billing` (billing portal) — line 817

All billing operations are dead.

### Fix

Set `STRIPE_SECRET_KEY` in the Cloudflare Worker's environment secrets via the
Cloudflare Dashboard or `wrangler secret put STRIPE_SECRET_KEY`.

**Local-only fix** — requires access to Cloudflare Dashboard or wrangler with prod credentials.

---

## Issue 2: Passkeys — "Could not load passkeys. Please try refreshing the page."

**Error code:** None (UI fallback state when `passkeyError: true`)
**Severity:** High — passkey listing and registration broken

### What Happens

Page loads → passkey section shows error state immediately (deferred data fails).

### Root Cause

The page server's `fetchUserPasskeys()` function uses a different auth approach than
every other caller in the codebase, and the GroveAuth API rejects it.

### Trace

1. `+page.server.ts:144` calls `fetchUserPasskeys()` as deferred data
2. Function at line 83 does `fetch("${authBaseUrl}/api/auth/passkey/list-user-passkeys")`
   with a manually constructed `Cookie` header containing `grove_session` / `better-auth.session_token`
3. GroveAuth returns non-200 → function returns `{ passkeys: [], error: true }`
4. `+page.svelte:256` resolves the promise → `PasskeyCard` renders error state

### Auth Method Inconsistency

Every other caller uses Bearer token or the service binding. The page server is the outlier:

| Caller | Auth Method |
|--------|-------------|
| **Page server** (`+page.server.ts:83`) | `Cookie` header via raw `fetch()` — **broken** |
| API route (`/api/passkey/+server.ts:38`) | `Authorization: Bearer ${access_token}` |
| Register options (`register-options/+server.ts:42`) | Service binding `platform.env.AUTH.fetch()` |
| Heartwood client (`client.ts:923`) | `Authorization: Bearer ${accessToken}` |
| Plant (`plant/account/+page.server.ts:58`) | `Authorization: Bearer ${accessToken}` |

### Why It Fails

Two compounding problems:

1. **No service binding** — `fetchUserPasskeys` uses public internet `fetch()` instead of
   `platform.env.AUTH.fetch()` (Cloudflare service binding). The register-options route
   already demonstrates the service binding pattern works.

2. **Session cookie forwarding** — Passing `grove_session` via a manually constructed
   `Cookie` header in a Worker-to-Worker `fetch()` may not be processed the same way
   GroveAuth expects. Better Auth's session middleware may not resolve sessions from
   server-side requests the same way it resolves browser requests.

### Fix Options (pick one)

**Option A (recommended):** Use the `platform.env.AUTH` service binding like
`register-options/+server.ts` does. This is faster (no public internet round-trip)
and more reliable.

**Option B:** Fall back to Bearer token auth with `access_token` cookie, matching
what Plant and the Heartwood client do. Note: the page server comments say
"access_token (legacy JWT) is no longer used for OAuth accounts" — so this might
not work for newer sessions.

**Option C:** Debug why GroveAuth rejects the Cookie header from server-to-server
fetch. May require changes in Heartwood's session resolution.

**Code fix** — can be done in a PR. The service binding approach (Option A) is cleanest.

---

## Issue 3: Data Export — "The operation didn't complete. Please try again."

**Error code:** `GROVE-API-081` (`OPERATION_FAILED`)
**Severity:** Critical — core feature (data portability) completely broken

### What Happens

User clicks "Export Data" → API returns 500 → toast shows generic error.

### Root Cause

The export query for pages references a column (`display_order`) that **does not exist**
in the production database. The correct column is `nav_order`.

### Trace

1. `+page.svelte:147` calls `fetch("/api/export", { method: "POST", ... })`
2. Auth/CSRF/tenant verification all pass
3. `api/export/+server.ts:248-253` runs this query:
   ```sql
   SELECT id, slug, title, description, markdown_content, type, created_at, updated_at
   FROM pages WHERE tenant_id = ?
   ORDER BY display_order ASC
   ```
4. D1 throws "no such column: display_order" (standard Error, no `.status`)
5. Falls through to catch-all at line 326 → `throwGroveError(500, OPERATION_FAILED)`

### Evidence

- Migration `019_page_navigation.sql` adds **`nav_order`** (not `display_order`)
- The reference schema (`docs/developer/database/schema/multi-tenant-schema.sql`)
  documents `display_order` but it was **never migrated** — schema drift
- All other pages queries use `nav_order` correctly:
  - `+layout.server.ts:75` — `SELECT slug, title, show_in_nav, nav_order FROM pages`
  - `api/pages/[slug]/+server.ts:211-213` — updates `nav_order`
- `display_order` exists on `gallery_collections` (different table) — likely copy-paste error
- Count queries work (no column reference) → page shows "3 pages" fine

### Fix

**One-line change** in `packages/engine/src/routes/api/export/+server.ts:251`:

```diff
-         ORDER BY display_order ASC`,
+         ORDER BY nav_order ASC`,
```

Also update the reference schema to remove the phantom `display_order` from the
pages table definition to prevent future confusion.

**Code fix** — straightforward PR.

---

## Action Plan

| # | Issue | Fix Type | Where |
|---|-------|----------|-------|
| 1 | Stripe key missing | Infra/config | Cloudflare Dashboard |
| 2 | Passkey auth inconsistency | Code (service binding) | `+page.server.ts` fetchUserPasskeys |
| 3 | Export column mismatch | Code (one-line) | `api/export/+server.ts:251` |

Issues 2 and 3 can be fixed in code. Issue 1 is purely infrastructure.

---

## Related Files

```
packages/engine/src/routes/arbor/account/+page.svelte
packages/engine/src/routes/arbor/account/+page.server.ts
packages/engine/src/routes/arbor/account/PaymentMethodCard.svelte
packages/engine/src/routes/arbor/account/PasskeyCard.svelte
packages/engine/src/routes/arbor/account/DataExportCard.svelte
packages/engine/src/routes/api/billing/+server.ts
packages/engine/src/routes/api/export/+server.ts
packages/engine/src/routes/api/passkey/+server.ts
packages/engine/src/routes/api/passkey/register-options/+server.ts
packages/engine/src/lib/errors/api-errors.ts
packages/engine/src/lib/auth/session.ts
packages/engine/migrations/019_page_navigation.sql
docs/developer/database/schema/multi-tenant-schema.sql
```
