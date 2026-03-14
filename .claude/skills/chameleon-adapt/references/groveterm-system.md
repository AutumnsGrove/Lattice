# Chameleon Adapt: GroveTerm Vocabulary System

> Loaded by chameleon-adapt during Phase 3 (COLOR) when writing user-facing text, and Phase 5 (ADAPT) for final polish. See SKILL.md for the full workflow.

---

## What GroveTerm Is

Grove has a complete terminology system that automatically switches between Grove-themed terms and standard/understandable terms based on the user's **Grove Mode** setting.

**Always use the GroveTerm component instead of hardcoding Grove terminology.**

- When Grove Mode is **OFF** (default for new visitors): users see familiar terms like "Posts", "Dashboard", "Support"
- When Grove Mode is **ON** (user opted in): they see the full nature-themed vocabulary: "Blooms", "Arbor", "Porch"

---

## Import

```svelte
import { GroveTerm, GroveText } from '@autumnsgrove/lattice/ui';
import groveTermManifest from '$lib/data/grove-term-manifest.json';
```

---

## Component Suite

| Component   | When to Use                              | Behavior                                                                                               |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GroveTerm` | All Grove terminology display            | Defaults to non-interactive (silent text swap). Add `interactive` prop for popup + category underline.  |
| `GroveText` | Parsing `[[term]]` syntax in strings     | Converts `[[bloom\|posts]]` in data strings to GroveTerm components. Use `!` suffix for interactive.   |

### GroveTerm Props

| Prop              | Type      | Default   | Description                                              |
| ----------------- | --------- | --------- | -------------------------------------------------------- |
| `term`            | `string`  | required  | Term slug (e.g., "bloom", "arbor", "porch")              |
| `interactive`     | `boolean` | `false`   | Enable popup + category-colored underline                |
| `standard`        | `string`  | —         | Explicit standard term override (skips manifest lookup)  |
| `icon`            | `boolean` | `false`   | Show Leaf icon next to term (for Grove Mode hints)       |
| `displayOverride` | `string`  | —         | Force "grove" or "standard" display regardless of mode   |
| `children`        | snippet   | —         | Override display text                                    |

---

## Usage Examples

```svelte
<!-- Non-interactive term (default — silent text swap) -->
<GroveTerm term="arbor" />

<!-- Interactive term with popup -->
<GroveTerm interactive term="bloom" />

<!-- Custom display text (for plurals, etc.) -->
<GroveTerm interactive term="wanderer">wanderers</GroveTerm>

<!-- With leaf icon (for Grove Mode discovery) -->
<GroveTerm term="porch" icon />

<!-- Explicit standard term override -->
<GroveTerm term="wanderer" standard="visitors">Wanderers</GroveTerm>

<!-- Parse [[term]] syntax in data strings -->
<GroveText content="Your [[bloom|posts]] live in your [[garden|blog]]." />

<!-- Interactive terms in parsed strings (use ! suffix) -->
<GroveText content="Protected by [[shade!|Shade]]." />
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
- **Default is non-interactive.** Only add `interactive` when the term should have a popup.
- **URLs stay as Grove terms** (e.g., `/porch`, `/garden`) regardless of display mode.
- **Subscription tiers** (Seedling/Sapling/Oak/Evergreen) and the brand name (Grove) always show as-is — they are not swapped.
- **The `[[term]]` syntax** is preferred for data-driven content (FAQ items, pricing text, marketing copy, etc.).
- **Use `[[term!]]` syntax** when terms in parsed strings should be interactive (popup + underline).

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
"Protected by [[shade!|Shade]]."
```

Format: `[[grove-term|display-text]]` or `[[grove-term!|display-text]]`

- Without `!` — non-interactive (silent swap, default)
- With `!` — interactive (popup + colored underline)
- `display-text` — what's shown (optional, defaults to the term name)

Render with `<GroveText>` — it handles both interactive and non-interactive based on the `!` suffix.

---

## Accessibility Considerations

- GroveTerm popups (when `interactive`) are keyboard-accessible and screen-reader-friendly — the component handles ARIA automatically.
- When Grove Mode is OFF, users never encounter confusing nature jargon. The experience is welcoming by default.
- The colored underline on interactive Grove terms provides a visual hint without breaking reading flow — do not remove or override this styling.
- The Leaf icon (`icon` prop) serves as a subtle discovery cue for Grove Mode — users who see it can find the toggle in the footer.
- The footer toggle for Grove Mode is the single source of control — never add competing toggles on other pages.
