---
title: Signpost — Error Code Diagnostic Guide
description: Every Grove error code, what it means, and how to fix it
category: developer
icon: signpost
lastUpdated: "2026-02-07"
aliases: [error-codes, signpost, grove-errors]
tags:
  - errors
  - diagnostics
  - debugging
  - infrastructure
---

```
                    ╭─────────────╮
                    │  GROVE-042  │
                    ╰──────┬──────╯
                           │
                     ┌─────┴─────┐
                     │  ◈  ◈  ◈  │
                     │ what broke │
                     │ who can    │
                     │ fix it     │
                     │ what to do │
                     └─────┬─────┘
                           │
                      ╱╱╱╱╱│╲╲╲╲╲
                     ╱  ╱  │  ╲  ╲
                    ·  ·   │   ·  ·
                           │
                    ═══════╧═══════

           Every error tells you where to look.
```

> _Every error tells you where to look._

---

# Signpost: Error Code Diagnostic Guide

When something breaks, the error code tells you three things: which package, which category, and where to start looking. No more grepping for "Something went wrong."

## How Error Codes Work

Every code follows the pattern: `PREFIX-CATEGORY-NUMBER`

```
  GROVE-API-040
  ─────┬── ─┬─
       │    │
       │    └── 040 = business logic / validation
       └─────── API routes in the engine package
```

### Prefixes

| Prefix        | Package             | Where It Runs                 |
| ------------- | ------------------- | ----------------------------- |
| `GROVE-API`   | Engine API routes   | `/api/*` endpoints            |
| `GROVE-ARBOR` | Engine admin pages  | `/arbor/*` dashboard          |
| `GROVE-SITE`  | Engine public pages | Blog, garden, about, contact  |
| `HW-AUTH`     | Heartwood auth      | OAuth, sessions, tokens       |
| `PLANT`       | Plant onboarding    | First-time setup, magic links |

### Number Ranges

The same ranges apply across all packages:

| Range   | Category        | Who Fixes It                                  |
| ------- | --------------- | --------------------------------------------- |
| 001–019 | Infrastructure  | You (check bindings, secrets, config)         |
| 020–039 | Auth & sessions | User retries, or you check auth config        |
| 040–059 | Business logic  | User fixes their input, or you check logic    |
| 060–079 | Rate limiting   | User waits, or you adjust limits              |
| 080–099 | Internal errors | You (check logs, investigate the catch block) |

### Error Categories

Each error has a `category` field that tells you who can fix it:

- **`user`** — The person using Grove can fix it themselves. Retry, fix input, sign in again.
- **`admin`** — You (Wayfinder) or a Pathfinder need to fix a config, binding, or setting.
- **`bug`** — Something unexpected broke. Check logs, investigate, fix the code.

---

## Quick Lookup

See an error code? Find it here.

### GROVE-API (Engine API Routes)

#### Infrastructure (001–019)

| Code            | Key                             | What Broke                      | Fix                                            |
| --------------- | ------------------------------- | ------------------------------- | ---------------------------------------------- |
| `GROVE-API-001` | DB_NOT_CONFIGURED               | D1 database binding missing     | Check `platform.env.DB` in wrangler.toml       |
| `GROVE-API-002` | R2_NOT_CONFIGURED               | R2 bucket binding missing       | Check `platform.env.IMAGES` in wrangler.toml   |
| `GROVE-API-003` | DURABLE_OBJECTS_NOT_CONFIGURED  | DO bindings missing             | Check DO config in wrangler.toml               |
| `GROVE-API-004` | PAYMENT_PROVIDER_NOT_CONFIGURED | LemonSqueezy/Stripe not set up  | Check payment provider secrets                 |
| `GROVE-API-005` | AI_SERVICE_NOT_CONFIGURED       | OpenRouter API key missing      | Set `OPENROUTER_API_KEY` secret                |
| `GROVE-API-006` | WEBHOOK_SECRET_NOT_CONFIGURED   | Webhook secret missing          | Set the webhook signing secret                 |
| `GROVE-API-007` | KEK_NOT_CONFIGURED              | Encryption key missing          | Set `GROVE_KEK` secret for envelope encryption |
| `GROVE-API-008` | TURNSTILE_NOT_CONFIGURED        | Turnstile secret missing        | Set Turnstile secret key                       |
| `GROVE-API-009` | GITHUB_TOKEN_NOT_CONFIGURED     | GitHub token missing            | Set `GITHUB_TOKEN` secret                      |
| `GROVE-API-010` | SERVICE_UNAVAILABLE             | Generic service binding missing | Check wrangler.toml for the relevant binding   |
| `GROVE-API-011` | UPLOAD_SERVICE_UNAVAILABLE      | R2 upload service down          | Check R2 bucket binding and permissions        |

