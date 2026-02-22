---
title: "Meadow PWA Implementation Plan"
status: planned
category: features
---

# Meadow PWA Implementation Plan

```
                    ☀️  even when clouds cover the sun
         .  *  .        .     .        .  *  .
       🌱      🌿              🌿      🌱
          \    |    /      \    |   /
           \   |   /        \   |  /
    ═══════════════════════════════════════════
              the meadow remembers
    ═══════════════════════════════════════════
       📱        ✨       🌿       ✨       📱

         Offline-first. Always accessible.
            Your feed, wherever you are.
```

> *The meadow doesn't close when you lose signal.*

---

> **Status:** Ready for Implementation
> **Priority:** High — v1 launch blocker
> **Estimated Effort:** 5 weeks
> **Prerequisites:** None (can be implemented independently)
> **Blocks:** Meadow offline capabilities

## Overview

This document outlines the Progressive Web App (PWA) implementation for Meadow, Grove's social feed platform. The goal is to provide wanderers with a native app-like experience that works reliably offline, syncs gracefully when connectivity returns, and feels like home on their phone's home screen.

**Target Experience:** A wanderer opens Meadow on the subway. No signal. They scroll through posts they saw yesterday, react to a few, draft a quick post about their commute. When they surface and regain signal, everything syncs silently. They never noticed they were offline.

---

## What PWA Enables

| Capability | Without PWA | With PWA |
|------------|-------------|----------|
| Home screen icon | Browser bookmark | Native app icon with splash screen |
| Offline feed reading | ❌ Error page | ✅ Cached posts available |
| Offline interactions | ❌ Lost | ✅ Queued, synced later |
| Offline post drafting | ❌ Lost on refresh | ✅ Persisted locally |
| App feel | Browser chrome visible | Standalone, full-screen |
| Return visits | Full reload | Instant from cache |
| Background sync | ❌ | ✅ Actions replay when online |
| Storage | Session only | Persistent (IndexedDB + Cache API) |

---

## Architecture

### How It Fits

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Device                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    SvelteKit App Shell                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │   Svelte 5   │  │    Runes     │  │   Components/Routes  │  │ │
│  │  │   Runtime    │  │   ($state)   │  │   /feed, /profile    │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Service Worker                              │ │
│  │                                                                  │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │ │
│  │   │  Precache   │  │  Runtime    │  │   Background Sync   │    │ │
│  │   │  (shell)    │  │  Cache      │  │   (queued actions)  │    │ │
│  │   └─────────────┘  └─────────────┘  └─────────────────────┘    │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐   │
│  │ Cache API   │     │ IndexedDB   │     │   localStorage      │   │
│  │             │     │             │     │                     │   │
│  │ - App shell │     │ - Posts     │     │ - User prefs        │   │
│  │ - JS/CSS    │     │ - Drafts    │     │ - Feed position     │   │
│  │ - Images    │     │ - Queued    │     │ - UI state          │   │
│  │ - Fonts     │     │   actions   │     │                     │   │
│  └─────────────┘     │ - Bookmarks │     └─────────────────────┘   │
│                      │ - Profile   │                                │
│                      └─────────────┘                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ (when online)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                                  │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Pages     │  │   Workers   │  │     D1      │  │    R2     │  │
│  │  (SvelteKit)│  │  (API/DO)   │  │  (social)   │  │  (images) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Budget

iOS Safari allocates ~50MB for PWA storage. Here's our budget:

| Storage Type | Allocation | Contents |
|--------------|------------|----------|
| **Cache API** | ~20MB | App shell, JS bundles, CSS, fonts, icons |
| **IndexedDB** | ~25MB | Posts, images, drafts, queued actions |
| **localStorage** | ~1MB | UI preferences, scroll position, tokens |
| **Reserved** | ~4MB | Buffer for growth |

With the engine at ~7MB and Meadow being a subset, we have plenty of room.

---

## Caching Strategy

### Layer 1: Precache (Install Time)

Cached immediately when service worker installs. User has these forever (until app update).

