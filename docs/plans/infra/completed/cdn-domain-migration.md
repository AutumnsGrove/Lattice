# CDN Domain Migration Plan

## Overview

Migrate CDN URLs from `cdn.autumnsgrove.com` to `cdn.grove.place` with proper multi-tenant URL structure.

**Current State:** CDN URLs hardcoded to `cdn.autumnsgrove.com` (personal domain)
**Target State:** `cdn.grove.place/{username}/photos/YYYY/MM/DD/filename.webp`

## Architecture (Option C: Hybrid)

```
┌──────────────────────────────────────────────────────────────┐
│                     cdn.grove.place                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   /alice/photos/2025/01/19/sunset.webp   ← Alice's images   │
│   /bob/photos/2025/01/18/profile.webp    ← Bob's images     │
│   /dave/photos/2025/01/17/banner.webp    ← Dave's images    │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Cloudflare R2 Bucket                   │   │
│   │   Key: {tenantId}/photos/YYYY/MM/DD/filename.webp   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Why Option C (Hybrid)?**

- Single domain is simpler to manage (no wildcard SSL complexity)
- Path-based routing is clear and predictable
- Tenant isolation already built into R2 keys
- Human-readable URLs (`/alice/...` not `/abc123-def456/...`)
- Works well with Cloudflare's caching and CDN

## Current Implementation

### R2 Key Structure (Already Correct!)

```typescript
// libs/engine/src/routes/api/images/upload/+server.ts:304
const key = `${tenantId}/${datePath}/${filename}`;
// Results in: alice/photos/2025/01/19/sunset.webp
```

### Tenant Resolution (Already Correct!)

```typescript
// Tenant ID = subdomain (human-readable!)
const tenantId = event.url.hostname.split(".")[0];
// alice.grove.place → 'alice'
```

### CSP Headers (Partially Prepared!)

```typescript
// libs/engine/src/hooks.server.ts:548
// Already includes both domains - just remove the old one after migration
"img-src 'self' https://cdn.autumnsgrove.com https://cdn.grove.place data:";
```

## Migration Tasks

### Phase 1: Infrastructure Setup

| #   | Task                                           | Effort | Notes                                   |
| --- | ---------------------------------------------- | ------ | --------------------------------------- |
| 1.1 | Create cdn.grove.place CNAME in Cloudflare DNS | 5m     | Point to R2 public bucket URL           |
| 1.2 | Configure R2 bucket custom domain              | 10m    | Link cdn.grove.place to IMAGES bucket   |
| 1.3 | Verify SSL certificate provision               | 5m     | Cloudflare handles automatically        |
| 1.4 | Test CDN access with new domain                | 10m    | `curl https://cdn.grove.place/test/...` |

### Phase 2: Code Updates

| #   | Task                             | File                                                        | Line |
| --- | -------------------------------- | ----------------------------------------------------------- | ---- |
| 2.1 | Update upload CDN URL            | `libs/engine/src/routes/api/images/upload/+server.ts`       | 321  |
| 2.2 | Update list CDN URL              | `libs/engine/src/routes/api/images/list/+server.ts`         | 94   |
| 2.3 | Clean CSP headers                | `libs/engine/src/hooks.server.ts`                           | 548  |
| 2.4 | Update GutterManager placeholder | `libs/engine/src/lib/components/admin/GutterManager.svelte` | 506  |

### Phase 3: Test & Documentation Updates

| #   | Task                     | File                                                           |
| --- | ------------------------ | -------------------------------------------------------------- |
| 3.1 | Update test fixtures     | `libs/engine/src/lib/server/services/tenant-isolation.test.ts` |
| 3.2 | Update any documentation | Various                                                        |

## Code Changes

### 2.1 Upload CDN URL

```typescript
// libs/engine/src/routes/api/images/upload/+server.ts:321
// FROM:
const cdnUrl = `https://cdn.autumnsgrove.com/${key}`;
// TO:
const cdnUrl = `https://cdn.grove.place/${key}`;
```

### 2.2 List CDN URL

```typescript
// libs/engine/src/routes/api/images/list/+server.ts:94
// FROM:
url: `https://cdn.autumnsgrove.com/${obj.key}`,
// TO:
url: `https://cdn.grove.place/${obj.key}`,
```

### 2.3 CSP Headers

```typescript
// libs/engine/src/hooks.server.ts:548
// FROM:
"img-src 'self' https://cdn.autumnsgrove.com https://cdn.grove.place data:",
// TO:
"img-src 'self' https://cdn.grove.place data:",
```

## Environment Consideration

Consider extracting CDN_DOMAIN to environment variable for flexibility:

```typescript
// Option: Environment variable approach (future enhancement)
const CDN_DOMAIN = platform?.env?.CDN_DOMAIN || "cdn.grove.place";
const cdnUrl = `https://${CDN_DOMAIN}/${key}`;
```

For now, hardcoding `cdn.grove.place` is fine since it's a permanent domain.

## Rollback Strategy

If issues arise after migration:

1. CSP already allows both domains (can revert code without CSP change)
2. R2 bucket is unchanged - same keys work with either domain
3. DNS change can be reverted in minutes

## Verification Checklist

- [ ] cdn.grove.place DNS configured
- [ ] R2 custom domain linked
- [ ] SSL certificate active
- [ ] Test image upload returns new CDN URL
- [ ] Test image list returns new CDN URLs
- [ ] CSP headers only include cdn.grove.place
- [ ] All existing images accessible via new domain
- [ ] Build passes: `pnpm build`
- [ ] Tests pass: `pnpm test`

## Total Effort

| Phase                  | Time        |
| ---------------------- | ----------- |
| Infrastructure Setup   | 30 min      |
| Code Updates           | 15 min      |
| Testing & Verification | 15 min      |
| **Total**              | **~1 hour** |

## Notes

- **No data migration needed** - R2 keys unchanged, just URL prefix changes
- **Tenant isolation preserved** - Same `{tenant}/photos/...` structure
- **Backward compatibility** - Old URLs will continue working if old domain stays configured
- **V1 Blocker?** - Yes, should be done before public launch to avoid URL changes for users
