# Curio: Badges

> *You earned this. Wear it proudly.*

**Priority:** Tier 3 — Ship When Ready
**Complexity:** Medium
**Category:** Social / Decoration
**Placement:** Right-vine, header-vine, dedicated page (`/badges/`)

---

## What

Collectible achievement and profile badges — small visual tokens that celebrate milestones, interests, and participation. Think: "Early Adopter," "100 Posts," "Night Owl," "Beta Tester," community badges, and custom personal ones.

Different from **Status Badges** (which are site-status indicators like "Under Construction"). These are about the *person* and their journey, not the site's state.

## Why

Badges create a sense of accomplishment and identity. They're collectible, shareable, and deeply personal. Early web had "award" badges you'd put on your site. Modern platforms use them for gamification. Grove can split the difference — badges that are meaningful, not manipulative. They celebrate what you've done, not pressure you into doing more.

---

## Database Schema

### Migration: `{next}_badges_curio.sql`

```sql
-- Badge definitions (what badges exist)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'achievement',
  rarity TEXT NOT NULL DEFAULT 'common',
  auto_criteria TEXT DEFAULT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Badges earned by tenants
CREATE TABLE IF NOT EXISTS tenant_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_showcased INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badge_definitions(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, badge_id)
);

-- Custom badges created by tenants (Oak+)
CREATE TABLE IF NOT EXISTS custom_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_badges_tenant ON tenant_badges(tenant_id);
CREATE INDEX idx_tenant_badges_showcased ON tenant_badges(tenant_id, is_showcased);
```

---

## Badge Categories

### System Badges (Auto-Awarded)
Awarded automatically when criteria are met:

| Badge | Criteria | Rarity |
|-------|----------|--------|
| Early Adopter | Signed up during beta | Rare |
| First Post | Published first blog post | Common |
| Prolific Writer | 50+ posts published | Uncommon |
| Centurion | 100+ posts published | Rare |
| Night Owl | 50%+ posts published 10pm-4am | Uncommon |
| Early Bird | 50%+ posts published 5am-9am | Uncommon |
| Consistent | Posted every week for 4+ weeks | Uncommon |
| Gallery Keeper | 50+ gallery images | Uncommon |
| Guestbook Star | 100+ guestbook entries received | Rare |
| Webring Walker | Member of 3+ webrings | Uncommon |
| Curator | 25+ links in Link Garden | Common |
| Seasonal | Active during all 4 seasons | Rare |

### Community Badges (Wayfinder-Awarded)
Given by the Wayfinder (Autumn) for community participation:

| Badge | Meaning |
|-------|---------|
| Beta Tester | Participated in beta testing |
| Bug Hunter | Found and reported a bug |
| Pathfinder | Appointed community guide |
| Seedling Nurturer | Helped new members |

### Custom Badges (Oak+)
Tenants create their own badges — for personal milestones, fandoms, interests. These only appear on their own site.

---

## Components

| Component | Purpose |
|-----------|---------|
| `BadgeDisplay.svelte` | Renders a single badge (icon + tooltip) |
| `BadgeShelf.svelte` | Vine-compatible display of showcased badges |
| `BadgeCollection.svelte` | Full page: all earned badges in grid |
| `BadgeAdmin.svelte` | Manage badges: showcase/hide, reorder |
| `BadgeEarned.svelte` | "You earned a badge!" notification animation |

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/badges` | Get tenant's earned badges | Public |
| `GET` | `/api/curios/badges/available` | List all possible badges | Public |
| `PATCH` | `/api/curios/badges/[id]` | Showcase/hide, reorder | Admin |
| `POST` | `/api/curios/badges/custom` | Create custom badge | Admin (Oak+) |
| `DELETE` | `/api/curios/badges/custom/[id]` | Delete custom badge | Admin |

---

## Key Implementation Details

- **Auto-award check:** Run on relevant events (post publish, gallery upload, etc.) or lazy-check on badge page load
- **Showcase system:** Tenants pick up to 5 badges to "showcase" (displayed in vine). Others visible on dedicated page.
- **Badge icons:** SVG with Foliage color variable integration, stored in `static/curios/badges/`
- **Rarity colors:** Common (bronze), Uncommon (silver), Rare (gold) — subtle glow on hover
- **"Earned" notification:** Toast animation when a new badge is awarded (one-time, dismissible)
- **Badge art:** Each badge needs a small SVG icon. Start with geometric/simple designs, refine later.
- **No FOMO:** Badges celebrate, never pressure. No "almost there!" prompts.

---

## Tier Logic

| Tier | System Badges | Custom Badges | Showcase |
|------|--------------|---------------|----------|
| Seedling | Yes (auto) | No | 3 badges |
| Sapling | Yes (auto) | No | 5 badges |
| Oak+ | Yes (auto) | Up to 10 custom | Unlimited |

---

## Implementation Steps

1. Design badge SVG icons (blocking creative dependency)
2. Migration + types in `index.ts`
3. `BadgeDisplay.svelte` — single badge renderer
4. `BadgeShelf.svelte` — vine component for showcased badges
5. `BadgeCollection.svelte` — full page grid
6. Auto-award criteria checker utility
7. API routes
8. Admin page (showcase selection, reorder, custom badge creation)
9. "Earned" notification component
10. Wire auto-checks into post publish, gallery upload, etc.
11. Public page at `/(site)/badges/`
12. Register in curio registry
13. Tests

---

*A small token. A quiet celebration. You were here and you did something.*
