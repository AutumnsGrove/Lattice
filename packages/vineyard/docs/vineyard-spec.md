# Vineyard — Asset & Tool Showcase Pattern

> *Every vine starts somewhere.*

**Status:** Spec Draft
**Target Phase:** Ongoing (each tool implements as ready)
**Internal Name:** GroveShowcase

---

## Overview

Vineyard is a documentation and demo pattern that every Grove tool implements. Rather than a single showcase site, each product gets its own `/vineyard` route on its subdomain—creating a consistent, discoverable way to explore what each tool does, how it works, and where it's headed.

### Why Vineyard?

Grove's ecosystem is growing. Foliage handles theming. Ivy handles email. Amber handles storage. Meadow handles social. Each tool has its own identity, but users need a consistent way to:

- **Understand** what a tool does before using it
- **Explore** working demos and examples
- **Learn** through documentation and guides
- **Preview** features that are planned but not yet built

Vineyard solves this by establishing a pattern: visit `toolname.grove.place/vineyard` to see everything about that tool.

### Core Principles

1. **Consistent structure** — Every Vineyard follows the same layout pattern
2. **Honest about progress** — Show what's ready, what's coming, and what's just an idea
3. **Demo-first** — Working examples beat documentation walls
4. **Beautiful by default** — Grove's warm aesthetic throughout
5. **Self-documenting** — The Vineyard is the documentation

---

## URL Structure

```
amber.grove.place/vineyard      → Amber (Storage Management)
ivy.grove.place/vineyard        → Ivy (Email Client)
foliage.grove.place/vineyard    → Foliage (Theming System)
meadow.grove.place/vineyard     → Meadow (Social Layer)
rings.grove.place/vineyard      → Rings (Analytics)
trails.grove.place/vineyard     → Trails (Personal Roadmaps)
heartwood.grove.place/vineyard  → Heartwood (Authentication)
forage.grove.place/vineyard     → Forage (Domain Discovery)
```

Each Vineyard is self-contained within its tool's deployment. No central aggregator site needed—though a directory could link to all Vineyards from `grove.place/vineyard`.

---

## Content Sections

Every Vineyard page should include these sections (in order):

### 1. Hero / Overview
- Tool name and tagline
- One-sentence description
- Current status badge: `Ready` | `Preview` | `Coming Soon` | `In Development`
- Philosophy quote from grove-naming.md

### 2. Feature Tour
- Visual walkthrough of key features
- Interactive demos where possible
- Mockups/screenshots for planned features
- Clear labels: `Live`, `Demo`, `Coming Soon`

### 3. How It Works
- Technical overview (for users who want depth)
- Architecture diagrams where relevant
- Integration points with other Grove tools

### 4. Getting Started
- Quick start guide for users
- Prerequisites (tier requirements, etc.)
- First steps walkthrough

### 5. API Reference (if applicable)
- Endpoint documentation
- Request/response examples
- Rate limits and constraints

### 6. Configuration
- Settings and options
- Tier-gated features explained
- Customization possibilities

### 7. Roadmap
- What's built and working
- What's in progress
- What's planned
- Link to full spec if available

### 8. Related Tools
- Links to other Grove tools that integrate
- "Works well with..." suggestions

---

## Status Badges

Use consistent status indicators across all Vineyards:

| Badge | Meaning | Visual |
|-------|---------|--------|
| `Ready` | Production-ready, available now | Green, solid |
| `Preview` | Functional but may change | Yellow, dashed border |
| `Demo` | Working example, not real data | Blue, labeled |
| `Coming Soon` | Designed, not yet built | Gray, subtle |
| `In Development` | Actively being built | Orange, pulsing |

---

## Shared Components

These components should live in Lattice (`@autumnsgrove/groveengine`) for reuse across all Vineyards:

### VineyardLayout
```svelte
<VineyardLayout
  tool="amber"
  tagline="Your files, preserved"
  status="preview"
>
  <slot />
</VineyardLayout>
```

### FeatureCard
```svelte
<FeatureCard
  title="Storage Overview"
  description="See usage across posts and media"
  status="ready"
  icon="HardDrive"
>
  <DemoComponent slot="demo" />
</FeatureCard>
```

### StatusBadge
```svelte
<StatusBadge status="coming-soon" />
```

### DemoContainer
```svelte
<DemoContainer
  title="Theme Picker Demo"
  description="Try switching between curated themes"
  mockData={true}
>
  <ThemePicker themes={sampleThemes} />
</DemoContainer>
```

### CodeExample
```svelte
<CodeExample
  language="typescript"
  filename="src/routes/+layout.svelte"
>
  {codeString}
</CodeExample>
```

### TierGate
```svelte
<TierGate required="oak" current={userTier}>
  <AdvancedFeature />
  <UpgradePrompt slot="fallback" />
</TierGate>
```

### RoadmapSection
```svelte
<RoadmapSection
  built={['Core storage view', 'Usage breakdown']}
  inProgress={['Export functionality']}
  planned={['Bulk delete', 'Storage alerts']}
/>
```

---

## Design Guidelines

### Visual Consistency

- Use Grove's glassmorphism style
- Warm color palette from Foliage
- Lexend font throughout
- Nature decorations appropriate to tool (vines for Ivy, amber resin shapes for Amber, etc.)

