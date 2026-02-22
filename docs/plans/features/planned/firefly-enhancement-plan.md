---
title: "Firefly Enhancement Plan"
status: planned
category: features
---

# Firefly Enhancement Plan

> **Created:** February 2026  
> **Status:** Planning  
> **Author:** Kilo Code (AI Assistant)

---

## Overview

This plan outlines enhancements to the Firefly component and introduces a versatile Swarm system for nature components. The Firefly component has been identified as the most beloved component in the Lattice codebase, and these enhancements aim to extend its magic while maintaining the performance and accessibility standards that make it special.

---

## Background

### The Firefly Pattern (Infrastructure)

Interestingly, "Firefly" is already a well-established pattern in Grove's infrastructure architecture:

- **Public Name:** Firefly
- **Internal Name:** GroveFirefly
- **Purpose:** Ephemeral server infrastructure that ignites, illuminates, and fades away
- **Used By:** Bloom (AI coding agents), Outpost (gaming servers)

The Firefly infrastructure pattern defines a three-phase lifecycle:

1. **Ignite** — Spin up a server in response to demand
2. **Illuminate** — Execute the work (coding, gaming, processing)
3. **Fade** — Tear down gracefully when complete or idle

This creates a delightful meta-naming opportunity: the UI Firefly component can reference the infrastructure Firefly pattern, creating a unified metaphor across Grove.

### The Firefly Component (UI)

Current implementation in [`Firefly.svelte`](libs/engine/src/lib/ui/components/nature/creatures/Firefly.svelte):

- Multi-layered bioluminescence (outer glow, inner glow, glowing abdomen)
- Performance-optimized animations (opacity-based, not filter-based)
- IntersectionObserver for visibility-based animation pausing
- Accessibility support (prefers-reduced-motion, aria-hidden)
- Customizable props (glowColor, bodyColor, intensity, animate)

---

## Phase 1: Firefly Component Enhancements

### 1.1 Size Variants

Add a `size` prop for consistent sizing across the grove.

```typescript
interface FireflyProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  // ... existing props
}
```

**Implementation:**

- `xs`: w-1.5 h-1.5 (tiny, distant fireflies)
- `sm`: w-2 h-2 (default, current size)
- `md`: w-3 h-3 (medium, foreground)
- `lg`: w-4 h-4 (large, close-up)
- `xl`: w-6 h-6 (hero fireflies)

**Glow scaling:** Glow radius should scale proportionally with size.

### 1.2 Interactive Mode

Add an `interactive` prop for fireflies that respond to user interaction.

```typescript
interface FireflyProps {
  interactive?: boolean;
  onHover?: () => void;
  onClick?: () => void;
  // ... existing props
}
```

**Behavior:**

- `interactive={true}`: Firefly follows cursor movement (subtle parallax)
- `interactive={true}` + click: Firefly bursts into brighter glow temporarily
- Proper ARIA attributes: `role="button"`, `tabindex="0"`, `aria-label="Firefly"`

### 1.3 Accessibility Enhancements

**Current state:** `aria-hidden="true"` for decorative use

**Enhancements:**

- Export `fireflyA11yProps()` helper function for interactive mode
- Add `aria-live` region for screen reader announcements (optional)
- Ensure keyboard focus indicators for interactive fireflies

### 1.4 Seasonal Integration

Auto-adapt glow color based on `seasonStore.current`.

```typescript
interface FireflyProps {
  seasonal?: boolean; // Default: true
  // ... existing props
}
```

**Seasonal colors:**

- **Spring:** warm amber, soft green undertones
- **Summer:** bright gold, no green (hotter)
- **Autumn:** deep orange-red, shorter flashes
- **Winter:** pale blue-white (cold bioluminescence)
- **Midnight:** deep plum, soft gold (from palette.midnightBloom)

---

## Phase 2: FireflySwarm Component

### 2.1 Core Concept

A swarm component that renders multiple fireflies with coordinated patterns. Real fireflies flash in emergent synchronization—this component captures that magic.

### 2.2 Interface

```svelte
<script lang="ts">
  import Firefly from './Firefly.svelte';

  interface SwarmProps {
    count?: number;           // Number of fireflies (default: 8)
    spread?: number;          // Spread area in rems (default: 20)
    sync?: boolean;           // Synchronized flashing (default: false)
    intensity?: 'subtle' | 'normal' | 'bright';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    seasonal?: boolean;
    interactive?: boolean;
    animation?: 'random' | 'wave' | 'pulse' | 'chaos';
  }
</script>

<FireflySwarm
  count={12}
  spread={30}
  sync={true}
  intensity="normal"
  size="sm"
  animation="wave"
/>
```

### 2.3 Animation Patterns

| Pattern  | Description                                        |
| -------- | -------------------------------------------------- |
| `random` | Each firefly has independent timing (default)      |
| `wave`   | Fireflies flash in a wave pattern across the swarm |
| `pulse`  | All fireflies flash together (heartbeat)           |
| `chaos`  | Bursts of activity followed by silence             |

### 2.4 Performance Considerations

- **Render optimization:** Use `<svelte:component>` for dynamic Firefly instances
- **IntersectionObserver:** Only animate visible fireflies
- **CSS containment:** Use `contain: paint` for swarm container
- **Limit count:** Cap at 50 fireflies per swarm for performance

