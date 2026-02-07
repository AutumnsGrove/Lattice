# Signpost: Error Code Diagnostic Guide

```
                    ╭─────────────╮
                    │  GROVE-042  │
                    ╰──────┬──────╯
                           │
                     ┌─────┴─────┐
                     │  ◈  ◈  ◈  │
                     │ what broke │
                     │ who fixes  │
                     │ what to do │
                     └─────┬─────┘
                           │
                    ═══════╧═══════

           Every error tells you where to look.
```

> *Every error tells you where to look.*

This guide covers every structured error code in the Grove ecosystem. When you see a code in logs, in a URL bar, or on a user's screen, find it here.

---

## How Error Codes Work

Every error has four parts:

| Field | What It Means |
|-------|---------------|
| `code` | The structured ID (e.g. `GROVE-API-040`) |
| `category` | Who can fix it: `user`, `admin`, or `bug` |
| `userMessage` | What the person sees (warm, safe, actionable) |
| `adminMessage` | What shows up in logs (detailed, diagnostic) |

**Categories explained:**

- **user**: They can fix it themselves. Retry, sign in, use a different input.
- **admin**: A config or permissions issue. The Wayfinder or a Pathfinder needs to check settings.
- **bug**: Something unexpected broke. Needs investigation. Check Worker logs.

**Code format:** `PREFIX-NNN` where the prefix identifies the package and the number tells you the category:

| Range | Category |
|-------|----------|
| 001-019 | Infrastructure (D1, KV, R2, service bindings) |
| 020-039 | Auth, sessions, CSRF, origin |
| 040-059 | Business logic, validation, data |
| 060-079 | Rate limiting, security |
| 080-099 | Internal errors, catch-all |

---

## GROVE-API: Engine API Routes

These appear in JSON responses from `/api/*` endpoints.

### Infrastructure (001-019)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-API-001` | DB_NOT_CONFIGURED | D1 database binding missing | `wrangler.toml` has `[[d1_databases]]` binding named `DB` |
| `GROVE-API-002` | R2_NOT_CONFIGURED | R2 bucket binding missing | `wrangler.toml` has `[[r2_buckets]]` binding named `IMAGES` |
| `GROVE-API-003` | DURABLE_OBJECTS_NOT_CONFIGURED | Durable Object bindings missing | `wrangler.toml` has `[durable_objects]` section |
| `GROVE-API-004` | PAYMENT_PROVIDER_NOT_CONFIGURED | Payment provider not set up | LemonSqueezy/Stripe env vars in Worker secrets |
| `GROVE-API-005` | AI_SERVICE_NOT_CONFIGURED | AI/OpenRouter API key missing | `OPENROUTER_API_KEY` secret set in Worker |
| `GROVE-API-006` | WEBHOOK_SECRET_NOT_CONFIGURED | Webhook secret missing | Check relevant webhook secret in Worker secrets |
| `GROVE-API-007` | KEK_NOT_CONFIGURED | Encryption key missing | `GROVE_KEK` secret for envelope encryption |
| `GROVE-API-008` | TURNSTILE_NOT_CONFIGURED | Turnstile verification unavailable | `TURNSTILE_SECRET_KEY` in Worker secrets |
| `GROVE-API-009` | GITHUB_TOKEN_NOT_CONFIGURED | GitHub API access unavailable | `GITHUB_TOKEN` secret for git contributions |
| `GROVE-API-010` | SERVICE_UNAVAILABLE | Generic service binding missing | Check all bindings in `wrangler.toml` |
| `GROVE-API-011` | UPLOAD_SERVICE_UNAVAILABLE | R2 upload not working | R2 bucket binding + any upload config |

> 💡 **Tip:** All 001-019 errors are category `bug`. They mean the Worker started but a binding isn't wired up. Run `gw bindings` to see what's configured.

