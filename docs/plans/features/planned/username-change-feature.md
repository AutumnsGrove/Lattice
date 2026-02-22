---
title: "Username Change Feature Plan"
status: planned
category: features
---

# Username Change Feature Plan

## Overview

Allow users to change their Grove username (subdomain). This affects their site URL, CDN paths, and all public-facing references.

**Priority:** Low (Future Enhancement)
**Effort:** ~4-6 hours
**Dependencies:** None (can be built anytime)

## What Changes When Username Changes

| Resource | Old | New | Migration |
|----------|-----|-----|-----------|
| Site URL | `alice.grove.place` | `newname.grove.place` | Wildcard DNS handles it |
| CDN URLs | `cdn.grove.place/alice/...` | `cdn.grove.place/newname/...` | Copy R2 objects |
| Database | `username = 'alice'` | `username = 'newname'` | Single UPDATE |
| External links | Break | Work | Optional redirects |

## Implementation

### Phase 1: Core Change (~2h)

#### 1.1 Database Migration
```sql
-- Username change history for audit + preventing rapid re-registration
CREATE TABLE IF NOT EXISTS username_history (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  user_id TEXT NOT NULL,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL, -- When old username becomes available again
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_username_history_old ON username_history(old_username);
CREATE INDEX idx_username_history_user ON username_history(user_id);
```

#### 1.2 Username Change Service
```typescript
// libs/engine/src/lib/server/services/username-change.ts

interface UsernameChangeResult {
  success: boolean;
  error?: string;
  oldUsername: string;
  newUsername: string;
}

export async function changeUsername(
  db: D1Database,
  r2: R2Bucket,
  userId: string,
  newUsername: string
): Promise<UsernameChangeResult> {
  // 1. Validate new username (same rules as registration)
  // 2. Check not reserved/blocked
  // 3. Check not recently released (30-day hold)
  // 4. Update database
  // 5. Queue R2 migration (async)
  // 6. Record in username_history
  // 7. Return success
}
```

#### 1.3 Admin Settings UI
- Add "Change Username" section to `/admin/settings`
- Show current username
- Input for new username with real-time validation
- Warning about what will break (external links, embeds)
- Confirmation dialog (GlassConfirmDialog)

### Phase 2: R2 Migration (~1.5h)

#### 2.1 R2 Copy Worker
```typescript
// Can be done synchronously for small accounts, or queued for large ones
export async function migrateR2Objects(
  r2: R2Bucket,
  oldPrefix: string,
  newPrefix: string
): Promise<{ copied: number; failed: number }> {
  const objects = await r2.list({ prefix: oldPrefix });

  for (const obj of objects.objects) {
    const newKey = obj.key.replace(oldPrefix, newPrefix);
    const data = await r2.get(obj.key);
    if (data) {
      await r2.put(newKey, data.body, {
        httpMetadata: data.httpMetadata,
        customMetadata: data.customMetadata
      });
      await r2.delete(obj.key);
    }
  }
}
```

#### 2.2 Progress Tracking
- For accounts with many images, show migration progress
- Could use Durable Object for real-time progress updates
- Or just run synchronously with loading spinner (most accounts are small)

### Phase 3: Redirects (Optional, ~1.5h)

#### 3.1 Subdomain Redirect
```typescript
// In hooks.server.ts - check if subdomain is an old username
const oldUsernameRecord = await db.prepare(
  'SELECT new_username FROM username_history WHERE old_username = ? AND expires_at > unixepoch()'
).bind(subdomain).first();

if (oldUsernameRecord) {
  // Redirect to new subdomain
  return redirect(301, `https://${oldUsernameRecord.new_username}.grove.place${url.pathname}`);
}
```

#### 3.2 CDN Redirect (Optional)
- Could add a Worker in front of R2 to redirect old CDN paths
- Probably overkill - just let old URLs 404
- Document that external embeds will break

## Business Rules

### Rate Limiting
- **Free tier:** 1 change per year
- **Sapling:** 2 changes per year
- **Oak+:** Unlimited (but cooldown of 7 days between changes)

### Username Reservation Period
- Old username is **held for 30 days** after change
- Prevents impersonation/confusion
- After 30 days, username becomes available for new registrations
- Could extend to 90 days for Oak+ (protect their brand longer)

### Validation
- Same rules as initial registration:
  - 3-20 characters
  - Alphanumeric + hyphens (no leading/trailing hyphen)
  - Not in reserved list
  - Not in offensive blocklist
  - Not recently released by another user

## User Experience

### Change Flow
1. User goes to Settings → Account
2. Clicks "Change Username"
3. Enters new username
4. Real-time validation (availability, format)
5. Warning dialog explains consequences:
   - External links to old URL will break
   - Old username held for 30 days
   - RSS subscribers may need to re-subscribe
6. User confirms
7. Change happens immediately
8. Success message with new URL

### What We Tell Users
```
Changing your username will:
✓ Update your site to newname.grove.place
✓ Move all your images to the new location
✓ Keep all your posts and settings

⚠️ External links to your old URL will stop working
⚠️ RSS subscribers may need to update their feeds
⚠️ Your old username will be unavailable for 30 days
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User has 10,000+ images | Queue migration, show progress bar |
| R2 migration fails midway | Rollback database change, alert user |
| User tries to change back within 30 days | Allow it (they still "own" the old name) |
| Two users swap usernames | Works fine - 30-day hold prevents conflicts |
| Username in offensive blocklist added after registration | Allow change away, but not back |

## Testing

- [ ] Username validation (format, reserved, blocklist)
- [ ] R2 object migration (small account)
- [ ] R2 object migration (large account with pagination)
- [ ] Subdomain redirect for old username
- [ ] Rate limit enforcement per tier
- [ ] 30-day reservation period
- [ ] Rollback on migration failure

## Files to Create/Modify

### New Files
- `libs/engine/migrations/0XX_username_history.sql`
- `libs/engine/src/lib/server/services/username-change.ts`
- `libs/engine/src/lib/server/services/username-change.test.ts`
- `libs/engine/src/routes/admin/settings/username/+page.svelte`
- `libs/engine/src/routes/admin/settings/username/+page.server.ts`

### Modified Files
- `libs/engine/src/hooks.server.ts` (add redirect check)
- `libs/engine/src/routes/admin/settings/+page.svelte` (add link to username section)

## Not In Scope (V1 of this feature)

- CDN redirects (let old URLs 404)
- Email notification to followers
- Automatic RSS redirect
- Username "marketplace" or transfers between users

---

## Summary

This is a straightforward feature:
1. Validate new username
2. Update database
3. Copy R2 objects
4. (Optional) Redirect old subdomain

The 30-day reservation period and per-tier rate limits prevent abuse while keeping the feature simple.

**When to build:** When the first user asks for it, or when you have a spare afternoon post-launch.
