---
title: "Passkey Safari — Tracking the Ghost Keys"
status: active
category: safari
---

# Passkey Safari — Tracking the Ghost Keys

> Passkeys should be the sleek, modern predators of auth — fast, secure, passwordless.
> In Grove, they're ghosts. Time to make them real.
>
> **Aesthetic principle**: One ceremony, one origin, one source of truth.
> **Scope**: Full end-to-end trace — UI, API routes, proxy, Heartwood, WebAuthn, cookies, D1.

---

## Ecosystem Overview

**~45 files** across 5 packages touch passkeys: heartwood, engine, login, plant, e2e tests.

### Packages by role

**Backend (source of truth)**: heartwood — Better Auth + passkey plugin, D1 `ba_passkey` table
**Auth Hub (same-origin ceremonies)**: login — proxy to Heartwood, same-origin UI
**Tenant App (admin panel)**: engine — Arbor Account passkey management, Login Graft
**Onboarding**: plant — redirects to login.grove.place (correctly!)
**Tests**: heartwood/e2e — Playwright tests with CDP virtual authenticator

---

## The Root Cause (Read This First)

The system has **two parallel passkey implementations** fighting each other:

### Implementation A: Better Auth Client (Login Hub)

- Uses `authClient.passkey.addPasskey()` / `authClient.signIn.passkey()`
- Better Auth handles the full WebAuthn ceremony internally
- Runs on `login.grove.place` — **correct origin** for `PASSKEY_ORIGIN`
- Session cookies are first-party (same-origin)
- Proxied to Heartwood via service binding

### Implementation B: Custom Engine Routes (Arbor Account + Login Graft)

- Manually reimplements the WebAuthn ceremony with raw `navigator.credentials.create/get()`
- Custom proxy routes (`/api/passkey/*`) that forward to Heartwood endpoints
- Runs on `*.grove.place` subdomains — **WRONG origin** for `PASSKEY_ORIGIN`
- Sends `grove_session` cookie which Better Auth doesn't recognize
- Mix of service binding and bare `fetch()` calls

**Implementation A is architecturally correct. Implementation B is fundamentally broken.**

Plant already does the right thing: it redirects `/auth/setup-passkey` to `https://login.grove.place/passkey`.

---

## Bug Inventory

### BUG 1: WebAuthn Origin Mismatch (CRITICAL — Blocks ALL Engine Passkey Operations)

**Files**:

- `libs/engine/src/routes/arbor/account/passkey-utils.ts:110` (registration)
- `libs/engine/src/lib/grafts/login/passkey-authenticate.ts:220` (authentication)

**What happens**:
When the WebAuthn ceremony runs on `autumn.grove.place`, the browser embeds `origin: "https://autumn.grove.place"` into `clientDataJSON`. Heartwood validates this against:

```
PASSKEY_ORIGIN = "https://login.grove.place"   (wrangler.toml line 19)
```

Origin mismatch → **Heartwood rejects the credential**. Every time. On every subdomain.

**Why this exists**: WebAuthn's origin check is a security feature — it prevents phishing by ensuring the credential was created on the expected domain. You can't bypass it; you have to run the ceremony on the allowed origin.

**Impact**: Passkey registration from Arbor Account always fails. Passkey sign-in from Login Graft always fails. Only `login.grove.place` has the correct origin.

**Fix**: Don't run WebAuthn ceremonies on engine subdomains. Redirect to `login.grove.place` (like Plant does).

---

### BUG 2: Session Cookie Mismatch in Engine Registration Routes (CRITICAL)

**Files**:

- `libs/engine/src/routes/api/passkey/register-options/+server.ts:38-41`
- `libs/engine/src/routes/api/passkey/verify-registration/+server.ts:62-70`

**What happens**:
The engine sends `Cookie: grove_session=${groveSession}` to Heartwood. But Better Auth identifies users via `better-auth.session_token`, not `grove_session`. `grove_session` is a custom SessionDO token that Better Auth has no knowledge of.

```typescript
// Engine sends this:
Cookie: grove_session=abc123

// Better Auth looks for this:
Cookie: better-auth.session_token=xyz789
```

Result: Better Auth returns 401 "Unauthorized" or "User not found" because it can't identify who's registering.

**Contrast**: The `fetchUserPasskeys()` function in `+page.server.ts:71-78` correctly sends BOTH cookies. But the registration routes don't.

**Fix**: Forward `better-auth.session_token` in the Cookie header alongside `grove_session`. But this is moot if we fix BUG 1 by redirecting to login.grove.place.

---

### BUG 3: Authentication Routes Use Bare `fetch()` (HIGH)

