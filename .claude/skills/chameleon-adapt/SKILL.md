---
name: chameleon-adapt
description: Adapt UI to its environment with glassmorphism, seasonal themes, and nature components. The chameleon reads the light, blends with intention, and becomes one with the forest. Use when designing interfaces, theming pages, or making Grove feel alive.
---

# Chameleon Adapt

```
READ → SKETCH → COLOR → TEXTURE → ADAPT
```

Each phase loads one reference. Don't read them all up front — load the one the phase calls for.

## Reference Routing Table

| Phase   | Reference                         | Load When                                |
| ------- | --------------------------------- | ---------------------------------------- |
| READ    | —                                 | No reference needed (context assessment) |
| SKETCH  | `references/layout-patterns.md`   | When designing page structure            |
| COLOR   | `references/color-palette.md`     | When applying seasonal colors            |
| COLOR   | `references/groveterm-system.md`  | When writing user-facing text            |
| TEXTURE | `references/glass-components.md`  | When adding glassmorphism                |
| TEXTURE | `references/nature-components.md` | When adding nature decorations           |

---

## Phase 1: READ

Pick a season from the emotional tone, and a decoration level (`minimal` / `moderate` / `full`).

| Tone                | Season   | Mood                        |
| ------------------- | -------- | --------------------------- |
| Hope, renewal       | Spring   | Cherry blossoms, new growth |
| Growth, warmth      | Summer   | Full foliage, activity      |
| Harvest, reflection | Autumn   | Falling leaves, warm colors |
| Rest, stillness     | Winter   | Snow, frost, evergreens     |
| Dreams, far-future  | Midnight | Purple glow, fireflies      |

Decoration level follows the page's purpose: story pages get full atmosphere, data-dense admin screens get clean glass and no forest.

```svelte
import { season } from "$lib/stores/season";
const isAutumn = $derived($season === "autumn");
// Summer is the default — no flag needed.
```

**Output:** season + decoration level.

---

## Phase 2: SKETCH

`references/layout-patterns.md` — layering formula, sticky nav, page sections, responsive grid, spacing, layout accessibility.

```svelte
import { Glass, GlassCard, GlassButton } from "@lattice/ui/ui";

<Glass variant="tint" class="p-6 rounded-xl">
	<p>Readable text over busy backgrounds</p>
</Glass>
```

`references/glass-components.md` has the variants, props and CSS utilities.

**Output:** page structure with glass containers and z-index layers.

---

## Phase 3: COLOR

`references/color-palette.md` — every token with hex values, the seasonal palettes, helper functions (`getSeasonalGreens`, `getCherryColors`) and background gradients.

**Accent surfaces** (buttons, links, highlights, focus rings) use `var(--grove-accent-*)`, never hardcoded green. `var(--grove-accent)` solid, `-dark` for hover, `-N` for opacity tints. The user's accent may not be green. Pre-commit enforces it; brand greens in nature SVGs and the logo are fine with `// accent-ok`.

**Grove terminology** goes through GroveTerm components — `references/groveterm-system.md` for the suite, the `[[term|standard]]` syntax and the vocabulary.

**Output:** seasonal colours applied, terminology wrapped.

---

## Phase 4: TEXTURE

`references/nature-components.md` — component catalog, randomized forest algorithm, weather effects, seasonal birds, icon registry, mobile particle counts.

- Trees never overlap — 8% minimum gap.
- Lucide icons, never emojis.
- Respect the responsive density table.

**Output:** nature layered with correct z-index and density.

---

## Phase 5: ADAPT

Polish and accessibility:

- Particle counts down for mobile; every particle layer wrapped in `prefers-reduced-motion`
- Mobile overflow sheet for navigation
- Touch targets 44×44px minimum
- Dark-mode glass variants checked

**Verification is mandatory:**

```bash
pnpm install
gw ci --affected --fail-fast --diagnose
```

**Component check.** There is no isolated component harness (Showroom was removed in #1654). Capture the element where it renders and check it against `DESIGN.md`: colour tokens not hardcoded values, spacing on the 4px grid, type from the scale, visible focus ring, no skipped headings, alt text.

```bash
bun run glimpse capture "http://localhost:5173/[page]" -S "[selector]" -s autumn -t dark
```

**Visual verification.** Don't ship UI you haven't looked at.

```bash
./scripts/dev-stack.sh seed blog                       # if not seeded yet

bun run glimpse capture "http://localhost:5173/[page]?subdomain=midnight-bloom" -s autumn -t dark --logs

bun run glimpse matrix "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --seasons spring,summer,autumn,winter --themes light,dark
```

Interactive flows (clicks, tab order, focus traps) aren't what glimpse does — write a throwaway Playwright script against `@playwright/test`, copying the browser setup from `tools/glimpse/src/browser.ts`.

Iterate: capture → look → fix → capture. `dev-stack.sh seed fake 5` proves it survives arbitrary content.

**Final checklist:**

- [ ] CI: `gw ci --affected` clean
- [ ] Captured in every target season, light and dark, no console errors
- [ ] Glass used for readability over busy backgrounds
- [ ] Lucide icons, no emojis
- [ ] Mobile overflow menu present
- [ ] Decoration respects `prefers-reduced-motion`
- [ ] Touch targets ≥ 44×44px
- [ ] Trees randomized, 8% minimum gap
- [ ] Grove voice, GroveTerm components, `[[term]]` in data-driven strings

**Output:** adapted, accessible, responsive UI, visually verified.

---

## Chameleon Rules

**Intention.** Every colour choice serves the content. Decoration enhances readability; it never obstructs it.

**Restraint.** Not every page needs a forest. Data-dense interfaces deserve clean glass without distraction.

**Authenticity.** Use the seasonal system as intended. Spring isn't just "light colours" — it's renewal.

---

## When to Use

| Pattern            | Good for                                       |
| ------------------ | ---------------------------------------------- |
| Glassmorphism      | Text over backgrounds, navbars, cards, modals  |
| Randomized forests | Story pages, about pages, visual sections      |
| Seasonal themes    | Roadmaps, timelines, emotional storytelling    |
| Midnight Bloom     | Future features, dreams, mystical content      |
| Weather particles  | Hero sections, season transitions              |
| Birds              | Life in forest scenes, seasonal indicators     |

## When NOT to Use

| Pattern               | Avoid when                                        |
| --------------------- | ------------------------------------------------- |
| Heavy decoration      | Data-dense pages, admin interfaces, forms         |
| Particle effects      | Performance-critical pages, a11y concerns         |
| Seasonal colours      | Brand-critical contexts needing consistency       |
| Multiple glass layers | Blur cost                                          |
| Randomization         | Content that must match between sessions          |
| Complex forests       | Mobile-first pages, simple informational content  |

---

## Example Adaptation

> "Make this about page feel like Grove"

1. **READ** — team's journey, reflective → autumn, full decoration.
2. **SKETCH** — `layout-patterns.md`; glass cards, sticky nav.
3. **COLOR** — `color-palette.md` autumn palette; `groveterm-system.md` for copy.
4. **TEXTURE** — `nature-components.md` + `glass-components.md`; aspen/birch, falling leaves, cardinals.
5. **ADAPT** — responsive density, reduced motion, GroveTerm greeting, 44px targets, dark mode, CI.

---

## Integration with Other Skills

- **`/gathering-ui`** — pairs chameleon with deer-sense for accessible UI in one pass
- **`/deer-sense`** — accessibility audit after adaptation
- **`/grove-ui-design`** — broader UI patterns and component selection
- **`/beaver-build`** — tests covering interactive UI after adaptation

---

_The forest welcomes those who adapt with intention._
