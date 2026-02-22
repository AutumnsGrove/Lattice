---
title: "Curio: Cursors"
status: planned
category: features
---

# Curio: Cursors

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 15

---

**Character**: Enchanted forest meets cozy companion. The site whispers "you're in my world now." A leaf drifting after your mouse. A butterfly that settles when you stop. Not flashy — alive.

### Public component — hollow facade

- [x] Config fetching and body style application works
- [ ] **Only 3 of 13 presets have SVGs** (leaf, paw, star) — paw isn't even in the preset list! Other 10 presets silently fall back to default cursor.
- [ ] **Trail system is a comment**: `<!-- Trail canvas would go here in future -->`. Admin configures trails, visitors get nothing.
- [ ] **No `prefers-reduced-motion` check** despite docs claiming it
- [ ] **Hardcoded colors**: Existing SVGs use `#4ade80`, `#a78bfa`, `#fbbf24` instead of grove palette vars
- [ ] **Custom URL has no sanitization** beyond basic URL validation

---

### Cursor Design Spec

#### Preset categories (expanded)

| Category         | Cursors                                    | Feel                        |
| ---------------- | ------------------------------------------ | --------------------------- |
| **Nature**       | leaf, flower, butterfly, ladybug, raindrop | The grove around you        |
| **Whimsical**    | sparkle, wand, mushroom                    | Fairy tale energy           |
| **Classic**      | hourglass                                  | Timeless                    |
| **Seasonal**     | snowflake, pumpkin, blossom, falling-leaf  | The seasons made visible    |
| **Cozy** _(NEW)_ | candle, teacup, book, lantern, pen/quill   | Midnight tea shop companion |

#### All 13+ presets need SVGs built

Every preset needs a proper SVG data URI with grove palette colors. Current state: only 3 exist. Priority: build all nature + cozy first, then seasonal, then whimsical + classic.

#### Subtle animation (where natural)

Some cursors have gentle idle/movement animation:

- **Butterfly**: Wings gently flap
- **Candle**: Tiny flame flicker
- **Leaf/falling-leaf**: Sways softly
- **Sparkle**: Twinkles
- **Raindrop**: Subtle wobble

Static cursors (mushroom, book, hourglass, etc.) stay still — animation only where motion is _natural_. CSS animation or sprite-based, respects `prefers-reduced-motion`.

#### Seasonal mode (optional toggle per cursor)

Owner can enable "seasonal mode" — cursor adapts to site season:

- **Leaf**: spring green → summer deep → autumn orange → winter frost/bare
- **Flower**: spring cherry blossom → summer full bloom → autumn dried → winter none (falls back to snowflake?)
- Uses existing `getSeasonalGreens()` / palette functions — no new color infra needed

When seasonal mode is OFF, cursor stays exactly as configured.

#### Trail system: ACTUALLY BUILD IT

Canvas-based particle trail, layered over page (`pointer-events: none`, high z-index):

| Trail effect   | Particles            | Behavior                       |
| -------------- | -------------------- | ------------------------------ |
| **Sparkle**    | Tiny bright dots     | Twinkle and fade in place      |
| **Fairy dust** | Soft glowing circles | Drift downward slowly, fade    |
| **Leaves**     | Tiny leaf shapes     | Tumble and rotate as they fall |
| **Stars**      | Small star shapes    | Shrink as they fade            |

Each particle: position, velocity, opacity, lifetime, rotation (for leaves). Canvas clears and redraws each frame. Cap particle count for performance.

**Trails are seasonal if cursor is**: If owner enables seasonal mode, trail colors shift too:

- Winter sparkle → ice crystal blue
- Autumn leaves → warm reds/oranges
- Spring fairy dust → cherry blossom pink
- Summer → default green/gold

**Performance & a11y**:

- Skip trails entirely on `prefers-reduced-motion: reduce`
- Cap at ~30 active particles
- RequestAnimationFrame with frame skipping on low-end devices

### Admin

- [ ] (Good foundation — radio presets by category, trail toggle, length slider)
- [ ] Add **seasonal mode toggle** per cursor
- [ ] Add **cozy category** presets
- [ ] Show animated preview of selected cursor + trail in admin
- [ ] Custom cursor upload via Custom Uploads curio picker

---