**Files**:

- `libs/engine/src/routes/api/passkey/authenticate/options/+server.ts:79`
- `libs/engine/src/routes/api/passkey/authenticate/verify/+server.ts:124`

**What happens**:
These routes use `fetch()` instead of `platform.env.AUTH.fetch()` (service binding). The register routes correctly use the service binding for the `grove_session` path, but the authenticate routes don't — they go over the public internet.

```typescript
// Registration route (correct):
response = await platform.env.AUTH.fetch(...);  // service binding

// Authentication route (wrong):
const response = await fetch(...);  // public internet
```

The bare `fetch()` targets `${authBaseUrl}/api/auth/passkey/generate-authentication-options` where `authBaseUrl` comes from `platform?.env?.GROVEAUTH_URL || AUTH_HUB_URL`.

**Compounded by**: BUG 4 (wrong URL).

---

### BUG 4: Engine `GROVEAUTH_URL` May Point to Wrong Domain (HIGH)

**Files**:

- `libs/engine/wrangler.toml:140` → `GROVEAUTH_URL = "https://auth.grove.place"`
- `services/heartwood/wrangler.toml:43` → Heartwood's domain is `auth-api.grove.place`
- `libs/engine/src/lib/config/auth.ts:15` → `AUTH_HUB_URL = "https://login.grove.place"`

**What happens**:
When bare `fetch()` is used (BUG 3), the URL is `https://auth.grove.place/api/auth/passkey/...`.
Heartwood's actual custom domain is `auth-api.grove.place`. If `auth.grove.place` doesn't resolve to Heartwood (different domain!), all bare fetch calls fail with DNS/connection errors.

Note: This doesn't affect service binding calls (hostname is cosmetic for `platform.env.AUTH.fetch()`). But any code path using bare `fetch()` with `GROVEAUTH_URL` is affected.

The `fetchUserPasskeys()` in `+page.server.ts:80` also uses bare `fetch()` with this URL — so the passkey LIST on the account page may also be failing.

---

### BUG 5: Engine Verify Route Expects Non-Standard Response Format (HIGH)

**File**: `libs/engine/src/routes/api/passkey/authenticate/verify/+server.ts:156-163`

**What happens**:
The route expects this from Heartwood:

```json
{
	"verified": true,
	"accessToken": "jwt...",
	"refreshToken": "...",
	"user": { "id": "...", "email": "..." }
}
```

But Better Auth's passkey authentication returns a **session response** with Set-Cookie headers, not a JSON body with JWT tokens. Better Auth creates a session, sets `better-auth.session_token` via cookie, and returns session metadata — NOT access/refresh tokens.

```typescript
// Engine expects:
if (!result.verified || !result.accessToken) { ... fail ... }

// Better Auth actually returns:
// Headers: Set-Cookie: better-auth.session_token=...
// Body: { session: {...}, user: {...} }  (maybe)
```

The engine then tries to set its own `access_token` and `refresh_token` cookies from a response that doesn't contain them → undefined cookies → broken session.

---

### BUG 6: `GET /api/passkey` Only Accepts Legacy JWT (MEDIUM)

**File**: `libs/engine/src/routes/api/passkey/+server.ts:20-22`

**What happens**:

```typescript
const accessToken = cookies.get("access_token");
if (!accessToken) {
	throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
}
```

Only checks `access_token` (legacy JWT). Users who signed in via Better Auth (OAuth, magic link, passkey) get `better-auth.session_token`, not `access_token`. This route rejects all modern sessions.

**Current impact**: Low — the account page loads passkeys via server-side deferred data (`fetchUserPasskeys()`), not this client API. But if any client code calls `GET /api/passkey`, it fails.

---

### BUG 7: Possible HTTP Method Mismatch (MEDIUM)

**File**: `libs/engine/src/routes/api/passkey/register-options/+server.ts:34`

**What happens**:

```typescript
// Comment says: "Note: generate-register-options is a GET endpoint in Better Auth"
response = await platform.env.AUTH.fetch(
  `${AUTH_HUB_URL}/api/auth/passkey/generate-register-options`,
  { method: "GET", ... }
);
```

But Heartwood's endpoint listing says: `"POST /api/auth/passkey/generate-register-options"`.

If Better Auth expects POST, the GET request returns 404 or 405. Need to verify which method Better Auth actually uses.

---

## Structural Issues

### Duplicated base64url encoding

Two independent implementations:

- `libs/engine/src/lib/utils/webauthn.ts` → `base64urlToBuffer()`, `bufferToBase64url()`
- `libs/engine/src/lib/grafts/login/passkey-authenticate.ts` → `arrayBufferToBase64Url()`, `base64UrlToArrayBuffer()`

