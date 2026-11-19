---
title: Arbor — Admin Panel
description: Content management and site administration interface
category: specs
specCategory: platform-services
icon: dashboard
lastUpdated: "2025-12-24"
aliases: []
tags:
  - admin-panel
  - ui
  - user-experience
---

# Arbor — Admin Panel

```
            🌿              🌿              🌿
              \    🌸      /  \    🌺      /
               \    |     /    \    |     /
        ────────╳───┼────╳──────╳───┼────╳────────
               /    |     \    /    |     \
              /    🌷      \  /    🌻      \
            🌿              🌿              🌿

              Where you tend what you've grown.
```

> _The structured framework where growth is tended._

Grove's blogger admin panel where users manage content, customize their site, and configure settings. Designed to be minimal and anxiety-free with quick navigation, instant saves, and a warm aesthetic matching Grove's cozy tea-shop vibe.

**Public Name:** Arbor
**Internal Name:** GroveArbor
**Access URL:** `{blog}.grove.place/admin`

An arbor is a garden structure that supports climbing plants: structured, nurturing, and essential for healthy growth. It's where you manage and cultivate your corner of the grove.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Navigation Structure](#navigation-structure)
5. [Core Sections](#core-sections)
6. [User Messages Panel](#user-messages-panel)
7. [Mobile Experience](#mobile-experience)
8. [Design System](#design-system)
9. [API Integration](#api-integration)
10. [Future Additions](#future-additions)

---

## Overview

### Purpose

The Grove Admin Panel is where bloggers manage their content, customize their site, and configure settings. It's designed to be simple, focused, and get out of the way—write, publish, done.

### Design Philosophy

- **Minimal by default**: Show what's needed, hide what isn't
- **No anxiety-inducing metrics**: No real-time analytics dashboards
- **Mobile-first**: Works on phones, tablets, and desktops
- **Fast**: Quick navigation, instant saves, responsive UI
- **Warm aesthetic**: Matches Grove's cozy, tea-shop vibe

### Non-Goals

- Complex analytics dashboards
- SEO optimization tools
- Plugin management
- Multi-user collaboration (v1)

---

## Architecture

### Tech Stack

- **Framework**: SvelteKit 2.0+
- **Styling**: Tailwind CSS + custom CSS variables
- **UI Components**: Custom component library (`$lib/ui`)
- **API**: RESTful endpoints via Cloudflare Workers
- **State**: Svelte 5 runes ($state, $effect)

### File Structure

```
libs/engine/src/routes/admin/
├── +layout.svelte          # Admin layout with sidebar
├── +layout.server.ts       # Auth check, user data
├── +page.svelte            # Dashboard
├── blog/
│   ├── +page.svelte        # Post list
│   ├── new/+page.svelte    # Create post
│   └── edit/[slug]/        # Edit post
├── pages/
│   ├── +page.svelte        # Page list
│   └── edit/[slug]/        # Edit page
├── images/
│   └── +page.svelte        # CDN uploader
├── settings/
│   └── +page.svelte        # Site settings
└── messages/               # NEW: Platform messages
    └── +page.svelte
```

### Shared Components

```
libs/engine/src/lib/components/admin/
├── MarkdownEditor.svelte   # WYSIWYG-ish markdown editor
├── GutterManager.svelte    # Line gutters for editor
└── ImageUploader.svelte    # Drag-drop image upload
```

---

## Authentication

### Flow

1. User visits `/admin`
2. Server checks for valid session cookie
3. If no session: redirect to Heartwood (GroveAuth)
4. Heartwood authenticates (Google OAuth or Magic Code)
5. Heartwood redirects back with auth token
6. Admin creates session, sets cookie
7. User lands on Dashboard

### Session Management

- Session cookie: `grove_session` (HttpOnly, Secure, SameSite=Lax)
- Session duration: 30 days
- Refresh: Extended on each authenticated request
- Logout: Clears cookie, redirects to home

### Authorization

- Blog owners: Full access to their admin panel
- No admin roles (single-owner blogs in v1)
- Rate limiting on write operations

---

## Navigation Structure

### Sidebar (Desktop)

```
┌────────────────────────────┐
│ Admin Panel                │
├────────────────────────────┤
│ 🏠 Dashboard               │
│ 📝 Blog Posts              │
│ 📄 Pages                   │
│ 📷 CDN Uploader            │
│ 📢 Messages           NEW  │
│ ⚙️ Settings                │
├────────────────────────────┤
│ user@email.com             │
│ [Logout]                   │
└────────────────────────────┘
```

### Mobile Navigation

- Hamburger menu (top-left)
- Slides in from left
- Same sections as desktop
- Overlay closes on tap outside

### Section Descriptions

| Section          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| **Dashboard**    | Quick overview, system health, quick actions |
| **Blog Posts**   | List, create, edit, delete blog posts        |
| **Pages**        | Static pages (About, Contact, etc.)          |
| **CDN Uploader** | Upload images directly to media library      |
| **Messages**     | Platform status, announcements (NEW)         |
| **Settings**     | Site configuration, appearance, account      |

---

## Core Sections

### Dashboard

The landing page after login. Intentionally simple.

**Displays:**

- Quick system health indicators (D1, KV, R2 status)
- Quick action cards (New Post, Upload Image, View Site)
- Recent activity summary (last 5 posts)
- Active platform messages (if any)

**Does NOT display:**

- Visitor counts
- Real-time analytics
- Engagement metrics
- Revenue numbers

**Rationale**: Dashboards often create anxiety. Grove's dashboard answers "is everything working?" and provides quick shortcuts, nothing more.

### Blog Posts

List view of all blog posts with actions.

**Features:**

- Table view: Title, Date, Tags, Status, Actions
- Filters: Published, Drafts, All
- Sort: Date (newest first)
- Actions: View, Edit, Delete
- "New Post" button (prominent)

**Post Editor:**

- Markdown editor with toolbar
- Live preview (toggle)
- Autosave to local storage
- Manual save to server
- Fields: Title, Content, Slug, Excerpt, Featured Image, Tags
- Publish/Draft toggle

### Pages

Same as Blog Posts, but for static pages.

**Differences:**

- No date display
- No tags
- Pages appear in navigation (configurable)
- Slug determines URL path

### CDN Uploader

Direct upload to R2 storage.

**Features:**

- Drag-and-drop upload area
- Paste from clipboard
- Progress indicator
- Copy URL button
- Gallery view of recent uploads
- File type restrictions (images only in v1)

**Upload Flow:**

1. User drops/selects file
2. Client validates (type, size)
3. Upload to `/api/upload` endpoint
4. Worker stores in R2
5. Returns CDN URL
6. User can copy URL for use in posts

### Settings

Site configuration divided into sections.

**Site Settings:**

- Blog title
- Blog description
- Social links (Twitter, Mastodon, GitHub, etc.)

**Appearance:**

- Theme mode (Light / Dark / System)
- Accent color picker
- Font selection (plan-dependent)

**Account:**

- Email (display only, changed via Heartwood)
- Payment, plan summary, and usage cards
- **Your Data** card — counts, then **Go to Full Export** → `/arbor/export` (zip only)
- **Closing Your Grove** card — support-based; a `mailto:` is the whole flow
- *Planned:* self-serve deletion, and with it a real danger-zone affordance here (#1743). Nothing in this panel deletes an account today.

**Cache Management:**

- Clear all cache button
- System health check

---

## User Messages Panel

### Purpose

Shows platform-wide status updates, maintenance notices, and system messages to users within their admin panel.

### Location

New sidebar item: **📢 Messages**

Also displayed on Dashboard when there are active messages.

### Data Source

Pulls from the shared D1 database:

- `status_incidents` (active incidents)
- `status_scheduled` (upcoming maintenance)
- `status_updates` (incident updates)

### Display Types

| Type                  | Icon | Display Duration          |
| --------------------- | ---- | ------------------------- |
| Active Incident       | ⚠️   | Until resolved            |
| Scheduled Maintenance | 🔧   | Until completed           |
| Resolved Incident     | ✓    | 24 hours after resolution |
| Announcement          | 📢   | As configured             |

### UI Design

**On Dashboard (Summary):**

```
┌────────────────────────────────────────────────────────────────┐
│ 📢 Messages                                                    │
├────────────────────────────────────────────────────────────────┤
│ ⚠️ CDN Degraded Performance                                    │
│    Images may load slower than usual.                          │
│    Status: Monitoring → View on status.grove.place             │
└────────────────────────────────────────────────────────────────┘
```

**Messages Page (Full View):**

```
┌────────────────────────────────────────────────────────────────┐
│ Messages                                                       │
│ Platform status and announcements                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Active                                                         │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ ⚠️ CDN Degraded Performance                      Dec 20, 10:15 │
│    Images may load slower than usual. We're on it.             │
│    Affected: CDN                                               │
│    Status: Monitoring                                          │
│    Latest: "Fix deployed, watching for stability"              │
│    [View on status.grove.place →]                              │
│                                                                │
│ Upcoming                                                       │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ 🔧 Scheduled: Database Maintenance               Dec 22, 2:00  │
│    Brief read-only period expected (~30 min).                  │
│    Affected: Blog Engine, API                                  │
│                                                                │
│ Recent (Past 24 Hours)                                         │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ ✓ Payment Processing Issue                       Dec 19, 15:00 │
│    Resolved after 2 hours.                                     │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ 📡 Subscribe to status updates: status.grove.place/feed        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### When Empty

```
┌────────────────────────────────────────────────────────────────┐
│ Messages                                                       │
│ Platform status and announcements                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ✓ All Systems Operational                                      │
│                                                                │
│ No active incidents or scheduled maintenance.                  │
│                                                                │
│ For real-time status updates, visit status.grove.place         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Badge Indicator

When there are active incidents or upcoming maintenance:

- Sidebar "Messages" item shows notification dot
- Dashboard shows message summary card

---

## Mobile Experience

### Responsive Breakpoints

| Breakpoint | Behavior                         |
| ---------- | -------------------------------- |
| < 768px    | Mobile layout (hamburger nav)    |
| ≥ 768px    | Desktop layout (sidebar visible) |

### Mobile-Specific Adjustments

- Sidebar slides in from left on hamburger tap
- Table columns collapse (hide Tags, Date on mobile)
- Editor toolbar stays fixed at bottom
- Touch-friendly tap targets (44px minimum)
- Swipe to close sidebar

### Mobile Header

```
┌────────────────────────────────────────┐
│ ☰    The Grove                         │
└────────────────────────────────────────┘
```

---

## Design System

### Colors (CSS Variables)

```css
/* Light mode */
--color-bg-primary: #fdfcfa;
--color-bg-secondary: #f5f3ef;
--color-text: #2d3436;
--color-text-muted: #636e72;
--color-primary: #2c5f2d;
--color-border: #e0ddd8;

/* Dark mode */
--color-bg-primary-dark: #1a1d1e;
--color-bg-secondary-dark: #232728;
--color-text-dark: #e8e6e3;
--color-text-muted-dark: #9ca3af;
--color-primary-dark: #5cb85f;
--color-border-dark: #3d4144;

/* Status colors */
--accent-success: #27ae60;
--accent-warning: #f39c12;
--accent-danger: #e74c3c;
--accent-info: #3498db;
```

### Typography

- **Font**: Lexend (default), configurable per-site
- **Heading sizes**: 2rem (h1), 1.25rem (h2), 1rem (h3)
- **Body**: 1rem (16px base)
- **Small text**: 0.875rem

### Spacing

- Section padding: 1.5rem
- Card padding: 1rem - 1.5rem
- Gap between items: 0.75rem - 1rem
- Border radius: var(--border-radius-standard) = 8px

### Components

| Component | Usage                                  |
| --------- | -------------------------------------- |
| `Button`  | Primary, secondary, danger variants    |
| `Card`    | Content containers with optional title |
| `Badge`   | Tags, status indicators                |
| `Spinner` | Loading states                         |
| `Toast`   | Notifications (success, error)         |

---

## API Integration

### Endpoints Used

| Endpoint                 | Method   | Purpose                 |
| ------------------------ | -------- | ----------------------- |
| `/api/posts`             | GET      | List all posts          |
| `/api/posts`             | POST     | Create new post         |
| `/api/posts/:slug`       | GET      | Get single post         |
| `/api/posts/:slug`       | PUT      | Update post             |
| `/api/posts/:slug`       | DELETE   | Delete post             |
| `/api/pages`             | GET/POST | Pages CRUD              |
| `/api/upload`            | POST     | Upload to R2            |
| `/api/settings`          | GET/PUT  | Site settings           |
| `/api/admin/cache/clear` | POST     | Clear KV cache          |
| `/api/status/messages`   | GET      | Platform messages (NEW) |

### API Client

```typescript
// $lib/utils/api.ts
export const api = {
  async get(path: string) { ... },
  async post(path: string, data: object) { ... },
  async put(path: string, data: object) { ... },
  async delete(path: string) { ... }
};
```

### Error Handling

- Toast notifications for user-facing errors
- Console logging for debugging
- Graceful degradation (show cached data if API fails)

---

## Future Additions

### Planned Features

| Feature                    | Priority | Description                        |
| -------------------------- | -------- | ---------------------------------- |
| **Comments moderation**    | High     | Approve/reject/delete comments     |
| **Analytics (basic)**      | Medium   | Aggregate page views, no tracking  |
| **Scheduled posts**        | Medium   | Publish at future date/time        |
| **Custom domain settings** | Medium   | Configure custom domain (Oak+)     |
| **Theme customizer**       | Low      | Advanced appearance options (Oak+) |
| **Sidebar links (Vines)**  | Low      | Manage sidebar link list           |

### Messages Panel Expansion

Future versions may include:

- Personal notifications (new comment, new reply)
- Tips and onboarding messages
- Feature announcements

---

## Implementation Notes

### Current State

The admin panel exists and is functional for:

- ✅ Blog post management
- ✅ Page management
- ✅ CDN uploads
- ✅ Settings (basic)
- ✅ System health display

### Needs Implementation

- [ ] Messages panel (platform status)
- [ ] Comments moderation section
- [ ] Scheduled posts UI
- [ ] Analytics section (basic)

### Adding the Messages Panel

1. Create `/admin/messages/+page.svelte`
2. Add API endpoint `/api/status/messages`
3. Add sidebar navigation item
4. Add badge indicator for active incidents
5. Add summary card to Dashboard

---

_Spec Version: 1.0_
_Created: 2025-12-24_
_Author: Claude (based on existing codebase exploration)_