**Diagnosis steps for infrastructure errors:**

1. Run `gw bindings` to see all configured bindings
2. Compare against what the route expects (check the route's `platform.env.*` access)
3. If local dev, make sure `.dev.vars` has the required secrets
4. If production, check `wrangler secret list` for the worker

#### Auth & Sessions (020–039)

| Code            | Key                       | What Broke                   | Fix                                                                |
| --------------- | ------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `GROVE-API-020` | UNAUTHORIZED              | No authenticated user        | User needs to sign in. Check `locals.user` in hooks                |
| `GROVE-API-021` | INVALID_ORIGIN            | CSRF origin mismatch         | Origin header doesn't match host. Check proxy config               |
| `GROVE-API-022` | INVALID_CSRF_TOKEN        | CSRF token bad or missing    | Client needs to include CSRF token. Check `apiRequest()` usage     |
| `GROVE-API-023` | TENANT_CONTEXT_REQUIRED   | Tenant ID missing            | `locals.tenantId` is null. Check hooks.server.ts tenant resolution |
| `GROVE-API-024` | ADMIN_ACCESS_REQUIRED     | Non-admin hit admin endpoint | User lacks admin role                                              |
| `GROVE-API-025` | SESSION_EXPIRED           | Session token expired        | User signs in again. If frequent, check session TTL config         |
| `GROVE-API-026` | SUBSCRIPTION_REQUIRED     | No active subscription       | User needs to subscribe. Check billing integration                 |
| `GROVE-API-027` | HUMAN_VERIFICATION_FAILED | Turnstile challenge failed   | User retries. If persistent, check Turnstile site key              |

**Diagnosis steps for auth errors:**

1. Check browser cookies: `grove_session`, `access_token` should be present
2. Check the `Cookie` header in the network tab
3. For CSRF: verify the client uses `apiRequest()` (not bare `fetch()`)
4. For tenant context: check that `hooks.server.ts` resolves the tenant from the hostname

#### Business Logic (040–059)

| Code            | Key                      | What Broke                        | Fix                                         |
| --------------- | ------------------------ | --------------------------------- | ------------------------------------------- |
| `GROVE-API-040` | INVALID_REQUEST_BODY     | Bad or missing JSON body          | Check the request payload format            |
| `GROVE-API-041` | MISSING_REQUIRED_FIELDS  | Required fields not sent          | Check which fields the endpoint expects     |
| `GROVE-API-042` | VALIDATION_FAILED        | Input didn't pass validation      | Check format, length, or value constraints  |
| `GROVE-API-043` | RESOURCE_NOT_FOUND       | Item doesn't exist in DB          | Check the ID/slug being requested           |
| `GROVE-API-044` | SLUG_CONFLICT            | Slug already taken                | Choose a different URL path                 |
| `GROVE-API-045` | CONTENT_TOO_LARGE        | Payload exceeds size limit        | Reduce content size                         |
| `GROVE-API-046` | INVALID_FILE             | Bad file type or corrupt file     | Check file extension, MIME type, dimensions |
| `GROVE-API-047` | FEATURE_DISABLED         | Feature off for this tenant       | Enable the feature in site settings         |
| `GROVE-API-048` | EXPORT_TOO_LARGE         | Export exceeds limits             | Contact support for large exports           |
| `GROVE-API-049` | INVALID_STATE_TRANSITION | Action not valid in current state | Check item status before operating on it    |

#### Rate Limiting (060–079)

| Code            | Key                 | What Broke            | Fix                                         |
| --------------- | ------------------- | --------------------- | ------------------------------------------- |
| `GROVE-API-060` | RATE_LIMITED        | Too many requests     | Wait and retry. Check KV rate limit config  |
| `GROVE-API-061` | USAGE_LIMIT_REACHED | Monthly/daily cap hit | Resets at month start. Adjust cap if needed |
| `GROVE-API-062` | UPLOAD_RESTRICTED   | Upload abuse detected | Review tenant's upload patterns             |

#### Internal (080–099)

| Code            | Key              | What Broke              | Fix                                           |
| --------------- | ---------------- | ----------------------- | --------------------------------------------- |
| `GROVE-API-080` | INTERNAL_ERROR   | Unhandled exception     | Check Worker logs for the stack trace         |
| `GROVE-API-081` | OPERATION_FAILED | DB/service op failed    | Check D1 logs, verify table schema            |
| `GROVE-API-082` | UPSTREAM_ERROR   | External service failed | Check GitHub/AI/payment provider status       |
| `GROVE-API-083` | AI_TIMEOUT       | AI request timed out    | Retry. If persistent, check OpenRouter status |

**Diagnosis steps for internal errors:**

1. Check Worker real-time logs: `wrangler tail`
2. Look for the `[API] GROVE-API-0XX:` prefix in console.error output
3. The structured JSON after the prefix contains `cause`, `path`, and other context
4. For upstream errors, check the third-party service's status page

---

### GROVE-ARBOR (Admin Dashboard)

#### Infrastructure (001–019)

| Code              | Key              | What Broke                      | Fix                             |
| ----------------- | ---------------- | ------------------------------- | ------------------------------- |
| `GROVE-ARBOR-001` | DB_NOT_AVAILABLE | D1 not available in admin route | Check `platform.env.DB` binding |

#### Auth & Admin Gates (020–039)

| Code              | Key                     | What Broke               | Fix                                           |
| ----------------- | ----------------------- | ------------------------ | --------------------------------------------- |
| `GROVE-ARBOR-020` | UNAUTHORIZED            | Not signed in            | Sign in first                                 |
| `GROVE-ARBOR-021` | ACCESS_DENIED           | Not an admin             | Only grove administrators can access arbor    |
| `GROVE-ARBOR-022` | TENANT_CONTEXT_REQUIRED | Tenant context missing   | Check hooks.server.ts tenant resolution       |
| `GROVE-ARBOR-023` | GREENHOUSE_REQUIRED     | No Greenhouse membership | User needs Greenhouse for beta/graft features |

#### Business Logic (040–059)

| Code              | Key                | What Broke                   | Fix                                           |
| ----------------- | ------------------ | ---------------------------- | --------------------------------------------- |
| `GROVE-ARBOR-040` | FIELD_REQUIRED     | Missing form field           | Fill in the required field                    |
| `GROVE-ARBOR-041` | INVALID_INPUT      | Input validation failed      | Check the input format                        |
| `GROVE-ARBOR-042` | RESOURCE_NOT_FOUND | Admin item not found         | Verify the item ID exists                     |
| `GROVE-ARBOR-043` | CONFLICT           | Duplicate or state conflict  | Check for existing items with same identifier |
| `GROVE-ARBOR-044` | CANNOT_MODIFY      | Item in non-modifiable state | Check item status (resolved incidents, etc.)  |

#### Internal (080–099)

| Code              | Key              | What Broke               | Fix                                            |
| ----------------- | ---------------- | ------------------------ | ---------------------------------------------- |
| `GROVE-ARBOR-080` | OPERATION_FAILED | Admin operation failed   | Check Worker logs                              |
| `GROVE-ARBOR-081` | LOAD_FAILED      | Page data failed to load | Refresh. Check D1 connectivity                 |
| `GROVE-ARBOR-082` | SAVE_FAILED      | Save/update failed       | Retry. Check D1 logs for constraint violations |

---

### GROVE-SITE (Public Pages)

#### Infrastructure (001–019)

| Code             | Key               | What Broke                        | Fix                             |
| ---------------- | ----------------- | --------------------------------- | ------------------------------- |
| `GROVE-SITE-001` | DB_NOT_CONFIGURED | D1 not available for public pages | Check `platform.env.DB` binding |

#### Auth & CSRF (020–039)

| Code             | Key                | What Broke               | Fix                                   |
| ---------------- | ------------------ | ------------------------ | ------------------------------------- |
| `GROVE-SITE-020` | INVALID_ORIGIN     | Origin validation failed | Check proxy/CDN config, CORS settings |
| `GROVE-SITE-021` | INVALID_CSRF_TOKEN | CSRF token mismatch      | Refresh the page and try again        |

#### Content & Pages (040–059)

| Code             | Key                     | What Broke              | Fix                                              |
| ---------------- | ----------------------- | ----------------------- | ------------------------------------------------ |
| `GROVE-SITE-040` | PAGE_NOT_FOUND          | Page doesn't exist      | Check the slug in the database                   |
| `GROVE-SITE-041` | POST_NOT_FOUND          | Blog post doesn't exist | Check the post slug, verify it's published       |
| `GROVE-SITE-042` | TENANT_CONTEXT_REQUIRED | Tenant context missing  | Check hostname → tenant resolution               |
| `GROVE-SITE-043` | FEATURE_NOT_ENABLED     | Curio/feature disabled  | Enable the feature in arbor settings             |
| `GROVE-SITE-044` | RESERVED_SLUG           | Slug is a system path   | Visitor hit a reserved URL (arbor, api, etc.)    |
| `GROVE-SITE-045` | HOME_PAGE_NOT_FOUND     | Home page query failed  | Check that at least one page exists for the site |

#### Rate Limiting (060–079)

| Code             | Key                    | What Broke           | Fix                                         |
| ---------------- | ---------------------- | -------------------- | ------------------------------------------- |
| `GROVE-SITE-060` | RATE_LIMITED           | Too many page loads  | Wait. Possibly a bot. Check access patterns |
| `GROVE-SITE-061` | RATE_LIMIT_UNAVAILABLE | KV rate limiter down | Check `CACHE_KV` binding                    |

#### Internal (080–099)

| Code             | Key              | What Broke                 | Fix                                   |
| ---------------- | ---------------- | -------------------------- | ------------------------------------- |
| `GROVE-SITE-080` | PAGE_LOAD_FAILED | Page load function crashed | Check Worker logs for the catch block |
| `GROVE-SITE-081` | POST_LOAD_FAILED | Post load function crashed | Check Worker logs, verify D1 schema   |
| `GROVE-SITE-082` | WORKER_NOT_FOUND | Request fell through hooks | Check hooks.server.ts routing logic   |

---

### HW-AUTH (Heartwood Authentication)

#### OAuth Provider (001–019)

| Code          | Key                   | What Broke                  | Fix                                      |
| ------------- | --------------------- | --------------------------- | ---------------------------------------- |
| `HW-AUTH-001` | ACCESS_DENIED         | User cancelled OAuth        | User retries when ready                  |
| `HW-AUTH-002` | PROVIDER_ERROR        | OAuth provider error        | Retry. Check provider status page        |
| `HW-AUTH-003` | INVALID_SCOPE         | Bad OAuth scope config      | Check OAuth client scope settings        |
| `HW-AUTH-004` | REDIRECT_URI_MISMATCH | Redirect URI not registered | Register the URI with the OAuth provider |

#### Sessions & Tokens (020–039)

| Code          | Key                    | What Broke                 | Fix                                                           |
| ------------- | ---------------------- | -------------------------- | ------------------------------------------------------------- |
| `HW-AUTH-020` | NO_SESSION             | Session cookie not set     | Check cookie domain (`.grove.place`), browser cookie settings |
| `HW-AUTH-021` | SESSION_EXPIRED        | Session expired            | Sign in again                                                 |
| `HW-AUTH-022` | INVALID_TOKEN          | Token malformed or revoked | Sign in again. If persistent, check token signing config      |
| `HW-AUTH-023` | TOKEN_EXCHANGE_FAILED  | Auth code exchange failed  | Check client credentials, OAuth provider config               |
| `HW-AUTH-024` | LEGACY_SESSION_EXPIRED | Old session format         | Sign in fresh. Legacy migration deadline passed               |

#### Client Configuration (040–059)

| Code          | Key                 | What Broke               | Fix                                           |
| ------------- | ------------------- | ------------------------ | --------------------------------------------- |
| `HW-AUTH-040` | UNREGISTERED_CLIENT | Client ID not registered | Register the client in GroveAuth              |
| `HW-AUTH-041` | INVALID_CLIENT      | Client auth failed       | Check client_id and secret                    |
| `HW-AUTH-042` | ORIGIN_NOT_ALLOWED  | Origin not in allowlist  | Add origin to allowed_origins for this client |

#### Security (060–079)

| Code          | Key           | What Broke             | Fix                                       |
| ------------- | ------------- | ---------------------- | ----------------------------------------- |
| `HW-AUTH-060` | RATE_LIMITED  | Too many auth attempts | Wait a few minutes                        |
| `HW-AUTH-061` | CSRF_MISMATCH | OAuth state mismatch   | Retry sign-in. Possible CSRF or stale tab |

#### Internal (080–099)

| Code          | Key            | What Broke           | Fix                                     |
| ------------- | -------------- | -------------------- | --------------------------------------- |
| `HW-AUTH-080` | INTERNAL_ERROR | Unhandled auth error | Check Heartwood Worker logs             |
| `HW-AUTH-099` | UNKNOWN_ERROR  | Unknown OAuth error  | Check the raw error from the OAuth flow |

---

### PLANT (Onboarding)

#### Infrastructure (001–019)

| Code        | Key                  | What Broke                   | Fix                                            |
| ----------- | -------------------- | ---------------------------- | ---------------------------------------------- |
| `PLANT-001` | DB_UNAVAILABLE       | D1 not available             | Check Plant worker's `platform.env.DB` binding |
| `PLANT-002` | AUTH_BINDING_MISSING | AUTH service binding missing | Check `platform.env.AUTH` in wrangler.toml     |

#### Sessions & Auth (020–039)

| Code        | Key                  | What Broke                   | Fix                                                      |
| ----------- | -------------------- | ---------------------------- | -------------------------------------------------------- |
| `PLANT-020` | SESSION_FETCH_FAILED | get-session returned non-200 | Check Heartwood auth service, network between workers    |
| `PLANT-021` | NO_SESSION_DATA      | get-session returned empty   | Session may have expired between link click and callback |
| `PLANT-022` | MAGIC_LINK_ERROR     | Magic link callback errored  | Check Heartwood logs. Maps to an `HW-AUTH-*` error       |

#### Database & Onboarding (040–059)

| Code        | Key                      | What Broke                    | Fix                                             |
| ----------- | ------------------------ | ----------------------------- | ----------------------------------------------- |
| `PLANT-040` | ONBOARDING_QUERY_FAILED  | SELECT from onboarding failed | Check D1, verify `user_onboarding` table exists |
| `PLANT-041` | ONBOARDING_INSERT_FAILED | INSERT into onboarding failed | Check constraints, column names                 |
| `PLANT-042` | ONBOARDING_UPDATE_FAILED | UPDATE onboarding failed      | Check row exists, column types                  |
| `PLANT-043` | TENANT_QUERY_FAILED      | SELECT from tenants failed    | Check D1, verify `tenants` table                |
| `PLANT-044` | COOKIE_ERROR             | Cookie set failed             | Check cookie domain config                      |

#### Internal (080–099)

| Code        | Key            | What Broke            | Fix                     |
| ----------- | -------------- | --------------------- | ----------------------- |
| `PLANT-080` | INTERNAL_ERROR | Unhandled Plant error | Check Plant Worker logs |

---

## How Errors Surface

Errors reach you through three channels depending on where they happen:

### JSON API Responses

API routes (`/api/*`) return structured JSON:

```json
{
	"error": "Please sign in to continue.",
	"error_code": "GROVE-API-020"
}
```

The `error` field is safe to show to visitors. The `error_code` is what you search for in this guide.

### SvelteKit Error Pages

Page routes (blog, garden, arbor) throw through SvelteKit's `error()` helper. The `+error.svelte` page renders the error code in monospace when present:

```
Something went wrong loading this page.

GROVE-SITE-080
```

The code appears below the user message. Copy it and search this doc.

### Redirect Parameters

Auth flows (login, OAuth callbacks) redirect with error params:

```
/login?error=Your+session+has+expired&error_code=HW-AUTH-021
```

The landing page, Plant, and engine all parse `error` and `error_code` from the URL to display in an error notice.

### Structured Logs

Every error logged with `logGroveError()` produces structured console output:

```
[API] GROVE-API-001: D1 database binding (platform.env.DB) is not available.
{"code":"GROVE-API-001","category":"bug","path":"/api/posts"}
```

The bracketed prefix tells you the package. The JSON has the code, category, and any context the handler included (path, userId, cause message).

---

## Debugging Workflow

When you see an error code:

1. **Find it in this guide.** The code tells you the package, the category, and the fix.

2. **Check the category.**
   - `user` — The person hit a normal guard (expired session, bad input). Usually fine.
   - `admin` — Something you configured is wrong (OAuth redirect URI, missing binding).
   - `bug` — Something unexpected broke. Time to dig into logs.

3. **For `bug` category errors:**
   - Open Worker real-time logs: `wrangler tail <worker-name>`
   - Search for the error code prefix: `[API] GROVE-API-080:`
   - The `cause` field in the JSON tells you what the original exception was
   - Cross-reference with D1 analytics if it's a database error

4. **For `admin` category errors:**
   - Run `gw bindings` to check all service bindings
   - Run `gw d1 tables` to verify database tables exist
   - Check `.dev.vars` (local) or `wrangler secret list` (production) for secrets

5. **For `user` category errors:**
   - Usually no action needed. The user message tells them what to do.
   - If a user reports one repeatedly, check for a deeper issue (cookie blocking, proxy misconfiguration).

---

## Adding New Error Codes

When you add a new error path to any Grove package:

1. **Pick the right catalog.** API route? Use `API_ERRORS`. Admin page? `ARBOR_ERRORS`. Public page? `SITE_ERRORS`.

2. **Pick the right range.** Infrastructure (001–019), auth (020–039), logic (040–059), rate limiting (060–079), internal (080–099).

3. **Choose the next available number** within that range. Check the catalog file for gaps.

4. **Add the entry:**

```typescript
MY_NEW_ERROR: {
  code: "GROVE-API-050",
  category: "user" as const,
  userMessage: "Warm, clear message the visitor sees.",
  adminMessage: "Detailed technical message for logs.",
},
```

5. **Use it in the route:**

```typescript
// For JSON API routes:
return json(
	{
		error: API_ERRORS.MY_NEW_ERROR.userMessage,
		error_code: API_ERRORS.MY_NEW_ERROR.code,
	},
	{ status: 400 },
);

// For page routes:
throwGroveError(404, SITE_ERRORS.PAGE_NOT_FOUND, "Site", { path: slug });
```

6. **Run the integrity tests** to verify the entry is valid:

```bash
cd packages/engine && npx vitest run src/lib/errors/integrity.test.ts
```

The tests auto-validate format, uniqueness, category values, and message content for every entry.

7. **Update this guide** with the new code.

---

## Architecture Reference

### File Locations

```
libs/engine/src/lib/errors/
  types.ts          GroveErrorDef, ErrorCategory
  helpers.ts        logGroveError, buildErrorUrl, buildErrorJson, throwGroveError
  api-errors.ts     GROVE-API-* catalog
  arbor-errors.ts   GROVE-ARBOR-* catalog
  site-errors.ts    GROVE-SITE-* catalog
  index.ts          Barrel export (all of the above)
  integrity.test.ts 489 auto-generated tests

libs/engine/src/lib/heartwood/errors.ts
  HW-AUTH-* catalog (AuthErrorDef = GroveErrorDef)

apps/plant/src/lib/errors.ts
  PLANT-* catalog (PlantErrorDef = GroveErrorDef)
```

### Import Paths

```typescript
// From engine (SvelteKit routes)
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

// From other packages (via engine export)
import { type GroveErrorDef, logGroveError } from "@autumnsgrove/lattice/errors";

// Heartwood (local)
import { AUTH_ERRORS, logAuthError } from "../errors.js";

// Plant (local)
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
```

### The Type

```typescript
type ErrorCategory = "user" | "admin" | "bug";

interface GroveErrorDef {
	code: string; // "GROVE-API-040"
	category: ErrorCategory;
	userMessage: string; // Warm, safe for display
	adminMessage: string; // Detailed, for logs
}
```

---

_The signpost stands at every fork. Read the code, follow the path._
