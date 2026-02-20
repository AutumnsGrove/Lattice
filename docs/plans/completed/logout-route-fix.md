# Plan: Fix Logout Route

## Problem

The logout button in the Header links to `/logout`, but the actual logout handler is at `/auth/logout`. Clicking logout currently does nothing (404).

## Solution

Two minimal changes:

### 1. Create `/logout` redirect route

**File:** `libs/engine/src/routes/logout/+server.ts` (new)

```typescript
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	redirect(302, "/auth/logout");
};
```

### 2. Change post-logout redirect to homepage

**File:** `libs/engine/src/routes/auth/logout/+server.ts`

Line 59: Change `redirect(302, "/auth/login")` → `redirect(302, "/")`

## Flow After Fix

1. User clicks "Logout" → `/logout`
2. `/logout` redirects → `/auth/logout`
3. `/auth/logout` revokes session, clears cookies
4. Redirects to `/` (homepage)

## Files Changed

- `libs/engine/src/routes/logout/+server.ts` (create)
- `libs/engine/src/routes/auth/logout/+server.ts` (edit line 59)