```
Precached Assets (~5-8MB estimated)
├── /_app/immutable/*.js      # SvelteKit bundles
├── /_app/immutable/*.css     # Styles  
├── /manifest.json            # PWA manifest
├── /icons/*.png              # App icons (192, 512, maskable)
├── /fonts/*.woff2            # Grove typography
├── /emojis/top-20/*.png      # Most popular reaction emojis
└── /offline.html             # Fallback page (if all else fails)
```

### Layer 2: Runtime Cache (On Demand)

Cached as the user browses. Strategies vary by content type.

#### Feed API — NetworkFirst

```typescript
// Try network, fall back to cache
// User sees fresh content when online, cached when offline

Pattern: /api/feed/*
Cache: 'meadow-feed'
TTL: 24 hours
Max Entries: 50 responses (paginated feed pages)
```

**Why NetworkFirst:** Feed content changes frequently. We want fresh when possible, but stale is better than nothing.

#### Individual Posts — StaleWhileRevalidate

```typescript
// Serve cached immediately, update in background
// User sees instant content, gets update on next view

Pattern: /api/posts/*
Cache: 'meadow-posts'
TTL: 7 days
Max Entries: 200 posts
```

**Why StaleWhileRevalidate:** Posts don't change often after creation. Show cached instantly, refresh quietly.

#### Images — CacheFirst

```typescript
// Serve from cache if exists, only fetch if missing
// Images are immutable (same URL = same content)

Pattern: /api/images/*, cdn.grove.place/images/*
Cache: 'meadow-images'
TTL: 30 days
Max Entries: 300 images
Max Size: 15MB (with LRU eviction)
```

**Why CacheFirst:** Images at a URL never change. Cache aggressively.

#### User Data — NetworkOnly with IndexedDB Fallback

```typescript
// Always try network for user-specific data
// Fall back to IndexedDB mirror if offline

Pattern: /api/me, /api/bookmarks, /api/profile
Strategy: Custom (network → IndexedDB)
```

**Why Custom:** User data needs to be fresh, but we keep a local copy for offline access.

### Layer 3: IndexedDB (Structured Data)

For data that needs querying, relationships, or offline writes.

```typescript
// IndexedDB Stores

interface MeadowOfflineDB {
  // Cached feed posts (denormalized for offline reading)
  posts: {
    id: string;
    title: string;
    content: string;           // Full post text
    excerpt: string;
    authorId: string;
    authorUsername: string;
    authorAvatar: string;
    blogSubdomain: string;
    imageUrls: string[];       // URLs of attached images
    reactions: ReactionSummary[];
    createdAt: number;
    cachedAt: number;          // When we cached it
  };

  // User's own profile (for offline viewing)
  profile: {
    id: 'me';                  // Singleton
    userId: string;
    username: string;
    displayName: string;
    avatar: string;
    bio: string;
    cachedAt: number;
  };

  // User's bookmarks
  bookmarks: {
    id: string;                // Same as post ID
    postId: string;
    bookmarkedAt: number;
    cachedAt: number;
  };

  // Draft posts (created offline)
  drafts: {
    id: string;                // Local UUID
    content: string;
    imageBlobs: Blob[];        // Stored locally until upload
    createdAt: number;
    updatedAt: number;
  };

  // Queued actions (for background sync)
  pendingActions: {
    id: string;
    type: 'vote' | 'reaction' | 'bookmark' | 'post';
    payload: Record<string, unknown>;
    createdAt: number;
    retryCount: number;
  };

  // Image blob cache (for offline images)
  imageCache: {
    url: string;               // Original URL as key
    blob: Blob;
    cachedAt: number;
  };
}
```

---

## Offline Capabilities

### What Works Offline

| Feature | Offline Behavior |
|---------|------------------|
| **View feed** | Shows cached posts (may be stale) |
| **Read full post** | ✅ If previously viewed |
| **View images** | ✅ If previously loaded |
| **View profile** | ✅ Own profile cached |
| **View bookmarks** | ✅ Bookmarked posts cached |
| **Upvote/downvote** | Queued, syncs when online |
| **React with emoji** | Queued, syncs when online |
| **Bookmark post** | Queued, syncs when online |
| **Write new post** | Saved as draft, publishes when online |
| **Scroll position** | Restored on return |

### What Requires Online

