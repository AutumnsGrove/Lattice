# Query Isolation Audit - Action Items

**Created**: 2026-01-12
**Status**: Pending
**Context**: Discovered cascading query failure pattern where one table's absence blocks unrelated queries

## The Pattern to Fix

Multiple database queries in the same try/catch block cause cascading failures:

```typescript
// ❌ BAD - one failure blocks all
try {
	const settings = await db.prepare("SELECT * FROM settings").all();
	const pages = await db.prepare("SELECT * FROM pages").all(); // Never runs if settings fails!
} catch (error) {}

// ✅ GOOD - isolated queries
try {
	const settings = await db.prepare("SELECT * FROM settings").all();
} catch (error) {
	/* graceful fallback */
}

try {
	const pages = await db.prepare("SELECT * FROM pages").all();
} catch (error) {
	/* graceful fallback */
}
```

---

## High Priority Fixes

### 1. `libs/engine/src/routes/api/stats/+server.ts`

**Lines**: 47-116
**Issue**: Stats query and tags query share try/catch
**Impact**: If posts table has issues, both stats and tags fail together

```typescript
// Current: Two queries grouped
const statsResult = await db.prepare(statsQuery).bind(tenantId).first();
const postsResult = await db.prepare(postsQuery).bind(tenantId).all();
```

**Fix**: Separate into individual try/catch blocks with fallbacks

---

### 2. `libs/engine/src/routes/admin/subscribers/+page.server.ts`

**Lines**: 26-45
**Issue**: Active subscribers query and unsubscribed count query share try/catch
**Impact**: If count query fails, entire page fails

**Fix**: Allow partial data loading (show subscribers even if count fails)

---

## Medium Priority Fixes

### 3. `plant/src/routes/profile/+page.server.ts`

**Lines**: 60-101
**Issue**: Three validation queries + update in same try/catch
**Impact**: If `reserved_usernames` table doesn't exist, entire form fails

**Fix**: Wrap table checks individually with fallbacks (skip check if table missing)

---

### 4. `landing/src/routes/api/signup/+server.ts`

**Lines**: 40-70
**Issue**: Check, update, and insert operations in same try/catch
**Impact**: Can't distinguish "email already exists" from database errors

**Fix**: Better error differentiation for constraint violations vs connectivity issues

---

### 5. `landing/src/routes/unsubscribe/+page.server.ts`

**Lines**: 23-50
**Issue**: Check query and update query share try/catch
**Impact**: If SELECT succeeds but UPDATE fails, user sees generic error

**Fix**: Separate the existence check from the update operation

---

## Acceptable Patterns (No Action Needed)

These files have grouped queries intentionally for transactional behavior:

- `plant/src/routes/auth/callback/+server.ts` - OAuth flow requires atomic success
- `plant/src/routes/api/webhooks/stripe/+server.ts` - Webhook retries on any failure
- `plant/src/routes/success/+page.server.ts` - Payment flow is logically dependent
- `plant/src/routes/checkout/+server.ts` - Checkout operations are dependent

---

## Verification Steps

After fixing each file:

1. Test with missing table (rename temporarily)
2. Verify graceful fallback behavior
3. Confirm unrelated functionality still works
4. Check console for expected warning logs
