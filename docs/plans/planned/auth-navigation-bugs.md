# Auth/Navigation Bug Fix Plan

**Issues:** #865, #866
**Branch:** `fix/admin-auth-navigation`

---

## Executive Summary

Two related bugs prevent logged-in users from navigating to their grove admin:

| Issue | Bug | Root Cause | Fix |
|-------|-----|------------|-----|
| #865 | Admin link goes to `grove.place/admin` instead of `username.grove.place/admin` | Landing page passes `groveUrl` only when tenant exists; falls back to relative `/admin` | Ensure landing always passes full URL for logged-in users |
| #866 | Wayfinder gets 403 on their own `/admin` route | Email mismatch between SessionDO response and tenant DB record | Add debug logging + investigate email normalization |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTH/NAVIGATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LANDING (grove.place)                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  +page.server.ts                                                  │  │
│  │    ├── locals.user (from SessionDO) ───────────────────┐         │  │
│  │    ├── Query tenants WHERE email = user.email          │         │  │
│  │    ├── buildGroveAdminUrl(tenant.username)        ← FIX #1       │  │
│  │    └── Return { user, groveUrl }                       │         │  │
│  └────────────────────────────────────────────────────────┼─────────┘  │
│                                                            │            │
│  +page.svelte                                              │            │
│  ┌────────────────────────────────────────────────────────┼─────────┐  │
│  │  <Header user={data.user}                              │         │  │
│  │          userHref={data.groveUrl ?? undefined} ← FIX #1         │  │
│  │          ... />                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  TENANT BLOG (username.grove.place)                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  hooks.server.ts                                                  │  │
│  │    ├── Extract subdomain: "username"                              │  │
│  │    ├── TenantDO lookup → locals.tenantId                          │  │
│  │    └── SessionDO validate → locals.user { email, name, ... }      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  /admin route                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  +layout.server.ts                                                │  │
│  │    ├── Check: locals.user exists?                     ← AUTH     │  │
│  │    │     └── No → redirect to /auth/login                        │  │
│  │    ├── Query tenant by locals.tenantId                           │  │
│  │    ├── Check: emailsMatch(tenant.email, locals.user.email)       │  │
│  │    │     └── No → redirect to /?error=access_denied   ← FIX #2   │  │
│  │    └── Return tenant data                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Bug #865: Admin Link URL Wrong

### Problem
When logged-in user clicks their avatar in landing site header, it goes to `/admin` (relative) instead of `https://username.grove.place/admin`.

### Root Cause
`packages/landing/src/routes/+page.server.ts` returns `groveUrl: null` when:
1. User has no tenant yet (no grove created)
2. DB query fails silently

When `groveUrl` is null, `Header.svelte` falls back to its default `userHref = '/admin'`.

### Fix
**File:** `packages/landing/src/routes/+page.server.ts`

Change the fallback behavior:
- If user is logged in but has no grove → link to Plant (grove signup)
- If user has a grove → link to their grove admin

```typescript
// Current (broken):
return {
  user: locals.user,
  groveUrl,  // null if no tenant found
};

// Fixed:
return {
  user: locals.user,
  // If user has grove → their admin. If not → Plant for grove signup.
  groveUrl: groveUrl || (locals.user ? 'https://plant.grove.place' : null),
};
```

**Impact:** 1 file, ~3 lines changed.

---

## Bug #866: Wayfinder 403 on Own Admin

### Problem
Valid wayfinder (site owner) gets `/?error=access_denied` redirect when visiting their own `/admin` route.

### Root Cause (Suspected)
The `emailsMatch()` check at line 63 fails:
```typescript
if (!emailsMatch(result.email, locals.user!.email)) {
  throw redirect(302, `/?error=access_denied`);
}
```

This happens when:
1. **SessionDO returns a different email** than what's stored in tenants table
2. **`locals.user.email` is undefined** (SessionDO response missing email field)
3. **Tenant email in DB doesn't match** auth email (rare, data integrity issue)

### Investigation Needed
Add temporary debug logging to identify the exact mismatch:

**File:** `packages/engine/src/routes/admin/+layout.server.ts`

```typescript
// TEMPORARY DEBUG - remove after fixing
console.log('[Admin Auth Debug]', {
  tenantEmail: result.email,
  userEmail: locals.user?.email,
  normalized: {
    tenant: normalizeEmail(result.email),
    user: normalizeEmail(locals.user?.email),
  },
  match: emailsMatch(result.email, locals.user?.email),
});
```

### Likely Fixes
Based on the investigation, one of:

**Option A: Email field missing from SessionDO response**
- Fix in `hooks.server.ts` to handle missing email
- Add fallback to fetch email from userinfo endpoint

**Option B: Email normalization issue**
- Emails are stored differently in tenants table vs SessionDO
- Ensure both are normalized the same way

**Option C: Data integrity fix**
- Tenant email in DB doesn't match auth email
- Update tenant record OR add email sync on login

**Impact:** 1-2 files, ~10-20 lines changed.

---

## Files to Modify

| File | Change | Issue |
|------|--------|-------|
| `packages/landing/src/routes/+page.server.ts` | Add fallback for missing groveUrl | #865 |
| `packages/engine/src/routes/admin/+layout.server.ts` | Add debug logging, then fix based on findings | #866 |
| `packages/engine/src/hooks.server.ts` | (Possibly) Handle missing email in SessionDO response | #866 |

---

## Panther Strike Plan

### Panther 1: Fix #865 (Admin Link URL)
1. Read `packages/landing/src/routes/+page.server.ts`
2. Change return to provide fallback URL for logged-in users without groves
3. Test by visiting grove.place while logged in

### Panther 2: Fix #866 (403 on Admin)
1. Add debug logging to `packages/engine/src/routes/admin/+layout.server.ts`
2. Read logs to identify email mismatch source
3. Apply appropriate fix based on findings
4. Remove debug logging
5. Test by visiting `username.grove.place/admin` while logged in

---

## Verification

After fixes:

1. **Bug #865 Test:**
   - Log into grove.place as a user with a grove
   - Click avatar in header
   - Should navigate to `username.grove.place/admin`

2. **Bug #866 Test:**
   - Log into heartwood
   - Navigate to `username.grove.place/admin`
   - Should load admin panel (not 403)

3. **Edge Cases:**
   - User logged in but no grove → should link to Plant (plant.grove.place)
   - User not logged in → should show "Sign in" link

4. **Type Check:**
   ```bash
   cd packages/landing && pnpm check
   cd packages/engine && pnpm check
   ```