### 2.5 Use Cases

- **Hero sections:** Large swarms for landing pages
- **Footer decorations:** Small, subtle swarms
- **Loading states:** Animated swarms as loading indicators
- **Seasonal effects:** Larger swarms during summer months

---

## Phase 3: Versatile Swarm Utility

### 3.1 Concept

A generic `Swarm<T>` component that can render any component type in swarm formation. This is more versatile than creating individual swarm components for each nature component.

### 3.2 Interface

```svelte
<script lang="ts">
  import type { ComponentType } from 'svelte';

  interface SwarmProps<T extends ComponentType> {
    component: T;           // Component to swarm
    count?: number;         // Number of instances
    spread?: number;        // Area spread
    props?: ConstructorParameters<T>; // Props for each instance
    animation?: 'random' | 'wave' | 'pulse' | 'chaos';
    bounds?: 'container' | 'viewport' | 'parent';
  }
</script>

<!-- Usage examples: -->
<Swarm component={Firefly} count={8} spread={25} animation="wave" />
<Swarm component={Firefly} count={5} props={{ size: 'lg', interactive: true }} />
<Swarm component={Firefly} count={12} animation="chaos" />
```

### 3.3 Position Generation

```typescript
function generateSwarmPositions(
  count: number,
  spread: number,
  bounds: "container" | "viewport" | "parent",
): { x: number; y: number; delay: number }[] {
  // Poisson disk sampling for natural distribution
  // Or simple grid with jitter for performance
  // Returns array of positions and animation delays
}
```

### 3.4 Component Registry

```typescript
const SWARMABLE_COMPONENTS = {
  firefly: Firefly,
  fireflyGlow: FireflyGlow, // Glow-only variant
  fireflySimple: FireflySimple, // Simplified for performance
  // Future: leaves, petals, birds, etc.
} as const;
```

---

## Phase 4: Testing & Documentation

### 4.1 Test Coverage

Create `Firefly.test.ts` and `FireflySwarm.test.ts`:

```typescript
// Firefly.test.ts
describe("Firefly", () => {
  it("renders with default props");
  it("applies custom colors");
  it("pauses animation when off-screen");
  it("respects prefers-reduced-motion");
  it("handles interactive mode");
  it("scales correctly with size prop");
});

// FireflySwarm.test.ts
describe("FireflySwarm", () => {
  it("renders correct number of fireflies");
  it("applies animation pattern");
  it("handles sync mode");
  it("respects spread bounds");
});
```

### 4.2 Storybook Stories

Create `Firefly.stories.svelte` and `FireflySwarm.stories.svelte`:

```typescript
// Firefly.stories.svelte
export default {
  title: "Nature/Firefly",
  args: {
    glowColor: "#FFD700",
    bodyColor: "#1a1a1a",
    intensity: "normal",
    animate: true,
  },
};
```

### 4.3 Documentation

Update component docstrings with:

- Usage examples
- Performance tips
- Accessibility guidelines
- Integration with seasonStore

---

## Phase 5: Meta Integration with Firefly Infrastructure

### 5.1 Conceptual Connection

The UI Firefly component can reference the infrastructure Firefly pattern:

- **UI Firefly:** Brief, purposeful flashes of light in the darkness
- **Infrastructure Firefly:** Brief, purposeful servers that ignite and fade

This creates a unified metaphor: "Let your code glow like fireflies in the grove."

### 5.2 Implementation Ideas

1. **Loading state:** When Bloom (AI coding) is igniting, show a FireflySwarm
2. **Server status:** Firefly intensity indicates server activity level
3. **Documentation links:** UI Firefly docs link to infrastructure Firefly pattern

---

## File Structure

```
libs/engine/src/lib/ui/components/nature/
├── creatures/
│   ├── Firefly.svelte          # Enhanced Firefly
│   ├── FireflySwarm.svelte     # NEW: Swarm component
│   ├── FireflyGlow.svelte      # NEW: Glow-only variant
│   ├── FireflySimple.svelte    # NEW: Performance-optimized
│   └── index.ts                # Export all firefly components
├── swarm/
│   ├── Swarm.svelte            # NEW: Generic swarm utility
│   ├── swarmUtils.ts           # NEW: Position generation
│   └── index.ts                # Export swarm utilities
└── index.ts                    # Update exports
```

---

## Implementation Order

1. **Week 1:** Firefly enhancements (size, interactive, seasonal)
2. **Week 2:** FireflySwarm component
3. **Week 3:** Generic Swarm utility
4. **Week 4:** Testing, stories, documentation

---

## Success Criteria

- [ ] Firefly component has size variants (xs through xl)
- [ ] Firefly component supports interactive mode
- [ ] Firefly component auto-adapts to seasons
- [ ] FireflySwarm component exists and works
- [ ] Generic Swarm utility can render any component
- [ ] All components have test coverage
- [ ] All components have Storybook stories
- [ ] Documentation is complete and accessible

---

## Open Questions

1. Should FireflySwarm support drag-to-rearrange?
2. Should there be a "constellation" mode for connecting fireflies?
3. Should interactive fireflies respond to scroll position?
4. How should we handle mobile (touch) vs desktop (hover) for interactive mode?

---

_Plan created: February 2026_
_Inspired by: The most beloved component in Lattice_