### Auth & Session (020-039)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-API-020` | UNAUTHORIZED | No authenticated session | User needs to sign in. Check `grove_session` cookie. |
| `GROVE-API-021` | INVALID_ORIGIN | CSRF origin mismatch | Request `Origin` header doesn't match expected host. Likely a cross-origin issue or browser extension. |
| `GROVE-API-022` | INVALID_CSRF_TOKEN | CSRF token invalid | Token missing or stale. User should refresh the page. |
| `GROVE-API-023` | TENANT_CONTEXT_REQUIRED | `locals.tenantId` is null | Tenant resolution failed in `hooks.server.ts`. Check the `tenants` table and domain mapping. |
| `GROVE-API-024` | ADMIN_ACCESS_REQUIRED | Non-admin hit an admin endpoint | User doesn't have admin role. Check `user.role` in the session. |
| `GROVE-API-025` | SESSION_EXPIRED | Session token expired | User signs in again. If frequent, check session TTL in Heartwood config. |
| `GROVE-API-026` | SUBSCRIPTION_REQUIRED | Feature requires paid plan | Check tenant's plan in `tenants` table. Feature is gated behind subscription. |
| `GROVE-API-027` | HUMAN_VERIFICATION_FAILED | Turnstile challenge failed | Bot detection triggered. Legitimate users should retry. If persistent, check Turnstile dashboard. |

### Business Logic (040-059)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-API-040` | INVALID_REQUEST_BODY | Malformed or missing JSON body | Client sent bad JSON. Check request payload. |
| `GROVE-API-041` | MISSING_REQUIRED_FIELDS | Required fields missing | Check which fields the endpoint expects. |
| `GROVE-API-042` | VALIDATION_FAILED | Input validation failed | Format, length, or value constraint. Check the specific field. |
| `GROVE-API-043` | RESOURCE_NOT_FOUND | Item doesn't exist in DB | The slug, ID, or key doesn't match any row. May have been deleted. |
| `GROVE-API-044` | SLUG_CONFLICT | URL path already in use | A post or page with that slug already exists. Pick a different one. |
| `GROVE-API-045` | CONTENT_TOO_LARGE | Content exceeds size limit | Reduce content size. Check `MAX_CONTENT_LENGTH` in config. |
| `GROVE-API-046` | INVALID_FILE | File type or format rejected | Unsupported type, bad extension, corrupted file, or dimensions too large. |
| `GROVE-API-047` | FEATURE_DISABLED | Feature not enabled for tenant | Check `site_settings` table or curio config for the tenant. |
| `GROVE-API-048` | EXPORT_TOO_LARGE | Export exceeds limits | Too many posts, pages, or media. Contact support or export in batches. |
| `GROVE-API-049` | INVALID_STATE_TRANSITION | Action not valid in current state | E.g., trying to cancel something that isn't running. Check current resource state. |

### Rate Limiting (060-079)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-API-060` | RATE_LIMITED | Too many requests | Wait and retry. Check `RATE_LIMIT` config for the endpoint. |
| `GROVE-API-061` | USAGE_LIMIT_REACHED | Monthly/daily cap hit | Resets at month start. Check `wisp_requests` cost totals. |
| `GROVE-API-062` | UPLOAD_RESTRICTED | Upload abuse throttle | Tenant temporarily restricted. Check upload patterns in logs. |

### Internal (080-099)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-API-080` | INTERNAL_ERROR | Unhandled exception | Check Worker logs for the full stack trace. This is a bug. |
| `GROVE-API-081` | OPERATION_FAILED | DB or service op failed | A query or service call threw in a catch block. Check the `cause` in logs. |
| `GROVE-API-082` | UPSTREAM_ERROR | External service failed | GitHub API, AI provider, or payment service returned an error or timed out. |
| `GROVE-API-083` | AI_TIMEOUT | AI request timed out | OpenRouter/Workers AI took too long. May be provider-side. Retry usually works. |

---

## GROVE-ARBOR: Admin Dashboard

These appear in arbor (`/arbor/*`) pages, usually as SvelteKit error pages or form action failures.

### Infrastructure (001-019)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-ARBOR-001` | DB_NOT_AVAILABLE | D1 not reachable from arbor | Same as `GROVE-API-001`. Check `wrangler.toml` DB binding. |

