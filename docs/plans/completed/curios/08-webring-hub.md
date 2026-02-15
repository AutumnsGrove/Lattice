# Curio: Webring Hub

> *We're all connected, and clicking through is the adventure.*

**Priority:** Tier 2 — Build Next
**Complexity:** Low (Phase 1), High (Phase 2)
**Category:** Social
**Placement:** Footer-vine (classic), right-vine, floating

---

## What

Join and navigate webrings — a classic navigation element linking related sites in a loop. Phase 1: support external webrings. Phase 2 (future): Grove-native webrings across `*.grove.place` sites.

## Why

Webrings are THE defining feature of the indie web revival. They're how people discover sites organically, without algorithms. The [← Prev | Hub | Next →] bar is iconic. Grove is perfectly positioned to offer native webring support.

---

## Database Schema

### Migration: `{next}_webring_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS webring_memberships (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ring_name TEXT NOT NULL,
  ring_home_url TEXT DEFAULT NULL,
  prev_url TEXT NOT NULL,
  next_url TEXT NOT NULL,
  badge_style TEXT NOT NULL DEFAULT 'bar',
  badge_image_url TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_webring_memberships_tenant ON webring_memberships(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `WebringNav.svelte` | Classic [← Prev \| Ring \| Next →] bar |
| `WebringBadge.svelte` | Compact 88x31 button or small badge |
| `WebringList.svelte` | List all ring memberships (if multiple) |
| `WebringAdmin.svelte` | Manage ring memberships |

---

## Display Styles

- **Bar** — Classic horizontal [← Prev | Ring Name | Next →] (default)
- **Badge** — 88x31 button image (custom or auto-generated)
- **Compact** — Small text-only: "← Ring Name →"
- **Floating** — Fixed-position floating bar

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/webring` | Get ring memberships | Public |
| `POST` | `/api/curios/webring` | Add ring membership | Admin |
| `PUT` | `/api/curios/webring/[id]` | Update membership | Admin |
| `DELETE` | `/api/curios/webring/[id]` | Leave ring | Admin |

---

## Key Implementation Details

### Phase 1: External Webrings (Build Now)
- User manually inputs: ring name, prev URL, next URL, home URL
- Renders the classic navigation bar
- Multiple ring memberships supported
- Footer placement is the classic position
- Badge images can be uploaded or auto-generated

### Phase 2: Grove-Native Webrings (Future)
This would be a bigger project requiring its own service:
- `webring.grove.place` service managing ring membership and routing
- Any `*.grove.place` site can create or join rings
- Auto-routing: the ring service handles prev/next resolution
- Ring directory: browse and discover rings
- This deserves its own spec when the time comes

---

## Tier Logic

| Tier | Memberships |
|------|------------|
| Seedling | 1 ring |
| Sapling | 3 rings |
| Oak+ | Unlimited |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `WebringNav.svelte` — the classic nav bar
3. `WebringBadge.svelte` — compact badge option
4. API routes (CRUD for memberships)
5. Admin page (add/edit ring info, style picker)
6. Register in curio registry
7. Tests

Phase 2 is a separate spec and separate project.

---

*Follow the ring. See where it leads.*
