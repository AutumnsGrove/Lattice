---
aliases: []
date created: Monday, December 29th 2025
date modified: Friday, January 3rd 2026
tags:
  - roadmaps
  - content-planning
  - user-experience
type: tech-spec
---

# Trails — Personal Roadmaps

> *The path becomes clear by walking it.*

Grove's personal roadmap system for building in public. Lets users create and share project timelines with waypoints, phases, and beautiful nature-themed presentations that show where they've been and where they're headed.

**Public Name:** Trails
**Internal Name:** GroveTrails
**Target Phase:** First Buds (Early Spring)
**Tiers:** Sapling ($12/mo) and up
**Last Updated:** December 2025

Trails wind through the forest, marking where others have walked. They show the journey, not just the destination. Trails is Grove's personal roadmap system, letting you build in public and share the path you're walking.

Whether planning a creative project, outlining upcoming blog content, or tracking progress on a long-term goal, Trails provides a beautiful way to show where you've been, where you are, and where you're headed.

---

## Overview

Trails lets Grove users create and share personal roadmaps. Whether planning a creative project, outlining upcoming blog content, or building in public, Trails provides a beautiful way to show the journey: where you've been, where you are, and where you're headed.

### Core Value Proposition

- **Build in Public**: Share your project roadmap with readers and followers
- **Content Planning**: Outline upcoming posts, series, and creative work
- **Progress Tracking**: Mark waypoints as you complete milestones
- **Flexible Structure**: Flat lists or grouped phases with custom names
- **Tier-Gated Theming**: Simple timeline for all, nature themes for premium tiers

---

## Feature Specification

### Waypoints (Trail Entries)

Each waypoint represents a milestone or planned item on the trail.

```typescript
interface Waypoint {
  id: string;                          // UUID
  trail_id: string;                    // Parent trail
  title: string;                       // Required, max 200 chars
  description?: string;                // Optional, max 500 chars
  status: WaypointStatus;              // planned | in_progress | complete | deferred
  target_date?: string;                // Optional ISO date or timeframe text
  links?: WaypointLink[];              // Related posts, external resources
  icon?: string;                       // Lucide icon name (default: Circle)
  phase_id?: string;                   // Optional grouping
  sort_order: number;                  // Position in list/phase
  created_at: string;
  updated_at: string;
}

type WaypointStatus = 'planned' | 'in_progress' | 'complete' | 'deferred';

interface WaypointLink {
  label: string;
  url: string;
  type: 'post' | 'external' | 'resource';
}
```

### Phases (Optional Grouping)

Users can group waypoints into named phases, similar to Grove's roadmap.

```typescript
interface Phase {
  id: string;                          // UUID
  trail_id: string;                    // Parent trail
  name: string;                        // e.g., "First Frost", "Chapter One", "Q1 2026"
  subtitle?: string;                   // e.g., "The quiet before dawn"
  description?: string;                // Phase description
  sort_order: number;                  // Phase order
  season?: Season;                     // For nature-themed trails (Oak+)
  created_at: string;
}

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
```

### Trail Configuration

```typescript
interface Trail {
  id: string;
  tenant_id: string;
  name: string;                        // Trail name (for internal reference)
  slug: string;                        // URL slug: /trail, /roadmap, or custom
  visibility: 'public' | 'private';    // Public shows on site, private is admin-only
  template?: TrailTemplate;            // Optional starting template
  theme: TrailTheme;                   // Visual presentation
  use_phases: boolean;                 // Flat list or grouped phases
  show_dates: boolean;                 // Show target dates publicly
  show_progress: boolean;              // Show progress bar
  custom_intro?: string;               // Optional intro text for public page
  created_at: string;
  updated_at: string;
}

interface TrailTheme {
  style: 'minimal' | 'nature' | 'custom';  // Tier-gated
  season?: Season;                          // For nature style (Oak+)
  custom_assets?: CustomAssets;             // For Evergreen custom themes
}

interface CustomAssets {
  background_image?: string;           // R2 URL
  phase_icons?: Record<string, string>; // Custom icons per phase
  accent_color?: string;               // Custom accent
}
```

---

## Templates

Templates provide pre-configured phase structures and waypoint suggestions for common use cases.

### Built-in Templates