| Feature | Why |
|---------|-----|
| **Fetch new posts** | Need server data |
| **See real-time reactions** | Need server state |
| **View other profiles** | Not pre-cached |
| **Search** | Server-side only |
| **Login/logout** | Auth requires server |

### Offline Indicators

```
┌─────────────────────────────────────────────────────────────────┐
│  ◎ Meadow                                   ☁️ Offline Mode     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  📶 You're offline                                      │   │
│   │  Showing cached posts. Your actions will sync when     │   │
│   │  you're back online.                        [ Dismiss ] │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   (feed content below)                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Subtle, non-blocking. Appears once, dismissible, persists as small icon in header.

---

## Background Sync

When a user takes an action offline, we queue it and replay when connectivity returns.

### Sync Flow

```
User taps upvote (offline)
         │
         ▼
┌─────────────────┐
│ Optimistic UI   │  ← Button shows "voted" immediately
│ Update          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in        │  ← IndexedDB: pendingActions
│ pendingActions  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Register Sync   │  ← navigator.serviceWorker.ready
│ Event           │     .then(sw => sw.sync.register('sync-actions'))
└────────┬────────┘
         │
         │  ... time passes, user regains connectivity ...
         │
         ▼
┌─────────────────┐
│ Service Worker  │  ← 'sync' event fires
│ Wakes Up        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Replay Queued   │  ← Fetch each action, POST to API
│ Actions         │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Success    Failure
    │         │
    ▼         ▼
Remove    Retry with
from DB   backoff (max 3)
```

### Action Queue Schema

```typescript
interface PendingAction {
  id: string;
  type: 'vote' | 'reaction' | 'bookmark' | 'post';
  endpoint: string;
  method: 'POST' | 'DELETE';
  body: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

// Example queued vote
{
  id: 'pending-vote-abc123',
  type: 'vote',
  endpoint: '/api/vote',
  method: 'POST',
  body: { post_id: 'post-xyz', vote_type: 'upvote' },
  createdAt: 1706500000000,
  retryCount: 0
}
```

### Conflict Resolution

If the user voted on a post offline, then voted differently online before sync:

1. **Last-write-wins** — The most recent action takes precedence
2. **Timestamp comparison** — Server checks `createdAt` against existing vote
3. **Graceful degradation** — If conflict, server response updates local state

---

## Draft Posts (Offline Composition)

Wanderers can write posts offline. These persist until published.

### Draft Storage

```typescript
interface Draft {
  id: string;              // Local UUID (crypto.randomUUID())
  content: string;         // Post text
  images: DraftImage[];    // Local image references
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'pending' | 'published' | 'failed';
}

interface DraftImage {
  localId: string;         // Reference to imageCache store
  blob: Blob;              // Actual image data
  previewUrl: string;      // URL.createObjectURL() for display
}
```

### Publish Flow

```
User writes post offline
         │
         ▼
┌─────────────────┐
│ Save to IndexedDB│  ← drafts store
│ (auto-save)      │
└────────┬────────┘
         │
User taps "Post"
         │
         ▼
┌─────────────────┐
│ status: 'pending'│
│ Queue for sync   │
└────────┬────────┘
         │
         │  ... connectivity returns ...
         │
         ▼
┌─────────────────┐
│ Upload images   │  ← POST to /api/upload, get URLs
│ first           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create post     │  ← POST to /api/posts with image URLs
│ with image URLs │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Success    Failure
    │         │
    ▼         ▼
Delete    status: 'failed'
draft     Show retry UI
```

---

## Installation Flow

### Install Prompt Strategy

We use a **deferred prompt** — don't immediately ask, wait for engagement.

```typescript
// In +layout.svelte or dedicated component

let deferredPrompt: BeforeInstallPromptEvent | null = $state(null);
let showInstallBanner = $state(false);

// Capture the install prompt event
if (browser) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show banner after user has engaged
    // (scrolled feed, made 3+ interactions, visited 2+ times)
    if (shouldShowInstallPrompt()) {
      showInstallBanner = true;
    }
  });
}

