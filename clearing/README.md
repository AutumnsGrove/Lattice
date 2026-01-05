# Clearing — Grove Status Page

> *A clearing in the forest where you can see what's happening.*

Clearing is Grove's public status page, providing transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, users can check `status.grove.place` to understand what's happening.

## Features

- **Overall Status Banner** — Large, clear indicator of platform health
- **Component Status Grid** — Individual status for each platform service
- **90-Day Uptime History** — Visual bar charts showing historical uptime per component
- **Incident Timeline** — Detailed updates for each incident
- **Scheduled Maintenance** — Upcoming maintenance windows
- **RSS Feed** — Subscribe at `/feed` for automatic updates
- **Dark Mode** — Follows system preference with manual toggle

## Tech Stack

- **Framework**: SvelteKit 2.0+
- **Styling**: Tailwind CSS with glassmorphism components
- **Database**: Cloudflare D1 (shared with Grove)
- **Hosting**: Cloudflare Pages
- **Icons**: Lucide

## Project Structure

```
clearing/
├── migrations/              # D1 database migrations
│   └── 0001_status_tables.sql
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   │   ├── GlassStatusBanner.svelte
│   │   │   ├── GlassStatusCard.svelte
│   │   │   ├── GlassUptimeBar.svelte
│   │   │   ├── IncidentCard.svelte
│   │   │   ├── ScheduledMaintenanceCard.svelte
│   │   │   ├── Header.svelte
│   │   │   └── Footer.svelte
│   │   ├── server/          # Server-side utilities
│   │   │   └── status.ts    # D1 query functions
│   │   ├── stores/          # Svelte stores
│   │   │   └── theme.ts     # Dark mode state
│   │   ├── types/           # TypeScript definitions
│   │   │   └── status.ts    # Status types & helpers
│   │   └── utils/           # Utilities
│   │       └── cn.ts        # Class name helper
│   ├── routes/
│   │   ├── +layout.svelte   # App layout
│   │   ├── +page.svelte     # Main status page
│   │   ├── +page.server.ts  # Status data loading
│   │   ├── feed/            # RSS feed endpoint
│   │   │   └── +server.ts
│   │   └── incidents/[slug]/ # Incident detail pages
│   │       ├── +page.svelte
│   │       └── +page.server.ts
│   ├── app.css              # Global styles
│   ├── app.html             # HTML template
│   └── app.d.ts             # Type declarations
├── DEPLOY.md                # Deployment instructions
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── wrangler.toml
└── README.md
```

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Local Development

```bash
cd clearing
pnpm install
pnpm dev
```

The local server runs at `http://localhost:5173` with mock data.

### Build

```bash
pnpm run build
```

### Type Checking

```bash
pnpm run check
```

## Components

### Glass Components

Clearing uses glassmorphism styling consistent with Grove's design language:

- **GlassStatusBanner** — Large overall status indicator with gradient background
- **GlassStatusCard** — Individual component status with icon and label
- **GlassUptimeBar** — 90-day horizontal bar chart with hover tooltips

### Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Operational | Green | Everything working normally |
| Degraded | Yellow | Slower than usual, but functional |
| Partial Outage | Orange | Some functionality unavailable |
| Major Outage | Red | Service is down |
| Maintenance | Blue | Planned maintenance in progress |

## Database Schema

### Tables

- `status_components` — Platform services (Blog Engine, CDN, Auth, etc.)
- `status_incidents` — Incident records with status lifecycle
- `status_updates` — Timeline updates for incidents
- `status_incident_components` — Affected components per incident
- `status_scheduled` — Scheduled maintenance announcements
- `status_daily_history` — Daily status snapshots for uptime visualization

### Incident Lifecycle

```
Investigating → Identified → Monitoring → Resolved
```

## API

### Public Endpoints

- `GET /` — Main status page
- `GET /feed` — RSS 2.0 feed of incidents
- `GET /incidents/[slug]` — Incident detail page

### RSS Feed

Subscribe to `/feed` for automatic updates about:
- New incidents
- Status changes
- Incident resolutions

## Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

Quick deploy:

```bash
pnpm run deploy
```

## Related Documentation

- [Clearing Spec](../docs/specs/clearing-spec.md) — Full technical specification
- [Grove UI Design Skill](../.claude/skills/grove-ui-design) — Design system guidelines

## Future Enhancements (Phase 2+)

- Admin interface in GroveAuth for managing incidents
- Messages panel in user dashboards
- Email notifications (optional)
- Automated status checks

---

*Part of the Grove ecosystem — helping friends have their own space online.*
