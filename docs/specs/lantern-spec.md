---
aliases: [compass, grove-launcher, grove-compass, grove-lantern]
date created: Sunday, March 2nd 2026
date modified: Sunday, March 2nd 2026
tags:
  - lattice
  - engine
  - chrome
  - navigation
  - feature
type: tech-spec
---

```
                    ╭─╮
                   ╭┤ ├╮
                   │╰─╯│
                  ╭┤   ├╮
                  │├───┤│
                  ││ ✧ ││
                  ││   ││
                  │├───┤│
                  ╰┤   ├╯
                   ╰───╯
                    │ │
                   ─┴─┴─

        a warm light in the bottom corner,
       showing you the way through the forest
               and the way back home.
```

# Lantern: Cross-Grove Navigation

> *Light your Lantern to see what's nearby. Follow the glow to find your way home.*

The Lantern is a floating navigation panel that lets logged-in Grove users hop between groves, access platform services, and always find their way home. It lives in the bottom-left corner of every grove site, glowing softly, waiting to be opened.

In standard mode, it's the **Compass**. In Grove mode, it's the **Lantern**. Same light, two names.

**Public Name:** Compass
**Grove Name:** Lantern
**Internal Name:** GroveLantern
**Domain:** N/A (engine chrome component, not a standalone service)
**Last Updated:** March 2026

A lantern in the forest does three things: it shows you what's around you, it shows you where you can go, and it always, always shows you the way back home. This component does the same. Your grove is home base. Friends' groves are visits. The wider Grove ecosystem (Meadow, Canopy, Forests) are destinations. And the path home is never more than one tap away.

---

## Overview

### What This Is

A floating action button (FAB) in the bottom-left corner of every grove site. When tapped, it opens a glassmorphism panel with two columns: destinations and services on the left, friends on the right. Only visible to logged-in users. It's the navigation hub for the entire Grove ecosystem, accessible from any grove without leaving the page until you choose to.

### Goals

- Let users navigate between groves without opening a new browser tab or remembering URLs
- Provide quick access to Grove platform services (Meadow, Canopy, Arbor, etc.)
- Always offer a one-tap path home to the user's own grove
- Feel warm and unobtrusive. The Lantern glows softly. It doesn't demand attention.
- Work beautifully in the browser. PWA is a future consideration, not the target.

### Non-Goals (Out of Scope)

- PWA cross-subdomain navigation (iOS limitation makes this impractical today)
- Real-time presence ("Arturo is online") (too complex for Phase 1)
- Chat or messaging between groves (that's Ivy's domain)
- Replacing the existing Header/MobileMenu navigation
- Passage worker injection (Phase 2 future work)

---

## Architecture

### Component Placement

```
Browser loads autumn.grove.place
    │
    ▼
Engine layout (+layout.svelte)
    │
    ├── Header.svelte (top)
    ├── <slot /> (page content)
    ├── Footer.svelte (bottom)
    ├── MobileTOC.svelte (bottom-right, blog posts only)
    └── Lantern.svelte (bottom-left, logged-in users only) ← NEW
```

### Data Flow

```
+layout.server.ts
    │
    ├── Session check ── not logged in ──→ Lantern hidden
    │
    ├── LOGGED IN
    │       │
    │       ├── Fetch user's grove subdomain (home URL)
    │       ├── Fetch friend list (Meadow follows + local friends)
    │       └── Pass to layout as `lanternData`
    │
    ▼
+layout.svelte
    │
    └── <Lantern data={lanternData} />
            │
            ├── FAB button (bottom-left, always visible)
            │
            └── Panel (opens on tap)
                    │
                    ├── Left column: Destinations / Services tabs
                    │       │
                    │       ├── Destinations: Canopy, Meadow, Home,
                    │       │   Knowledge Base, Forests
                    │       │
                    │       └── Services: Ivy, Amber, Reverie,
                    │           Arbor, Lumen
                    │
                    └── Right column: Friends list
                            │
                            ├── Friend cards (name, subdomain, visit)
                            │
                            └── "Add Friends" flow
```

### Panel States