function handleInstall() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') {
      // Track install
    }
    deferredPrompt = null;
    showInstallBanner = false;
  });
}
```

### Install Banner UI

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  🌿                                               [ × ]  │   │
│   │                                                         │   │
│   │  Add Meadow to your home screen                         │   │
│   │  Open faster, read offline, never miss a post.          │   │
│   │                                                         │   │
│   │                              [ Not now ]  [ Install ]   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Dismissible (remembers for 7 days)
- Shows after meaningful engagement
- Never interrupts active reading

### iOS Specific

iOS doesn't support `beforeinstallprompt`. We show manual instructions:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  🌿 Install Meadow                              [ × ]    │   │
│   │                                                         │   │
│   │  Tap  ↑  then "Add to Home Screen"                      │   │
│   │       ⎯⎯                                                │   │
│   │       Share                                             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Web App Manifest

```json
{
  "name": "Meadow",
  "short_name": "Meadow",
  "description": "Your feed from the Grove. Connection without competition.",
  "start_url": "/feed",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#2d5a3d",
  "background_color": "#0f1a0f",
  "categories": ["social", "news"],
  "icons": [
    {
      "src": "/icons/meadow-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/meadow-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/meadow-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/feed.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Meadow feed view"
    }
  ],
  "shortcuts": [
    {
      "name": "New Post",
      "short_name": "Post",
      "url": "/compose",
      "icons": [{ "src": "/icons/compose.png", "sizes": "96x96" }]
    },
    {
      "name": "Bookmarks",
      "short_name": "Saved",
      "url": "/bookmarks",
      "icons": [{ "src": "/icons/bookmark.png", "sizes": "96x96" }]
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** App installs and caches shell. Basic offline page.

- [ ] Add `@vite-pwa/sveltekit` and configure Vite
- [ ] Create web app manifest with icons
- [ ] Set up basic service worker with precaching
- [ ] Create offline fallback page
- [ ] Test installation flow on Android + iOS

**Deliverable:** Users can install Meadow, app loads instantly on repeat visits.

### Phase 2: Offline Reading (Week 2)

**Goal:** Feed and posts available offline.

- [ ] Implement runtime caching strategies (NetworkFirst, CacheFirst, etc.)
- [ ] Set up IndexedDB stores for posts
- [ ] Cache feed responses on view
- [ ] Cache images with size limits
- [ ] Add offline detection and UI indicator
- [ ] Implement scroll position persistence

**Deliverable:** Users can read previously-viewed posts offline.

### Phase 3: Offline Actions (Week 3)

**Goal:** Votes, reactions, bookmarks work offline.

- [ ] Create pending actions queue in IndexedDB
- [ ] Implement optimistic UI updates
- [ ] Set up background sync registration
- [ ] Write sync event handler in service worker
- [ ] Handle conflict resolution
- [ ] Add "pending sync" indicators in UI

**Deliverable:** Users can interact with posts offline; actions sync automatically.

### Phase 4: Offline Composition (Week 4)

**Goal:** Users can write posts offline.

- [ ] Create drafts store in IndexedDB
- [ ] Build auto-save mechanism
- [ ] Handle offline image attachment (blob storage)
- [ ] Implement publish queue
- [ ] Add draft management UI
- [ ] Handle upload failures gracefully

**Deliverable:** Users can write and queue posts while offline.

### Phase 5: Polish & Edge Cases (Week 5)

**Goal:** Handle all the weird stuff.

- [ ] Cache invalidation on app update
- [ ] Storage quota management (graceful eviction)
- [ ] iOS-specific quirks (7-day eviction, add-to-home-screen prompt)
- [ ] Error boundaries for failed syncs
- [ ] Analytics for offline usage
- [ ] Update notification ("New version available, refresh to update")

**Deliverable:** Production-ready PWA.

---

## Technical Implementation

### Vite Configuration

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'prompt',  // Show update prompt, don't auto-reload
      manifest: {
        name: 'Meadow',
        short_name: 'Meadow',
        description: 'Your feed from the Grove',
        theme_color: '#2d5a3d',
        background_color: '#0f1a0f',
        display: 'standalone',
        start_url: '/feed',
        icons: [
          { src: '/icons/meadow-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/meadow-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/meadow-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline',
        runtimeCaching: [
          // Feed API - network first
          {
            urlPattern: /^https:\/\/meadow\.grove\.place\/api\/feed/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'meadow-feed',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24,  // 24 hours
                maxEntries: 50
              },
              networkTimeoutSeconds: 3
            }
          },
          // Individual posts - stale while revalidate
          {
            urlPattern: /^https:\/\/meadow\.grove\.place\/api\/posts\/.+/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'meadow-posts',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7,  // 7 days
                maxEntries: 200
              }
            }
          },
          // Images - cache first
          {
            urlPattern: /^https:\/\/(meadow\.grove\.place|cdn\.grove\.place)\/.*\.(png|jpg|jpeg|webp|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'meadow-images',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30,  // 30 days
                maxEntries: 300,
                purgeOnQuotaError: true  // Delete images first if quota exceeded
              }
            }
          },
          // Emoji assets - cache first (these rarely change)
          {
            urlPattern: /^https:\/\/meadow\.grove\.place\/emojis\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'meadow-emojis',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 90,  // 90 days
                maxEntries: 150
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true  // Enable PWA in dev for testing
      }
    })
  ]
});
```

### IndexedDB Setup

```typescript
// src/lib/offline/db.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface MeadowDB extends DBSchema {
  posts: {
    key: string;
    value: CachedPost;
    indexes: { 'by-cached': number };
  };
  profile: {
    key: string;
    value: CachedProfile;
  };
  bookmarks: {
    key: string;
    value: CachedBookmark;
    indexes: { 'by-bookmarked': number };
  };
  drafts: {
    key: string;
    value: Draft;
    indexes: { 'by-updated': number };
  };
  pendingActions: {
    key: string;
    value: PendingAction;
    indexes: { 'by-created': number };
  };
  imageCache: {
    key: string;
    value: CachedImage;
    indexes: { 'by-cached': number };
  };
}

