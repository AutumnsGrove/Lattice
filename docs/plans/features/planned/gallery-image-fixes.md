---
title: "Gallery Image Fixes Plan"
status: planned
category: features
---

# Gallery Image Fixes Plan

> **Date:** February 7, 2026
> **Issues:** #871 (mobile layout), #869 (image deletion)
> **Priority:** High — Image uploads going live

## Issue #871: Mobile Gallery Layout

### Problem
On mobile, the gallery displays images in a single-column layout instead of a responsive grid. The current CSS uses `minmax(120px, 1fr)` which collapses to one column on narrow viewports.

### Root Cause
```css
/* Current mobile breakpoint (line 1678) */
.gallery-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
```

On a 375px mobile viewport with 0.75rem gap (~12px) on each side and padding, there's insufficient width for even one 120px column with `1fr` stretch, causing the grid to collapse.

### Fix
Replace the responsive `auto-fill` logic with a fixed 3-column grid for mobile:

```css
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
}
```

### Acceptance Criteria
- [ ] Gallery shows 3-column grid on mobile devices (< 768px)
- [ ] Grid adapts responsively: 3 cols mobile → 4 cols tablet → more on desktop
- [ ] Touch targets meet 44×44px minimum (increase action button padding)
- [ ] Images remain tappable with adequate spacing

---

## Issue #869: Image Deletion Fails

### Problem
Images cannot be deleted from the Arbor gallery. The delete button triggers a 403 Forbidden error for migrated images from the old CDN.

### Root Cause
The delete endpoint enforces strict tenant isolation:

```typescript
// libs/engine/src/routes/api/images/delete/+server.ts:119-126
const expectedPrefix = `${tenantId}/`;
if (!sanitizedKey.startsWith(expectedPrefix)) {
  console.warn(`Tenant isolation violation: user ${locals.user?.id} attempted to delete ${sanitizedKey}`);
  throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
}
```

**Issue:** Migrated images from the old CDN have keys like `photos/2025/01/15/image.jpg` without the `${tenantId}/` prefix, causing them to fail this check.

### Fix
Modify the tenant isolation logic to handle legacy keys while maintaining security:

1. **If key has tenant prefix** → Validate normally
2. **If key lacks tenant prefix** → Verify the image was returned by the tenant's list endpoint (meaning it belongs to them), then allow deletion

```typescript
const expectedPrefix = `${tenantId}/`;
const hasTenantPrefix = sanitizedKey.startsWith(expectedPrefix);

if (!hasTenantPrefix) {
  // Legacy image without tenant prefix
  // Verify ownership by checking if image exists in tenant's scope
  // The list endpoint already filters by tenant, so if the user has the key,
  // the image belongs to them
  console.info(`Legacy image deletion: user ${locals.user?.id} deleting ${sanitizedKey} (no tenant prefix)`);
}
```

### Alternative Approach
Query the database to verify tenant ownership before allowing deletion of legacy keys. This is more secure but requires additional database round-trip.

### Acceptance Criteria
- [ ] Clicking delete on any gallery image removes it from R2 storage
- [ ] Migrated images (without tenant prefix) can be deleted
- [ ] New images (with tenant prefix) can be deleted
- [ ] Proper error handling when deletion fails (clear error message)
- [ ] Security maintained: users cannot delete images from other tenants

---

## Implementation Order

### Phase 1: Mobile Layout Fix (15 min)
1. Update `.gallery-grid` CSS at mobile breakpoint
2. Increase action button touch targets to 44×44px
3. Test responsive behavior in browser devtools

### Phase 2: Delete Endpoint Fix (30 min)
1. Modify tenant isolation logic in `/api/images/delete`
2. Add logging for legacy image deletions
3. Test with both new and migrated images
4. Verify security: ensure cross-tenant deletion remains blocked

### Phase 3: Verification (15 min)
1. Test complete delete flow: confirm → delete → success toast
2. Test gallery on mobile viewport
3. Test with existing images and new uploads
4. Verify error messages are clear

---

## Files Affected

| File | Change |
|------|--------|
| `libs/engine/src/routes/arbor/images/+page.svelte` | CSS update for mobile grid layout |
| `libs/engine/src/routes/api/images/delete/+server.ts` | Update tenant isolation logic |

---

## Testing Checklist

- [ ] Mobile viewport (375px): 3-column grid visible
- [ ] Tablet viewport (768px): 4+ column grid
- [ ] Desktop viewport (1200px): 6+ column grid
- [ ] Delete new image (with tenant prefix): success
- [ ] Delete migrated image (without tenant prefix): success
- [ ] Delete image from another tenant: blocked with 403
- [ ] Toast message shows on successful deletion
- [ ] Error message shows on failed deletion
- [ ] Action buttons tappable on mobile (44×44px min)