```
STATE 1: No friends (single column, narrow)

    ┌───────────────────────┐
    │  🔮 Lantern     [×]  │
    ├───────────────────────┤
    │  🏠 Back to My Grove  │
    ├───────────────────────┤
    │ [Destinations]        │
    │ [Services]            │
    │───────────────────────│
    │ ○ Canopy              │
    │ ○ Meadow              │
    │ ○ Home                │
    │ ○ Knowledge Base      │
    │ ○ Forests             │
    │───────────────────────│
    │ ✨ Add Friends        │
    └───────────────────────┘


STATE 2: Has friends (two columns, wider)

    ┌─────────────────────────────────────────────┐
    │  🔮 Lantern                    👥 Friends   │
    ├─────────────────────┬───────────────────────┤
    │  🏠 Back to My Grove │                       │
    ├─────────────────────┤  🌿 Arturo            │
    │ [Destinations]      │     arturo.grove.place │
    │ [Services]          │                       │
    │─────────────────────│  🌿 Sage              │
    │ ○ Canopy            │     sage.grove.place   │
    │ ○ Meadow            │                       │
    │ ○ Home              │  🌿 River             │
    │ ○ Knowledge Base    │     river.grove.place  │
    │ ○ Forests           │                       │
    │                     │  + Add Friends        │
    └─────────────────────┴───────────────────────┘


STATE 3: Services tab selected

    ┌─────────────────────────────────────────────┐
    │  🔮 Lantern                    👥 Friends   │
    ├─────────────────────┬───────────────────────┤
    │  🏠 Back to My Grove │                       │
    ├─────────────────────┤  🌿 Arturo            │
    │ [Destinations]      │     arturo.grove.place │
    │ [Services] ●        │                       │
    │─────────────────────│  🌿 Sage              │
    │ ○ Ivy (Email)       │     sage.grove.place   │
    │ ○ Amber (Storage)   │                       │
    │ ○ Reverie (AI)      │                       │
    │ ○ Arbor (Admin)     │                       │
    │ ○ Lumen (AI Chat)   │                       │
    │                     │                       │
    └─────────────────────┴───────────────────────┘


STATE 4: Add Friends view (single wide column, slides over)

    ┌───────────────────────────────────────────────┐
    │  🔮 Lantern                        ← Back    │
    ├───────────────────────────────────────────────┤
    │                                               │
    │  Search for a grove...              [🔍]     │
    │                                               │
    │───────────────────────────────────────────────│
    │  🌿 Arturo                         [+ Add]   │
    │     arturo.grove.place                        │
    │  🌿 Sage                           [+ Add]   │
    │     sage.grove.place                          │
    │  🌿 River                          [+ Add]   │
    │     river.grove.place                         │
    │───────────────────────────────────────────────│
    │  Or browse Forests to discover groves →       │
    └───────────────────────────────────────────────┘


TRANSITION: First friend added

    ┌──────────────┐               ┌──────────────┬──────────────┐
    │              │               │              │ 🌿 Arturo    │
    │  Single col  │  ──slides──▶  │  Left col    │   (slides in)│
    │              │               │              │              │
    └──────────────┘               └──────────────┴──────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| UI Framework | Svelte 5 | Engine chrome, runes reactivity |
| Styling | Tailwind + glassmorphism | Consistent with MobileTOC, CategoryNav |
| State | Svelte store | Lantern open/closed, active tab, friend list |
| Data Loading | +layout.server.ts | Server-side, session-gated |
| Friend Storage | D1 (SQLite) | Tenant-scoped, lightweight |
| Friend Discovery | Meadow follows API | Reuse existing social graph |
| Animations | CSS transitions | slideIn, column expand, smooth and warm |

---

## Component API

### Lantern.svelte

```svelte
<script lang="ts">
  import type { LanternData } from './types';

  interface Props {
    data: LanternData;
  }

  let { data }: Props = $props();
</script>
```

### Types

```typescript
export interface LanternData {
  /** The logged-in user's grove subdomain (e.g., "autumn") */
  homeGrove: string;
  /** Display name for the home button */
  displayName: string;
  /** Friends list, sorted by most recently visited */
  friends: LanternFriend[];
  /** Whether the user has opted into the Lantern */
  enabled: boolean;
}

export interface LanternFriend {
  /** Tenant ID of the friend's grove */
  tenantId: string;
  /** Display name */
  name: string;
  /** Subdomain (e.g., "arturo") */
  subdomain: string;
  /** Optional avatar URL */
  avatar?: string;
  /** Source: where this connection came from */
  source: 'meadow' | 'manual' | 'forest';
}

