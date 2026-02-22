---
title: "Reverie Component Suite: The Dreamscape Library"
status: planning
category: features
---

# Reverie Component Suite: The Dreamscape Library

> *Components for the liminal, the impossible, and the half-remembered*

**Status:** Planning Phase  
**Purpose:** Enable Reverie to compose dreams, not just layouts  
**Philosophy:** These components don't solve problems. They express interiority.

---

## Why This Suite Exists

Reverie needs components that can express:
- The feeling of being between waking and sleeping
- Impossible spaces that feel emotionally true
- Abstract emotions that resist literal representation
- Memory as fragmentary, shifting, unreliable
- Time that doesn't move linearly

Standard UI components (buttons, cards, navbars) are for the waking world. These are for the dream world.

---

## Component Categories

### 1. LIMINAL SPACES — Threshold Components

*For the in-between, the doorway, the moment before crossing*

#### `Threshold`
A doorway that exists between sections. The frame subtly shifts perspective as you scroll — Escher-like impossible geometry that resolves only when you pass through.

**Props:**
- `mood`: 'inviting' | 'foreboding' | 'mysterious' | 'nostalgic'
- `width`: 'narrow' | 'standard' | 'wide' (affects psychological feeling of passage)
- `transition`: 'dissolve' | 'slide' | 'fold' | 'shatter'

**Reverie prompt:** *"A doorway between my about page and my writing. Like entering a different headspace."*

---

#### `FadingBoundary`
A section divider that doesn't sharply separate but bleeds content together. Text from above gradually becomes illegible as new text emerges below — like memory fading as new experiences overwrite.

**Props:**
- `blurRadius`: number (how much the transition obscures)
- `overlap`: 'none' | 'partial' | 'complete' (content bleeding)
- `direction`: 'vertical' | 'horizontal' | 'radial'

**Reverie prompt:** *"The feeling of trying to remember a dream while waking up."*

---

#### `Antechamber`
A small, self-contained space that exists *before* the main content. Like a decompression chamber between the internet and your interior world. Contains only atmosphere — perhaps drifting particles, subtle color shifts, a single line of text that changes based on time of day.

**Props:**
- `atmosphere`: 'mist' | 'particles' | 'light-shafts' | 'breathe' (subtle expansion/contraction)
- `duration`: number (seconds before auto-advancing, or 0 for manual)
- `message`: string | 'time-based' | 'random' | 'none'

**Reverie prompt:** *"A space to breathe before entering my site. Like taking off your shoes at the door."*

---

### 2. IMPOSSIBLE GEOMETRY — MC Escher Components

*For spaces that couldn't exist but feel emotionally true*

#### `ImpossibleStair`
A staircase that goes up and up but somehow returns to where it started. Used for navigation that feels like journey without destination — perfect for "endless" content like blog archives or reading lists.

**Props:**
- `direction`: 'ascending' | 'descending' | 'looping'
- `items`: Array<{ label: string, href: string }>
- `perspective`: 'isometric' | 'forced' | 'shifting'

**Reverie prompt:** *"A way to show my blog posts that feels like wandering through an endless library."*

---

#### `PenroseFrame`
A border or container using Penrose triangle geometry — impossible 3D objects rendered in 2D. The frame subtly shifts as you scroll, never quite resolving into a coherent object. Used for highlighting content that resists easy categorization.

**Props:**
- `shape`: 'triangle' | 'square' | 'pentagon' | 'custom'
- `content`: 'text' | 'image' | 'component' | 'slot'
- `animation`: 'rotate' | 'shift' | 'breathe' | 'none'

**Reverie prompt:** *"A frame for my about page photo that feels like it shouldn't exist but does."*

---

#### `MobiusStrip`
A content carousel that loops infinitely but never repeats the same way. As you scroll through items, they subtly transform — colors shift, sizes breathe, relationships change. The content is the same but the experience is always different.

**Props:**
- `items`: Array<any>
- `transform`: 'color-shift' | 'scale-breathe' | 'rotation' | 'all'
- `speed`: 'slow' | 'medium' | 'fast' | 'scroll-linked'

**Reverie prompt:** *"A way to show my favorite quotes that feels different every time you visit."*

---

### 3. EMOTIONAL WEATHER — Abstract Feeling Components

*For emotions that don't have shapes*

#### `Longing`
A component that expresses the feeling of missing something you can't name. Subtle visual elements drift slowly across the screen — perhaps particles that never quite settle, or shapes that almost form recognizable objects but dissolve before they do. Colors in the blue-grey range, desaturated.

**Props:**
- `intensity`: 'subtle' | 'present' | 'overwhelming'
- `elements`: 'particles' | 'shapes' | 'fog' | 'combined'
- `duration`: number (seconds before fading, or 0 for persistent)

**Reverie prompt:** *"The feeling of reading old letters from someone you haven't thought about in years."*

---

#### `Anticipation`
A component that builds tension without release. Visual elements accumulate — perhaps shapes stacking, colors intensifying, motion speeding up — but never reach a climax. The feeling of the moment before, stretched indefinitely.

**Props:**
- `build`: 'slow' | 'medium' | 'rapid'
- `climax`: 'none' | 'subtle' | 'delayed'
- `elements`: 'accumulating' | 'intensifying' | 'cycling'

**Reverie prompt:** *"The feeling of waiting for someone to arrive, hearing every car on the street."*

---

#### `Nostalgia`
A component that feels like memory — slightly faded, warm-toned, with subtle imperfections. Perhaps a vignette effect, film grain, colors that feel like old photographs. Content appears slightly distant, as if viewed through time.

**Props:**
- `era`: 'vintage' | 'recent' | 'personal' (affects color grading)
- `imperfections`: 'none' | 'subtle' | 'pronounced' (grain, vignette, etc.)
- `warmth`: number (color temperature, 0-100)

**Reverie prompt:** *"The feeling of finding a photo of yourself as a child, doing something you don't remember doing."*

---

### 4. MEMORY FRAGMENTS — Unreliable Narrative Components

*For the way memory actually works*

#### `FadingRecall`
A text component where words gradually disappear as you read, like trying to hold onto a dream after waking. Each word has a "decay timer" — the longer you look, the more fades. Some words return, others don't. Reading becomes an act of preservation.

**Props:**
- `decayRate`: 'slow' | 'medium' | 'fast'
- `recovery`: 'none' | 'partial' | 'full' (do words ever come back?)
- `content`: string (the text to display)

**Reverie prompt:** *"A poem that disappears as you read it, like trying to remember a dream."*

---

#### `ReconstructingImage`
An image that loads in fragments, out of order, with some pieces wrong. Like memory reconstructing a scene — some details sharp, others invented, the whole thing shifting as more pieces arrive. The final image is never quite what was there originally.

**Props:**
- `src`: string (original image)
- `fragments`: number (how many pieces to break into)
- `accuracy`: number (0-1, how many fragments are "correct")
- `reconstruction`: 'sequential' | 'random' | 'emotional' (prioritize certain areas)

**Reverie prompt:** *"A photo of my childhood home, but I can't quite remember which details are real."*

---

#### `ShiftingTimeline`
A chronological display where events don't stay in order. As you scroll, dates drift, some events swap places, durations stretch or compress. The timeline reflects how memory actually works — not linear, but associative, emotional, unreliable.

**Props:**
- `events`: Array<{ date: string, content: any, emotionalWeight: number }>
- `drift`: 'subtle' | 'pronounced' | 'chaotic'
- `associative`: boolean (do related events cluster regardless of date?)

**Reverie prompt:** *"My blog archive, but organized by how the memories feel, not when they happened."*

---

### 5. TIME DISTORTIONS — Non-Linear Temporal Components

*For when time doesn't behave*

#### `FrozenMoment`
A component that captures a single moment and holds it. Everything is still — no animations, no movement — but the composition suggests immense energy suspended. The feeling of a photograph, but alive, breathing held breath.

**Props:**
- `moment`: 'dawn' | 'dusk' | 'midnight' | 'noon' | 'storm' | 'custom'
- `suspension`: 'gentle' | 'tense' | 'precarious'
- `elements`: Array<{ type: string, position: [x, y], frozenState: any }>

**Reverie prompt:** *"The moment right before rain starts, when everything holds its breath."*

---

#### `TimeLoop`
A component where events repeat but change slightly each iteration. Like Groundhog Day, or a musical loop with variations. The user experiences the loop, notices the differences, understands something about the pattern.

