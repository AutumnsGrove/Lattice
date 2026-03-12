---
title: "Lantern Developer Guide"
description: "How the cross-grove navigation panel works, how to extend it, and what to watch for."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - lantern
  - navigation
  - chrome
  - friends
  - cross-grove
---

# Lantern Developer Guide

The Lantern is a floating navigation panel visible to logged-in users on every grove site. It lets people hop between groves, access platform services, and always find their way home. In Grove mode it goes by "Lantern." In standard mode it's called "Compass." Same component, two names.

This guide covers the chrome lifecycle, component structure, friends system, and how to add new destinations or services.

## How Lantern Works

### Chrome Lifecycle

Lantern is engine chrome, mounted in the root layout alongside Header and Footer. The data pipeline looks like this:

1. `+layout.server.ts` checks if the user is logged in.
2. If logged in, it evaluates the `lantern_enabled` feature flag (via `isFeatureEnabled`).
3. It assembles `lanternData` with the user's home grove subdomain, display name, visiting grove info, and the enabled flag.
4. `+layout.svelte` conditionally renders `<Lantern>` when `data.lanternData?.enabled` is truthy.

```svelte
<!-- libs/engine/src/routes/+layout.svelte -->
{#if data.lanternData?.enabled}
    <Lantern data={data.lanternData} />
{/if}
```

If the user is not logged in, or the feature flag returns false, the Lantern never renders. No DOM, no FAB, no panel.

### Feature Gating

The Lantern uses the feature flag system, not the graft system. The flag key is `lantern_enabled`. It evaluates per-tenant with greenhouse awareness:

```ts
lanternEnabled = await isFeatureEnabled(
    "lantern_enabled",
    { tenantId, inGreenhouse: greenhouseResult },
    flagsEnv,
).catch(() => false);
```

The `.catch(() => false)` means the Lantern degrades silently if the flag service is unreachable.

## Component Architecture

Six Svelte components live in `libs/engine/src/lib/ui/components/chrome/lantern/`:

| Component | Role |
|-----------|------|
| `Lantern.svelte` | Orchestrator. Renders FAB, panel, and backdrop. Handles Escape key and click-outside. |
| `LanternFAB.svelte` | The 48px floating button in the bottom-right corner. |
| `LanternPanel.svelte` | The glassmorphism dialog with tabs, nav links, and friends column. |
| `LanternFriendCard.svelte` | Individual friend row with visit link and remove button. |
| `LanternVisitingCard.svelte` | Contextual prompt to add the grove you're currently visiting. |
| `LanternAddFriends.svelte` | Search view for finding and adding groves as friends. |

Supporting files:

| File | Role |
|------|------|
| `types.ts` | All Lantern-specific types: `LanternLayoutData`, `LanternDestination`, `LanternTab`, `LanternView`, `VisitingGrove`, `LanternSearchResult` |
| `destinations.ts` | Static navigation data for the Destinations and Services tabs |
| `index.ts` | Barrel re-export for all components and types |

### Data Flow

```
+layout.server.ts
    |
    |-- builds LanternLayoutData (homeGrove, displayName, enabled, visitingGrove)
    |
    v
Lantern.svelte
    |-- receives data as props
    |-- sets data-lantern attribute on <body> (signals other chrome like MobileTOC)
    |-- renders LanternFAB (always) and LanternPanel (with data)
    |-- listens for Escape key globally, manages backdrop click
    |
    v
LanternPanel.svelte
    |-- reads lanternStore for open/tab/view state
    |-- reads friendsStore for friend list
    |-- derives destinations from getDestinations(data.homeGrove)
    |-- renders two-column layout when friendsStore.hasFriends is true
```

## Two Stores

The Lantern splits its state across two stores, each with a distinct scope.

### lanternStore (ephemeral UI state)

Located at `libs/engine/src/lib/ui/stores/lantern.svelte.ts`. All state resets when the panel closes. Nothing persists to localStorage.

Key properties and methods:

```ts
lanternStore.open          // boolean: is the panel visible?
lanternStore.activeTab     // "destinations" | "services"
lanternStore.currentView   // "main" | "add-friends"
lanternStore.searchQuery   // string: current search input
lanternStore.searchResults // LanternSearchResult[]

lanternStore.toggle()      // open/close (resets state on close)
lanternStore.close()       // close and reset
lanternStore.setTab(tab)   // switch between Destinations and Services
lanternStore.setView(view) // switch between main and add-friends views
```

When the panel closes (via `toggle()` or `close()`), the view resets to `"main"` and search state clears. This keeps the panel fresh on every open.

### friendsStore (social state)

Located at `libs/engine/src/lib/ui/stores/friends.svelte.ts`. Independent of Lantern. Friends load eagerly for all logged-in users so that other features (like FollowButton) can check follow state without the Lantern being enabled or opened.