Same logic, different names, different files. Should consolidate.

### Dead code paths

If we fix the architecture by redirecting all ceremonies to `login.grove.place`, these engine routes become dead code:

- `libs/engine/src/routes/api/passkey/register-options/+server.ts`
- `libs/engine/src/routes/api/passkey/verify-registration/+server.ts`
- `libs/engine/src/routes/api/passkey/authenticate/options/+server.ts`
- `libs/engine/src/routes/api/passkey/authenticate/verify/+server.ts`
- `libs/engine/src/routes/api/passkey/[id]/+server.ts`
- `libs/engine/src/routes/arbor/account/passkey-utils.ts`
- Parts of `libs/engine/src/lib/grafts/login/passkey-authenticate.ts`

That's ~800 lines of custom WebAuthn proxy code that should be replaced by redirects.

---

## The Fix Architecture

### Principle: One Origin, One Client, One Flow

All WebAuthn ceremonies MUST happen on `login.grove.place` because:

1. It's the `PASSKEY_ORIGIN` — WebAuthn validates the origin
2. Better Auth's session cookies are first-party there
3. The proxy correctly round-trips all cookies
4. The Better Auth client handles the ceremony correctly

### Registration Flow (adding a passkey)

**Current (broken)**:

```
Arbor Account → /api/passkey/register-options → Heartwood
                                                ↑ wrong origin
                                                ↑ wrong cookie
```

**Fixed**:

```
Arbor Account "Add Passkey" button
    → redirect to https://login.grove.place/passkey?redirect=<arbor-url>
    → login.grove.place runs ceremony (correct origin!)
    → Better Auth client handles it (correct cookies!)
    → redirect back to arbor account page
```

Plant already does this! See `apps/plant/src/routes/auth/setup-passkey/+page.server.ts`.

### Authentication Flow (signing in with passkey)

**Current (broken)**:

```
Login Graft on autumn.grove.place
    → /api/passkey/authenticate/options → Heartwood
    → navigator.credentials.get() (wrong origin!)
    → /api/passkey/authenticate/verify → Heartwood (bare fetch, wrong URL)
```

**Fixed** — Two options:

**Option A (recommended): Add subdomain origins to Heartwood**

```toml
# heartwood/wrangler.toml
PASSKEY_ORIGIN = "https://login.grove.place,https://grove.place"
```

With `rpID: "grove.place"`, passkeys registered on `login.grove.place` are usable on ANY `*.grove.place` subdomain per WebAuthn spec. We just need Heartwood to accept the origin from those subdomains. BUT — Better Auth's passkey plugin may not support wildcard origins. Need to check.

**Option B: Redirect all sign-in to Login Hub**
The Login Graft's passkey button redirects to `login.grove.place/?redirect=<current-url>` instead of running the ceremony locally. Login hub runs the ceremony, sets cookies, redirects back.

**Option A is better UX** (no redirect) but requires Better Auth to accept multiple origins or wildcard `*.grove.place`. Option B always works but adds a redirect.

### Passkey List Flow (viewing passkeys in admin)

**Current (partially broken)**:

```
+page.server.ts → bare fetch() to GROVEAUTH_URL (might be wrong domain)
                → sends both grove_session + better-auth.session_token (correct!)
```

**Fixed**:

```
+page.server.ts → platform.env.AUTH.fetch() (service binding, always works)
                → sends better-auth.session_token (correct cookie)
```

### Passkey Delete Flow

Currently in `libs/engine/src/routes/api/passkey/[id]/+server.ts` — needs same session cookie fixes as the other routes. Or, if we redirect management to login.grove.place, this becomes dead code too.

---

## Implementation Plan

### Phase 1: Make Login Hub Passkeys Work (Quick Win)

The Login Hub (`login.grove.place`) should already work — it uses Better Auth client on the correct origin. If it doesn't, debug the cookie flow:

- [ ] Test `authClient.signIn.passkey()` on login.grove.place — check browser console
- [ ] Verify the challenge cookie (`better-auth-passkey` or similar) round-trips through proxy
- [ ] Check if `better-auth.session_token` cookie exists before trying passkey sign-in
- [ ] Test `authClient.passkey.addPasskey()` on login.grove.place/passkey after sign-in

### Phase 2: Redirect Engine to Login Hub (Core Fix)

- [ ] **Arbor Account**: Change "Add Passkey" button to redirect to `https://login.grove.place/passkey?redirect={currentUrl}` instead of calling `registerPasskey()`
- [ ] **Login Graft**: Change PasskeyButton to redirect to `https://login.grove.place?redirect={currentUrl}` with passkey intent, OR implement Option A (multi-origin)
- [ ] **Delete passkey routes**: Keep the delete route but fix session cookie forwarding, or move management to login.grove.place too