let dbPromise: Promise<IDBPDatabase<MeadowDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MeadowDB>('meadow-offline', 1, {
      upgrade(db) {
        // Posts store
        const postStore = db.createObjectStore('posts', { keyPath: 'id' });
        postStore.createIndex('by-cached', 'cachedAt');

        // Profile store (singleton)
        db.createObjectStore('profile', { keyPath: 'id' });

        // Bookmarks store
        const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bookmarkStore.createIndex('by-bookmarked', 'bookmarkedAt');

        // Drafts store
        const draftStore = db.createObjectStore('drafts', { keyPath: 'id' });
        draftStore.createIndex('by-updated', 'updatedAt');

        // Pending actions store
        const actionStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
        actionStore.createIndex('by-created', 'createdAt');

        // Image cache store
        const imageStore = db.createObjectStore('imageCache', { keyPath: 'url' });
        imageStore.createIndex('by-cached', 'cachedAt');
      }
    });
  }
  return dbPromise;
}
```

### Offline State Management

```typescript
// src/lib/offline/state.svelte.ts
import { browser } from '$app/environment';

// Reactive online status
let isOnline = $state(browser ? navigator.onLine : true);

if (browser) {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

export function useOnlineStatus() {
  return {
    get isOnline() { return isOnline; },
    get isOffline() { return !isOnline; }
  };
}

// Pending actions count
let pendingCount = $state(0);

export function usePendingActions() {
  // Load count from IndexedDB on init
  if (browser) {
    getDB().then(async (db) => {
      pendingCount = await db.count('pendingActions');
    });
  }

  return {
    get count() { return pendingCount; },
    increment() { pendingCount++; },
    decrement() { pendingCount = Math.max(0, pendingCount - 1); },
    set(n: number) { pendingCount = n; }
  };
}
```

### Optimistic Action Queue

```typescript
// src/lib/offline/actions.ts
import { getDB } from './db';

export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>) {
  const db = await getDB();
  
  const pendingAction: PendingAction = {
    id: crypto.randomUUID(),
    ...action,
    createdAt: Date.now(),
    retryCount: 0
  };

  await db.add('pendingActions', pendingAction);

  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-actions');
  }

  return pendingAction;
}