### Tone

- Warm and welcoming, not corporate
- Honest about what's ready vs. planned
- "We're building this together" energy
- Technical depth available but not required

### Responsive Layout

- Mobile-first, graceful degradation
- Demo components should work on touch
- Code examples should be scrollable/copyable

---

## Implementation Status

| Tool | Domain | Vineyard Status | Notes |
|------|--------|-----------------|-------|
| **Amber** | amber.grove.place | Not Started | Spec exists, product routing exists |
| **Ivy** | ivy.grove.place | Not Started | Full spec exists at `docs/specs/completed/ivy-mail-spec.md` |
| **Foliage** | foliage.grove.place | Not Started | External package, needs dedicated site |
| **Meadow** | meadow.grove.place | Not Started | Spec exists at `docs/specs/social-spec.md` |
| **Rings** | *(integrated)* | Not Started | Integrated into admin, may not need standalone |
| **Trails** | *(integrated)* | Not Started | Spec exists at `docs/specs/trails-spec.md` |
| **Heartwood** | heartwood.grove.place | Not Started | Auth system, may need limited Vineyard |
| **Forage** | forage.grove.place | Not Started | Domain discovery tool |

### Priority Order (Suggested)

1. **Foliage** — Theming is visual, demos well, has external package ready
2. **Ivy** — Full spec exists, comprehensive to showcase
3. **Amber** — Simple concept, easy to explain and demo
4. **Meadow** — Important for launch, even as "coming soon"
5. **Others** — As tools mature

---

## Directory Page (Optional)

A central directory at `grove.place/vineyard` could list all tools:

```
grove.place/vineyard
├── Overview of the Grove ecosystem
├── Visual garden/forest representation
├── Links to each tool's Vineyard
├── Status indicators for each
└── "What's growing" section for upcoming tools
```

This is optional—each Vineyard can exist independently.

---

## Technical Implementation

### Routing

Each tool adds a `/vineyard` route to its SvelteKit app:

```
src/routes/vineyard/
├── +page.svelte          # Main Vineyard page
├── +layout.svelte        # Vineyard-specific layout
├── features/
│   └── +page.svelte      # Feature deep-dives
├── api/
│   └── +page.svelte      # API reference
└── demo/
    └── +page.svelte      # Interactive demos
```

### Shared Components Package

Add to Lattice:

```
packages/engine/src/lib/ui/components/vineyard/
├── VineyardLayout.svelte
├── FeatureCard.svelte
├── StatusBadge.svelte
├── DemoContainer.svelte
├── CodeExample.svelte
├── TierGate.svelte
├── RoadmapSection.svelte
└── index.ts
```

Export from `@autumnsgrove/groveengine/vineyard`:

```typescript
export {
  VineyardLayout,
  FeatureCard,
  StatusBadge,
  DemoContainer,
  CodeExample,
  TierGate,
  RoadmapSection
} from './components/vineyard';
```

---

## Content Strategy

### For Ready Tools

Full Vineyard with:
- Working demos using real (or realistic mock) data
- Complete documentation
- Getting started guides
- API reference

### For Preview/Development Tools

Vineyard with:
- Mockups and design previews
- Spec highlights
- Roadmap with progress indicators
- "Sign up to be notified" option

### For Coming Soon Tools

Minimal Vineyard with:
- Philosophy and vision
- Mockups or concept art
- Expected timeline (if known)
- Link to spec (if public)

---

## Example: Amber Vineyard

```
amber.grove.place/vineyard

Hero:
  "Amber — Your files, preserved"
  Status: Preview
  "Amber is fossilized tree resin—preserving moments in time..."

Feature Tour:
  - Storage Overview (Demo: mock usage chart)
  - File Browser (Demo: sample file list)
  - Usage by Type (Demo: pie chart breakdown)
  - Export Your Data (Coming Soon badge)

How It Works:
  - R2 storage backend
  - Per-tenant isolation
  - Integration with blog posts, Ivy attachments

Getting Started:
  - Available at Sapling tier and up
  - Access via admin panel → Storage
  - Upload limits by tier

Roadmap:
  ✓ Basic storage view
  ✓ Usage breakdown
  → Export functionality (in progress)
  ○ Bulk delete
  ○ Storage alerts
  ○ External backup integration
```

---

## Open Questions

1. **Authentication for Demos**: Should demos require login, or use fully mock data?
   - **Recommendation**: Mock data for public, real data after login

2. **Versioning**: How do we handle Vineyard content as tools evolve?
   - **Recommendation**: Vineyard always shows current state, use roadmap for history

3. **Search**: Should Vineyards be searchable across tools?
   - **Recommendation**: Not for MVP, consider for directory page later

4. **Feedback**: Should Vineyards have "Was this helpful?" or feedback forms?
   - **Recommendation**: Yes, simple thumbs up/down + optional comment

---

## Related Specs

- `grove-naming.md` — Tool names and philosophy
- `help-center-spec.md` — Related documentation patterns
- `theme-system-spec.md` — Foliage integration for Vineyard theming

---

*Last updated: December 2025*
*Author: Claude (with Autumn)*