### Auth & Admin Gates (020-039)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-ARBOR-020` | UNAUTHORIZED | Not signed in | Sign in first. Arbor requires authentication. |
| `GROVE-ARBOR-021` | ACCESS_DENIED | Not an admin | Only Grove administrators can access arbor. Check user role. |
| `GROVE-ARBOR-022` | TENANT_CONTEXT_REQUIRED | Tenant context missing | `locals.tenantId` is null in an arbor route that needs it. |
| `GROVE-ARBOR-023` | GREENHOUSE_REQUIRED | Greenhouse membership needed | Feature is behind Greenhouse (beta) access. Check grafts/feature flags. |

### Business Logic (040-059)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-ARBOR-040` | FIELD_REQUIRED | Form field missing | A required field wasn't filled in. Check the form. |
| `GROVE-ARBOR-041` | INVALID_INPUT | Validation failed | Input doesn't meet constraints. Check format, length, allowed values. |
| `GROVE-ARBOR-042` | RESOURCE_NOT_FOUND | Item not found | The record doesn't exist. It may have been deleted by another session. |
| `GROVE-ARBOR-043` | CONFLICT | Duplicate or state conflict | Something with that name/slug already exists, or a concurrent edit conflicted. |
| `GROVE-ARBOR-044` | CANNOT_MODIFY | Item locked or in wrong state | The resource can't be changed right now (e.g., published, resolved, archived). |

### Internal (080-099)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-ARBOR-080` | OPERATION_FAILED | Admin action failed | Check Worker logs for the cause. |
| `GROVE-ARBOR-081` | LOAD_FAILED | Page data failed to load | The `+page.server.ts` load function threw. Check D1 connectivity. |
| `GROVE-ARBOR-082` | SAVE_FAILED | Save/update failed | Database write failed. Check constraints and D1 availability. |

---

## GROVE-SITE: Public Pages

These appear on the public-facing site (blog, garden, about, contact). Users see them as error pages rendered by `+error.svelte`.

### Infrastructure (001-019)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-SITE-001` | DB_NOT_CONFIGURED | D1 not available for page load | Check `wrangler.toml` DB binding. |

### Auth & CSRF (020-039)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-SITE-020` | INVALID_ORIGIN | CSRF origin failed in hooks | Origin header mismatch. Check `hooks.server.ts` CSRF logic. |
| `GROVE-SITE-021` | INVALID_CSRF_TOKEN | CSRF token failed in hooks | Stale token. User should refresh. |

### Content (040-059)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-SITE-040` | PAGE_NOT_FOUND | Page doesn't exist | No page in D1 for that slug. May have been deleted or never existed. |
| `GROVE-SITE-041` | POST_NOT_FOUND | Blog post doesn't exist | No post in D1 for that slug. Check `posts` table. |
| `GROVE-SITE-042` | TENANT_CONTEXT_REQUIRED | Tenant context missing | Public page needs tenant ID but `locals.tenantId` is null. |
| `GROVE-SITE-043` | FEATURE_NOT_ENABLED | Feature/curio not enabled | The curio or feature isn't turned on for this tenant's plan. |
| `GROVE-SITE-044` | RESERVED_SLUG | System path requested | Slug matches a reserved route (`api`, `arbor`, `auth`, etc.). Not a real page. |
| `GROVE-SITE-045` | HOME_PAGE_NOT_FOUND | Home page missing | The home page query returned nothing. This is a data integrity issue. Check `pages` table. |

### Rate Limiting (060-079)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-SITE-060` | RATE_LIMITED | Too many page loads | Unusual traffic pattern. Check for bots or scrapers. |
| `GROVE-SITE-061` | RATE_LIMIT_UNAVAILABLE | KV binding missing | Rate limiter can't run because `CACHE_KV` isn't bound. Check `wrangler.toml`. |

### Internal (080-099)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `GROVE-SITE-080` | PAGE_LOAD_FAILED | Page load threw | The `+page.server.ts` load function failed. Check Worker logs. |
| `GROVE-SITE-081` | POST_LOAD_FAILED | Post load threw | Blog post load function failed. Check D1 and Worker logs. |
| `GROVE-SITE-082` | WORKER_NOT_FOUND | Request fell through hooks | Request didn't match any route in `hooks.server.ts`. |

