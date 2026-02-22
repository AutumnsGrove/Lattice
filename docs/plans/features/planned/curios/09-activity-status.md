---
title: "Curio: Activity Status"
status: planned
category: features
---

# Curio: Activity Status

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 9

---

**Character**: A living indicator — a tiny candle in the window. Changes energy based on what kind of status it is. The fresher the status, the warmer the glow.

### Design spec (safari-approved)

**Living indicator system:**
The status pill's visual character shifts based on the status category:

- **Doing** statuses feel active (subtle shimmer/pulse)
- **Away** statuses feel quieter (muted, dimmer, slower)
- **Vibes** statuses feel warm (soft, dreamy, gentle)

**Color**: Owner-configurable per-status. Default colors assigned per category that owners can override. The pill background tints with the chosen color.

**Freshness system (dual-layer):**

- **Visual freshness**: Status glow/opacity subtly fades over time. Fresh = bright and warm, stale (24h+) = slightly muted. The candle dims.
- **Timestamp on hover**: Hovering/tapping reveals "set 5m ago" or "set 2d ago" in a tiny tooltip. Clean surface, detail on demand.
- Both layers work together — visitors intuitively sense freshness, curious ones can check.

**Icons:**

- Presets use Lucide icons for consistent rendering across platforms
- Custom statuses let the owner type any emoji they want
- Replaces the current Unicode text symbols (✎, ⌨, ☰) that render inconsistently

### Expanded preset library

**Existing categories (refreshed):**

- **Doing**: Writing, Coding, Reading, Gaming, Cooking, Creating
- **Away**: Away, Sleeping, On Vacation, Touching grass, Out for a walk
- **Vibes**: Listening to music, Watching something, Having tea, Night owl mode

**New: Creative subcategories:**

- Drawing, Painting, Streaming, Recording, Photographing, Crafting

**New: Social category:**

- Chatting, In a call, Hanging out, At an event, With friends

**New: Cozy category:**

- Napping, Candle lit, Rainy day in, Blanket mode, Hot chocolate

### Auto-status: "Just published"

- When owner publishes a new post, status auto-sets to "✎ Just published: [title]" for 24h
- **Smart default**: On by default for new accounts. Skipped if owner has manually set a status in the last 24h (don't overwrite their intention).
- Owner can clear it or set something else anytime
- Admin toggle: "Auto-set status when I publish a post"
- Uses existing `autoSource` field (set to `"publish"`)

### Public component fixes

- [ ] Replace `rgba(0,0,0,0.04)` gray pill with grove-styled glass chip
- [ ] Add category-dependent visual character (shimmer/muted/warm)
- [ ] Add owner-configurable color tinting on the pill
- [ ] Add visual freshness (glow fades over time since `updatedAt`)
- [ ] Add hover/tap tooltip showing relative time ("set 5m ago")
- [ ] Replace Unicode text symbols with Lucide icons for presets
- [ ] Keep emoji rendering for custom statuses
- [ ] Add warm fallback when no status is set (optional "Wandering the grove..." or just hide)
- [ ] Respect `prefers-reduced-motion` (disable shimmer/pulse, keep color)

### API fixes

- [ ] Add `color` field to ActivityStatusRecord (owner-chosen hex color)
- [ ] Add auto-publish status hook (trigger on post publish)
- [ ] Add `autoPublishStatus` boolean to curio config
- [ ] Ensure `updatedAt` is always populated (needed for freshness calc)

### Admin fixes

- [ ] Add color picker for custom statuses
- [ ] Add default color per category (overridable)
- [ ] Add new preset categories (Creative, Social, Cozy)
- [ ] Replace Unicode symbols with Lucide icon previews in preset buttons
- [ ] Add "Auto-set on publish" toggle
- [ ] Fix duplicate emoji: "Having tea" and "Touching grass" both use ⌇