#### 1. Writer's Content Plan
```yaml
name: "Content Roadmap"
phases:
  - name: "In Progress"
    subtitle: "Currently writing"
  - name: "Up Next"
    subtitle: "Coming soon"
  - name: "Ideas"
    subtitle: "On the horizon"
default_waypoint_icon: "FileText"
```

#### 2. Project Roadmap
```yaml
name: "Project Roadmap"
phases:
  - name: "Foundation"
    subtitle: "Building the base"
  - name: "Core Features"
    subtitle: "The main work"
  - name: "Polish"
    subtitle: "Refinement"
  - name: "Future"
    subtitle: "What's next"
default_waypoint_icon: "Target"
```

#### 3. Seasonal Menu (Restaurant)
```yaml
name: "Seasonal Menu"
phases:
  - name: "Winter"
    subtitle: "Warm comfort"
    season: "winter"
  - name: "Spring"
    subtitle: "Fresh beginnings"
    season: "spring"
  - name: "Summer"
    subtitle: "Light & bright"
    season: "summer"
  - name: "Fall"
    subtitle: "Harvest flavors"
    season: "autumn"
default_waypoint_icon: "UtensilsCrossed"
```

#### 4. Album/Release Timeline (Musician)
```yaml
name: "Release Timeline"
phases:
  - name: "Writing"
    subtitle: "In the studio"
  - name: "Recording"
    subtitle: "Laying tracks"
  - name: "Mixing & Mastering"
    subtitle: "Final touches"
  - name: "Release"
    subtitle: "Out in the world"
default_waypoint_icon: "Music"
```

### Future Templates (Post-Launch)
- Podcast Season Planner
- Course Development
- Event Planning
- Portfolio Projects
- Reading List / Book Queue

---

## Tier Access

| Feature | Seedling | Sapling | Oak | Evergreen |
|---------|----------|---------|-----|-----------|
| Trails access | No | Yes | Yes | Yes |
| Waypoints per trail | - | 20 | 100 | Unlimited |
| Number of trails | - | 1 | 5 | Unlimited |
| Phases | - | Yes | Yes | Yes |
| Minimal theme | - | Yes | Yes | Yes |
| Nature theme | - | No | Yes | Yes |
| Custom theme | - | No | No | Yes |
| Custom URL slug | - | No | Yes | Yes |
| Multiple slugs (/trail + /roadmap) | - | No | Yes | Yes |

---

## URL Structure

### Default URLs
- `/trail` — Primary trail (default)
- `/roadmap` — Alias (Oak+ can enable both)

### Custom Slugs (Oak+)
Users can configure custom slugs in admin:
- `/plan`
- `/journey`
- `/path`
- Any valid slug

### API Endpoints

```
GET  /api/trails                    # List user's trails
POST /api/trails                    # Create new trail
GET  /api/trails/:id                # Get trail with phases and waypoints
PUT  /api/trails/:id                # Update trail settings
DELETE /api/trails/:id              # Delete trail

GET  /api/trails/:id/phases         # List phases
POST /api/trails/:id/phases         # Create phase
PUT  /api/trails/:id/phases/:pid    # Update phase
DELETE /api/trails/:id/phases/:pid  # Delete phase

GET  /api/trails/:id/waypoints      # List waypoints
POST /api/trails/:id/waypoints      # Create waypoint
PUT  /api/trails/:id/waypoints/:wid # Update waypoint
DELETE /api/trails/:id/waypoints/:wid # Delete waypoint

POST /api/trails/:id/reorder        # Reorder phases/waypoints (drag & drop)
```

---

## Database Schema

```sql
-- Trails table
CREATE TABLE trails (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT 'trail',
  visibility TEXT NOT NULL DEFAULT 'public',
  template TEXT,
  theme_style TEXT NOT NULL DEFAULT 'minimal',
  theme_season TEXT,
  theme_custom_assets TEXT, -- JSON
  use_phases INTEGER NOT NULL DEFAULT 0,
  show_dates INTEGER NOT NULL DEFAULT 1,
  show_progress INTEGER NOT NULL DEFAULT 1,
  custom_intro TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Phases table
CREATE TABLE trail_phases (
  id TEXT PRIMARY KEY,
  trail_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  season TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trail_id) REFERENCES trails(id) ON DELETE CASCADE
);

-- Waypoints table
CREATE TABLE trail_waypoints (
  id TEXT PRIMARY KEY,
  trail_id TEXT NOT NULL,
  phase_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  target_date TEXT,
  links TEXT, -- JSON array
  icon TEXT DEFAULT 'Circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trail_id) REFERENCES trails(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES trail_phases(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_trails_tenant ON trails(tenant_id);
CREATE INDEX idx_phases_trail ON trail_phases(trail_id);
CREATE INDEX idx_waypoints_trail ON trail_waypoints(trail_id);
CREATE INDEX idx_waypoints_phase ON trail_waypoints(phase_id);
```