---

## HW-AUTH: Heartwood Authentication

These appear in login/signup flows, usually as URL parameters on the sign-in page (`?error=...&error_code=HW-AUTH-001`).

### OAuth Provider (001-019)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `HW-AUTH-001` | ACCESS_DENIED | User cancelled sign-in | They clicked "deny" or closed the OAuth window. Normal behavior. |
| `HW-AUTH-002` | PROVIDER_ERROR | OAuth provider error | GitHub/Google returned an error. Check their status pages. |
| `HW-AUTH-003` | INVALID_SCOPE | OAuth scope rejected | The requested scope isn't permitted. Check Heartwood's client config. |
| `HW-AUTH-004` | REDIRECT_URI_MISMATCH | Redirect URI wrong | The callback URL doesn't match what's registered. Check client `redirect_uris`. |

### Sessions & Tokens (020-039)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `HW-AUTH-020` | NO_SESSION | Session cookie not set | Cookie might be blocked (Safari ITP, browser extension, wrong domain). Check cookie domain is `.grove.place`. |
| `HW-AUTH-021` | SESSION_EXPIRED | Session expired | Normal. Sign in again. If happening too fast, check session TTL config. |
| `HW-AUTH-022` | INVALID_TOKEN | Token malformed or revoked | Session was invalidated (logout elsewhere, revoke-all). Sign in again. |
| `HW-AUTH-023` | TOKEN_EXCHANGE_FAILED | Auth code exchange failed | Heartwood couldn't trade the OAuth code for tokens. Check client credentials and Heartwood logs. |
| `HW-AUTH-024` | LEGACY_SESSION_EXPIRED | Old session format | Pre-migration session. The user needs a fresh login. |

### Client Config (040-059)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `HW-AUTH-040` | UNREGISTERED_CLIENT | Client ID not found | The app's `client_id` isn't registered in Heartwood. Run `gw d1 tables` and check `oauth_clients`. |
| `HW-AUTH-041` | INVALID_CLIENT | Client auth failed | Bad `client_id` or `client_secret`. Verify in Heartwood's D1. |
| `HW-AUTH-042` | ORIGIN_NOT_ALLOWED | Request origin blocked | The `Origin` header isn't in the client's allowed origins list. Update the client registration. |

### Rate Limiting (060-079)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `HW-AUTH-060` | RATE_LIMITED | Too many auth attempts | Wait a few minutes. If legitimate, check rate limit config. |
| `HW-AUTH-061` | CSRF_MISMATCH | OAuth state mismatch | The `state` parameter doesn't match. Possible CSRF attempt, or stale browser tab. |

### Internal (080-099)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `HW-AUTH-080` | INTERNAL_ERROR | Auth server error | Check Heartwood Worker logs. |
| `HW-AUTH-099` | UNKNOWN_ERROR | Unmapped error code | An OAuth error code came in that Heartwood doesn't recognize. Check the raw `error` parameter. |

---

## PLANT: Onboarding

These appear during the Plant onboarding flow (sign-up, magic link, account setup). Usually surfaced as URL parameters on the Plant homepage.

### Infrastructure (001-019)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `PLANT-001` | DB_UNAVAILABLE | D1 binding missing | Check Plant's `wrangler.toml` for the `DB` binding. |
| `PLANT-002` | AUTH_BINDING_MISSING | Heartwood service binding missing | `platform.env.AUTH` not available. Check `services` in `wrangler.toml`. |

### Sessions & Auth (020-039)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `PLANT-020` | SESSION_FETCH_FAILED | Session verification failed | Heartwood's `/api/auth/get-session` returned non-200. Check Heartwood is running and reachable. |
| `PLANT-021` | NO_SESSION_DATA | Session response empty | Heartwood returned 200 but no session data. The session may have been revoked between the magic link click and the callback. |
| `PLANT-022` | MAGIC_LINK_ERROR | Magic link didn't work | The callback received an error parameter. Link may be expired, already used, or malformed. User should request a new one. |