export interface LanternDestination {
  /** URL to navigate to */
  href: string;
  /** Display label (standard mode) */
  label: string;
  /** Display label (Grove mode) */
  groveLabel?: string;
  /** Lucide icon component */
  icon: IconComponent;
  /** Whether this is an external link (different subdomain) */
  external: boolean;
}
```

---

## Data Schema

### New Table: `lantern_friends`

```sql
CREATE TABLE lantern_friends (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  friend_tenant_id TEXT NOT NULL,
  friend_name TEXT NOT NULL,
  friend_subdomain TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  added_at INTEGER NOT NULL,

  UNIQUE(tenant_id, friend_tenant_id)
);

CREATE INDEX idx_lantern_friends_tenant
  ON lantern_friends(tenant_id);
```

This table stores manually added friends. Meadow follows are fetched from the Meadow API and merged client-side, giving users a combined view without duplicating Meadow's social graph.

### Graft

```sql
-- Graft: lantern
-- Default: disabled (opt-in)
-- Tier gate: none (available to all tiers)
-- Consumed via: isGraftEnabled('lantern', tenantId)
```

---

## API Reference

### GET /api/lantern/friends

Returns the current user's friend list for the Lantern panel.

**Request:** No body. Session cookie required.

**Response:**
```json
{
  "friends": [
    {
      "tenantId": "abc123",
      "name": "Arturo",
      "subdomain": "arturo",
      "avatar": null,
      "source": "manual"
    }
  ]
}
```

### POST /api/lantern/friends

Add a friend to the Lantern.

**Request:**
```json
{
  "friendSubdomain": "arturo"
}
```

**Response:**
```json
{
  "success": true,
  "friend": {
    "tenantId": "abc123",
    "name": "Arturo",
    "subdomain": "arturo",
    "source": "manual"
  }
}
```

### DELETE /api/lantern/friends/:tenantId

Remove a friend from the Lantern.

**Response:**
```json
{
  "success": true
}
```

### GET /api/lantern/search?q=arturo

Search for groves to add as friends. Returns public grove profiles.

**Response:**
```json
{
  "results": [
    {
      "tenantId": "abc123",
      "name": "Arturo",
      "subdomain": "arturo",
      "avatar": null,
      "bio": "Writer and wanderer"
    }
  ]
}
```

---

## Destinations & Services

### Destinations (left column, default tab)

| Label | Grove Label | URL | Icon |
|-------|------------|-----|------|
| Home | Home | `{user}.grove.place` | Home |
| Dashboard | Canopy | `canopy.grove.place` | LayoutDashboard |
| Feed | Meadow | `meadow.grove.place` | Leaf |
| Home Page | Grove Home | `grove.place` | Trees |
| Help | Knowledge Base | `grove.place/knowledge-base` | BookOpen |
| Communities | Forests | `grove.place/forest` | TreePine |

### Services (left column, services tab)

| Label | Grove Label | URL | Icon |
|-------|------------|-----|------|
| Email | Ivy | `ivy.grove.place` | Mail |
| Storage | Amber | `amber.grove.place` | Archive |
| AI Config | Reverie | (in-Arbor) | Sparkles |
| Admin | Arbor | `/arbor` | Settings |
| AI Chat | Lumen | (in-Arbor) | MessageCircle |

---

## Interaction Design

### FAB Button

- **Position:** `fixed; bottom: 1rem; left: 1rem`
- **Size:** 48px circle (touch-friendly)
- **Z-index:** `z-grove-fab` (40), same layer as MobileTOC
- **Icon:** Lantern icon (Grove mode) or Compass icon (standard mode)
- **Background:** `var(--accent-success, #2c5f2d)` with subtle pulse glow
- **Visibility:** Only when user is logged in AND `lantern` graft is enabled for their tenant

### Panel Open Animation

```css
@keyframes lanternOpen {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
    transform-origin: bottom left;
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
/* duration: 200ms ease */
```

### Column Expansion (first friend added)

```css
@keyframes columnSlideIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: var(--friend-column-width);
    opacity: 1;
  }
}
/* duration: 300ms ease-in-out */
```

### Panel Glassmorphism

```css
.lantern-panel {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* Dark mode */
.dark .lantern-panel {
  background: rgba(16, 50, 37, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### Navigation Behavior

- **Click:** Navigate in the same tab (standard link behavior)
- **Ctrl/Cmd + Click:** Open in new tab (browser default)
- **All links are standard `<a>` tags.** No JavaScript navigation hijacking.

### Closing the Panel

- Click the FAB again (toggle)
- Click outside the panel (backdrop)
- Press Escape
- Navigate away (link click closes panel naturally)

### Accessibility

- `aria-expanded` on FAB button
- `aria-modal="true"` on panel
- Focus trap within panel when open
- First focusable element: "Back to My Grove" button
- Escape returns focus to FAB
- All destinations are standard links (screen reader friendly)
- Reduced motion: disable animations, instant show/hide

---

## "Back to My Grove" Button

The most important element in the panel. Always visible, always at the top, always one tap.

```
┌───────────────────────────────────┐
│  🏠 Back to My Grove              │  ← always the first item
│     autumn.grove.place            │     always visible
└───────────────────────────────────┘
```

- Links to `https://{user-subdomain}.grove.place`
- Uses the user's display name if available: "Back to Autumn's Grove"
- Styled prominently. Slightly larger than other items. Warm accent color.
- In Grove mode: "Return to Your Grove"
- In standard mode: "Back to My Site"

---

## Security Considerations

- **Auth required.** Lantern data is only loaded when a valid session exists. The `+layout.server.ts` guard prevents any data leakage.
- **Tenant isolation.** Friend lists are tenant-scoped. User A cannot see User B's friend list.
- **CSRF protection.** POST/DELETE endpoints use the existing CSRF token system.
- **Search rate limiting.** The `/api/lantern/search` endpoint is rate-limited to prevent directory scraping.
- **No PII in friend cards.** Only public profile data (name, subdomain, avatar) is shown. No email, no private data.
- **Cross-subdomain cookies.** Session cookie with `Domain=.grove.place` means the Lantern works across all groves. When visiting `arturo.grove.place`, your session is still valid, and the Lantern still appears with your data.

---

## Phase 2: Passage Worker Injection (Future)

Phase 1 covers engine-powered grove sites (the primary use case). Phase 2 would extend the Lantern to all `*.grove.place` pages by injecting it via the Passage worker.

This requires:
- Modifying `grove-router` to intercept HTML responses and inject a `<script>` tag
- Building a standalone JS bundle (no Svelte dependency) that renders the Lantern
- Using the same API endpoints for data, but fetching client-side
- Handling the case where the engine already renders the Lantern (no double-render)

Phase 2 is out of scope for this spec. It will get its own spec when the time comes.

---

## Implementation Checklist

### Phase 1: Engine Chrome

- [ ] Add `lantern_friends` table (new migration)
- [ ] Add `lantern` graft (migration + inventory update)
- [ ] Create `Lantern.svelte` component in `libs/engine/src/lib/ui/components/chrome/`
- [ ] Create `LanternFAB.svelte` (the floating button)
- [ ] Create `LanternPanel.svelte` (the popup panel)
- [ ] Create `LanternFriendCard.svelte` (individual friend display)
- [ ] Create `LanternAddFriends.svelte` (search and add view)
- [ ] Create `lantern-store.svelte.ts` (open/closed state, active tab)
- [ ] Create `types.ts` for Lantern types
- [ ] Add Lantern data loading to `+layout.server.ts` (session-gated)
- [ ] Mount `<Lantern>` in `+layout.svelte` (alongside Header/Footer)
- [ ] Add Grove term entries: Lantern/Compass to grove-term-manifest
- [ ] Build API routes: GET/POST/DELETE `/api/lantern/friends`
- [ ] Build API route: GET `/api/lantern/search`
- [ ] Integrate Meadow follows as a friend source
- [ ] Add column expansion animation (single → two column)
- [ ] Add "Add Friends" slide-over view
- [ ] Add "Back to My Grove" as persistent top element
- [ ] Implement focus trap and keyboard accessibility
- [ ] Add reduced-motion support
- [ ] Write tests for API endpoints
- [ ] Write component tests for panel states
- [ ] Add Lantern toggle to Arbor settings page

---

*The forest is wide, but you are never lost. Light the Lantern. Find a friend. Find your way home.*