export async function processQueue() {
  const db = await getDB();
  const actions = await db.getAllFromIndex('pendingActions', 'by-created');

  for (const action of actions) {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body)
      });

      if (response.ok) {
        await db.delete('pendingActions', action.id);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error, don't retry
        await db.delete('pendingActions', action.id);
      } else {
        // Server error, increment retry
        if (action.retryCount < 3) {
          await db.put('pendingActions', { ...action, retryCount: action.retryCount + 1 });
        } else {
          await db.delete('pendingActions', action.id);
        }
      }
    } catch (err) {
      // Network error, will retry on next sync
      console.error('Sync failed for action:', action.id, err);
    }
  }
}
```

### Service Worker Sync Handler

```typescript
// Custom service worker additions (merged with Workbox)
// src/service-worker.ts

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { processQueue } from './lib/offline/actions';

// Background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(processQueue());
  }
});

// Periodic sync (if supported) - check for new posts
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-feed') {
    event.waitUntil(refreshFeedCache());
  }
});

async function refreshFeedCache() {
  try {
    const response = await fetch('/api/feed?limit=20');
    if (response.ok) {
      const cache = await caches.open('meadow-feed');
      await cache.put('/api/feed?limit=20', response);
    }
  } catch {
    // Offline or error, ignore
  }
}
```

---

## iOS Considerations

iOS has some PWA quirks to handle:

| Issue | Mitigation |
|-------|------------|
| **7-day eviction** | Prompt users to open app at least weekly; accept graceful re-caching |
| **50MB storage limit** | Already within budget; LRU eviction on images |
| **No background sync** | Fall back to sync-on-open for iOS |
| **No beforeinstallprompt** | Custom "how to install" instructions |
| **Standalone loses state on kill** | Persist all state to IndexedDB/localStorage |

### iOS Sync Fallback

```typescript
// src/routes/+layout.svelte

import { onMount } from 'svelte';
import { browser } from '$app/environment';
import { processQueue } from '$lib/offline/actions';

onMount(() => {
  if (!browser) return;

  // iOS doesn't support background sync, so sync when app becomes visible
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        processQueue();
      }
    });
    
    // Also sync on initial load
    if (navigator.onLine) {
      processQueue();
    }
  }
});
```

---

## Testing Strategy

### Manual Testing Matrix

| Scenario | Android Chrome | iOS Safari | Desktop Chrome |
|----------|---------------|------------|----------------|
| Install from browser | ✓ | ✓ (manual) | ✓ |
| Launch from home screen | ✓ | ✓ | ✓ |
| Offline feed reading | ✓ | ✓ | ✓ |
| Offline voting | ✓ | ✓ | ✓ |
| Sync after reconnect | ✓ | ✓ | ✓ |
| Draft persistence | ✓ | ✓ | ✓ |
| Update prompt | ✓ | ✓ | ✓ |

### Lighthouse PWA Audit

Target scores:
- **PWA Badge:** ✓ Installable
- **Performance:** > 90
- **Accessibility:** > 90
- **Best Practices:** > 90

### Offline Testing

1. Install PWA
2. Browse feed, view 10+ posts
3. Enable airplane mode
4. Verify cached posts display
5. Vote on 3 posts
6. Write a draft post
7. Disable airplane mode
8. Verify votes synced (check in private window)
9. Publish draft, verify it appears

---

## Metrics to Track

| Metric | How | Why |
|--------|-----|-----|
| **Install rate** | `beforeinstallprompt` + `appinstalled` events | Measure PWA adoption |
| **Offline sessions** | `navigator.onLine` on page load | Understand offline usage |
| **Sync success rate** | Background sync completion / attempts | Reliability |
| **Cache hit rate** | Service worker fetch events | Efficiency |
| **Storage usage** | `navigator.storage.estimate()` | Stay within budget |

---

## Open Questions

1. **Update strategy:** Auto-update service worker, or prompt user? (Currently: prompt)

2. **Cache warming:** Pre-fetch followed users' posts? (Currently: no, just cache on view)

3. **Image quality:** Serve lower-res images for cache, full-res on demand? (Currently: same image)

4. **Notification prep:** Add notification permission request UI now (for future)? (Currently: skip)

---

## References

- [SvelteKit Service Workers](https://svelte.dev/docs/kit/service-workers)
- [Vite PWA for SvelteKit](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html)
- [Workbox Strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [IndexedDB with idb](https://github.com/jakearchibald/idb)
- [iOS PWA limitations](https://firt.dev/notes/pwa-ios/)

---

*The meadow stays with you, even when you wander offline.*
