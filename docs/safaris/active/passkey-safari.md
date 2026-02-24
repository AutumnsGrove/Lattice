---
title: "Passkey Safari — Tracking the Ghost Keys"
status: active
category: safari
updated: 2026-02-24
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
**Tenant App (admin panel)**: engine — Arbor Account passkey management redirect
**Onboarding**: plant — redirects to login.grove.place (correctly!)
**Tests**: heartwood/e2e — Playwright tests with CDP virtual authenticator

---

## Architecture (Post-Cleanup)

All WebAuthn ceremonies happen on `login.grove.place`. Period.

```
┌─────────────────────────────────────────────────────────────────┐
│  Plant (/auth/setup-passkey)                                    │
│  → redirect to login.grove.place/passkey?redirect=plant...      │
├─────────────────────────────────────────────────────────────────┤
│  Engine Arbor Account ("Manage Passkeys" button)                │
│  → redirect to login.grove.place/passkey?redirect=arbor...      │
├─────────────────────────────────────────────────────────────────┤
│  login.grove.place/passkey                                      │
│  → authClient.passkey.addPasskey()                              │
│  → POST /api/auth/passkey/generate-register-options (proxy)     │
│  → navigator.credentials.create() (browser prompt)              │
│  → POST /api/auth/passkey/verify-registration (proxy)           │
├─────────────────────────────────────────────────────────────────┤
│  Proxy (login hub /api/auth/[...path])                          │
│  → platform.env.AUTH.fetch() (service binding)                  │
│  → forwards auth cookies, returns filtered response headers     │
├─────────────────────────────────────────────────────────────────┤
│  Heartwood (groveauth Worker)                                   │
│  → Better Auth passkey plugin                                   │
│  → rpID: "grove.place", origin: ["https://login.grove.place"]   │
│  → ba_passkey table in D1                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Cookie Configuration (Heartwood auth/index.ts)

```
crossSubDomainCookies: { enabled: true, domain: ".grove.place" }
defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax", path: "/" }
```

All Better Auth cookies (`better-auth.session_token`, `better-auth-passkey`, etc.)
are set with `Domain=.grove.place` — shared across all *.grove.place subdomains.

---

## Current Bug Status (2026-02-24 Re-assessment)

### What's been FIXED since the original safari

| Original Bug | Status | What Changed |
|---|---|---|
| BUG 1: WebAuthn Origin Mismatch | FIXED | Engine now redirects to login hub instead of running ceremonies locally |
| BUG 2: Session Cookie Mismatch in Registration | FIXED | Custom registration routes deleted from engine |
| BUG 3: Bare fetch() in Auth Routes | FIXED | Custom auth routes deleted from engine |
| BUG 4: Wrong GROVEAUTH_URL | FIXED for listing | `fetchUserPasskeys()` uses service binding now |
| BUG 5: Non-Standard Response Format | FIXED | Custom verify route deleted from engine |
| BUG 6: Legacy JWT Only | FIXED | `api/passkey/+server.ts` now sends both session cookies |
| BUG 7: HTTP Method Mismatch | FIXED | Custom routes deleted; only Better Auth client flow remains |

### What's STILL broken

#### ACTIVE BUG 1: Login Hub Passkey Registration Fails (CRITICAL)

**Symptom**: "Failed to create passkey" error on `login.grove.place/passkey`

**Where**: `apps/login/src/routes/passkey/+page.svelte:54-60`

**What happens**:
1. User arrives at login.grove.place/passkey (redirected from Plant or Engine)
2. Server guard passes (session cookie exists) — page loads correctly
3. User clicks "Create Passkey"
4. `authClient.passkey.addPasskey({ name: getDeviceName() })` is called
5. Better Auth client internally calls `POST /api/auth/passkey/generate-register-options`
6. Proxy forwards to Heartwood via service binding
7. **Something fails** → error returned → "Failed to create passkey" displayed

**Diagnosis needed**: The error message is swallowed. The catch block at line 68-84 shows
specific messages for WebAuthn-specific errors (NotAllowedError, SecurityError, InvalidStateError)
but the generic case just shows `err.message` which may be empty/vague.

**Possible causes** (in order of likelihood):
1. **Session invalid on Heartwood side**: The `better-auth.session_token` cookie reaches
   Heartwood but the session has expired or doesn't exist in D1. (7-day expiry, but
   if user just signed up, this shouldn't apply)
2. **Challenge cookie not round-tripping**: The `better-auth-passkey` challenge cookie
   set by generate-register-options doesn't make it back to verify-registration through
   the proxy
3. **generate-register-options returns error**: Heartwood returns 401/500 before the
   browser ceremony even starts
4. **`ba_user` table mismatch**: The user's record exists in SessionDO/grove_session
   but NOT in Better Auth's `ba_user` table (if they signed up via legacy flow)

**Debug approach**: Add detailed error logging to the passkey page to capture the
actual error from Better Auth, and add console.log to the proxy for passkey requests.

#### ACTIVE BUG 2: Engine "Could not load passkeys" (LOW — Design Issue)

**Symptom**: "Could not load passkeys. Please try refreshing the page." on Arbor Account

**Where**: `libs/engine/src/routes/arbor/account/+page.server.ts:54-107`

**Root cause**: The engine calls `fetchUserPasskeys()` which makes a service binding
request to Heartwood's `list-user-passkeys` endpoint. This fails (probably 401) because
the `better-auth.session_token` cookie may not be present or valid when forwarded
from the engine.

**But this is a design issue, not a code bug**: Per the user, the engine account page
shouldn't be LOADING passkeys at all. It should just show a "Manage Passkeys" button
that redirects to login.grove.place. No API call, no loading state, no error state.

#### DEAD CODE: Plant Custom Passkey Routes

**Files**:
- `apps/plant/src/routes/api/account/passkey/register-options/+server.ts`
- `apps/plant/src/routes/api/account/passkey/verify-registration/+server.ts`
- Custom WebAuthn ceremony code in `apps/plant/src/routes/account/+page.svelte:124-191`

Plant correctly redirects to login.grove.place for passkey creation (/auth/setup-passkey).
These custom routes are dead code from before the architecture was fixed.
Plant's account page also has inline passkey UI that calls these dead routes.

---

## Fix Plan

### Phase 1: Quick Wins (Clean Up Dead Code + Simplify)

- [ ] **Engine Account**: Replace PasskeyCard deferred loading with a simple redirect button
  - Remove `fetchUserPasskeys()` call from `+page.server.ts`
  - Remove `passkeyData` from the returned data
  - Replace `{#await data.passkeyData}` block with a static PasskeyCard that only shows
    "Manage Passkeys → login.grove.place/passkey" button
  - Keep delete functionality? No — manage everything on login hub
- [ ] **Plant**: Delete dead passkey routes
  - Delete `apps/plant/src/routes/api/account/passkey/` directory (2 files)
  - Remove inline passkey UI from `apps/plant/src/routes/account/+page.svelte`

### Phase 2: Debug Login Hub Passkey (The Real Fix)

- [ ] **Better error logging**: Update login hub passkey page to show the actual error
  from Better Auth (not the generic fallback). Log `result.error` details to console.
- [ ] **Proxy passkey logging**: Add temporary console.log to the proxy for passkey
  requests showing request/response status and cookie presence.
- [ ] **Test the ceremony steps individually**:
  1. Does `generate-register-options` return 200? Check response body.
  2. Does the `better-auth-passkey` challenge cookie get set?
  3. Does the browser prompt appear? (If not, step 1 failed.)
  4. Does `verify-registration` receive the challenge cookie?
  5. Does Heartwood return 200 for verify?
- [ ] **Fix the root cause** once identified (likely session or cookie issue)

### Phase 3: Login Hub Passkey Management UI

Once registration works on login.grove.place/passkey:
- [ ] Add a passkey LIST page on login.grove.place (show registered passkeys)
- [ ] Add passkey DELETE functionality on login.grove.place
- [ ] Consider adding passkey rename
- [ ] Engine and Plant link to this management page

### Phase 4: Final Cleanup

- [ ] Remove engine's remaining passkey API routes (`/api/passkey/+server.ts`,
  `/api/passkey/[id]/+server.ts`) — no longer needed if management moves to login hub