### Database & Onboarding (040-059)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `PLANT-040` | ONBOARDING_QUERY_FAILED | Onboarding lookup failed | `user_onboarding` table query failed. Table might not exist (run migrations) or query error. |
| `PLANT-041` | ONBOARDING_INSERT_FAILED | Account creation failed | INSERT into `user_onboarding` failed. Possible constraint violation or schema mismatch. |
| `PLANT-042` | ONBOARDING_UPDATE_FAILED | Account update failed | UPDATE on `user_onboarding` failed. Check the row exists and columns match. |
| `PLANT-043` | TENANT_QUERY_FAILED | Tenant lookup failed | SELECT from `tenants` table failed. Check D1 connectivity and table schema. |
| `PLANT-044` | COOKIE_ERROR | Cookie setting failed | `onboarding_id` or `access_token` cookie couldn't be set. Check cookie domain and security settings. |

### Internal (080-099)

| Code | Key | What Broke | What to Check |
|------|-----|------------|---------------|
| `PLANT-080` | INTERNAL_ERROR | Unhandled Plant error | Check Plant Worker logs. |

---

## Quick Diagnosis Workflow

When you see an error code:

1. **Find it in the tables above.** The prefix tells you the package, the number tells you the category.

2. **Check the category.**
   - `user` = They can fix it. Nothing to investigate unless it's happening to everyone.
   - `admin` = Check the config listed in "What to Check."
   - `bug` = Go to Worker logs. Search for the error code.

3. **Check Worker logs.** Every error is logged with `logGroveError()`, which outputs:
   ```
   [API] GROVE-API-040: Request body is missing, malformed, or not valid JSON. {"code":"GROVE-API-040","category":"user"}
   ```
   The admin message tells you exactly what failed. The `cause` field (if present) has the underlying error.

4. **Common patterns:**
   - All `001-019` codes = a binding is missing. Run `gw bindings` or check `wrangler.toml`.
   - All `020-039` codes = auth or session issue. Check cookies, CSRF config, tenant resolution.
   - All `080-099` codes = something unexpected. Worker logs are your only friend.

---

## Where Error Codes Appear

| Surface | Format | Example |
|---------|--------|---------|
| JSON API response | `{ error: "...", error_code: "GROVE-API-040" }` | Fetch calls from the editor, dashboard |
| URL parameters | `?error=...&error_code=HW-AUTH-001` | Login redirects, Plant onboarding |
| SvelteKit error page | `+error.svelte` renders the code in monospace | 404s, 500s on public pages |
| Worker logs | `[API] GROVE-API-040: admin message` | Cloudflare dashboard, `wrangler tail` |

---

## Adding New Error Codes

When you need a new error:

1. Pick the right catalog file:
   - `packages/engine/src/lib/errors/api-errors.ts` for API routes
   - `packages/engine/src/lib/errors/arbor-errors.ts` for admin pages
   - `packages/engine/src/lib/errors/site-errors.ts` for public pages
   - `packages/engine/src/lib/heartwood/errors.ts` for auth
   - `packages/plant/src/lib/errors.ts` for onboarding

2. Choose a number in the right range (001-019, 020-039, etc.). Don't reuse numbers.

3. Add the entry with all four fields: `code`, `category`, `userMessage`, `adminMessage`.

4. Rebuild the engine: `cd packages/engine && pnpm run package`

5. The integrity test suite (`integrity.test.ts`) auto-validates: no duplicate codes, all fields present, correct format.

6. Update this guide.

---

## Source Files

| Catalog | File |
|---------|------|
| API errors | `packages/engine/src/lib/errors/api-errors.ts` |
| Arbor errors | `packages/engine/src/lib/errors/arbor-errors.ts` |
| Site errors | `packages/engine/src/lib/errors/site-errors.ts` |
| Heartwood auth | `packages/engine/src/lib/heartwood/errors.ts` |
| Plant onboarding | `packages/plant/src/lib/errors.ts` |
| Shared types | `packages/engine/src/lib/errors/types.ts` |
| Shared helpers | `packages/engine/src/lib/errors/helpers.ts` |
| Integrity tests | `packages/engine/src/lib/errors/integrity.test.ts` |

*The signpost stands at every crossroad. Read the code. Find the path.*