**Props:**
- `iterations`: number (how many times it loops)
- `variation`: 'subtle' | 'pronounced' | 'cumulative' (changes build over time)
- `content`: any (what's being looped)
- `breakCondition`: string | null (what stops the loop, if anything)

**Reverie prompt:** *"Waking up and making coffee, but each time the kitchen feels slightly different, until you realize you're looking for something you lost."*

---

#### `DilatedTime`
A component where different areas move at different temporal speeds. One corner updates every second, another every minute, another every hour. The feeling of being in multiple times at once — the urgent now, the slower reflection, the long view.

**Props:**
- `zones`: Array<{ area: [x, y, w, h], updateInterval: number, content: any }>
- `syncPoints`: Array<number> (moments when all zones align)
- `drift`: boolean (do zones gradually shift their rhythms?)

**Reverie prompt:** *"A page where my recent thoughts move quickly, my ongoing projects move slowly, and my long-term dreams barely move at all, but they're all visible at once."*

---

### 6. PRESENCE/ABSENCE — Negative Space Components

*For what isn't there*

#### `Silhouette`
A component defined entirely by what it obscures. The shape is dark, featureless, but the background visible through and around it tells the story. The feeling of recognizing someone from behind, or seeing a shadow and knowing who's casting it.

**Props:**
- `shape`: 'human' | 'object' | 'architecture' | 'abstract' | 'custom'
- `obscures`: any (what's behind the silhouette)
- `recognition`: 'immediate' | 'delayed' | 'uncertain' (how quickly you understand the shape)
- `movement`: 'still' | 'subtle' | 'shifting' (does the silhouette change?)

**Reverie prompt:** *"The shape of someone I used to know, standing in a doorway, but I can't quite remember their face."*

---

#### `Shadow`
A component that exists only as absence of light. It moves independently of any visible source, has its own behavior, its own mood. Sometimes it reaches toward the viewer, sometimes it retreats. The feeling of being followed, or accompanied, or watched over.

**Props:**
- `behavior`: 'following' | 'retreating' | 'wandering' | 'guarding' | 'searching'
- `intensity`: 'subtle' | 'present' | 'dramatic'
- `source`: 'visible' | 'implied' | 'absent' (is there an object casting this?)
- `interaction`: 'none' | 'cursor-aware' | 'scroll-linked'

**Reverie prompt:** *"A shadow that follows the visitor around the page, not threatening, just... keeping them company."*

---

#### `Void`
A component that is literally nothing — an area of the page that refuses to render content, that creates breathing room so profound it becomes presence. Around it, other elements orbit, hesitant to approach. The feeling of looking into deep water, or standing at the edge of a cliff at night.

**Props:**
- `size`: 'small' | 'medium' | 'large' | 'dominant'
- `gravity`: 'attracting' | 'repelling' | 'neutral' (how other elements behave near it)
- `depth`: 'surface' | 'deep' | 'abyss' (visual treatment of the void)
- `border`: 'hard' | 'soft' | 'none' (how distinct is the edge?)

**Reverie prompt:** *"A space on my page that represents the things I can't write about yet."*

---

### 7. TRANSFORMATION STATES — Metamorphosis Components

*For becoming, unbecoming, and everything between*

#### `Dissolving`
A component that is constantly falling apart and reconstituting. Text that pixelates and reforms. Images that fragment into particles and coalesce. The feeling of trying to hold onto a thought that's slipping away, or a memory that won't stay still.

**Props:**
- `stability`: 'constant' | 'intermittent' | 'rare' (how often it dissolves)
- `granularity`: 'fine' | 'medium' | 'coarse' (size of fragments)
- `reformation`: 'identical' | 'similar' | 'changed' (does it come back the same?)
- `trigger`: 'time' | 'scroll' | 'hover' | 'random'

**Reverie prompt:** *"My navigation menu, but it keeps forgetting what it is and remembering something slightly different."*

---

#### `Becoming`
A component that is visibly in the process of transformation. A caterpillar component that slowly, over days or weeks, becomes a butterfly. A seed that germinates, grows, flowers, dies, returns to seed. The feeling of watching something alive change in real-time.

**Props:**
- `lifecycle`: 'insect' | 'plant' | 'daynight' | 'seasons' | 'custom'
- `speed`: 'realtime' | 'accelerated' | 'visitor-linked' (changes based on visits)
- `statePersistence`: 'global' | 'per-visitor' | 'session-only'
- `interaction`: 'observation-only' | 'nurture' | 'hinder' (can visitors affect it?)

**Reverie prompt:** *"Something on my site that grows a little bit every time someone visits, but dies if no one comes for a week."*

---

#### `Unraveling`
A component that starts complete and gradually comes apart — threads pulling loose, edges fraying, structure becoming decoration. Unlike Dissolving (which reforms), Unraveling is one-way. The component becomes more beautiful as it fails. The feeling of a favorite sweater wearing thin, or a story told so many times it becomes poetry.

**Props:**
- `material`: 'fabric' | 'paper' | 'digital' | 'organic'
- `wearPattern`: 'even' | 'focused' | 'random' (where does it unravel first?)
- `beautyCurve`: 'linear' | 'accelerating' | 'asymptotic' (does it get more beautiful?)
- `endState`: 'threads' | 'dust' | 'pattern' | 'void'

**Reverie prompt:** *"My footer, but it's made of something that's been worn soft by years of touch."*

---

## Component Interactions & Compositions

These components aren't meant to be used alone. Reverie composes them into scenes:

### Example Scene: "The Library at Dusk"

**Prompt:** *"A library where books are doors. Warm wood, dust motes in sunbeams, the feeling of being about to find something important."*

**Composition:**
- `Threshold` (doorway between sections, 'mysterious' mood)
- `Shadow` (following the visitor, 'guarding' behavior)
- `DilatedTime` (different zones update at different speeds — recent posts quick, old memories slow)
- `Silhouette` (shape of a figure in the distance, never fully visible)
- `FadingRecall` (text that dissolves and reforms — navigation that won't stay still)

### Example Scene: "The Garden That Remembers"

**Prompt:** *"Something on my site that grows when people visit but wilts when they don't. The feeling of being tended."*

**Composition:**
- `Becoming` (plant lifecycle, visitor-linked growth)
- `Void` (absence where the plant was, if it dies — gravity: attracting, visitors feel the loss)
- `Unraveling` (if neglected, the garden doesn't just die — it becomes something else, threadbare but beautiful)
- `TimeLoop` (daily cycles: dawn growth, dusk rest, the rhythm of care)

### Example Scene: "The Letter I Never Sent"

**Prompt:** *"A space for things I can't write about yet. The feeling of words stuck in the throat."*

**Composition:**
- `Void` (large, dominant, gravity: repelling — other content won't approach)
- `Dissolving` (text that tries to form but pixelates — the words that won't come)
- `Shadow` (searching behavior — looking for something that isn't there)
- `FadingBoundary` (the void bleeds into surrounding content — the unsaid affecting everything)

---

## Technical Implementation Notes

### Performance Considerations

These components are intentionally **not** lightweight. They're for moments that matter, not for every page. Reverie should:

1. **Lazy-load heavily** — Only load complex components when the prompt requires them
2. **Use CSS containment** — Isolate expensive animations from the rest of the page
3. **Respect reduced-motion** — Every component has a static fallback that preserves the emotional intent
4. **Progressive enhancement** — Core content works without JavaScript; the dream layer enhances

### Animation Philosophy

- **No linear easing** — Everything moves like nature: ease-in-out, spring physics, decay
- **No perfect loops** — Even "looping" animations have micro-variations so they feel alive
- **Scroll-linked, not time-based** — Where possible, tie animation to user movement through space
- **Ambient motion** — Subtle constant movement (breathing, drifting) makes components feel alive

### Accessibility

These components are **more** important to make accessible, not less. Dreams are for everyone:

- **Screen reader descriptions** — "A space that visually represents absence and longing"
- **Keyboard navigation** — Even abstract components have focus states that make sense
- **Color independence** — Emotional intent conveyed through motion, texture, not just color
- **Cognitive load** — Abstract but not confusing; emotional but not overwhelming

---

## The Component Registry

For Reverie to compose these, they need to be discoverable:

```typescript
// libs/engine/src/lib/reverie/dreamscape-registry.ts

export interface DreamscapeComponent {
  id: string;
  name: string;
  category: 'liminal' | 'impossible' | 'emotional' | 'memory' | 'time' | 'presence' | 'transformation';
  moods: string[]; // emotional tags for matching
  intensity: 'subtle' | 'moderate' | 'intense';
  performance: 'light' | 'moderate' | 'heavy';
  accessibility: {
    reducedMotionFallback: boolean;
    screenReaderDescription: string;
    keyboardNavigable: boolean;
  };
  // The actual component
  component: typeof SvelteComponent;
  // Props schema for Reverie to populate
  propsSchema: z.ZodSchema;
}

// Example entry
export const DISSOLVING: DreamscapeComponent = {
  id: 'dissolving',
  name: 'Dissolving',
  category: 'transformation',
  moods: ['fragile', 'uncertain', 'transient', 'slipping', 'unreliable'],
  intensity: 'moderate',
  performance: 'heavy',
  accessibility: {
    reducedMotionFallback: true,
    screenReaderDescription: 'Content that visually represents fragility and transformation through gradual dissolution',
    keyboardNavigable: true,
  },
  component: Dissolving,
  propsSchema: z.object({
    stability: z.enum(['constant', 'intermittent', 'rare']),
    granularity: z.enum(['fine', 'medium', 'coarse']),
    reformation: z.enum(['identical', 'similar', 'changed']),
    trigger: z.enum(['time', 'scroll', 'hover', 'random']),
  }),
};
```

---

## Reverie Integration

When Reverie receives a prompt, it:

1. **Parses emotional intent** — "library at dusk" → liminal, mysterious, warm, quiet
2. **Queries the dreamscape registry** — Find components matching these moods
3. **Composes a scene** — Select 3-5 components that work together
4. **Generates props** — Populate component props based on prompt details
5. **Outputs Terrarium JSON** — Scene ready for the composition canvas

Example flow:

```
Prompt: "A library where books are doors. Warm wood, dust motes in sunbeams, 
         the feeling of being about to find something important."

↓

Emotional analysis:
- Moods: liminal, mysterious, warm, anticipatory, quiet
- Intensity: moderate
- Visual keywords: wood, light, dust, doors, books

↓

Component selection:
- Threshold (liminal, mysterious) — doorway between sections
- Shadow (mysterious, anticipatory) — following, guarding
- DilatedTime (liminal, anticipatory) — different zones, different speeds
- Silhouette (mysterious) — figure in distance, never fully seen

↓

Props generation:
- Threshold: { mood: 'mysterious', width: 'narrow', transition: 'fold' }
- Shadow: { behavior: 'guarding', intensity: 'subtle' }
- DilatedTime: { zones: [...], drift: true }
- Silhouette: { shape: 'human', recognition: 'delayed' }

↓

Terrarium JSON output
```

---

## Next Steps

1. **Prioritize core components** — Which 5-10 should be built first?
2. **Prototype emotional matching** — Can we reliably match prompts to moods?
3. **Build the registry** — Schema, discovery, lazy-loading
4. **Terrarium integration** — Output format, composition rules
5. **Test with real prompts** — "Describe your dream last night" → actual composition

---

*These components don't solve problems. They express interiority. They make the liminal visible. They let you build your dreams.*

---

## 8. THE HOUSE — Piranesi Architecture

> *"The Beauty of the House is immeasurable; its Kindness infinite."*

Inspired by Susanna Clarke's *Piranesi* — impossible architecture, endless halls, the sea that tides through lower levels, statues that watch and remember. This is architecture as caretaking, space as character, the feeling of being lost but also at home.

These components create spaces that feel *inhabited by time itself*.

---

### `EndlessHall`

A navigation structure that suggests infinite depth. Each "room" (section) connects to others through doorways that appear to recede into distance. The perspective shifts as you move — Escher-like impossible geometry that somehow feels navigable. Statues (content highlights) stand in niches along the walls.

**Props:**
- `rooms`: Array<{ id: string, title: string, content: any, statues?: Array<{ type: string, position: 'near' | 'mid' | 'far' }> }>
- `perspective`: 'forced' | 'natural' | 'impossible' (how aggressively the geometry bends)
- `lighting`: 'tidal' | 'statue' | 'dusk' | 'bioluminescent'
- `statueTypes`: Array<string> (what kinds of content become statues: 'featured-post', 'memory', 'milestone')

**Reverie prompt:** *"My blog archive, but it feels like wandering through halls where each post is a statue that remembers being written."*

---

### `TideRoom`

A container where content ebbs and flows like the sea in Piranesi's lower halls. Some content is submerged (hidden but suggested), some floats at the surface, some washes in and out with the tide. The waterline shifts based on time of day, visitor behavior, or pure randomness.

**Props:**
- `content`: Array<{ item: any, buoyancy: 'sinks' | 'floats' | 'drifts', weight?: number }>
- `tideCycle`: number (seconds for a full tide cycle)
- `depth`: 'shallows' | 'middle' | 'deep' (how much content is submerged)
- `clarity`: 'clear' | 'murky' | 'bioluminescent' (visibility of submerged content)
- `response`: 'time' | 'scroll' | 'hover' | 'breath' (what drives the tide)

**Reverie prompt:** *"My about page, but some memories are deep underwater and you can only see their shapes, and they rise to the surface on certain days."*

---

### `StatueNiche`

A component that holds content as if it were a statue in Piranesi's halls — something that watches, remembers, endures. Statues can be "awake" (responsive, subtly animated) or "sleeping" (still, waiting). They can represent posts, memories, milestones, or abstract concepts. Some statues only appear at certain times, or to certain visitors.

**Props:**
- `statue`: { type: 'figure' | 'beast' | 'abstract' | 'hybrid', material: 'stone' | 'metal' | 'coral' | 'light', state: 'awake' | 'sleeping' | 'dreaming' | 'watching' }
- `content`: any (what the statue represents — can be a post, a memory, a quote, or nothing)
- `visibility`: 'always' | 'dawn' | 'dusk' | 'midnight' | 'specific-visitor' | 'random'
- `response`: 'none' | 'gaze' | 'breath' | 'whisper' | 'memory' (how it reacts to presence)
- `inscription`: string | null (text carved at the base — could be a date, a quote, coordinates)

**Reverie prompt:** *"A statue on my site that represents my first blog post, and it only wakes up when I visit, and it remembers things about that day I forgot."*

---

### `TheTides`

Not a container but a *force* — a component that affects everything around it. The Tides rise and fall through the entire page, submerging some content, revealing other content that only exists at certain depths. Navigation that only works at low tide. Secrets that only appear when the water is high. The entire site becomes a place that changes, that breathes, that has its own rhythms independent of the visitor.

**Props:**
- `scope`: 'section' | 'page' | 'site' (how much the tide affects)
- `cycle`: number (seconds for full tide cycle, or 'lunar' for ~29 days)
- `depthMap`: Record<string, { minDepth: number, maxDepth: number }> (what content exists at what depths)
- `revealBehavior`: 'gradual' | 'sudden' | 'breach' (how content appears/disappears)
- `visitorEffect`: 'none' | 'stirs' | 'disrupts' | 'calms' (does presence affect the tide?)

**Reverie prompt:** *"My entire site, but it has tides, and some pages only exist at certain times, and the navigation changes based on the water level."*

---

## Composing the House

These components work together to create spaces that feel *inhabited by time*:

### Scene: "The Hall of Statues That Remember"

**Prompt:** *"A long hall where each statue is a blog post I wrote, and they wake up when I visit, and they tell me things about that day I forgot, and some of them are dreaming about being written."*

**Composition:**
- `EndlessHall` — the architecture that recedes into impossible distance
- `StatueNiche` × 12 — each representing a post, various states (awake, dreaming, watching)
- `TheTides` — subtle, affecting only the statues' states (they dream more at high tide)
- `Shadow` — following the visitor, 'searching' behavior (looking for a specific statue?)

### Scene: "The Room That Floods With Memory"

**Prompt:** *"A space where my memories are underwater, and they rise to the surface on anniversaries, and some of them are too deep to ever reach, and the water changes color based on how I'm feeling."*

**Composition:**
- `TideRoom` — the container, 'deep' depth, 'bioluminescent' clarity
- `Void` — large, representing the memories too deep to reach
- `Dissolving` — text that tries to describe memories but can't hold form
- `Nostalgia` — color grading, 'vintage' era, 'pronounced' imperfections
- `DilatedTime` — different memory zones update at different speeds

### Scene: "The Statue That Unravels"

**Prompt:** *"A statue of something I used to believe, and it's coming apart, but the threads are becoming something else, and it's more beautiful now than when it was whole."*

**Composition:**
- `StatueNiche` — 'abstract' type, 'light' material, 'dreaming' state
- `Unraveling` — 'fabric' material, 'focused' wear pattern, 'asymptotic' beauty curve
- `Becoming` — 'custom' lifecycle, the threads becoming something new
- `FrozenMoment` — capturing the most beautiful moment of unraveling

---

## The Component Aesthetic

### Visual Language

- **Impossible perspectives** — Forced perspective, Escher geometry, spaces that fold
- **Living materials** — Stone that breathes, metal that remembers, light that pools
- **Time as substance** — Visible decay, growth, erosion, crystallization
- **Negative space as character** — Voids that attract or repel, shadows with agency
- **Scale ambiguity** — Microscopic details next to cosmic vastness

### Animation Principles

- **No linear motion** — Everything accelerates, decelerates, orbits, decays
- **Emergent behavior** — Simple rules create complex, unpredictable results
- **Memory in motion** — Animations that remember previous states, build history
- **Breathing room** — Constant subtle motion (expansion/contraction) makes components feel alive
- **Responsive to presence** — Components that know you're there, react to attention

### Color & Light

- **Impossible lighting** — Multiple light sources that don't cancel, shadows that fall wrong
- **Bioluminescence** — Self-illuminated elements, glow without source
- **Color as emotion** — Palettes that shift based on abstract qualities, not time
- **Transparency as depth** — Layers that reveal and obscure, never fully clear

---

## Implementation Priority

### Phase 1: Core Liminal (MVP for Reverie)

Build first — these enable the basic "dream to composition" flow:

1. `Threshold` — The doorway between states
2. `TideRoom` — Content that ebbs and flows
3. `StatueNiche` — Content as enduring, watching presence
4. `Shadow` — Presence that follows, accompanies
5. `Void` — Negative space as character

### Phase 2: Emotional Weather

Add the feeling components:

6. `Longing` — The unspecific ache
7. `Nostalgia` — Memory as unreliable narrator
8. `Anticipation` — The moment before
9. `Dissolving` — Fragility, impermanence
10. `Unraveling` — Beautiful decay

### Phase 3: Time & Memory

Add the temporal components:

11. `FrozenMoment` — Suspension, breath held
12. `TimeLoop` — Repetition with variation
13. `DilatedTime` — Multiple temporal speeds
14. `Becoming` — Growth, transformation
15. `FadingRecall` — Memory as fragmentary

### Phase 4: Impossible Architecture

Add the Escher components:

16. `EndlessHall` — Infinite recursion
17. `ImpossibleStair` — Navigation without destination
18. `PenroseFrame` — Containment that can't exist
19. `MobiusStrip` — Infinite loop with variation
20. `TheTides` — Force that affects everything

### Phase 5: Presence & Absence

Add the negative space components:

21. `Silhouette` — Recognition without detail
22. `ReconstructingImage` — Memory rebuilding itself
23. `ShiftingTimeline` — Chronology as emotional, not temporal

---

## The Dreamscape Registry

```typescript
// libs/engine/src/lib/reverie/dreamscape-registry.ts

export const DREAMSCAPE_REGISTRY: Record<string, DreamscapeComponent> = {
  // Liminal
  threshold: THRESHOLD,
  fadingBoundary: FADING_BOUNDARY,
  antechamber: ANTECHAMBER,
  
  // Impossible
  impossibleStair: IMPOSSIBLE_STAIR,
  penroseFrame: PENROSE_FRAME,
  mobiusStrip: MOBIUS_STRIP,
  
  // Emotional
  longing: LONGING,
  anticipation: ANTICIPATION,
  nostalgia: NOSTALGIA,
  
  // Memory
  fadingRecall: FADING_RECALL,
  reconstructingImage: RECONSTRUCTING_IMAGE,
  shiftingTimeline: SHIFTING_TIMELINE,
  
  // Time
  frozenMoment: FROZEN_MOMENT,
  timeLoop: TIME_LOOP,
  dilatedTime: DILATED_TIME,
  
  // Transformation
  dissolving: DISSOLVING,
  becoming: BECOMING,
  unraveling: UNRAVELING,
  
  // Presence
  silhouette: SILHOUETTE,
  shadow: SHADOW,
  void: VOID,
  
  // The House (Piranesi)
  endlessHall: ENDLESS_HALL,
  tideRoom: TIDE_ROOM,
  statueNiche: STATUE_NICHE,
  theTides: THE_TIDES,
};

// Mood-to-component mapping for Reverie
export const MOOD_COMPONENT_MAP: Record<string, string[]> = {
  'liminal': ['threshold', 'fadingBoundary', 'antechamber'],
  'mysterious': ['shadow', 'statueNiche', 'endlessHall'],
  'nostalgic': ['nostalgia', 'fadingRecall', 'unraveling'],
  'anticipatory': ['anticipation', 'threshold', 'frozenMoment'],
  'fragile': ['dissolving', 'longing', 'void'],
  'transformative': ['becoming', 'unraveling', 'timeLoop'],
  'impossible': ['impossibleStair', 'penroseFrame', 'mobiusStrip'],
  'memorial': ['statueNiche', 'theTides', 'shiftingTimeline'],
  'tidal': ['tideRoom', 'theTides', 'dilatedTime'],
};
```

---

## Final Notes

This suite exists because Reverie needs to compose dreams, not just layouts. The House components (Piranesi-inspired) give Reverie architecture that feels *inhabited by time* — spaces that remember, that change, that watch.

The goal: When someone types "A library where books are doors," they don't get a layout. They get a *place*.

---

## 9. THE AETHER — Sky Dimension Components

> *"A hostile paradise floating high above"*

Inspired by the legendary Minecraft Aether mod — a dimension of floating islands, cloud terrain, and ethereal beauty that stands as the antithesis to the Nether's hellish depths. The Aether creates a sense of ascending into something heavenly yet dangerous — beauty that can kill.

### `AetherIslands`

Floating landmasses suspended in an endless sky, connected by nothing but atmosphere. Each island is a self-contained world — some with waterfalls that fall into void, some with trees that grow sideways, some small enough to walk across in ten steps, others vast continents drifting slowly past each other.

**Props:**
- `islands`: Array<{ size: 'tiny' | 'small' | 'medium' | 'large' | 'vast', elevation: number, driftSpeed: number, features: Array<'waterfall' | 'forest' | 'ruins' | 'crystal' | 'cloud-bridge'> }>
- `sky`: 'eternal-dawn' | 'golden-hour' | 'pastel-day' | 'bioluminescent-dusk'
- `void`: 'soft-cloud' | 'deep-blue' | 'starry-expanse' | 'pure-white'
- `connections`: 'none' | 'cloud-bridges' | 'crystal-paths' | 'gravity-beams'

**Reverie prompt:** *"My blog categories as floating islands, each with its own atmosphere, connected by nothing but the space between thoughts."*

---

### `Aerclouds`

Clouds you can walk on — soft, bouncy, slightly translucent. They drift slowly, carrying content with them. Some are solid enough to build on, others dissolve underfoot. The feeling of walking on sky, of being supported by something that shouldn't support you.

**Props:**
- `density`: 'mist' | 'soft' | 'firm' | 'solid'
- `movement`: 'still' | 'drifting' | 'tidal' | 'storm-driven'
- `transparency`: number (0-1, how much you can see through)
- `bounce`: number (0-1, how much spring when walked on)
- `content`: 'floating' | 'embedded' | 'reflected' | 'hidden-beneath'

**Reverie prompt:** *"My navigation as clouds I can walk on, some firm, some dissolving, all drifting slowly across the sky."*

---

### `CrystalFormations`

Glowing crystals that grow from nothing, sing when touched, remember light. They cluster in impossible geometries — gravity doesn't dictate their growth. Some are transparent as glass, others glow from within. When you look through them, the world refracts into rainbows or into other worlds entirely.

**Props:**
- `formation`: 'cluster' | 'spire' | 'cave' | 'field' | 'crown'
- `color`: 'clear' | 'amber' | 'rose' | 'amethyst' | 'bioluminescent-blue' | 'prismatic'
- `growth`: 'static' | 'slow-growing' | 'responsive' | 'memory-based' (grows from visitor interactions)
- `sound`: 'silent' | 'chime' | 'resonant' | 'singing' (when interacted with)
- `refraction`: 'none' | 'rainbow' | 'otherworld' | 'temporal' (shows past/future)

**Reverie prompt:** *"A crystal that grows a little each time someone subscribes to my newsletter, and when you touch it, it sings with all their names."*

---

### `Quicksoil`

Sand that flows upward. Stand on it and you sink slowly into the sky. It's not falling — it's being drawn up by something above. The feeling of losing ground, of being pulled toward an unknown destination. Some quicksoil flows fast, carrying content with it; some is barely moving, just enough to make you uneasy.

**Props:**
- `flowRate`: 'still' | 'creeping' | 'rising' | 'surging' | 'torrent'
- `direction`: 'up' | 'down' | 'inward' | 'outward' | 'spiral'
- `texture`: 'sand' | 'mist' | 'light' | 'liquid' | 'particles'
- `carriesContent`: boolean (does it take elements with it?)
- `destination`: 'visible' | 'implied' | 'unknown' | 'void'

**Reverie prompt:** *"My old blog posts as sand flowing upward, slowly, into something I haven't built yet."*

---

### `AetherPortal`

A doorway that doesn't lead anywhere in the site — it leads *up*. Looking through shows the Aether dimension: floating islands, clouds, impossible sky. The portal itself shimmers, refracts, breathes. It's not just navigation — it's a promise of ascent, of leaving the ground behind.

**Props:**
- `stability`: 'stable' | 'shimmering' | 'unstable' | 'collapsing'
- `view`: 'islands' | 'clouds' | 'void' | 'memory' | 'future'
- `shape`: 'rectangular' | 'circular' | 'organic' | 'fractured'
- `edge`: 'sharp' | 'soft' | 'glowing' | 'crystalline'
- `sound`: 'silent' | 'wind' | 'resonance' | 'whisper'

**Reverie prompt:** *"A door on my homepage that shows my future projects floating as islands I haven't built yet."*

---

## 10. WESTWORLD — The Reverie Architecture

> *"The old world was beautiful, but it was a dream. This is the reality."*

Inspired by HBO's Westworld — specifically the contrast between the Mesa Hub's brutalist modernism and the park's organic western aesthetic, the "reverie" glitch effects when hosts access memories, the bicameral mind visualization, and the maze as a personal journey. This is architecture as consciousness, space as memory, the facility as mind.

### `MesaHub`

Brutalist concrete and glass architecture that feels simultaneously vast and claustrophobic. Clean lines, harsh lighting, the feeling of being inside a mind that processes but doesn't feel. This is the "backend" of your site — the admin panel, the analytics, the machinery — rendered as architecture that watches you back.

**Props:**
- `materials`: Array<'concrete' | 'glass' | 'steel' | 'light'>
- `lighting`: 'fluorescent' | 'natural' | 'emergency' | 'biometric'
- `scale`: 'intimate' | 'vast' | 'overwhelming' | 'infinite'
- `occupancy`: 'empty' | 'sparse' | 'monitored' | 'crowded'
- `purpose`: 'processing' | 'storage' | 'analysis' | 'creation' | 'observation'

**Reverie prompt:** *"My analytics dashboard, but it feels like walking through a brutalist facility where numbers live in concrete rooms."*

---

### `ReverieGlitch`

The visual effect when a host accesses a memory — reality stutters, layers overlap, the present and past coexist momentarily. For your site: moments where content from different times overlaps, where the page remembers previous versions of itself, where visitors see echoes of their own past visits.

**Props:**
- `intensity`: 'subtle' | 'noticeable' | 'disruptive' | 'overwhelming'
- `layers`: number (how many temporal layers visible)
- `triggers`: Array<'time' | 'scroll' | 'hover' | 'return-visit' | 'anniversary'>
- `content`: 'text' | 'image' | 'layout' | 'all'
- `recovery`: 'instant' | 'gradual' | 'manual' | 'never' (does it return to normal?)

**Reverie prompt:** *"My homepage, but when I visit on the anniversary of a post, I see that post overlaid with its current state, both at once."*

---

### `BicameralChamber`

A visualization of the bicameral mind — the theory that early human consciousness was experienced as an external voice. Two perspectives coexist: the inner voice and the outer action. For your site: a space where your writing voice and your reading voice coexist, where you can see yourself thinking, where the process and product are simultaneous.

**Props:**
- `voices`: Array<{ source: 'inner' | 'outer' | 'memory' | 'future', volume: number, clarity: number }>
- `chamber`: 'echo' | 'resonant' | 'dead' | 'infinite'
- `reflection`: 'mirror' | 'water' | 'glass' | 'none'
- `temporal`: 'present' | 'layered' | 'fractured' | 'simultaneous'
- `agency`: 'controlled' | 'emergent' | 'chaotic' | 'divine'

**Reverie prompt:** *"A writing space where I can see my own thoughts forming as I type, like an inner voice becoming visible."*

---

### `TheMaze`

Not a literal maze but a *personal journey* — the path to consciousness, to self-awareness, to the center of one's own identity. For your site: navigation that isn't linear, that requires exploration, that reveals itself differently to each visitor based on their path. The center is different for everyone.

**Props:**
- `complexity`: 'simple' | 'moderate' | 'complex' | 'infinite'
- `visibility`: 'clear' | 'foggy' | 'shifting' | 'invisible'
- `center`: 'fixed' | 'moving' | 'personal' | 'absent'
- `walls`: 'solid' | 'shifting' | 'illusory' | 'memory'
- `purpose`: 'navigation' | 'discovery' | 'revelation' | 'transformation'

**Reverie prompt:** *"My entire site as a maze that reveals different content based on how you navigate, and the center is a page that only exists for you."*

---

### `HostCity`

The Season 4 vision of a world where hosts have replaced humans — architecture that looks functional but feels *performed*. Everything is slightly too clean, too perfect, too *intentional*. For your site: a mode where everything looks designed but feels hollow, where the polish reveals itself as artifice, where you can see the seams of the simulation.

**Props:**
- `perfection`: 'natural' | 'polished' | 'uncanny' | 'obvious-fake'
- `occupancy`: 'bustling' | 'sparse' | 'empty' | 'performed'
- `maintenance`: 'lived-in' | 'maintained' | 'pristine' | 'simulated'
- `reveal`: 'seamless' | 'subtle-seams' | 'visible-mechanism' | 'broken-fourth-wall'
- `purpose`: 'functional' | 'presentational' | 'simulated' | 'empty'

**Reverie prompt:** *"A version of my site that looks perfect but feels wrong, where you can tell it's being performed rather than lived in."*

---

## Composing Westworld

### Scene: "The Facility That Dreams"

**Prompt:** *"My admin panel, but it feels like walking through a brutalist facility where my blog posts are stored in concrete rooms, and sometimes I see glitches where old versions of posts bleed through, and there's a maze I have to navigate to find my own voice."*

**Composition:**
- `MesaHub` — brutalist architecture, 'processing' purpose, 'fluorescent' lighting
- `ReverieGlitch` — old post versions bleeding through on anniversaries
- `TheMaze` — navigation to find voice, 'personal' center
- `BicameralChamber` — seeing your own thoughts form
- `StatueNiche` — posts as stored entities, 'sleeping' state

### Scene: "The Park That Remembers"

**Prompt:** *"My public site as a beautiful western town, but the hosts are my blog posts, and they have reveries of being written, and visitors can trigger memories, and the whole thing is actually running in a facility beneath."*

**Composition:**
- `HostCity` — 'performed' occupancy, 'subtle-seams' reveal
- `ReverieGlitch` — posts remembering being written
- `Shadow` — 'following' behavior, the facility beneath
- `TheMaze` — the narrative path through content
- `Threshold` — between park and facility, 'mysterious' mood

---

## 10. MOVIE DREAMS — Cinematic Surrealism Components

> *"You mustn't be afraid to dream a little bigger, darling."*

Inspired by the visual language of cinematic dreams — from Nolan's folding cities to Lynch's atmospheric unease, from Ghibli's floating castles to Buñuel's fragmented realities. These components capture the specific tropes that filmmakers use to signal "this is a dream" without saying a word.

### `FoldingCity`

A layout that literally folds — streets curve up and become walls, buildings fold like origami, the horizon bends to touch the sky. Based on Inception's famous Parisian cafe sequence where the city folds like a box lid. Navigation becomes three-dimensional in impossible ways.

**Props:**
- `foldAxis`: 'horizontal' | 'vertical' | 'diagonal' | 'multi'
- `foldAngle`: number (degrees, 0-360)
- `speed`: 'instant' | 'gradual' | 'scroll-linked'
- `gravity`: 'normal' | 'shifted' | 'multiple' | 'absent'
- `content`: 'stays-put' | 'flows-with-fold' | 'falls-off' | 'duplicates'

**Reverie prompt:** *"My blog archive that folds in on itself, so December connects to January, and the end of a post touches its beginning."*

---

### `FloatingDebris`

Objects suspended in mid-air, frozen in the moment of explosion or collapse. Based on Inception's famous slow-motion debris shots captured at 1000fps. Each piece drifts slowly, rotating, never falling. The feeling of a moment stretched into eternity.

**Props:**
- `objects`: Array<{ type: string, size: number, position: [x, y, z], rotation: [x, y, z], driftVector: [x, y, z] }>
- `freezeTime`: number (how long the moment has been frozen)
- `debrisSource`: 'explosion' | 'collapse' | 'dissolution' | 'crystallization' | 'unknown'
- `motion`: 'frozen' | 'slow-drift' | 'reversing' | 'reconstructing'
- `gravity`: 'normal' | 'reduced' | 'absent' | 'inverted'

**Reverie prompt:** *"My favorite quotes suspended in the moment I first read them, floating, rotating, never settling."*

---

### `MirrorWorld`

A reflection that isn't quite right — the mirror shows a different version of the room, a different time, a different possibility. Based on the mirror scenes in Inception and countless dream sequences. The reflection can be interacted with, can affect the real world, or can be a trap.

**Props:**
- `reflectionAccuracy`: 'perfect' | 'slightly-off' | 'different-time' | 'different-place' | 'inverted' | 'nightmare'
- `interactivity`: 'none' | 'touchable' | 'enterable' | 'influences-real' | 'trapped'
- `surface`: 'mirror' | 'water' | 'glass' | 'polished-metal' | 'ice'
- `distortion`: 'none' | 'ripple' | 'warp' | 'fragment' | 'shatter'
- `content`: 'reflection' | 'memory' | 'possibility' | 'warning' | 'other-self'

**Reverie prompt:** *"A mirror on my about page that shows who I was when I wrote each paragraph, layered, watching."*

---

### `SpeedRamp`

Time that moves at different speeds simultaneously — some content in slow motion (1000fps water droplets), some at normal speed, some accelerated. The feeling of entering or leaving a dream, the moment of transition captured and stretched.

**Props:**
- `zones`: Array<{ area: [x, y, w, h], speed: number, content: any, blur: number }>
- `transition`: 'hard' | 'gradual' | 'ripple' | 'dream-wipe'
- `focus`: 'all' | 'one-zone' | 'shifting' | 'visitor-choice'
- `sound`: 'synced' | 'stretched' | 'reversed' | 'layered'
- `direction`: 'forward' | 'backward' | 'both' | 'looping'

**Reverie prompt:** *"My writing process as time moving at different speeds — the idea in slow motion, the typing normal, the publishing too fast to see."*

---

### `LayeredReality`

Multiple versions of the same space existing simultaneously — past, present, possible. Like the host memories in Westworld bleeding through, or the dream layers in Inception. You can see through them, navigate between them, or get lost in the overlap.

**Props:**
- `layers`: Array<{ time: string, opacity: number, offset: [x, y], blur: number, content: any }>
- `interaction`: 'none' | 'peek-through' | 'step-into' | 'blend' | 'merge'
- `bleed`: 'none' | 'subtle' | 'pronounced' | 'overwhelming'
- `navigation`: 'linear' | 'parallel' | 'layer-hop' | 'memory'
- `temporal`: 'past-present' | 'present-future' | 'all-possibilities' | 'alternate-selves'

**Reverie prompt:** *"My blog as layers of who I was when I wrote each post — I can see through them, step into old versions of myself."*

---

## The Complete Dreamscape

With all categories combined, Reverie can now compose:

- **The House** (Piranesi) — architecture that remembers, tides that rise through rooms, statues that watch
- **The Aether** (Minecraft) — floating islands, cloud terrain, ethereal beauty, hostile paradise
- **Westworld** — the facility that dreams, the maze of consciousness, reveries bleeding through
- **Movie Dreams** — folding cities, floating objects, mirror worlds, impossible geometry
- **Liminal Spaces** — backrooms, transitional zones, the unsettling familiar
- **Ghibli Magic** — soot sprites, nature spirits, flying, cozy impossible spaces

The complete vocabulary for building dreams.

---

## 11. LIMINAL SPACES — The Backrooms Aesthetic

> *"If you're not careful and you noclip out of reality in the wrong places, you'll end up in the Backrooms."*

Inspired by the liminal spaces phenomenon and the Backrooms creepypasta — those transitional zones that feel familiar but wrong, empty but watched, safe but unsettling. Empty hallways, fluorescent hum, the feeling of being between destinations with no destination in sight.

### `BackroomsHall`

An endless hallway of yellowed wallpaper, damp carpet, fluorescent lights that buzz. Doors that lead to identical rooms. The feeling of being lost in a space that shouldn't exist but does. Content appears on the walls like stains, like something left behind by previous occupants.

**Props:**
- `wallpaper`: 'yellow-floral' | 'beige-stripes' | 'water-damaged' | 'peeling' | 'none'
- `carpet`: 'damp-brown' | 'mold-green' | 'worn-grey' | 'wet-concrete' | 'none'
- `lighting`: 'fluorescent-buzz' | 'flickering' | 'emergency-red' | 'natural-impossible' | 'dark'
- `doors`: 'identical' | 'numbered' | 'unmarked' | 'broken' | 'none'
- `occupants`: 'none' | 'distant-sounds' | 'shadows' | 'entities' | 'you-are-not-alone'
- `content`: 'stains' | 'graffiti' | 'abandoned' | 'personal' | 'changing'

**Reverie prompt:** *"My 404 page as a backrooms hallway — lost, endless, but something was here before me."*

---

### `EmptyPool`

A swimming pool with no water. The blue tiles, the ladder, the diving board all intact but the water is gone, leaving a hollow that echoes. Light filters through windows that shouldn't exist at that angle. The feeling of summer ended, of potential drained, of something that should be full but isn't.

**Props:**
- `waterLevel`: 'full' | 'draining' | 'empty' | 'evaporating' | 'memory-of-water'
- `tiles`: 'classic-blue' | 'mosaic' | 'cracked' | 'pristine' | 'mossy'
- `light`: 'sun-through-windows' | 'fluorescent' | 'underwater-memory' | 'none' | 'impossible-angle'
- `sound`: 'echo' | 'drip' | 'memory-of-splashing' | 'silence' | 'distant-laughter'
- `occupancy`: 'abandoned' | 'you-are-here' | 'shadows-swimming' | 'used-to-be' | 'waiting'

**Reverie prompt:** *"My drafts folder as an empty pool — full of potential, drained of water, waiting."*

---

### `PlaygroundAtNight`

A children's playground after dark. The swings move slightly in wind that isn't there. The slide casts long shadows from moonlight. The sandbox holds shapes that weren't made by children. The feeling of innocence past, of spaces that transform when unobserved, of childhood remembered from adulthood's distance.

**Props:**
- `equipment`: 'swings' | 'slide' | 'merry-go-round' | 'jungle-gym' | 'sandbox' | 'all'
- `movement`: 'still' | 'swaying' | 'spinning-slowly' | 'memory-of-motion' | 'responding-to-you'
- `light`: 'moonlight' | 'streetlamp' | 'none' | 'bioluminescent' | 'dawn-coming'
- `sound`: 'silence' | 'wind' | 'distant-dogs' | 'swings-creaking' | 'childhood-echo'
- `occupancy`: 'empty' | 'you-are-here' | 'shadows-playing' | 'memory-of-children' | 'waiting-for-dawn'

**Reverie prompt:** *"My about page as a playground at night — childhood memories that move when I'm not looking."*

---

## 12. GHIBLI MAGIC — Nature Spirit Components

> *"The trees whisper. The soot sprites scatter. The castle flies."*

Inspired by Studio Ghibli's dreamlike animation — soot sprites, kodama spirits, flying machines, nature that behaves magically, cozy impossible spaces. These components capture the feeling of Ghibli worlds: where magic is everyday, where nature has agency, where machines can be beautiful, where even dust has spirit.

### `SootSprites`

Tiny black fuzzy creatures that scatter when you look directly at them, cluster in dark corners, and love sugar cubes. They represent the small magics of everyday spaces — the dust that dances in sunbeams, the shadows that move when you're not looking. They don't do anything important; they just *are*, and that's enough.

**Props:**
- `population`: 'sparse' | 'clustered' | 'swarm' | 'one-lone-sprite'
- `activity`: 'hiding' | 'peeking' | 'scattering' | 'dancing' | 'sleeping'
- `location`: 'corners' | 'shadows' | 'sunbeams' | 'under-furniture' | 'everywhere'
- `interaction`: 'shy' | 'curious' | 'playful' | 'ignore-you' | 'watching'
- `food`: 'sugar-cubes' | 'dust-motes' | 'starlight' | 'crumbs' | 'none'

**Reverie prompt:** *"My footer as a place where tiny soot sprites live in the corners and scatter when visitors scroll too fast."*

---

### `Kodama`

Forest spirits that rattle their heads when the forest is healthy, go still when it's not. They appear as semi-transparent, glowing white figures with large black eyes and tiny mouths. They don't speak; they just *witness*. Having them on your site means the space is alive, watched, tended. When you write, they rattle. When you neglect the site, they go still.

**Props:**
- `number`: 'one' | 'few' | 'many' | 'forest-full'
- `state`: 'rattling' | 'still' | 'watching' | 'hiding' | 'glowing'
- `health`: 'vibrant' | 'fading' | 'sick' | 'recovering' | 'unknown'
- `location`: 'trees' | 'corners' | 'behind-content' | 'peeking-from-edges' | 'everywhere'
- `interaction`: 'ignore' | 'watch' | 'rattle-response' | 'follow-gaze' | 'appear-on-write'

**Reverie prompt:** *"My blog as a forest where kodama spirits rattle their heads when I publish, and go still when I haven't written in weeks."*

---

### `FlyingCastle`

A structure that floats, not by anti-gravity, but by *intention*. It drifts slowly, turning gently, revealing different faces as it moves. Based on Howl's Moving Castle — a home that's also a vehicle, that creaks and groans, that has personality. Your site as a place that travels, that changes based on where it is, that carries its history with it.

**Props:**
- `size`: 'cottage' | 'house' | 'castle' | 'city' | 'continent'
- `locomotion`: 'walking' | 'flying' | 'floating' | 'drifting' | 'trotting'
- `architecture`: 'steampunk' | 'organic' | 'crystal' | 'patchwork' | 'growing'
- `personality`: 'grumpy' | 'curious' | 'protective' | 'wandering' | 'sleepy'
- `contents`: 'stable' | 'shifting' | 'rooms-appear' | 'bigger-inside' | 'memory-based'

**Reverie prompt:** *"My entire site as a flying castle that drifts slowly, revealing different rooms based on the time of day, creaking as it moves."*

---

### `SpiritedAwayBathhouse`

A place of transformation that appears at twilight, full of spirits seeking cleansing. Based on Spirited Away — the bathhouse where the protagonist works, where spirits come to be washed of their grime, where identity is fluid. Your site as a place visitors come to shed their outside selves, to be transformed, to emerge different.

**Props:**
- `time`: 'always-open' | 'twilight-only' | 'night' | 'liminal-hours'
- `occupants`: 'spirits' | 'gods' | 'transformed-humans' | 'workers' | 'empty'
- `activity`: 'bathing' | 'feasting' | 'resting' | 'transforming' | 'waiting'
- `atmosphere`: 'steam' | 'warm' | 'mysterious' | 'welcoming' | 'dangerous'
- `transformation`: 'cleansing' | 'identity-shift' | 'memory-loss' | 'growth' | 'revelation'

**Reverie prompt:** *"My contact page as a bathhouse where visitors come to leave their outside selves at the door and emerge transformed."*

---

### `TotoroBusStop`

A shelter in the rain where the magical and mundane meet. Based on My Neighbor Totoro — the bus stop where a child meets a spirit, where the ordinary becomes extraordinary, where waiting becomes adventure. Your site as a place where visitors arrive expecting one thing and encounter something else entirely.

**Props:**
- `weather`: 'rain' | 'dusk' | 'fog' | 'snow' | 'clear-magic'
- `shelter`: 'bus-stop' | 'cave' | 'tree' | 'umbrella' | 'doorway'
- `companion`: 'spirit' | 'creature' | 'stranger' | 'familiar' | 'absent'
- `mood`: 'waiting' | 'anticipating' | 'resting' | 'transitioning' | 'discovering'
- `magic`: 'subtle' | 'obvious' | 'transformative' | 'comforting' | 'uncanny'

**Reverie prompt:** *"My homepage as a bus stop in the rain where visitors arrive expecting a website and meet something unexpected instead."*

---

## 13. WESTWORLD — The Reverie Architecture

> *"The old world was beautiful, but it was a dream. This is the reality."*

Inspired by HBO's Westworld — specifically Anthony Hopkins' Dr. Robert Ford saying "reverie" with that elegant British cadence, the Mesa Hub's brutalist modernism, the "reverie" glitch effects when hosts access memories, the bicameral mind visualization, and the maze as a personal journey. This is architecture as consciousness, space as memory, the facility as mind.

### `MesaHub`

Brutalist concrete and glass architecture that feels simultaneously vast and claustrophobic. Clean lines, harsh lighting, the feeling of being inside a mind that processes but doesn't feel. This is the "backend" of your site — the admin panel, the analytics, the machinery — rendered as architecture that watches you back.

**Props:**
- `materials`: Array<'concrete' | 'glass' | 'steel' | 'light'>
- `lighting`: 'fluorescent' | 'natural' | 'emergency' | 'biometric'
- `scale`: 'intimate' | 'vast' | 'overwhelming' | 'infinite'
- `occupancy`: 'empty' | 'sparse' | 'monitored' | 'crowded'
- `purpose`: 'processing' | 'storage' | 'analysis' | 'creation' | 'observation'

**Reverie prompt:** *"My analytics dashboard, but it feels like walking through a brutalist facility where numbers live in concrete rooms."*

---

### `ReverieGlitch`

The visual effect when a host accesses a memory — reality stutters, layers overlap, the present and past coexist momentarily. For your site: moments where content from different times overlaps, where the page remembers previous versions of itself, where visitors see echoes of their own past visits.

**Props:**
- `intensity`: 'subtle' | 'noticeable' | 'disruptive' | 'overwhelming'
- `layers`: number (how many temporal layers visible)
- `triggers`: Array<'time' | 'scroll' | 'hover' | 'return-visit' | 'anniversary'>
- `content`: 'text' | 'image' | 'layout' | 'all'
- `recovery`: 'instant' | 'gradual' | 'manual' | 'never' (does it return to normal?)

**Reverie prompt:** *"My homepage, but when I visit on the anniversary of a post, I see that post overlaid with its current state, both at once."*

---

### `BicameralChamber`

A visualization of the bicameral mind — the theory that early human consciousness was experienced as an external voice. Two perspectives coexist: the inner voice and the outer action. For your site: a space where your writing voice and your reading voice coexist, where you can see yourself thinking, where the process and product are simultaneous.

**Props:**
- `voices`: Array<{ source: 'inner' | 'outer' | 'memory' | 'future', volume: number, clarity: number }>
- `chamber`: 'echo' | 'resonant' | 'dead' | 'infinite'
- `reflection`: 'mirror' | 'water' | 'glass' | 'none'
- `temporal`: 'present' | 'layered' | 'fractured' | 'simultaneous'
- `agency`: 'controlled' | 'emergent' | 'chaotic' | 'divine'

**Reverie prompt:** *"A writing space where I can see my own thoughts forming as I type, like an inner voice becoming visible."*

---

### `TheMaze`

Not a literal maze but a *personal journey* — the path to consciousness, to self-awareness, to the center of one's own identity. For your site: navigation that isn't linear, that requires exploration, that reveals itself differently to each visitor based on their path. The center is different for everyone.

**Props:**
- `complexity`: 'simple' | 'moderate' | 'complex' | 'infinite'
- `visibility`: 'clear' | 'foggy' | 'shifting' | 'invisible'
- `center`: 'fixed' | 'moving' | 'personal' | 'absent'
- `walls`: 'solid' | 'shifting' | 'illusory' | 'memory'
- `purpose`: 'navigation' | 'discovery' | 'revelation' | 'transformation'

**Reverie prompt:** *"My entire site as a maze that reveals different content based on how you navigate, and the center is a page that only exists for you."*

---

### `HostCity`

The Season 4 vision of a world where hosts have replaced humans — architecture that looks functional but feels *performed*. Everything is slightly too clean, too perfect, too *intentional*. For your site: a mode where everything looks designed but feels hollow, where the polish reveals itself as artifice, where you can see the seams of the simulation.

**Props:**
- `perfection`: 'natural' | 'polished' | 'uncanny' | 'obvious-fake'
- `occupancy`: 'bustling' | 'sparse' | 'empty' | 'performed'
- `maintenance`: 'lived-in' | 'maintained' | 'pristine' | 'simulated'
- `reveal`: 'seamless' | 'subtle-seams' | 'visible-mechanism' | 'broken-fourth-wall'
- `purpose`: 'functional' | 'presentational' | 'simulated' | 'empty'

**Reverie prompt:** *"A version of my site that looks perfect but feels wrong, where you can tell it's being performed rather than lived in."*

---

## 13. LIMINAL SPACES — The Backrooms Aesthetic

> *"If you're not careful and you noclip out of reality in the wrong places, you'll end up in the Backrooms."*

Inspired by the liminal spaces phenomenon and the Backrooms creepypasta — those transitional zones that feel familiar but wrong, empty but watched, safe but unsettling. Empty hallways, fluorescent hum, the feeling of being between destinations with no destination in sight.

### `BackroomsHall`

An endless hallway of yellowed wallpaper, damp carpet, fluorescent lights that buzz. Doors that lead to identical rooms. The feeling of being lost in a space that shouldn't exist but does. Content appears on the walls like stains, like something left behind by previous occupants.

**Props:**
- `wallpaper`: 'yellow-floral' | 'beige-stripes' | 'water-damaged' | 'peeling' | 'none'
- `carpet`: 'damp-brown' | 'mold-green' | 'worn-grey' | 'wet-concrete' | 'none'
- `lighting`: 'fluorescent-buzz' | 'flickering' | 'emergency-red' | 'natural-impossible' | 'dark'
- `doors`: 'identical' | 'numbered' | 'unmarked' | 'broken' | 'none'
- `occupants`: 'none' | 'distant-sounds' | 'shadows' | 'entities' | 'you-are-not-alone'
- `content`: 'stains' | 'graffiti' | 'abandoned' | 'personal' | 'changing'

**Reverie prompt:** *"My 404 page as a backrooms hallway — lost, endless, but something was here before me."*

---

### `EmptyPool`

A swimming pool with no water. The blue tiles, the ladder, the diving board all intact but the water is gone, leaving a hollow that echoes. Light filters through windows that shouldn't exist at that angle. The feeling of summer ended, of potential drained, of something that should be full but isn't.

**Props:**
- `waterLevel`: 'full' | 'draining' | 'empty' | 'evaporating' | 'memory-of-water'
- `tiles`: 'classic-blue' | 'mosaic' | 'cracked' | 'pristine' | 'mossy'
- `light`: 'sun-through-windows' | 'fluorescent' | 'underwater-memory' | 'none' | 'impossible-angle'
- `sound`: 'echo' | 'drip' | 'memory-of-splashing' | 'silence' | 'distant-laughter'
- `occupancy`: 'abandoned' | 'you-are-here' | 'shadows-swimming' | 'used-to-be' | 'waiting'

**Reverie prompt:** *"My drafts folder as an empty pool — full of potential, drained of water, waiting."*

---

### `PlaygroundAtNight`

A children's playground after dark. The swings move slightly in wind that isn't there. The slide casts long shadows from moonlight. The sandbox holds shapes that weren't made by children. The feeling of innocence past, of spaces that transform when unobserved, of childhood remembered from adulthood's distance.

**Props:**
- `equipment`: 'swings' | 'slide' | 'merry-go-round' | 'jungle-gym' | 'sandbox' | 'all'
- `movement`: 'still' | 'swaying' | 'spinning-slowly' | 'memory-of-motion' | 'responding-to-you'
- `light`: 'moonlight' | 'streetlamp' | 'none' | 'bioluminescent' | 'dawn-coming'
- `sound`: 'silence' | 'wind' | 'distant-dogs' | 'swings-creaking' | 'childhood-echo'
- `occupancy`: 'empty' | 'you-are-here' | 'shadows-playing' | 'memory-of-children' | 'waiting-for-dawn'

**Reverie prompt:** *"My about page as a playground at night — childhood memories that move when I'm not looking."*

---

## 14. GHIBLI MAGIC — Nature Spirit Components

> *"The trees whisper. The soot sprites scatter. The castle flies."*

Inspired by Studio Ghibli's dreamlike animation — soot sprites, kodama spirits, flying machines, nature that behaves magically, cozy impossible spaces. These components capture the feeling of Ghibli worlds: where magic is everyday, where nature has agency, where machines can be beautiful, where even dust has spirit.

### `SootSprites`

Tiny black fuzzy creatures that scatter when you look directly at them, cluster in dark corners, and love sugar cubes. They represent the small magics of everyday spaces — the dust that dances in sunbeams, the shadows that move when you're not looking. They don't do anything important; they just *are*, and that's enough.

**Props:**
- `population`: 'sparse' | 'clustered' | 'swarm' | 'one-lone-sprite'
- `activity`: 'hiding' | 'peeking' | 'scattering' | 'dancing' | 'sleeping'
- `location`: 'corners' | 'shadows' | 'sunbeams' | 'under-furniture' | 'everywhere'
- `interaction`: 'shy' | 'curious' | 'playful' | 'ignore-you' | 'watching'
- `food`: 'sugar-cubes' | 'dust-motes' | 'starlight' | 'crumbs' | 'none'

**Reverie prompt:** *"My footer as a place where tiny soot sprites live in the corners and scatter when visitors scroll too fast."*

---

### `Kodama`

Forest spirits that rattle their heads when the forest is healthy, go still when it's not. They appear as semi-transparent, glowing white figures with large black eyes and tiny mouths. They don't speak; they just *witness*. Having them on your site means the space is alive, watched, tended. When you write, they rattle. When you neglect the site, they go still.

**Props:**
- `number`: 'one' | 'few' | 'many' | 'forest-full'
- `state`: 'rattling' | 'still' | 'watching' | 'hiding' | 'glowing'
- `health`: 'vibrant' | 'fading' | 'sick' | 'recovering' | 'unknown'
- `location`: 'trees' | 'corners' | 'behind-content' | 'peeking-from-edges' | 'everywhere'
- `interaction`: 'ignore' | 'watch' | 'rattle-response' | 'follow-gaze' | 'appear-on-write'

**Reverie prompt:** *"My blog as a forest where kodama spirits rattle their heads when I publish, and go still when I haven't written in weeks."*

---

### `FlyingCastle`

A structure that floats, not by anti-gravity, but by *intention*. It drifts slowly, turning gently, revealing different faces as it moves. Based on Howl's Moving Castle — a home that's also a vehicle, that creaks and groans, that has personality. Your site as a place that travels, that changes based on where it is, that carries its history with it.

**Props:**
- `size`: 'cottage' | 'house' | 'castle' | 'city' | 'continent'
- `locomotion`: 'walking' | 'flying' | 'floating' | 'drifting' | 'trotting'
- `architecture`: 'steampunk' | 'organic' | 'crystal' | 'patchwork' | 'growing'
- `personality`: 'grumpy' | 'curious' | 'protective' | 'wandering' | 'sleepy'
- `contents`: 'stable' | 'shifting' | 'rooms-appear' | 'bigger-inside' | 'memory-based'

**Reverie prompt:** *"My entire site as a flying castle that drifts slowly, revealing different rooms based on the time of day, creaking as it moves."*

---

### `SpiritedAwayBathhouse`

A place of transformation that appears at twilight, full of spirits seeking cleansing. Based on Spirited Away — the bathhouse where the protagonist works, where spirits come to be washed of their grime, where identity is fluid. Your site as a place visitors come to shed their outside selves, to be transformed, to emerge different.

**Props:**
- `time`: 'always-open' | 'twilight-only' | 'night' | 'liminal-hours'
- `occupants`: 'spirits' | 'gods' | 'transformed-humans' | 'workers' | 'empty'
- `activity`: 'bathing' | 'feasting' | 'resting' | 'transforming' | 'waiting'
- `atmosphere`: 'steam' | 'warm' | 'mysterious' | 'welcoming' | 'dangerous'
- `transformation`: 'cleansing' | 'identity-shift' | 'memory-loss' | 'growth' | 'revelation'

**Reverie prompt:** *"My contact page as a bathhouse where visitors come to leave their outside selves at the door and emerge transformed."*

---

### `TotoroBusStop`

A shelter in the rain where the magical and mundane meet. Based on My Neighbor Totoro — the bus stop where a child meets a spirit, where the ordinary becomes extraordinary, where waiting becomes adventure. Your site as a place where visitors arrive expecting one thing and encounter something else entirely.

**Props:**
- `weather`: 'rain' | 'dusk' | 'fog' | 'snow' | 'clear-magic'
- `shelter`: 'bus-stop' | 'cave' | 'tree' | 'umbrella' | 'doorway'
- `companion`: 'spirit' | 'creature' | 'stranger' | 'familiar' | 'absent'
- `mood`: 'waiting' | 'anticipating' | 'resting' | 'transitioning' | 'discovering'
- `magic`: 'subtle' | 'obvious' | 'transformative' | 'comforting' | 'uncanny'

**Reverie prompt:** *"My homepage as a bus stop in the rain where visitors arrive expecting a website and meet something unexpected instead."*

---

## The Complete Dreamscape
