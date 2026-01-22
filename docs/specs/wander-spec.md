---
title: "Wander — First-Person Grove Discovery"
description: "A first-person immersive walking experience through the Grove forest where users discover other groves as floating terrariums among the trees."
category: specs
specCategory: "reference"
icon: filecode
lastUpdated: "2026-01-22"
aliases: []
date created: Monday, January 13th 2026
date modified: Monday, January 13th 2026
tags:
  - discovery
  - immersive
  - community
  - experience
type: tech-spec
---

# Wander — First-Person Grove Discovery

```
         🌲        🌲    🌲        🌲
      🌲    🌲  🌲    🌲    🌲  🌲    🌲
    🌲  ╭────────╮  🌲  ╭────────╮  🌲
   🌲   │   ✨   │ 🌲   │  🎨     │   🌲
  🌲    │  luna  │  🌲  │ river  │    🌲
   🌲   ╰────────╯  🌲  ╰────────╯   🌲
    🌲      🌲  🌲  👤  🌲  🌲      🌲
      🌲  🌲    🌲    🌲    🌲  🌲
         🌲        🌲    🌲        🌲

              [ you are here ]
```

> *Step into the forest. Wander among the trees. Discover who else calls this place home.*

Wander is a first-person immersive walking experience through the Grove. Not a feed. Not a list. A forest you can walk through, where other people's groves exist as living, breathing spaces scattered among the trees. You hear leaves crunch beneath your feet. Birds call in the distance. A brook babbles somewhere nearby. And floating among the ancient oaks, you see them—little windows into other worlds, each one unique, each one someone's home.

---

## Overview

**Internal Name:** GroveWander
**Public Name:** Wander
**Domain:** `wander.grove.place` or `grove.place/wander`
**Package:** `@autumnsgrove/wander`

Wander transforms community discovery from browsing into *being there*. You don't scroll through profiles—you walk through a forest and encounter them. Each grove is rendered as a miniature Terrarium scene floating in the woods, alive with their colors, their trees, their artifacts. Approach one that catches your eye. Step closer. Enter.

---

## Design Philosophy

- **Presence over browsing** — You're not looking at a screen. You're in a place.
- **Serendipity over search** — Discovery happens by wandering, not querying
- **Atmosphere over information** — The experience matters more than efficiency
- **Calm over engagement** — This is a walk in the woods, not a slot machine
- **Accessible wonder** — Beautiful on high-end machines, graceful on modest ones

---

## Core Experience

### First-Person Perspective

You see the forest from eye level. Trees tower above you. Ferns brush at your knees. The path winds ahead, and around you, scattered among the undergrowth, are the groves of others—floating terrariums glowing softly, each one a portal to someone's world.

**First-Person View (ASCII representation):**

```
                    🌲          🌲
                  🌲   🌲    🌲   🌲
               🌲       🌲  🌲       🌲
             🌲           🌲           🌲
           🌲              ║              🌲
         🌲               ║               🌲
                          ║
              ╭─────────────────────╮
              │  ┌───────────────┐  │  ← luna's grove
              │  │ 🌳  ✨  🦋     │  │     (glowing in distance)
              │  │  🌸   🌿       │  │
              │  └───────────────┘  │
              │    ~ luna's home ~  │
              ╰─────────────────────╯
                          ║
                    🌿  🌿║🌿  🌿
                   🌿   🌿 🌿   🌿
              ┌────────────────────┐
              │   [path ahead]     │  ← winding dirt path
              │ w  a  s  d to move │
              │ [click grove] enter│
              └────────────────────┘
                   🌿   🌿 🌿   🌿
                    🌿  🌿║🌿  🌿

              [drift mode: spacebar]
```

### Movement

Two modes, toggleable at any time:

