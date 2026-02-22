---
title: "Curio: Hit Counter"
status: planned
category: features
---

# Curio: Hit Counter

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 1

---

**Character**: Grove-ified retro. Retro SHAPES, nature PALETTE. Each style is a _personality_ — its own entrance, its own daylight feel, its own night-mode glow.

### Design spec (safari-approved)

**4 styles, each fully realized:**

#### Classic — Frosted glass digit cells

- Each digit in its own frosted glass cell (not opaque black)
- Grove-green text with subtle glow bleeding through glass
- Entrance animation: Fade in with green glow pulse
- Night mode: Glass cells glow warmer, green becomes more luminous against dark. Like a display case lit from within.

#### Odometer — Warm mechanical flip counter

- Cream/parchment digit cards in brass/gold bezels
- Glass-fronted — like looking through a display case at a brass instrument
- Entrance animation: CSS flip animation, digits roll into place (~1.5s)
- Night mode: Warm lamplight feel. Brass catches amber light, cream darkens to warm tan.
- Respects prefers-reduced-motion (instant position, no flip)

#### LCD — Full seven-segment display

- Actual CSS seven-segment characters with GHOSTED inactive segments visible behind active ones
- Leaf-green tint on the "screen" panel
- Entrance animation: LCD flicker-on, like powering up a calculator
- Night mode: "Clock on the nightstand" vibe. Screen glow becomes the primary light source. Deeper black surround.

#### Minimal — Subtle accent text

- Number in grove-green, rest in muted text
- Tiny leaf or dot separator between label and number
- Entrance animation: None — just appears. Minimal means minimal.
- Night mode: Green brightens slightly, muted text warms.

### Label system

- **Presets + free text**: Offer warm presets with custom option
  - "You are visitor" (default)
  - "Wanderer #"
  - "Welcome, traveler #"
  - "Soul #"
  - Custom (free text, max 100 chars)
- **Toggle to hide label entirely** — some people want just the number

### Since-date display

- **Owner's choice** between two presentations:
  - **Footnote**: Small muted italic below digits — "counting since Jan 2026"
  - **Integrated**: Etched/engraved into the counter frame — like a plaque date on a brass instrument
- Toggle to hide entirely (existing `showSinceDate` field)

### Dedup strategy

- **Owner-configurable**: "every visit" or "unique daily"
- Unique daily: `SHA-256(ip + userAgent + date + pagePath)` checked against `hit_counter_visitors` table
- Privacy-preserving — no PII stored, hash is one-way
- New field on config: `countMode: "every" | "unique"`

### Public component fixes

- [ ] Implement all 4 styles (currently only classic renders)
- [ ] Use `style` field from API to select renderer
- [ ] Render label from API data
- [ ] Render since-date with owner's chosen presentation
- [ ] Replace hardcoded colors with CSS custom properties / grove palette
- [ ] Add dark mode / night-mode character per style
- [ ] Add style-dependent entrance animations
- [ ] Respect `prefers-reduced-motion` (instant states, no animation)

### API fixes

- [ ] Add `countMode` field to config (`"every" | "unique"`)
- [ ] Create `hit_counter_visitors` table for dedup hashes
- [ ] Implement daily hash dedup when `countMode === "unique"`
- [ ] Add since-date display style field (`"footnote" | "integrated"`)

### Admin fixes

- [ ] Add label presets dropdown + custom input
- [ ] Add count mode toggle (every visit vs unique daily)
- [ ] Add since-date display style picker
- [ ] Update live preview to match all 4 grove-ified styles
