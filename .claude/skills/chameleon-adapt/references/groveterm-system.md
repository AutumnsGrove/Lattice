# Chameleon Adapt: GroveTerm Vocabulary System

> Loaded by chameleon-adapt during Phase 3 (COLOR) when writing user-facing text, and Phase 5 (ADAPT) for final polish. See SKILL.md for the full workflow.

---

## What GroveTerm Is

Grove has a complete terminology system that automatically switches between Grove-themed terms and standard/understandable terms based on the user's **Grove Mode** setting.

**Always use GroveTerm components instead of hardcoding Grove terminology.**

- When Grove Mode is **OFF** (default for new visitors): users see familiar terms like "Posts", "Dashboard", "Support"
- When Grove Mode is **ON** (user opted in): they see the full nature-themed vocabulary: "Blooms", "Arbor", "Porch"

---

## Import

```svelte
import { GroveTerm, GroveSwap, GroveText, GroveSwapText, GroveIntro } from '@autumnsgrove/lattice/ui';
import groveTermManifest from '$lib/data/grove-term-manifest.json';
```

---

## Component Suite

| Component       | When to Use                              | Behavior                                                                                               |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GroveTerm`     | Interactive terms with popup definitions | Shows standard term when Grove Mode OFF, Grove term with colored underline when ON. Click opens popup. |
| `GroveSwap`     | Silent text replacement (no popup)       | Reactively swaps between Grove/standard terms. No underline, no interaction.                           |
| `GroveText`     | Parsing `[[term]]` syntax in strings     | Converts `[[bloom\|posts]]` in data strings to interactive GroveTerm components.                       |
| `GroveSwapText` | Parsing `[[term]]` syntax silently       | Same parsing but renders silent swaps (no popups).                                                     |
| `GroveIntro`    | "We call it X" banners below page titles | Shows a standardized intro: "we call it the [Grove Term]".                                             |

---

## Usage Examples

```svelte
<!-- Interactive term with popup -->
<GroveTerm term="bloom" manifest={groveTermManifest} />

<!-- Custom display text (for plurals, etc.) -->
<GroveTerm term="wanderer" manifest={groveTermManifest}>wanderers</GroveTerm>

<!-- Silent swap (no popup, no underline) -->
<GroveSwap term="arbor" manifest={groveTermManifest} />

<!-- Parse [[term]] syntax in data strings -->
<GroveText content="Your [[bloom|posts]] live in your [[garden|blog]]." manifest={groveTermManifest} />

<!-- Page intro banner -->
<GroveIntro term="meadow" manifest={groveTermManifest} />
```

---

## Grove Mode Store

```svelte
import { groveModeStore } from '@autumnsgrove/lattice/ui/stores';

// Check current mode
const isGroveMode = $derived(groveModeStore.current);

// Toggle is in the footer — don't add competing toggles
```

---

## Key Rules

- **Never hardcode Grove terms** in user-facing UI. Always use GroveTerm components.
- **Default is OFF** for new visitors. They see standard, familiar terminology.
- **URLs stay as Grove terms** (e.g., `/porch`, `/garden`) regardless of display mode.
- **Subscription tiers** (Seedling/Sapling/Oak/Evergreen) and the brand name (Grove) always show as-is — they are not swapped.
- **The `[[term]]` syntax** is preferred for data-driven content (FAQ items, pricing text, marketing copy, etc.).

---

## Common Grove Term Vocabulary

| Grove Term   | Standard Term  | Context / Notes                                          |
| ------------ | -------------- | -------------------------------------------------------- |
| Wanderer     | Visitor        | A user visiting the site (not logged in or new to Grove) |
| Rooted       | Member         | A user who has joined and made Grove their home          |
| Pathfinder   | Explorer       | A user discovering new features or areas                 |
| Bloom        | Post           | An individual piece of content (blog post, article)      |
| Garden       | Blog           | The collection of a user's blooms                        |
| Arbor        | Dashboard      | The main control area for a user's Grove site            |
| Porch        | Support / Help | The help and support section                             |
| Meadow       | Community      | The shared community space                               |
| Grove        | Platform       | Grove itself (always shown as-is, never swapped)         |
| Seedling     | Starter tier   | Subscription tier (always shown as-is)                   |
| Sapling      | Basic tier     | Subscription tier (always shown as-is)                   |
| Oak          | Pro tier       | Subscription tier (always shown as-is)                   |
| Evergreen    | Premium tier   | Subscription tier (always shown as-is)                   |

> **Note:** The full vocabulary lives in `$lib/data/grove-term-manifest.json`. The table above covers the most common terms. When in doubt, check the manifest.

---

## The `[[term]]` Syntax

Use in data-driven strings (FAQ answers, pricing blurbs, onboarding copy):

```
"Your [[bloom|posts]] live in your [[garden|blog]]."
```

Format: `[[grove-term|standard-term]]`

- `grove-term` — shown when Grove Mode is ON
- `standard-term` — shown when Grove Mode is OFF (the default)

Render with `<GroveText>` for interactive popups or `<GroveSwapText>` for silent swaps.

---

## Accessibility Considerations

- GroveTerm popups are keyboard-accessible and screen-reader-friendly — the component handles ARIA automatically.
- When Grove Mode is OFF, users never encounter confusing nature jargon. The experience is welcoming by default.
- The colored underline on active Grove terms provides a visual hint without breaking reading flow — do not remove or override this styling.
- The footer toggle for Grove Mode is the single source of control — never add competing toggles on other pages.