---

## UI Components

### Admin Panel

#### Trail Manager (`/admin/trails`)
- List of user's trails with status
- Create new trail (from template or blank)
- Edit trail settings
- Drag-and-drop reordering

#### Trail Editor (`/admin/trails/[id]`)
- Phase management (add, edit, reorder, delete)
- Waypoint management within phases
- Status quick-toggle (click to cycle status)
- Icon picker (Lucide icon selector)
- Link management
- Preview button

#### Waypoint Quick Editor
- Inline editing in the list view
- Click title to edit
- Status dropdown
- Date picker for target_date
- Expand for full edit (description, links, icon)

### Public Page

#### Minimal Theme
- Clean timeline with status indicators
- Glass card styling
- Progress bar (optional)
- Responsive layout

#### Nature Theme (Oak+)
- Seasonal background gradients
- Weather particles (snow, petals, leaves)
- Tree decorations
- Phase-specific seasonal styling
- Lanterns, vines, and Grove nature elements

#### Custom Theme (Evergreen)
- User-uploaded background images
- Custom accent colors
- Custom phase icons
- Full creative control

---

## Durable Objects Integration

Trails will use the **TenantDO** for caching and coordination:

```typescript
// TenantDO methods for Trails
interface TenantDO {
  // Cache trail data
  getTrail(slug: string): Promise<Trail | null>;
  setTrail(slug: string, trail: Trail): Promise<void>;
  invalidateTrail(slug: string): Promise<void>;

  // Batch updates (writes accumulated, flushed every 5 min)
  queueWaypointUpdate(waypointId: string, status: WaypointStatus): Promise<void>;
  flushWaypointUpdates(): Promise<void>;
}
```

Benefits:
- Fast reads from DO cache
- Batched writes to D1 reduce costs
- Real-time preview updates in admin

---

## Implementation Phases

### Phase 1: Core (MVP)
- [ ] Database migrations
- [ ] API endpoints (CRUD)
- [ ] Admin trail manager
- [ ] Admin trail editor with phases/waypoints
- [ ] Minimal theme public page
- [ ] Basic drag-and-drop reordering

### Phase 2: Templates & Polish
- [ ] Template system
- [ ] Writer and Project templates
- [ ] Icon picker component
- [ ] Link management UI
- [ ] Progress bar calculation

### Phase 3: Nature Theme (Oak+)
- [ ] Seasonal gradients
- [ ] Weather particles integration
- [ ] Phase-specific seasons
- [ ] Tree decorations

### Phase 4: Custom Theme (Evergreen)
- [ ] Asset upload to R2
- [ ] Custom background support
- [ ] Custom accent colors
- [ ] Theme preview

### Phase 5: Advanced Features
- [ ] Multiple slugs per trail
- [ ] Additional templates (Restaurant, Musician)
- [ ] Public sharing (generate share links)
- [ ] Embed widget for external sites

---

## Open Questions

1. **Progress Calculation**: How should overall progress be calculated?
   - Option A: Simple percentage of completed waypoints
   - Option B: Weighted by phase (each phase = equal portion)
   - Option C: User-defined weights per waypoint
   - **Recommendation**: Option A for simplicity, with Option B available for phased trails

2. **Deferred Status**: Should deferred waypoints count against limits?
   - **Recommendation**: Yes, to prevent gaming the system

3. **History/Changelog**: Should we track waypoint status changes over time?
   - **Recommendation**: Not for MVP, consider for future

4. **RSS/Feed**: Should trails have their own RSS feed for updates?
   - **Recommendation**: Nice-to-have, not MVP

---

## Related Specs

- `grove-durable-objects-architecture.md` — DO integration patterns
- `foliage-project-spec.md` — Foliage theming
- `grove-naming.md` — Naming system documentation

---

*Last updated: December 2025*
*Author: Claude (with Autumn)*
