# Vineyard

A Svelte 5 component library for creating consistent showcase and documentation pages across the Grove ecosystem.

## Overview

Vineyard provides shared UI components that Grove tools use to create their `/vineyard` routes - demo-first documentation pages that showcase features, display code examples, and communicate roadmaps.

## Installation

```bash
pnpm add @autumnsgrove/vineyard
```

## Components

| Component | Description |
|-----------|-------------|
| **VineyardLayout** | Main page wrapper with hero section, tool branding, and related tools footer |
| **FeatureCard** | Showcase individual features with icons, status badges, and optional demo slots |
| **StatusBadge** | Consistent status indicators: Ready, Preview, Demo, Coming Soon, In Development |
| **DemoContainer** | Wrapper for interactive demos with mock data indicator and visual styling |
| **CodeExample** | Syntax-highlighted code blocks with copy-to-clipboard functionality |
| **TierGate** | Tier-based access control with blur preview and upgrade prompts |
| **RoadmapSection** | Visual timeline showing built, in-progress, and planned features |
| **AuthButton** | Authentication button with Better Auth integration for sign in/out |
| **UserMenu** | User profile menu with avatar, email, and sign out functionality |

## Usage

### Basic Example

```svelte
<script>
  import {
    VineyardLayout,
    FeatureCard,
    StatusBadge
  } from '@autumnsgrove/vineyard/vineyard';
</script>

<VineyardLayout
  tool="amber"
  tagline="Your files, preserved"
  status="preview"
>
  <FeatureCard
    title="Storage Overview"
    description="See usage across posts and media"
    status="ready"
    icon="HardDrive"
  />
</VineyardLayout>
```

### With Authentication

```svelte
<script>
  import {
    VineyardLayout,
    AuthButton,
    UserMenu,
    getSession
  } from '@autumnsgrove/vineyard/vineyard';
  import { onMount } from 'svelte';

  let user = $state(null);

  onMount(async () => {
    const session = await getSession();
    user = session.user;
  });
</script>

<VineyardLayout tool="amber" tagline="Your files, preserved" status="preview">
  {#if user}
    <UserMenu />
  {:else}
    <AuthButton provider="google" />
  {/if}
</VineyardLayout>
```

For complete authentication integration guide, see [docs/better-auth-integration.md](docs/better-auth-integration.md).

## Status Badge Types

- **ready** (green) - Feature is complete and stable
- **preview** (amber) - Feature is functional but may change
- **demo** (blue) - Interactive demonstration available
- **coming-soon** (gray) - Planned but not yet implemented
- **in-development** (orange, pulsing) - Currently being built

## Design System

Vineyard uses Grove's glassmorphism aesthetic with a warm color palette:

- **Primary**: Amber tones (#f59e0b, #d97706)
- **Background**: Stone neutrals (#fafaf9, #1c1917)
- **Glass effect**: Semi-transparent backgrounds with backdrop blur
- **Typography**: Lexend font family

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build package
pnpm package

# Type check
pnpm check
```

## Tech Stack

- **Framework**: Svelte 5 (with runes)
- **Icons**: lucide-svelte
- **Package Manager**: pnpm
- **Language**: TypeScript

## Integration

Vineyard is designed to be consumed by Grove tools through the `@autumnsgrove/groveengine` package:

```javascript
// In your Grove tool
import { VineyardLayout } from '@autumnsgrove/groveengine/vineyard';
```

## License

MIT