```ts
friendsStore.friends        // Friend[]
friendsStore.loaded         // boolean: has the initial load completed?
friendsStore.loading        // boolean: is a load in progress?
friendsStore.hasFriends     // boolean: friends.length > 0

friendsStore.setFriends(friends)  // replace the full list
friendsStore.addFriend(friend)    // append one
friendsStore.removeFriend(id)     // remove by tenantId
friendsStore.isFriend(id)         // check if a tenantId is in the list
```

Friends are loaded by `FriendsLoader.svelte`, a separate chrome component mounted in the layout independently of Lantern.

## Panel States

The panel has four visual states, determined by friends and the current view.

**No friends (single column, 320px)**. Shows Destinations/Services tabs and a dashed "Add Friends" CTA at the bottom. The visiting card appears here too if the user is on someone else's grove.

**Has friends (two columns, 520px)**. The friends column slides in from the left with a 300ms animation. Each friend row shows their name, subdomain, and a remove button that appears on hover.

**Services tab**. Swaps the navigation list to show platform tools (Ivy, Amber, Reverie, Arbor). Same column structure, just different content.

**Add Friends view**. Replaces the entire panel content with a search input and results list. The search field auto-focuses on mount. Input is debounced at 300ms before hitting `/api/friends/search`. A back arrow returns to the main view.

On screens narrower than 560px, the two-column layout collapses to a single column with the friends section stacked below navigation.

## The FAB

The floating action button sits fixed at `bottom: 1rem; right: 1rem`. It's a 48px circle (meeting the 44px minimum touch target) with a subtle pulse animation.

In Grove mode, it shows a `Lamp` icon. In standard mode, a `Compass` icon. Both come from `@lucide/svelte`.

The pulse animation runs on a 3-second loop and stops when the panel is open. It also stops entirely when `prefers-reduced-motion: reduce` is active.

The FAB sets `aria-expanded` and `aria-haspopup="dialog"` for assistive technology. Its label toggles between "Open Lantern"/"Close Lantern" (or "Open Compass"/"Close Compass" in standard mode).

Dark mode swaps the background from the primary color to `--accent-success` with darker text, giving it a green glow that feels like a lantern in the woods.

## The "Return Home" Button

Always the first element in the panel, always visible, always one tap. It links to `https://{homeGrove}.grove.place` and adapts its label:

- Grove mode: "Return to Your Grove"
- Standard mode: "Back to My Site"

It only renders when `data.homeGrove` is truthy (which it should always be for logged-in users, but the guard prevents broken links).

## The Visiting Card

When you open the Lantern while visiting someone else's grove, a contextual card appears: "You're visiting [Name]" with an "Add Friend" button. This only shows if you're not already following that grove.

The visiting grove is determined server-side by comparing the current tenant context against the user's home grove tenant ID. If they differ, `visitingGrove` is populated in `LanternLayoutData`.

Two placement rules control where the card renders:

- If the user has friends, it appears at the top of the friends column.
- If the user has no friends, it appears below the navigation tabs as a standalone element.

## Adding a New Destination

Destinations and services live in `destinations.ts`. To add a new destination:

```ts
// libs/engine/src/lib/ui/components/chrome/lantern/destinations.ts

export function getDestinations(_homeGrove: string): LanternDestination[] {
    return [
        // ... existing destinations
        {
            href: "https://grove.place/your-new-page",
            label: "Public Label",        // shown in standard mode
            groveLabel: "Grove Label",    // shown in Grove mode (optional)
            icon: YourIcon,               // Lucide component or resolved grove icon
            external: true,               // true = opens in new tab
            termSlug: "your-term",        // optional grove-term-manifest slug
        },
    ];
}
```

The `icon` field accepts any Svelte component matching Lucide's interface. The existing code pulls icons two ways:

1. Direct Lucide imports: `import { BookUser, BookOpen } from "@lucide/svelte"`
2. Grove icon manifest: `resolveIcon(defaultSuite.meadow.icon)` from `$lib/ui/components/ui/groveicon`

Use the manifest approach for any service that has a canonical icon defined in `defaultSuite`. Use direct Lucide imports for everything else.

To add a new service, push to the `services` array in the same file. Services use the same `LanternDestination` shape.

### External vs. Internal Links

The `external` flag controls two things in the template:

- `target="_blank"` and `rel="noopener noreferrer"` when true
- No target override (same-tab navigation) when false

Set `external: true` for cross-subdomain links (meadow.grove.place, ivy.grove.place). Set `external: false` for same-origin paths like `/arbor`.

## Friends System

### API Endpoints

The friends API lives at `/api/friends/`, not `/api/lantern/friends/`. It's decoupled from the Lantern component itself.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/friends` | Fetch the user's friend list |
| POST | `/api/friends` | Add a friend by subdomain (`{ friendSubdomain: "arturo" }`) |
| DELETE | `/api/friends/:tenantId` | Remove a friend |
| GET | `/api/friends/search?q=query` | Search for groves to add |

