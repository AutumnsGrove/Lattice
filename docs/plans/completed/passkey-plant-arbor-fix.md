# Plan: Passkey Login in Plant + Arbor Panel Passkey Fix

## Overview

Two related tasks:

1. **Plant Auth Section**: Add passkey login option (first) + Google (second)
2. **Arbor Panel Bug**: Fix passkey registration/listing for accounts created via OAuth

---

## Task 1: Add Passkeys to Plant Auth Section

### Current State

`apps/plant/src/routes/+page.svelte` (lines 362-376) uses a **custom inline auth** section:

```svelte
<div class="space-y-3">
  <!-- Google (only option for launch) -->
  <a href="/auth?provider=google" class="btn-auth ...">
    {@html GoogleIcon}
    <span>Continue with Google</span>
  </a>
  <!-- Note: Discord, Passkey, and Email options will be added post-launch -->
</div>
```

This does NOT use the `LoginGraft` component from the engine.

### Solution

Replace the inline auth with `LoginGraft` configured for passkey-first:

```svelte
import { LoginGraft } from '@autumnsgrove/lattice/grafts/login';

<LoginGraft
  providers={['passkey', 'google']}
  returnTo="/arbor"
/>
```

### Files to Modify

- `apps/plant/src/routes/+page.svelte`

---

## Task 2: Fix Arbor Panel Passkey Registration

### Root Cause Analysis

**Cookie Situation After Google OAuth:**
| Cookie | Set By | Present? |
|--------|--------|----------|
| `better-auth.session_token` | Better Auth | ✅ Yes |
| `grove_session` | SessionDO Bridge | ✅ Yes |
| `access_token` | Legacy JWT system | ❌ No |

**The Bug:**

1. **Passkey LIST** (`+page.server.ts:100`):

   ```typescript
   const accessToken = cookies.get("access_token");
   // If no access_token, returns empty passkeys (no error)
   ```

   → Fails silently because OAuth accounts don't have `access_token`

2. **Passkey FETCH to GroveAuth** (`+page.server.ts:59`):
   ```typescript
   headers: {
     Authorization: `Bearer ${accessToken}`,  // Wrong header type
   },
   ```
   → Uses `Authorization: Bearer` but GroveAuth expects session via Cookie header

### Solution

Update the passkey fetch to use the correct cookies:

1. Check for `grove_session` OR `better-auth.session_token` (not just `access_token`)
2. Send session via **Cookie header** (not Authorization header) to match how GroveAuth validates sessions

### Files to Modify

- `libs/engine/src/routes/arbor/account/+page.server.ts`
  - Update `fetchUserPasskeys()` to use Cookie header with grove_session or better-auth cookies

---

## Implementation Steps

### Step 1: Update Plant Auth Section

1. Import `LoginGraft` from engine
2. Replace inline auth section with `<LoginGraft providers={['passkey', 'google']} />`
3. Remove the `GoogleIcon` SVG constant (no longer needed)
4. Keep the surrounding UI (the "Begin your journey" card wrapper)

### Step 2: Fix Passkey Fetch in Arbor

1. Update `+page.server.ts` to check for `grove_session` and `better-auth.session_token`
2. Change fetch to use Cookie header instead of Authorization header
3. Match the pattern used in the passkey registration endpoint

---

## Testing

After implementation:

1. Sign out completely
2. Sign in with Google → should have `grove_session` + `better-auth.session_token`
3. Go to Arbor → Account page
4. Verify passkey section shows (not error state)
5. Click "Add Your First Passkey"
6. Complete WebAuthn ceremony
7. Verify passkey appears in list

Arturo can test this flow tonight!

---

## Notes

- The `DEFAULT_PROVIDERS` in config.ts stays as `['google']` - apps can override
- Plant is special because it's the signup flow, so passkey-first makes sense for users who prefer it
- The passkey registration endpoint (`/api/passkey/register-options`) already supports `grove_session`, so that should work once the list fetch is fixed
