# Plan: Add [[term]] Syntax to Documentation

**Goal:** Update all Grove documentation to use the new `[[term]]` GroveTerm syntax for interactive terminology.

**Status:** Phase 4 complete (rehype plugin built). Now adding brackets to existing docs.

---

## Scope

| Priority | Location | Files | Description |
|----------|----------|-------|-------------|
| **HIGH** | `docs/help-center/articles/` | 78 | User-facing help articles |
| MEDIUM | `docs/specs/` | 64 | Technical specifications |
| LOW | `docs/philosophy/` | 66 | Internal naming research |
| SKIP | `docs/plans/`, `docs/museum/` | 100+ | Historical/internal docs |

**Focus:** 78 help center articles first. These are user-facing and will render GroveTerm components.

---

## Available Terms (57)

```
amber, arbor, aria, blooms, burrow, centennial, clearing, curios, etch,
flow, foliage, forage, forests, gossamer, grafts, heartwood, ivy, lattice,
loam, lumen, meadow, mycelium, nook, outpost, pantry, passage, pathfinder,
patina, petal, plant, porch, press, reeds, reverie, rings, rooted, scribe,
shade, shutter, terrarium, thorn, trace, trails, trove, verge, vineyard,
vista, wander, wanderer, warden, wayfinder, waystone, weave, wisp,
your-garden, your-grove, zephyr
```

**Common aliases:**
- "grove" → `[[your-grove|grove]]`
- "garden" → `[[your-garden|garden]]`
- "bloom" (singular) → `[[blooms|bloom]]`

---

## Transformation Examples

**Before:**
```markdown
Your garden is where blooms live. See [foliage](/knowledge/help/what-is-foliage).
```

**After:**
```markdown
Your [[your-garden|garden]] is where [[blooms]] live. See [[foliage]].
```

---

## Rules

1. **First occurrence only** per article (avoid clutter)
2. **Skip headings** - don't bracket terms in h1/h2/h3
3. **Skip code blocks** - terms in backticks stay plain
4. **Replace existing links** - `[blooms](/knowledge/help/...)` → `[[blooms]]`
5. **Use display text** for natural reading when slug differs from prose

---

## Implementation

Work through articles one at a time:

1. Open article
2. Find Grove terminology mentions
3. Add `[[term]]` or `[[term|display]]` brackets
4. Save and move to next

No automation needed - manual pass is faster and catches context.

---

## Files (78 Help Articles)

Location: `/docs/help-center/articles/`

**Start with core concepts:**
- `what-is-grove.md`
- `what-is-my-grove.md`
- `what-is-my-garden.md`
- `wanderers-and-pathfinders.md`
- `what-are-blooms.md`

Then continue through remaining articles alphabetically.

---

## Verification

1. `bun run build` - Build succeeds
2. `bun run dev` - Articles render GroveTerm components
3. Hover test - Definitions appear on hover