**Active Mode (Default)**
- WASD or arrow keys to walk
- Mouse to look around
- Click on a grove to approach it
- Click again (or Enter) to visit their site
- Shift to walk faster (but you'll miss things)

**Active Mode Control Panel:**

```
┌──────────────────────────────────────┐
│                                      │
│  ↑ W                                 │
│ A ↓ D                     [⏸ Drift]  │
│  ← S →                               │
│                                      │
│  Mouse: Look                         │
│  Click: Approach grove               │
│  Enter: Visit                        │
│                                      │
│  🌲 The Prism Forest                 │
│  ┌─────────────────────────────────┐ │
│  │  You ●                          │ │
│  │     ∙ luna's grove              │ │
│  │         ∙ river's home          │ │
│  │  ∙ abandoned station            │ │
│  └─────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

**Drift Mode**
- Toggle with spacebar or a UI button
- The forest carries you gently forward
- Camera slowly pans, taking in the scenery
- Groves drift past like scenes from a train window
- Click any grove to pause and focus
- Perfect for leaning back, watching, discovering passively

**Drift Mode View:**

```
┌──────────────────────────────────────┐
│        🌲          🌲    🌲           │
│      🌲   🌲    🌲   🌲   🌲           │
│    🌲       🌲 🌲       🌲            │
│  🌲           ║           🌲          │
│              ║                       │
│   ╭────────────────────╮             │
│   │  🌳  ✨  🦋  🌸     │             │
│   │     river's home   │             │
│   ╰────────────────────╯             │
│              ║                       │
│    🌿   🌿🌿 🌿 🌿🌿   🌿              │
│                                      │
│  [gently drifting...]                │
│  [click a grove to focus]            │
│                                      │
│  🌀 Drift Mode (press ⏯ to stop)     │
│                                      │
└──────────────────────────────────────┘
```

### The Environment

**Static Forest Elements:**
- Ancient trees (oaks, pines, birches, willows)
- Undergrowth (ferns, bushes, wildflowers)
- Rocks and boulders (some mossy)
- Fallen logs
- Mushroom clusters
- Streams and small ponds
- Winding dirt paths
- Wooden bridges
- Benches (rest spots)
- Lanterns along paths (lit at night)

**Dynamic Elements:**
- Falling leaves (seasonal)
- Fireflies (summer nights)
- Butterflies (spring/summer days)
- Birds flying between trees
- Squirrels scampering
- Fish in streams
- Clouds drifting overhead
- Sunbeams through canopy

**Grove Representations:**
- Each user's grove appears as a floating terrarium
- Rendered using their actual Terrarium scene (miniaturized)
- Their Foliage colors glow from within
- Their Curios might be visible (hit counter ticking, guestbook pages fluttering)
- Size indicates activity? Or all equal? (TBD)
- Groves cluster in clearings, scatter along paths

---

## Soundscape

Sound is *essential*. Wander isn't just visual—it's an audio experience that makes you feel present.

### Ambient Layers (Always Present)

| Layer | Sound | Notes |
|-------|-------|-------|
| **Base** | Wind through leaves | Constant, gentle, varies with weather |
| **Water** | Distant babbling brook | Fades in/out as you move, directional |
| **Birds** | Birdsong, occasional calls | Species vary by time of day |
| **Insects** | Crickets (night), bees (day) | Seasonal |
| **Atmosphere** | Deep forest hum | Almost subliminal, grounding |

### Movement Sounds

| Action | Sound |
|--------|-------|
| Walking on path | Soft dirt footsteps |
| Walking on leaves | Crunchy leaf sounds |
| Walking on grass | Soft swishing |
| Walking near water | Splashing if in shallows |
| Stopping | Settling sound, world continues |

### Environmental Events

| Event | Sound |
|-------|-------|
| Branch snap | Occasional, random, immersive |
| Bird taking flight | When you get close to certain areas |
| Acorn falling | Rare, seasonal |
| Frog croak | Near ponds |
| Owl hoot | Night only |
| Thunder | During storms, distant |

### Grove Proximity Sounds

As you approach a grove, you might hear hints of their world:
- A grove with lots of activity: gentle murmur
- A grove with music interests: faint melody?
- A new grove: wind chimes welcoming
- This needs careful design to avoid cacophony

---

## Time of Day

Wander features a complete day/night cycle. Time passes slowly—a full cycle might be 20-30 real minutes, or sync to the user's local time.

### Periods

| Period | Visual | Audio | Mood |
|--------|--------|-------|------|
| **Dawn** | Pink/orange sky, mist rising, long shadows | Birds waking, quiet | Hopeful, fresh |
| **Morning** | Golden light, dew on leaves | Full birdsong, activity | Energetic, clear |
| **Midday** | Bright, high sun, short shadows | Insects buzzing, less birds | Warm, full |
| **Afternoon** | Warm amber light, lengthening shadows | Calmer, afternoon birds | Contemplative |
| **Dusk** | Purple/orange sky, golden hour | Evening birds, first crickets | Nostalgic, peaceful |
| **Night** | Moonlight, stars through canopy, lanterns lit | Crickets, owls, quiet | Mysterious, intimate |

### Lighting

- Dynamic shadows from sun/moon position
- God rays through canopy (morning, afternoon)
- Grove terrariums glow more visibly at night
- Lanterns along paths illuminate at dusk
- Fireflies provide ambient light in summer nights

---

## Seasons

The forest changes with the seasons. This could sync to real-world seasons (northern hemisphere default, toggleable) or be independent.

### Spring

**Visual:**
- Cherry blossoms, flowering trees
- Fresh green leaves unfurling
- Wildflowers blooming
- Streams full from snowmelt
- Occasional rain showers

**Audio:**
- Lots of birdsong (mating calls)
- Rain on leaves
- Frogs in full chorus

**Mood:** Renewal, hope, beginning

### Summer

**Visual:**
- Full, lush canopy
- Deep greens everywhere
- Fireflies at night (iconic)
- Butterflies abundant
- Warm, hazy light

**Audio:**
- Insects buzzing (bees, cicadas)
- Quieter birds (midday)
- Thunderstorms possible

**Mood:** Abundance, warmth, vitality

### Autumn

**Visual:**
- Red, orange, gold foliage
- Leaves falling constantly
- Mushrooms everywhere
- Morning mist
- Lower sun angle, long shadows

**Audio:**
- Leaves crunching underfoot (louder)
- Geese honking overhead
- Wind picking up

**Mood:** Change, reflection, coziness

### Winter

**Visual:**
- Bare branches (deciduous trees)
- Snow on ground and branches
- Evergreens still green
- Frozen streams/ponds
- Breath visible?
- Shorter days, longer nights

**Audio:**
- Snow crunching underfoot
- Wind through bare branches
- Quieter overall
- Occasional bird

**Mood:** Rest, solitude, quiet beauty

---

## Weather

Weather adds variety and mood. Could be random, sync to local weather, or user-controlled.

### Weather Types

| Weather | Visual | Audio | Notes |
|---------|--------|-------|-------|
| **Clear** | Blue sky, full sun/moon | Standard ambient | Default |
| **Partly Cloudy** | Drifting clouds, variable light | Slightly more wind | Common |
| **Overcast** | Gray sky, flat light | Muted birds, more wind | Contemplative |
| **Light Rain** | Gentle rain, droplets on leaves | Rain pattering, less birds | Cozy |
| **Heavy Rain** | Downpour, reduced visibility | Loud rain, thunder possible | Dramatic |
| **Fog/Mist** | Low visibility, mysterious | Muffled sounds, eerie | Atmospheric |
| **Snow** | Falling snow, accumulation | Quiet, muffled footsteps | Winter only |
| **Thunderstorm** | Dark clouds, lightning flashes | Thunder, heavy rain, wind | Rare, dramatic |

### Weather Affects Experience

- Rain: groves' glow more visible through the grey
- Fog: discover groves by stumbling upon them
- Snow: footprints left behind (temporary)
- Storms: seek shelter under large trees?

---

## Grove Interaction

### Discovery Flow

1. **Notice** — A grove appears in your peripheral vision, glowing softly
2. **Approach** — Walk toward it; it grows larger, more detailed
3. **Preview** — See their Terrarium scene rendered, their colors, maybe their name
4. **Hover** — More info appears: username, tagline, maybe recent post title
5. **Enter** — Click/press Enter to open their actual grove in a new tab (or transition)

### Grove Rendering

Each grove is rendered as a floating terrarium:

```
        ╭─────────────────────╮
        │  ┌───────────────┐  │
        │  │ 🌳   🦋   🌸   │  │
        │  │   ✨     🌿    │  │
        │  │  🍄   🌻   🌳  │  │
        │  └───────────────┘  │
        │   ~ luna's grove ~  │
        ╰─────────────────────╯
              ╲  glow  ╱
```

**Rendering details:**
- Uses their actual Terrarium assets (simplified/LOD)
- Their Foliage accent color as ambient glow
- Gentle floating animation (bobbing)
- Particles from their scene (fireflies, leaves)
- Frame style could vary by tier? Or all equal?

### Interaction States

| State | Visual | Notes |
|-------|--------|-------|
| **Distant** | Small, simple glow | Just a hint |
| **Noticed** | Slightly larger, more glow | 50m away |
| **Approaching** | Growing, details emerging | 20m away |
| **Near** | Full detail, info visible | 5m away |
| **Focused** | Highlighted, "Enter" prompt | Directly in front |

**Grove Interaction Progression:**

```
DISTANT (50m away)          NOTICED (approaching)
    ✨                           ╭─────────╮
    ·                            │ ✨ glow  │
 (small glow)                    ╰─────────╯


APPROACHING (20m)           NEAR (5m away)
╭───────────────╮           ╭─────────────────────╮
│  · · glow · · │           │  ┌───────────────┐  │
│  ✨ emerging  │           │  │ 🌳  ✨  🦋    │  │
╰───────────────╯           │  │  🌸   🌿      │  │
                            │  └───────────────┘  │
                            │  ~ luna's grove ~   │
                            ╰─────────────────────╯


FOCUSED (directly ahead)
╭─────────────────────────────╮
│  ┌─────────────────────────┐│
│  │ 🌳  ✨  🦋  🌸  🌿    ││
│  │                         ││
│  │    luna's grove         ││
│  │   she/her · cozy space  ││
│  └─────────────────────────┘│
│  [✨ VISIT GROVE ✨]         │
│  [or click] [or press Enter] │
╰─────────────────────────────╯
```

---

## Connection to Forests

Wander integrates with Forests for themed exploration:

### Forest Biomes

Each Forest could have its own biome style:

| Forest | Biome | Visual Flavor |
|--------|-------|---------------|
| The Prism | Rainbow Grove | Colorful flowers, prismatic light |
| The Terminal | Digital Forest | Subtle glitch effects, greener? |
| The Kitchen | Garden Grove | Herbs, vegetable gardens, farmhouse |
| The Moshpit | Dark Woods | Pine forest, darker, moodier |
| The Observatory | High Clearing | Mountain meadow, clear skies, stars |
| The Arcade | Neon Forest | Bioluminescent plants, mushrooms |

### Navigation Between Forests

- Walking toward the edge of one forest gradually transitions to another
- Or: explicit portals/paths between forests
- Or: start in a specific forest from the Forest page

### "Wander The Grove" vs "Wander The Prism"

- `wander.grove.place` = Wander through all forests (mixed)
- `wander.grove.place/prism` = Wander only through The Prism
- Each forest entrance could be a trailhead

---

## UI & Interface Layout

### Main Wander Screen

The primary interface for wandering the grove:

```
┌──────────────────────────────────────────────────────┐
│  🌲 Wander                                ☰  ⚙   [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│         🌲          🌲    🌲         🌲               │
│       🌲   🌲    🌲   🌲   🌲    🌲   🌲               │
│     🌲       🌲 🌲       🌲   🌲       🌲              │
│   🌲           ║           🌲           🌲            │
│                ║                                     │
│     ╭────────────────────╮                           │
│     │  ┌───────────────┐ │                           │
│     │  │ 🌳  ✨  🦋     │ │  luna's grove             │
│     │  │  🌸   🌿       │ │  [approaching]            │
│     │  └───────────────┘ │                           │
│     │ ~ luna's home ~    │                           │
│     ╰────────────────────╯                           │
│                ║                                     │
│     🌿   🌿🌿 🌿 🌿🌿   🌿                             │
│                                                      │
│  ╔════════════════════════════════════════════════╗  │
│  ║ W/↑: forward  S/↓: back  A/←: left  D/→: right ║  │
│  ║ Mouse: look around Click: approach Enter: visit║  │
│  ║ [Spacebar: Drift Mode]         [Settings: S]   ║  │
│  ╚════════════════════════════════════════════════╝  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Settings & Preferences Panel

Accessible via the gear icon:

```
┌──────────────────────────────────────────────────┐
│  ⚙ Wander Settings                        [×]    │
├──────────────────────────────────────────────────┤
│                                                  │
│  MOVEMENT & CONTROLS                             │
│  ┌────────────────────────────────────────────┐  │
│  │ Default Mode: (Active) [Drift]             │  │
│  │ Walk Speed: [Slow] Normal [Fast]           │  │
│  │ Mouse Sensitivity: ▬▬▬▬●▬▬▬▬               │  │
│  │ ☐ Invert Y-axis                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  TIME & WEATHER                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Time Mode: [Realtime] Cycle Fixed          │  │
│  │ Season Mode: [Realtime] Fixed              │  │
│  │ ☑ Weather Enabled                          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  AUDIO                                           │
│  ┌────────────────────────────────────────────┐  │
│  │ Master Volume: ▬▬▬▬●▬▬▬▬ (75%)             │  │
│  │ Ambient: ▬▬▬▬▬●▬▬▬ (60%)                   │  │
│  │ Footsteps: ▬▬▬●▬▬▬▬ (50%)                  │  │
│  │ Grove Proximity: ▬▬▬▬▬▬●▬ (80%)            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  PERFORMANCE                                     │
│  ┌────────────────────────────────────────────┐  │
│  │ Quality: [Auto] High Medium Low Minimal    │  │
│  │                                            │  │
│  │ ☑ Reduce Motion                            │  │
│  │ ☐ High Contrast                            │  │
│  │ ☐ Screen Reader Mode                       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [ Save Preferences ]                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Time of Day & Season Visual Guide

What you see at different times:

```
DAWN                   MORNING              MIDDAY
╔════════════════╗   ╔════════════════╗   ╔════════════════╗
║ 🌅             ║   ║ ☀️              ║   ║ ☀️             ║
║  🌲  🌲  🌲     ║   ║ 🌲  🌲  🌲      ║   ║ 🌲  🌲  🌲      ║
║ 🌿  👤  🌿      ║   ║🌿  👤  🌿       ║   ║🌿  👤  🌿       ║
║                ║   ║                ║   ║                ║
║  fresh & quiet ║   ║ clear & warm   ║   ║ bright & full  ║
╚════════════════╝   ╚════════════════╝   ╚════════════════╝

AFTERNOON            DUSK                 NIGHT
╔════════════════╗   ╔════════════════╗   ╔═════════════════╗
║ 🌤️             ║   ║ 🌅              ║   ║ 🌙   ⭐         ║
║ 🌲  🌲  🌲      ║   ║ 🌲  🌲  🌲      ║   ║🌲  🌲  🌲        ║
║🌿  👤  🌿       ║   ║🌿  👤  🌿       ║   ║🌿  👤  🌿        ║
║  ~ golden ~    ║   ║  ~ peaceful ~  ║   ║ mysterious ✨   ║
╚════════════════╝   ╚════════════════╝   ╚═════════════════╝
```

### Forest Overview Map

Small compass-style minimap in corner:

```
┌─────────────────────┐
│ 🌲 The Prism Forest │
│ ┌─────────────────┐ │
│ │ ∙ luna (↑ 3m)   │ │
│ │  river (→ 8m)   │ │
│ │ ∙ @ (you are)   │ │
│ │  phoenix (← 12m)│ │
│ │ ∙ ∙ ∙ ∙ ∙ ∙ ∙ ∙ │ │
│ └─────────────────┘ │
│  Heading: ↑ North   │
└─────────────────────┘
```

---

## Technical Architecture

### Rendering Engine

**Primary: Three.js + WebGL**
- Industry standard for web 3D
- Good performance, wide support
- Extensive ecosystem (models, shaders)

**Fallback: 2.5D Canvas**
- For devices that can't handle WebGL
- Parallax layers, simplified but still atmospheric
- Graceful degradation

### Performance Tiers

| Tier | Targets | Features |
|------|---------|----------|
| **High** | Modern desktop, gaming laptops | Full 3D, all effects, high detail |
| **Medium** | Average laptops, good tablets | Reduced particles, simpler shadows |
| **Low** | Older devices, phones | 2.5D fallback, minimal effects |
| **Minimal** | Very old/limited | Static images, basic navigation |

### Asset Loading

- **Chunked loading** — Load forest sections as you approach
- **LOD (Level of Detail)** — Distant groves simple, near groves detailed
- **Grove caching** — Recently visited groves stay loaded
- **Lazy terrariums** — Only render grove scenes when visible

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Forests   │────▶│   Wander    │────▶│  Terrarium  │
│   (which    │     │  (renders   │     │  (grove     │
│   groves)   │     │   world)    │     │   scenes)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Foliage   │
                    │  (colors,   │
                    │   themes)   │
                    └─────────────┘
```

---

## User Settings

### Wander Preferences

```typescript
interface WanderSettings {
  // Movement
  defaultMode: 'active' | 'drift';
  walkSpeed: 'slow' | 'normal' | 'fast';
  mouseSensitivity: number;
  invertY: boolean;

  // Time & Weather
  timeMode: 'realtime' | 'cycle' | 'fixed';
  fixedTime?: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
  seasonMode: 'realtime' | 'fixed';
  fixedSeason?: 'spring' | 'summer' | 'autumn' | 'winter';
  weatherEnabled: boolean;

  // Audio
  masterVolume: number;
  ambientVolume: number;
  footstepVolume: number;
  groveVolume: number;

  // Performance
  qualityPreset: 'auto' | 'high' | 'medium' | 'low' | 'minimal';

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean; // Alternative text-based navigation
}
```

---

## Accessibility

Wander must be beautiful AND accessible.

### Visual Accessibility

- **High contrast mode** — Groves outlined clearly, paths marked
- **Reduced motion** — Disable floating animations, falling leaves
- **Color blind modes** — Grove identification not color-dependent
- **Zoom** — Ability to zoom in on groves

### Motor Accessibility

- **Keyboard-only navigation** — Full WASD + Tab to cycle groves
- **Click-to-move** — Click where you want to go
- **Drift mode** — Passive exploration without constant input
- **Adjustable speeds** — Very slow option available

### Screen Reader Support

- **Alternative mode** — Text-based list navigation with descriptions
- "You are in a clearing in The Prism forest. Nearby groves: luna's grove (5 steps ahead), river's grove (to your left)..."
- Atmospheric descriptions read aloud
- Full functionality without visuals

### Cognitive Accessibility

- **Simple mode** — Fewer groves, clearer paths
- **Guided paths** — Optional trails to follow
- **Quiet mode** — Reduced audio complexity

---

## Mobile Experience

### Touch Controls

- **Drag to look** — Finger drag rotates view
- **Tap to walk** — Tap location to walk there
- **Tap grove to focus** — Tap again to enter
- **Two-finger pinch** — Zoom
- **Swipe up** — Toggle drift mode

### Mobile Optimizations

- Simplified 2.5D rendering default
- Reduced draw distance
- Lower resolution groves
- Gyroscope look (optional)
- Battery-conscious mode

---

## Future Possibilities

### Social Features

- See other wanderers in real-time? (Ghosts/spirits)
- Leave "notes" on the ground for others to find
- Campfires where multiple people can gather

### Personalization

- Choose your avatar/representation (visible to others?)
- Customize your footstep sounds
- Unlock seasonal items by exploring

### Events

- Seasonal events (autumn festival, winter solstice)
- Community scavenger hunts
- Rare wildlife sightings (achievements?)

### Integration

- Your grove appears in Wander based on your Forest membership
- Curios from your grove visible to wanderers
- Guestbook entries could appear as floating notes

---

## Implementation Phases

### Phase 1: Core Experience (Weeks 1-4)
- Basic 3D forest environment
- Grove placement and rendering
- Walking controls (active mode)
- Day/night cycle
- Basic ambient audio

### Phase 2: Atmosphere (Weeks 5-8)
- Full soundscape implementation
- Seasons
- Weather
- Drift mode
- Grove interaction polish

### Phase 3: Integration (Weeks 9-12)
- Forests biome connection
- Terrarium scene rendering
- Foliage color integration
- Performance optimization

### Phase 4: Polish (Weeks 13-16)
- Mobile experience
- Accessibility features
- Settings and preferences
- Beta testing
- Performance tuning

---

## Success Metrics

Not engagement metrics. *Experience* metrics:

- **Time wandering** — Do people stay and explore?
- **Groves visited** — Are people discovering others?
- **Return visits** — Do people come back to wander?
- **Drift mode usage** — Are people relaxing here?
- **Qualitative feedback** — Does it feel like a walk in the woods?

---

## The Feeling

Close your eyes for a moment.

You're in a forest. Real trees around you, bark rough, leaves whispering. The path ahead is soft dirt, worn by others who've walked here. Through the trees, you see a soft glow—someone's home, floating gently, alive with their colors, their creativity, their weird wonderful self.

You walk toward it. Leaves crunch. A bird calls. The glow grows brighter.

You're not browsing. You're not scrolling. You're *there*.

You're wandering.

---

**Summary:** Wander transforms discovery into presence. It's a first-person walk through a living forest where other people's groves exist as floating terrariums among the trees. Complete with time of day, seasons, weather, and an immersive soundscape, Wander makes finding your people feel like a walk in the woods.

*Step into the forest. See who else calls it home.*