- [ ] Remove `passkey-authenticate.ts` from Login Graft if unused
- [ ] Remove duplicate base64url utilities
- [ ] Update PasskeyCard to be a pure redirect component (no loading/error states)

---

## Expedition Summary

### By the numbers (2026-02-24)

| Metric | Count |
|---|---|
| Original bugs (first safari) | 7 |
| Bugs FIXED since then | 7 |
| NEW bugs found | 1 active + 1 design |
| Dead code to remove | ~400 lines (Plant routes + inline UI) |

### Condition Assessment (Updated)

| Component | Condition |
|---|---|
| Heartwood passkey plugin config | Thriving 🟢 — correctly configured |
| Login Hub proxy | Thriving 🟢 — cookie allowlist, header filtering all correct |
| Login Hub passkey page (registration) | Wilting 🟠 — architecture correct but ceremony fails |
| Engine Arbor Account passkey section | Wilting 🟠 — loading when it should just redirect |
| Engine passkey API routes (list/delete) | Growing 🟡 — work but should migrate to login hub |
| Plant passkey setup redirect | Thriving 🟢 — correct redirect to login hub |
| Plant custom passkey routes | Barren 🔴 — dead code, should delete |

### Cross-cutting themes

1. **The architecture is now correct**: One origin, one client, one flow. All roads lead
   to login.grove.place. The original safari's recommendation was implemented.
2. **Dead code persists**: Plant and Engine both have remnant passkey code that should
   be removed now that the centralized approach is in place.
3. **The login hub ceremony itself needs debugging**: The one place where passkeys
   SHOULD work... doesn't. Need to add instrumentation to find the exact failure point.
4. **Error messages are too vague**: "Failed to create passkey" tells the user nothing.
   Need to surface the actual error from Better Auth for debugging (and eventually
   provide friendly messages once we know the failure modes).

---

_The fire dies to embers. Seven ghosts from the first expedition have been laid to rest.
One new ghost appeared — but this one's different. The architecture is sound; the ghost
is hiding in the plumbing. Tomorrow we add instruments to the pipes and find it.
Tonight? The journal is updated. The map is clear._ 🚙
