# Immersive Forest Landing Experience

A far-future vision for Grove's onboarding: walking through a forest instead of clicking through screens.

---

## The Idea

When someone opens Grove for the first time, imagine they step into a forest.

Not a tutorial. Not a carousel. A forest - full of trees, shifting with the seasons, alive. They walk through it at their own pace. As they wander, they pass by features: the Meadow in a clearing, a workshop tucked under the canopy, their own tree growing somewhere in the grove.

It's exploration as onboarding. Discovery instead of instruction.

---

## Why This Feels Right

Grove isn't a product you sign up for - it's a place you arrive at. The forest metaphor runs through everything we build: trees for blogs, meadows for community, seasons that change. An immersive walk-through isn't a gimmick; it's the natural extension of what Grove already is.

This approach:
- **Respects the Wanderer's pace** - They walk, they stop, they look around
- **Shows rather than tells** - Features exist in the landscape, not in bullet points
- **Sets the tone immediately** - "Oh, this is different. This is calm."
- **Makes the metaphor tangible** - The forest isn't branding; it's the actual interface

---

## What We Already Have

The `/forest` page is a foundation. Right now it includes:

**Trees**
- 5 types: Logo tree, Pine, Aspen, Birch, Cherry
- Randomized placement on layered rolling hills
- Responsive density (more trees on larger screens)
- Individual tree animations and hover states

**Seasons**
- Spring: pink cherry blossoms, falling petals, robins & bluebirds
- Summer: rich greens, full canopy
- Autumn: amber/gold foliage, falling leaves
- Winter: bare branches, snow, cardinals & chickadees

**Atmosphere**
- Layered parallax hills (4 depth layers)
- Floating clouds with gentle drift
- Weather effects (snow, leaves, petals)
- Seasonal color palettes for sky, hills, and foliage

**Technical**
- SVG-based trees (scalable, crisp at any size)
- Path-based hill curves with tree placement along slopes
- Season store that persists across pages
- Aspect ratio randomization for natural variation

---

## The Vision (Far Future)

### Walking Through

The Wanderer has some form of movement - maybe arrow keys, maybe click-to-walk, maybe just scrolling that feels like forward motion. The forest scrolls past. Parallax depth makes it feel dimensional. Trees pass on either side.

This might not be true 3D, but something that *feels* immersive with what we have: layered SVG planes, depth-based scaling, maybe subtle camera shake or sway.

### Features as Landmarks

As they walk, they encounter Grove's features naturally:

- **A clearing with wildflowers** - The Meadow community feed
- **A workshop with tools** - The editor, customization
- **A sapling with their name** - Their new blog, ready to grow
- **A path leading outward** - The wider internet, their subdomain

Each landmark is interactive but not demanding. Hover to learn more, click to visit, or just walk past.

### Optional & Skippable

This experience is:
- **Not mandatory** - Always a "skip to dashboard" option
- **Not first** - Maybe it's unlocked after signup, or tucked away as a "walk the forest" feature
- **Not blocking** - No forced interactions, no quiz at the end
- **Revisitable** - Come back anytime to just... walk

### Seasonal Continuity

If it's winter when they visit, it's winter in the forest. Their return in spring finds the trees in bloom. The forest is alive, not a static render.

---

## Technical Considerations (To Explore Later)

These are open questions, not decisions:

- **Movement mechanic**: Scroll-based? Click-to-move? Arrow keys? Gesture?
- **Depth rendering**: Pure CSS parallax? Canvas? Three.js (probably overkill)?
- **Performance**: How many trees before mobile struggles?
- **Accessibility**: How does this work with screen readers? Keyboard only?
- **Load time**: Pre-load forest assets? Lazy load as you "approach"?

---

## What This Is Not

- **A game** - No score, no achievements, no failure states
- **A tour** - No forced path, no checkpoints
- **A requirement** - Never blocking access to the actual product
- **A tech demo** - The forest serves the Wanderer, not the other way around

---

## Timeline

This is a "someday" feature. Way down the line, after:
- Core platform is stable
- Multi-tenant architecture is solid
- Meadow community features exist
- We have Wanderers to test with

It's documented now so the idea doesn't get lost, and so future decisions can keep this possibility open.

---

## Related

- `/forest` page - The current static forest scene
- `docs/promo-video-concept.md` - Video concept with similar organic themes
- `packages/engine/src/lib/components/ui/nature/` - Tree and atmosphere components

---

*Written January 2026. A seed planted for future growth.*