### Client-Side Flow

Adding a friend from the search view:

1. User types in the search input (debounced at 300ms).
2. `LanternAddFriends` calls `api.get('/api/friends/search?q=...')`.
3. Results render as rows with "Add" buttons.
4. Clicking "Add" posts to `/api/friends` with the subdomain.
5. On success, `friendsStore.addFriend(result.friend)` updates local state.
6. The view switches back to main, and the friends column appears (or updates).

Adding a friend from the visiting card:

1. `LanternVisitingCard` calls `api.post('/api/friends', { friendSubdomain })`.
2. On success, updates `friendsStore` and shows a status message.
3. The card hides because `alreadyFollowing` becomes true.

Removing a friend:

1. `LanternFriendCard` calls `api.delete('/api/friends/{tenantId}')`.
2. On success, `friendsStore.removeFriend(tenantId)` removes it locally.
3. If this was the last friend, the panel narrows back to single-column.

All API calls fail silently with no error toast. The user can retry by repeating the action.

### Database Schema

Friends are stored in the `lantern_friends` table:

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
```

The `source` field tracks where the connection came from: `'manual'`, `'meadow'`, or `'forest'`. Meadow follows can also be merged from the Meadow API at fetch time.

## Keyboard and Accessibility

The panel implements a full accessibility pattern:

- The FAB has `aria-expanded`, `aria-haspopup="dialog"`, and a dynamic `aria-label`.
- The panel has `role="dialog"`, `aria-modal="true"`, and uses the `inert` attribute when closed (which also sets `display: none` via CSS).
- Focus moves to the first focusable element (the home link) when the panel opens.
- A focus trap cycles Tab/Shift+Tab within the panel boundaries.
- Escape closes the panel and returns focus to the FAB.
- Tab list uses proper `role="tablist"`, `role="tab"`, and `aria-selected` attributes with `tabindex` management.
- The tab panel uses `role="tabpanel"` with `aria-labelledby` pointing to the active tab.
- All navigation items are standard `<a>` tags, not buttons pretending to be links.
- Touch targets meet the 44px minimum (`min-w-[44px] min-h-[44px]` on interactive elements).
- `prefers-reduced-motion: reduce` disables all animations (FAB pulse, panel slide-in, column expansion).

## Body Attribute Signal

When the Lantern mounts, it sets `data-lantern` on `<body>`. When it unmounts, it removes it. Other fixed-position chrome (like MobileTOC) can use this attribute to adjust their positioning so they don't overlap the FAB.

```ts
$effect(() => {
    document.body.setAttribute("data-lantern", "");
    return () => document.body.removeAttribute("data-lantern");
});
```

## Grove Mode Awareness

The panel adapts its labels based on `groveModeStore.current`:

| Element | Grove Mode | Standard Mode |
|---------|-----------|---------------|
| Panel title | Lantern | Compass |
| Home button | Return to Your Grove | Back to My Site |
| Destinations tab | Destinations | Navigation |
| Destination labels | Grove labels (Canopy, Meadow, Forests) | Standard labels (Dashboard, Feed, Communities) |
| FAB icon | Lamp | Compass |

This is handled per-component with `$derived` values that read from `groveModeStore`.

## Key Files

| Path | Purpose |
|------|---------|
| `libs/engine/src/lib/ui/components/chrome/lantern/` | All Lantern components |
| `libs/engine/src/lib/ui/components/chrome/lantern/types.ts` | Type definitions |
| `libs/engine/src/lib/ui/components/chrome/lantern/destinations.ts` | Static nav data |
| `libs/engine/src/lib/ui/stores/lantern.svelte.ts` | Ephemeral panel state |
| `libs/engine/src/lib/ui/stores/friends.svelte.ts` | Friends state (shared) |
| `libs/engine/src/routes/+layout.server.ts` | Server data loading and feature gate |
| `libs/engine/src/routes/+layout.svelte` | Mount point for the Lantern component |
| `docs/specs/lantern-spec.md` | Original feature spec |

## Quick Checklist

When modifying the Lantern:

- [ ] New destinations go in `destinations.ts`, not in component templates
- [ ] Use `resolveIcon(defaultSuite.xxx.icon)` for services with canonical grove icons
- [ ] Set `external: true` for any cross-subdomain link
- [ ] Keep touch targets at 44px minimum
- [ ] Test with `prefers-reduced-motion: reduce` enabled
- [ ] Verify the panel works at 560px and below (single-column collapse)
- [ ] Check both Grove mode and standard mode labels
- [ ] Friends API changes need updates in both `friendsStore` and the API handler
- [ ] The `inert` attribute handles panel hiding; don't add separate visibility logic