### Phase 3: Fix Passkey Listing (Service Binding)

- [ ] Change `fetchUserPasskeys()` in `+page.server.ts` to use `platform.env.AUTH.fetch()` instead of bare `fetch()`
- [ ] Send `better-auth.session_token` cookie (already doing this correctly)
- [ ] Remove dependency on `GROVEAUTH_URL` for this call

### Phase 4: Clean Up Dead Code

After Phases 1-3 are working:

- [ ] Remove engine passkey API routes (`/api/passkey/*`) — 6 files, ~750 lines
- [ ] Remove `passkey-utils.ts` — 248 lines
- [ ] Simplify `passkey-authenticate.ts` if Login Graft uses redirect
- [ ] Consolidate duplicate base64url utilities
- [ ] Remove `GET /api/passkey` endpoint (legacy JWT only)
- [ ] Update PasskeyCard to work with redirect flow (no local registration state)

### Phase 5: Multi-Origin Support (Optional Enhancement)

If we want passkey sign-in to work on subdomains without redirect:

- [ ] Update `PASSKEY_ORIGIN` to include `https://*.grove.place` (if Better Auth supports wildcards)
- [ ] OR enumerate known subdomains: `"https://login.grove.place,https://plant.grove.place,https://grove.place"`
- [ ] Test that passkeys registered on `login.grove.place` work on other subdomains (rpID: `grove.place` should allow this per WebAuthn spec)
- [ ] Rewrite engine authenticate routes to use service binding + correct cookies

---

## Expedition Summary

### By the numbers

| Metric            | Count |
| ----------------- | ----- |
| Total stops       | 10    |
| Critical bugs     | 2     |
| High bugs         | 3     |
| Medium bugs       | 2     |
| Structural issues | 2     |
| Dead code (lines) | ~800  |

### Condition Assessment

| Component                         | Condition                                                                  |
| --------------------------------- | -------------------------------------------------------------------------- |
| Heartwood passkey plugin config   | Thriving :green_circle: — correctly configured                             |
| Login Hub proxy                   | Growing :yellow_circle: — works but untested for passkey cookie flow       |
| Login Hub sign-in page            | Growing :yellow_circle: — correct code, may have cookie issue              |
| Login Hub passkey registration    | Growing :yellow_circle: — correct code, needs testing                      |
| Engine Arbor Account registration | Barren :red_circle: — fundamentally broken (wrong origin + cookies)        |
| Engine Login Graft authentication | Barren :red_circle: — fundamentally broken (wrong origin)                  |
| Engine passkey API routes         | Wilting :orange_circle: — wrong cookies, bare fetch, wrong response format |
| Engine passkey list (server)      | Wilting :orange_circle: — bare fetch with possibly wrong URL               |
| Plant passkey setup               | Thriving :green_circle: — correctly redirects to login.grove.place         |
| Heartwood E2E tests               | Growing :yellow_circle: — exist but may not run in CI                      |

### Cross-cutting themes

1. **Origin is king**: WebAuthn origin validation is the #1 blocker. Can't work around it — must run on `login.grove.place`.
2. **Cookie identity crisis**: Three different session tokens (`grove_session`, `better-auth.session_token`, `access_token`) and different routes expect different ones.
3. **Service binding vs bare fetch**: Some routes use the service binding, others use bare `fetch()` with a potentially wrong URL. Should be consistent.
4. **Better Auth client vs custom implementation**: The Better Auth client handles everything correctly. The custom implementation reimplements poorly. Use the client.

### Recommended trek order

1. **Login Hub** (Phase 1) — Verify the one correct path works. Quick win, builds confidence.
2. **Arbor redirect** (Phase 2a) — Redirect "Add Passkey" to login hub. Instant fix for admin panel.
3. **Login Graft** (Phase 2b) — Either redirect or multi-origin. Fixes sign-in.
4. **Passkey list** (Phase 3) — Fix service binding. Fixes the account page display.
5. **Dead code cleanup** (Phase 4) — Remove ~800 lines of broken proxy code.
6. **Multi-origin** (Phase 5) — Optional polish for seamless subdomain sign-in.

---

_The fire dies to embers. The journal is full — 10 stops, 7 bugs, 2 structural issues, and one clear path forward. The architecture isn't broken in a hundred small ways — it's broken in ONE fundamental way (wrong origin) that cascades into everything else. Fix the origin, fix the flow, remove the dead code. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ :bus:
