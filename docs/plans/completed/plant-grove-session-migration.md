# Plan: Migrate Plant Package from Legacy JWT to grove_session

## Overview

The Plant package (onboarding app) currently uses a **legacy OAuth flow** with JWT tokens:
- Custom PKCE flow via `/auth/+server.ts` → GroveAuth `/login` → `/token`
- Stores `access_token` cookie (JWT)
- Uses `Authorization: Bearer` for all GroveAuth API calls

This needs to migrate to **grove_session** (SessionDO-based auth):
- Use LoginGraft/Better Auth for OAuth
- Use `grove_session` cookie
- Use `Cookie` header for GroveAuth API calls

---

## Current State Analysis

### Files Using Legacy Auth

| File | What It Does | Bearer Usage |
|------|--------------|--------------|
| `/auth/+server.ts` | Initiates PKCE OAuth flow | N/A (redirect) |
| `/auth/callback/+server.ts` | Exchanges code for tokens, stores `access_token` | Lines 126-130 |
| `/+layout.server.ts` | Checks `access_token` cookie | Line 6 |
| `/account/+page.server.ts` | ALL GroveAuth API calls | 10+ Bearer usages |
| `/api/account/passkey/*` | Passkey registration | Bearer headers |
| `/verify-email/+page.server.ts` | Email verification | Needs check |

### Links Using Legacy `/auth` Route

1. `+page.svelte:101` — "Returning user banner": `href="/auth?provider=google"`
2. `account/+page.svelte:581` — "Link account": `href="/auth?provider={provider}&link=true"`

---

## Migration Strategy

### Phase 1: Remove Legacy OAuth Initiation

**Delete `/auth/+server.ts`** — The LoginGraft we just added handles OAuth initiation via Better Auth.

**Update returning user banner** (`+page.svelte:101`):
- Change from `<a href="/auth?provider=google">` to using LoginGraft
- Or redirect to a dedicated login page that uses LoginGraft

### Phase 2: Rewrite Auth Callback

**Rewrite `/auth/callback/+server.ts`** to work with Better Auth:

**Before** (legacy):
```typescript
// Exchange code for tokens (PKCE)
const tokenResponse = await fetch(`${authBaseUrl}/token`, { ... });
const tokens = await tokenResponse.json();

// Fetch user info with Bearer token
const userinfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
});

// Store access_token cookie
cookies.set("access_token", tokens.access_token, { ... });
```

**After** (grove_session):
```typescript
// Read grove_session cookie (already set by Better Auth + session bridge)
const groveSession = cookies.get("grove_session");
if (!groveSession) {
  redirect(302, "/?error=session_missing");
}

// Validate session and get user info via Cookie header
const response = await fetch(`${authBaseUrl}/session/validate`, {
  method: "POST",
  headers: { Cookie: `grove_session=${groveSession}` },
});

const { valid, user } = await response.json();
// user contains: id, email, name, avatarUrl, isAdmin
```

### Phase 3: Update Layout Server

**Update `/+layout.server.ts`**:

**Before**:
```typescript
const accessToken = cookies.get("access_token");
if (!onboardingId || !accessToken) {
  return { user: null, onboarding: null };
}
```

**After**:
```typescript
const groveSession = cookies.get("grove_session");
if (!onboardingId || !groveSession) {
  return { user: null, onboarding: null };
}
```

### Phase 4: Update All GroveAuth API Calls

**Pattern replacement** in `/account/+page.server.ts`:

**Before**:
```typescript
const accessToken = cookies.get('access_token');
// ...
const response = await fetch(`${authBaseUrl}/api/auth/passkey/list-user-passkeys`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

**After**:
```typescript
const groveSession = cookies.get('grove_session');
// ...
const response = await fetch(`${authBaseUrl}/api/auth/passkey/list-user-passkeys`, {
  headers: { Cookie: `grove_session=${groveSession}` }
});
```

**Files to update:**
- `/account/+page.server.ts` — ~10 API calls
- `/api/account/passkey/register-options/+server.ts`
- `/api/account/passkey/verify-registration/+server.ts`
- Any other files using `access_token`

### Phase 5: Handle Account Linking

The "Link account" feature (`/auth?provider={provider}&link=true`) needs special handling:
- This allows users to link additional OAuth providers (Discord, GitHub)
- Better Auth has built-in account linking support
- May need a dedicated `/account/link` page or use Better Auth's linking flow

### Phase 6: Cleanup

**Remove legacy code:**
- Delete `access_token` and `refresh_token` cookie handling
- Remove Bearer token utilities if unused
- Update error messages referencing "access token"

---

## Files to Modify

| File | Changes |
|------|---------|
| `/auth/+server.ts` | **DELETE** (replaced by LoginGraft) |
| `/auth/callback/+server.ts` | Rewrite to use grove_session |
| `/+layout.server.ts` | Change `access_token` → `grove_session` |
| `/+page.svelte` | Update returning user banner link |
| `/account/+page.server.ts` | Replace ALL Bearer headers with Cookie |
| `/account/+page.svelte` | Update "Link account" button |
| `/api/account/passkey/register-options/+server.ts` | Bearer → Cookie |
| `/api/account/passkey/verify-registration/+server.ts` | Bearer → Cookie |
| `/verify-email/+page.server.ts` | Line 17: `access_token` → `grove_session` |

---

## Key Pattern Reference

**Session validation (from engine/hooks.server.ts:419-453)**:
```typescript
const groveSession = cookies.get("grove_session");

const response = await fetch("https://auth-api.grove.place/session/validate", {
  method: "POST",
  headers: { Cookie: `grove_session=${groveSession}` },
});

if (response.ok) {
  const { valid, user } = await response.json();
  // user: { id, email, name, avatarUrl, isAdmin }
}
```

---

## Verification

1. **Test new signup flow**: Plant homepage → Get Started → Passkey/Google → completes onboarding
2. **Test returning user**: Sign in with existing account → redirects appropriately
3. **Test account page**: All sections load (passkeys, 2FA, linked accounts)
4. **Test passkey registration**: Can add new passkey from account page
5. **Check cookies**: Only `grove_session` and `onboarding_id` should be present (no `access_token`)

---

## Risk: GroveAuth API Session Validation

**Question**: Does GroveAuth's Better Auth endpoints accept `grove_session` via Cookie header?

Based on the arbor panel fix we just did, they should. The endpoints like `/api/auth/passkey/list-user-passkeys` accept session cookies.

But we should verify these endpoints work with grove_session:
- `/api/auth/passkey/generate-register-options`
- `/api/auth/passkey/verify-registration`
- `/api/auth/passkey/delete-passkey`
- `/api/auth/two-factor/*`
- `/api/auth/linked-accounts`

---

## Estimated Scope

- **~8 files** to modify
- **~50 lines** of Bearer → Cookie replacements
- **1 file** to delete
- **1 major rewrite** (auth callback)
