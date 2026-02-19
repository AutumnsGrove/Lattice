# Amber

Grove's unified storage management system.

## Overview

Amber is the storage layer that already exists in Grove—made visible and manageable. Every file you upload—blog images, email attachments, profile pictures—is preserved in Amber, organized and accessible from one place.

|                       |                   |
| --------------------- | ----------------- |
| **Public name**       | Amber             |
| **Internal codename** | GroveStorage      |
| **Domain**            | amber.grove.place |

## Philosophy

Amber isn't trying to be Dropbox or Google Drive. It's the storage layer that already exists in Grove—made visible and manageable. Every paid user already has storage; Amber is how they understand and control it.

- See what's using your space
- Download and export your data
- Clean up what you don't need
- Buy more when you need it

## Tech Stack

- **Frontend:** SvelteKit
- **Backend:** Cloudflare Workers
- **Storage:** Cloudflare R2
- **Database:** Cloudflare D1
- **Auth:** Heartwood (Grove SSO)
- **Payments:** Stripe

## Features

### Phase 1: Foundation (MVP)

- Storage dashboard with visual breakdown
- Usage meter with quota warnings (80%, 95%, 100%)
- File browser (category & source views)
- Single file download
- Delete to trash / empty trash
- Search files by name

### Phase 2: Export & Add-ons

- Full data export (GDPR compliance)
- Export by category
- Storage add-on purchases (+10GB, +50GB, +100GB)

### Phase 3: Polish

- Grid view with thumbnails
- Bulk operations
- Usage charts over time
- Mobile optimization

## Project Structure

```
Amber/
├── src/
│   ├── lib/                    # Shared utilities
│   │   ├── components/         # Svelte components
│   │   ├── server/             # Server-side utilities
│   │   └── types/              # TypeScript types
│   └── routes/                 # SvelteKit routes
│       ├── api/                # API endpoints
│       └── (app)/              # App pages
├── worker/                     # Cloudflare Worker
│   ├── src/
│   │   ├── handlers/           # API handlers
│   │   ├── services/           # Business logic
│   │   └── cron/               # Scheduled tasks
│   └── wrangler.toml
├── migrations/                 # D1 database migrations
├── tests/                      # Test files
└── docs/                       # Additional documentation
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Deploy worker
pnpm deploy:worker
```

## Storage Tiers

| Tier      | Base Storage | Price  |
| --------- | :----------: | :----: |
| Seedling  |     1 GB     | $8/mo  |
| Sapling   |     5 GB     | $12/mo |
| Oak       |    20 GB     | $25/mo |
| Evergreen |    100 GB    | $35/mo |

### Add-ons

| Add-on  | Storage | Price |
| ------- | :-----: | :---: |
| +10 GB  |  10 GB  | $1/mo |
| +50 GB  |  50 GB  | $4/mo |
| +100 GB | 100 GB  | $7/mo |

## Documentation

- [Project Spec](./amber-spec.md) - Full specification
- [AGENT.md](./AGENT.md) - Agent instructions
- [AgentUsage/](./AgentUsage/) - Development guides

## Related Grove Products

Amber provides storage management for:

- **Blog** - Images, markdown content, custom fonts
- **Ivy** - Email bodies, attachments
- **Profile** - Avatar, banner images
- **Themes** - Custom CSS, uploaded assets

---

_Part of the Grove ecosystem_
