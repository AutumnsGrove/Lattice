---
title: "Curio: Mood Ring"
status: planned
category: features
---

# Curio: Mood Ring

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 2

---

**Character**: Mystical artifact. Glass surface with color swirling beneath, like liquid aurora trapped in crystal. The most visually enchanting curio in the system. Never static — always shifting, always alive.

### Critical finding: Public component ignores displayStyle

The admin has 3 display styles with distinct CSS (ring=glowing circle, gem=rotated diamond with light, orb=radial gradient with double shadow). The public component ignores `displayStyle` entirely and always renders a plain 2rem circle with a 3px border and crude `{color}22` fill. No glow, no animation, no life. Also: color schemes are single static hex values, time mode snaps between 7 discrete colors, random mode changes every ~10 seconds (jarring), and the component uses its own season logic instead of Grove's.

### Design spec (safari-approved)

**7 display shapes (expanded from 3):**

1. **Ring** — Hollow circle with glowing, shifting border. Aurora gradient rotates around the ring.
2. **Gem** — Rotated diamond with faceted light refraction. Light plays across facets.
3. **Orb** — Sphere with radial gradient + depth. Color swirls in the center.
4. **Crystal** — Elongated hexagon with prismatic color shift.
5. **Flame** — Teardrop pointing up with warm flicker animation.
6. **Leaf** — Organic grove-native shape. Color flows through it like sap.
7. **Moon** — Crescent that could fill/empty with mood intensity.

**Aurora effect: Animated gradient**

- CSS conic-gradient or radial-gradient that slowly rotates/shifts
- Two colors from the active palette blending into each other, always moving
- Each shape inherits the gradient animation but it manifests naturally per shape
- Respects `prefers-reduced-motion` (static gradient, no animation)

**Time-based mode: Smooth interpolation**

- CSS color interpolation between time periods
- Ring gradually shifts from dawn-gold to morning-green over 2 hours
- Never snaps, never static — living, breathing color
- Replace discrete 7-period lookup with continuous interpolation function

**Color schemes: Palette + mood mapping**

- Each scheme becomes a language mapping moods to colors:
  - **Default**: happy=grove-green, calm=soft-teal, tired=warm-amber, sad=muted-blue, energetic=bright-lime
  - **Warm**: happy=gold, calm=amber, tired=rust, sad=warm-clay, energetic=coral
  - **Cool**: happy=sky-blue, calm=teal, tired=slate, sad=deep-blue, energetic=bright-cyan
  - **Forest**: happy=bright-moss, calm=deep-evergreen, tired=bark-brown, sad=rain-gray, energetic=spring-lime
  - **Sunset**: happy=amber, calm=coral, tired=violet, sad=deep-plum, energetic=hot-orange
- In manual mode, owner picks a mood from the scheme's vocabulary (not raw hex)
- Scheme defines the visual dialect — same mood, different color language

**Mood log: Optional public dot constellation**

- Owner can toggle public visibility of the mood log
- Displays as scattered dots in a small field (not a strict line) — like stars
- Recent moods are brighter and more vivid, older ones fade and dim
- Hover a dot to see mood name + note + date
- Organic and irregular, not mechanical or chart-like

**Random mode fix:**

- Current: changes every ~10 seconds (jarring)
- New: slow continuous drift between palette colors. Seeded per-visit for consistency during a session, but different each visit.

**Seasonal mode fix:**

- Use Grove's existing season system instead of separate month-based logic
- Tie into the nature palette system (`getSeasonalGreens()`, etc.)

### Public component fixes

- [ ] Implement all 7 display shapes with proper CSS
- [ ] Add aurora animated gradient effect per shape
- [ ] Implement smooth color interpolation for time-based mode
- [ ] Replace static color schemes with mood-mapped palettes
- [ ] Add optional dot constellation mood log display
- [ ] Fix random mode to use slow continuous drift
- [ ] Fix seasonal mode to use Grove's season system
- [ ] Replace crude `{color}22` fill with proper glass/translucency
- [ ] Add proper glow/shadow effects per shape
- [ ] Respect `prefers-reduced-motion` (static colors, no animation)
- [ ] Dark mode: artifact should glow more prominently against dark backgrounds

### Admin fixes

- [ ] Update shape picker to include all 7 shapes with visual previews
- [ ] Add mood vocabulary picker when scheme is selected (map moods to colors visually)
- [ ] Add mood log public visibility toggle
- [ ] Update preview to match aurora gradient effect
- [ ] Consider: emoji picker for mood log entries (supplement color with emotion)
