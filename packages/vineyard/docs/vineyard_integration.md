# Vineyard Integration Guide

> A guide for integrating Vineyard showcase components into Grove tools.

## Overview

Vineyard is a Svelte 5 component library that provides consistent showcase/documentation pages across the Grove ecosystem. Each Grove tool should implement a `/vineyard` route using these components to create demo-first documentation.

## Architecture

```
Vineyard (standalone package)
    ↓ link: dependency
GroveEngine (@autumnsgrove/groveengine)
    ↓ re-exports from /vineyard
Grove Tools (Amber, Ivy, Foliage, etc.)
```

## Integration Steps

### Step 1: Ensure Vineyard Package is Built

In the Vineyard project directory:

```bash
cd /path/to/Vineyard
pnpm install
pnpm package
```

This creates the `dist/` folder with compiled components.

### Step 2: Add Vineyard as a Linked Dependency

In your project's `package.json`:

```json
{
  "dependencies": {
    "@autumnsgrove/vineyard": "link:../path/to/Vineyard"
  }
}
```

The path is relative from your project's `package.json` location.

### Step 3: Install Dependencies

```bash
pnpm install
```

### Step 4: Import Components

```typescript
import {
  VineyardLayout,
  FeatureCard,
  StatusBadge,
  DemoContainer,
  CodeExample,
  TierGate,
  RoadmapSection
} from '@autumnsgrove/vineyard/vineyard';

// Types are also available
import type {
  VineyardStatus,
  GroveTool,
  GroveTier
} from '@autumnsgrove/vineyard/vineyard';
```

---

## Using via GroveEngine Re-exports

If your project already depends on GroveEngine, you can import from there instead:

```typescript
import {
  VineyardLayout,
  FeatureCard,
  StatusBadge
} from '@autumnsgrove/groveengine/vineyard';
```

This is the recommended approach for Grove tools that already use GroveEngine.

---

## Creating a Vineyard Page

### Basic Structure

Create a `/vineyard` route in your SvelteKit app:

```
src/routes/vineyard/
├── +page.svelte          # Main Vineyard page
├── +layout.svelte        # Optional: Vineyard-specific layout
└── +page.ts              # Optional: Load data
```

### Example: Amber Vineyard Page

```svelte
<script lang="ts">
  import {
    VineyardLayout,
    FeatureCard,
    DemoContainer,
    CodeExample,
    RoadmapSection
  } from '@autumnsgrove/groveengine/vineyard';
</script>

<VineyardLayout
  tool="amber"
  tagline="Your files, preserved"
  status="preview"
>
  <!-- Feature Tour Section -->
  <section>
    <h2>Features</h2>
    <div class="grid">
      <FeatureCard
        title="Storage Overview"
        description="See usage across posts and media"
        status="ready"
        icon="HardDrive"
      />
      <FeatureCard
        title="File Browser"
        description="Browse and manage uploaded files"
        status="ready"
        icon="FolderOpen"
      />
      <FeatureCard
        title="Export Data"
        description="Download all your stored content"
        status="coming-soon"
        icon="Download"
      />
    </div>
  </section>

  <!-- Demo Section -->
  <section>
    <DemoContainer
      title="Storage Dashboard"
      description="Preview of the storage management interface"
      mockData={true}
    >
      <!-- Your demo component here -->
      <StorageDashboardDemo />
    </DemoContainer>
  </section>

  <!-- Code Example -->
  <section>
    <h2>Quick Start</h2>
    <CodeExample language="typescript" filename="src/routes/+page.svelte">
{`import { getStorageStats } from '@autumnsgrove/groveengine/amber';

const stats = await getStorageStats();
console.log(stats.usedBytes, stats.totalBytes);`}
    </CodeExample>
  </section>

  <!-- Roadmap -->
  <RoadmapSection
    built={['Core storage view', 'Usage breakdown', 'File browser']}
    inProgress={['Export functionality']}
    planned={['Bulk delete', 'Storage alerts', 'External backup']}
  />
</VineyardLayout>

<style>
  section {
    margin-bottom: 3rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
</style>
```

---

## Component Reference

### VineyardLayout

Main wrapper with hero section and footer.

| Prop | Type | Description |
|------|------|-------------|
| `tool` | `GroveTool` | Tool identifier (amber, ivy, foliage, etc.) |
| `tagline` | `string` | Short tagline displayed in hero |
| `status` | `VineyardStatus` | Current tool status |

### FeatureCard

Card for showcasing individual features.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Feature title |
| `description` | `string` | Feature description |
| `status` | `VineyardStatus` | Feature status |
| `icon` | `string` | Lucide icon name (optional) |
| `demo` | `Snippet` | Demo slot content (optional) |

### StatusBadge

Status indicator pill.

| Prop | Type | Description |
|------|------|-------------|
| `status` | `VineyardStatus` | Status to display |

Status values:
- `ready` - Green, solid
- `preview` - Amber, dashed border
- `demo` - Blue
- `coming-soon` - Gray
- `in-development` - Orange, pulsing

### DemoContainer

Wrapper for interactive demos.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Demo title |
| `description` | `string` | Description (optional) |
| `mockData` | `boolean` | Show "Mock Data" indicator |

### CodeExample

Code block with copy button.

| Prop | Type | Description |
|------|------|-------------|
| `language` | `string` | Programming language |
| `filename` | `string` | Filename to display (optional) |

### TierGate

Tier-based access control.

| Prop | Type | Description |
|------|------|-------------|
| `required` | `GroveTier` | Required tier (seedling/sapling/oak/grove) |
| `current` | `GroveTier` | User's current tier |
| `showPreview` | `boolean` | Show blurred preview of gated content |
| `fallback` | `Snippet` | Custom fallback content (optional) |

### RoadmapSection

Visual timeline of built/in-progress/planned features.

| Prop | Type | Description |
|------|------|-------------|
| `built` | `string[]` | Completed features |
| `inProgress` | `string[]` | Features being worked on |
| `planned` | `string[]` | Future features |

---

## Design Guidelines

### Grove Aesthetic

All components follow the Grove design system:
- **Glassmorphism**: Semi-transparent backgrounds with blur
- **Warm palette**: Amber/earth tones (`#f59e0b`, `#d97706`)
- **Lexend font**: Clean, readable typography
- **Subtle animations**: Hover effects, pulse for in-development

### Responsive Design

Components are mobile-first and responsive:
- VineyardLayout adjusts padding for mobile
- RoadmapSection stacks vertically on mobile
- FeatureCards in grid auto-fit

---

## Updating Vineyard

When Vineyard components are updated:

1. Pull changes in Vineyard repo
2. Rebuild: `pnpm package`
3. Dependent projects automatically get updates (via link:)
4. Rebuild dependent projects to pick up changes

---

## Troubleshooting

### "Module not found" errors

Ensure Vineyard package is built:
```bash
cd /path/to/Vineyard
pnpm package
```

### Type errors with lucide icons

Icons use dynamic import. If TypeScript complains, ensure `lucide-svelte` is installed:
```bash
pnpm add lucide-svelte
```

### Styles not applying

VineyardLayout uses scoped CSS with CSS variables. The Lexend font is loaded via Google Fonts CDN in VineyardLayout.

---

*Last updated: December 2025*
