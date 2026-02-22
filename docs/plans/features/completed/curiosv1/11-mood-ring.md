# Curio: Mood Ring

> *The site reflects how I'm feeling.*

**Priority:** Tier 3 — Ship When Ready
**Complexity:** Low-Medium
**Category:** Decoration
**Placement:** Right-vine, left-vine, floating

---

## What

A visual mood indicator — a gem or ring that changes color based on time of day, season, manual mood setting, or randomness. Ambient, decorative, personal.

## Why

Different from Activity Status (which is text). This is purely visual and ambient. The ring/gem transitions through colors smoothly throughout the day, creating a living decoration. The optional mood log creates a beautiful color timeline over time.

---

## Database Schema

### Migration: `{next}_moodring_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS mood_ring_config (
  tenant_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'time',
  manual_mood TEXT DEFAULT NULL,
  manual_color TEXT DEFAULT NULL,
  color_scheme TEXT NOT NULL DEFAULT 'default',
  display_style TEXT NOT NULL DEFAULT 'ring',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mood_ring_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  mood TEXT NOT NULL,
  color TEXT NOT NULL,
  note TEXT DEFAULT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_mood_ring_log_tenant ON mood_ring_log(tenant_id, logged_at);
```

---

## Modes

| Mode | Behavior |
|------|----------|
| **Time-based** | Dawn (calm blue) → Morning (warm gold) → Afternoon (bright green) → Evening (purple) → Night (deep indigo) |
| **Manual** | Set your mood with a name + color |
| **Seasonal** | Follows the Grove season system (Spring green, Summer gold, Autumn amber, Winter blue, Midnight purple) |
| **Random** | Subtle color shift on each visit within a palette |

---

## Components

| Component | Purpose |
|-----------|---------|
| `MoodRing.svelte` | The ring/gem itself (animated color transitions) |
| `MoodRingAdmin.svelte` | Set mode, manual mood, view log |
| `MoodLog.svelte` | Optional: color timeline of past moods |

---

## Key Implementation Details

- **Pure CSS/SVG** for the ring (radial gradients, smooth transitions)
- **Color transitions** animated via CSS `transition` (60s between states for time mode)
- **Mood log** creates a timeline: a row of colored dots, one per day
- **Foliage integration:** Seasonal mode reads from the global season context
- **Display styles:** Ring (circle), Gem (diamond shape), Orb (glowing sphere)
- **Tooltip** shows current mood name on hover

---

## Tier Logic

| Tier | Modes | Log |
|------|-------|-----|
| Seedling | Time-based only | No |
| Sapling | Manual + time | No |
| Oak+ | All modes | Yes (mood logging) |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `MoodRing.svelte` — ring with CSS gradient animation
3. Time-based color calculation utility
4. Seasonal mode integration with Foliage
5. Admin page (mode selector, manual mood input)
6. Mood log display (color timeline)
7. API routes
8. Register in curio registry
9. Tests

---

*The ring glows softly. The grove knows how you feel.*
