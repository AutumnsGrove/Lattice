# Curio: Weird Artifacts

> *Click the thing and something unexpected happens.*

**Priority:** Tier 3 — Ship Incrementally
**Complexity:** Medium (many small components)
**Category:** Interactive
**Placement:** Right-vine, left-vine, floating

---

## What

Interactive chaos objects — Magic 8-Ball, fortune cookies, dice rollers, tarot cards, marquee text, rainbow dividers, and more. The playful, weird stuff that makes a personal site delightful.

## Why

Pure delight. These are conversation starters, the things people screenshot and share. "Look, their site has a magic 8-ball!" They're individually simple but collectively create a sense of whimsy and discovery.

**Ship incrementally:** Start with 3-4 artifacts and add more over time.

---

## Database Schema

### Migration: `{next}_artifact_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'right-vine',
  config TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_artifacts_tenant ON artifacts(tenant_id);
```

---

## Artifact Types

### Mystical
| Artifact | Description |
|----------|-------------|
| `Magic8Ball` | Click to shake, get an answer. Customizable answer pool. |
| `TarotCard` | Random daily card draw with meaning. Seeded by date (consistent per day). |
| `FortuneCookie` | Crack open for a daily fortune. |
| `CrystalBall` | Swirling animated mist (decorative). |
| `GlowingRunes` | Animated symbols (decorative). |

### Interactive
| Artifact | Description |
|----------|-------------|
| `DiceRoller` | Click to roll. Configurable: d4, d6, d8, d12, d20. |
| `CoinFlip` | Heads or tails with flip animation. |

### Classic Web
| Artifact | Description |
|----------|-------------|
| `MarqueeText` | Scrolling messages (CSS animation, not `<marquee>`). |
| `BlinkingNew` | The "NEW!" blinker. |
| `RainbowDivider` | Colorful separator lines. |
| `EmailButton` | Retro "Email Me!" button. |

---

## Components

Each artifact is a self-contained Svelte component:

```
packages/engine/src/lib/curios/artifacts/
├── index.ts
├── Magic8Ball.svelte
├── TarotCard.svelte
├── FortuneCookie.svelte
├── DiceRoller.svelte
├── CoinFlip.svelte
├── MarqueeText.svelte
├── ...
```

Plus `ArtifactRenderer.svelte` — reads artifact type from config and renders the correct component.

---

## Key Implementation Details

- **Self-contained:** Each artifact is a standalone component with no external deps
- **Config as JSON:** Per-artifact config stored in `artifacts.config` (custom answers for 8-ball, marquee text, etc.)
- **Daily draws** (tarot, fortune) seeded by `sha256(date + tenant_id)` — consistent per day per tenant
- **All interactive artifacts keyboard-accessible** (Enter/Space to activate)
- **Reduced motion:** Static fallbacks for all animations
- **Magic 8-Ball** supports custom answer pools (JSON array in config)
- **Marquee uses CSS** `animation: scroll` — never HTML `<marquee>`

---

## Suggested First Batch (Ship These First)

1. **Magic 8-Ball** — Iconic, interactive, fun
2. **MarqueeText** — Classic web, instant nostalgia
3. **FortuneCookie** — Daily interaction, keeps people coming back
4. **DiceRoller** — Simple, satisfying

Add the rest over time.

---

## Tier Logic

| Tier | Artifacts | Types |
|------|----------|-------|
| Seedling | 2 | Decorative only (Runes, Dividers) |
| Sapling | 5 | All types |
| Oak+ | Unlimited | All types |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `ArtifactRenderer.svelte` — type-switching wrapper
3. First batch: Magic8Ball, MarqueeText, FortuneCookie, DiceRoller
4. API routes (CRUD for artifact placement/config)
5. Admin page (add artifacts, configure, reorder)
6. Register in curio registry
7. Tests
8. Add more artifacts over time (TarotCard, CoinFlip, etc.)

---

*Reach into the cabinet. What will you find?*
