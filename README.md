<h1><img src="landing/static/favicon.svg" alt="Lattice logo" width="32" height="32" valign="middle">&nbsp;Lattice</h1>

> **Internal codename:** GroveEngine

A modern, multi-tenant blogging platform where users get their own blogs on subdomains (username.grove.place). Built entirely on Cloudflare infrastructure with SvelteKit, featuring unique gutter annotations, a powerful markdown editor, and an optional community feed. Lattice is the core framework that supports the entire Grove ecosystem—the thing that holds everything else up.

> *A lattice is the framework that supports growth. Vines climb it. Gardens are built around it. It's not the thing you see—it's the thing that holds everything else up.*

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@autumnsgrove/groveengine](packages/engine) | 0.9.5 | Lattice — Multi-tenant blog engine with 185 UI components |
| [landing](landing) | — | Marketing site at grove.place |
| [domains](domains) | — | Forage — AI-powered domain discovery tool |
| [og-worker](packages/og-worker) | — | Dynamic OG image generation Worker |
| [grove-router](packages/grove-router) | — | Subdomain routing Worker |
| [durable-objects](packages/durable-objects) | — | Cloudflare Durable Objects for caching and real-time features |
| [post-migrator](packages/post-migrator) | — | Hot/warm/cold storage migration (cron-triggered) |

### 🌐 Live Sites

| Site | URL | Description |
|------|-----|-------------|
| Grove Landing | [grove.place](https://grove.place) | Landing page with forest scenes and seasonal themes |
| Vineyard | [grove.place/vineyard](https://grove.place/vineyard) | Lattice asset showcase with all 185 UI components |
| Example Blog | [example.grove.place](https://example.grove.place) | Demo site (The Midnight Bloom Tea Café) |
| Forage | [forage.grove.place](https://forage.grove.place) | AI-powered domain discovery |
| CDN | [cdn.grove.place](https://cdn.grove.place) | Content delivery network |
| OG Images | [og.grove.place](https://og.grove.place) | Dynamic OG image generation |
| Auth | [auth.grove.place](https://auth.grove.place) | Heartwood authentication service |
| Admin | [admin.grove.place](https://admin.grove.place) | Heartwood admin dashboard |
| Login | [login.grove.place](https://login.grove.place) | Heartwood login portal |
| Scout | [scout.grove.place](https://scout.grove.place) | GroveScout |
| Music | [music.grove.place](https://music.grove.place) | Aria (music curation) |
| Search | [search.grove.place](https://search.grove.place) | GroveSearch |
| Status | [status.grove.place](https://status.grove.place) | System status page |

### Related Projects

| Project | Repository | Description |
|---------|------------|-------------|
| Heartwood | [AutumnsGrove/GroveAuth](https://github.com/AutumnsGrove/GroveAuth) | Authentication service with Google OAuth 2.0 + PKCE |
| GroveScout | [AutumnsGrove/GroveScout](https://github.com/AutumnsGrove/GroveScout) | Scout tool |
| Aria | [AutumnsGrove/GroveMusic](https://github.com/AutumnsGrove/GroveMusic) | Music curation platform |
| GroveSearch | [AutumnsGrove/GroveSearch](https://github.com/AutumnsGrove/GroveSearch) | Search service |
| Forage | [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage) | AI-powered domain discovery tool |
| Shutter | [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter) | Web content distillation with prompt injection defense |

## 📁 Project Structure

```
GroveEngine/
├── packages/
│   ├── engine/               # @autumnsgrove/groveengine - Core engine (0.9.5)
│   │   ├── src/lib/
│   │   │   ├── auth/             # JWT and session management
│   │   │   ├── components/       # Svelte components (admin, custom)
│   │   │   ├── payments/         # Lemon Squeezy payment system
│   │   │   ├── ui/               # 185 UI components with design system
│   │   │   │   ├── components/
│   │   │   │   │   ├── ui/           # Glass, buttons, cards, forms (40+)
│   │   │   │   │   ├── nature/       # Trees, creatures, weather (64)
│   │   │   │   │   ├── chrome/       # Header, Footer, navigation
│   │   │   │   │   ├── typography/   # Font components (20+)
│   │   │   │   │   ├── terrarium/    # Interactive terrarium displays
│   │   │   │   │   ├── gallery/      # Image gallery & lightbox
│   │   │   │   │   ├── charts/       # Analytics visualizations
│   │   │   │   │   └── content/      # Cards, roadmaps, plans
│   │   │   │   ├── tokens/       # Design tokens & color palettes
│   │   │   │   └── styles/       # Global CSS & Tailwind preset
│   │   │   └── utils/            # 12 utility modules
│   │   ├── routes/           # SvelteKit routes (blog, admin, API, auth)
│   │   └── migrations/       # D1 database migrations (13 migrations)
│   ├── og-worker/            # Dynamic OG image generation (og.grove.place)
│   ├── grove-router/         # Subdomain routing Worker
│   ├── durable-objects/      # Caching & real-time Durable Objects
│   └── post-migrator/        # Hot/warm/cold storage migration
├── domains/                  # Forage: AI-powered domain discovery
├── landing/                  # Marketing site for grove.place
│   └── src/routes/
│       ├── forest/           # Seasonal nature scene showcase
│       ├── vineyard/         # Asset & component showcase
│       ├── manifesto/        # Project philosophy
│       ├── knowledge/        # Help center (10+ categories)
│       └── legal/            # ToS, Privacy, DMCA, etc.
├── plant/                    # Tenant blog management app
├── meadow/                   # Community feed feature
├── clearing/                 # Admin dashboard & data tools
├── docs/                     # Project documentation
│   ├── specs/                # Technical specifications (50+ specs)
│   ├── patterns/             # Design patterns (8 patterns)
│   └── guides/               # Setup and onboarding guides
└── AgentUsage/               # 24+ agent workflow guides
```

## ✨ Key Features

### Core Platform
- **Gutter Annotations** — Unique sidebar annotation system for contextual notes on blog posts
- **Markdown Editor** — Full-featured editor with live preview modes (Source/Split/Preview), drag-drop images, and zen mode
- **Heartwood Integration** — Google Sign-In with OAuth 2.0 + PKCE via [Heartwood](https://github.com/AutumnsGrove/GroveAuth)
- **Multi-Tenant Architecture** — Subdomain-based isolation with per-tenant databases
- **Cloudflare Native** — D1 database, R2 storage, KV caching, Workers deployment, Durable Objects
- **Lemon Squeezy Payments** — Payment system with provider abstraction for subscriptions
- **Feature Flags** — Tenant-scoped toggles with gradual rollout and admin dashboard

### Design System (185 Components)
- **Glass Design System** — 8 glassmorphism components (Glass, GlassCard, GlassButton, GlassCarousel, GlassNavbar, GlassLogo, GlassOverlay, GlassConfirmDialog)
- **Nature Components** — 64 SVG components for atmospheric forest scenes (trees, creatures, weather, botanical, structural, water, sky)
- **Typography Components** — 20+ font components with FontProvider for scoped font application
- **Seasonal Palettes** — Complete color system for spring, summer, autumn, winter, and midnight (the queer fifth season)
- **Dark Mode** — Full dark mode support across all components

### Tools & Infrastructure
- **Forage** — AI-powered domain discovery with DeepSeek v3.2, SSE streaming, live Cloudflare pricing
- **Shutter** — Web content distillation layer with prompt injection defense and token efficiency (200 tokens vs 20,000)
- **Shade** — AI content protection with Turnstile verification, WAF rules, and Dark Visitors integration
- **OG Worker** — Dynamic Open Graph image generation at og.grove.place
- **CDN Admin Uploader** — R2-powered media upload with magic byte validation
- **Durable Objects** — Real-time coordination, caching, and D1 scaling infrastructure
- **Feature Flags** — Tenant-scoped feature toggles with admin dashboard
- **Accessibility Fonts** — 20 fonts including OpenDyslexic, Atkinson Hyperlegible, Luciole, and Lexend

## 🚀 Quick Start

### Installation

```bash
# Install the engine package
pnpm add @autumnsgrove/groveengine
```

### Using Engine Components

```javascript
// Import blog components
import { ContentWithGutter, MarkdownEditor } from '@autumnsgrove/groveengine';

// Import utilities
import { parseMarkdown } from '@autumnsgrove/groveengine/utils/markdown';
```

## 🎯 Project Status

**Current Phase:** Phase 1 - MVP Development | **Engine Version:** 0.9.5 | **Domain:** grove.place ✅

### Recently Completed (v0.9.5)
- ✅ **Forests** — Community aggregation inspired by GeoCities neighborhoods with 45 themed forests across 10 categories (The Prism, The Terminal, The Kitchen, etc.)
- ✅ **Wander** — First-person immersive grove discovery with floating terrariums, time of day, seasons, weather, and ambient soundscape
- ✅ **Curios** — Cabinet of wonders for old-web personalization (guestbooks, shrines, hit counters, custom cursors, link gardens)
- ✅ **New Tree Logo** — 3-tier tree design with light/dark depth, 5 seasonal palettes (spring, summer, autumn, winter, midnight), and -12° windswept rotation
- ✅ **Midnight Mode** — The queer fifth season with purple/rose palette, activated via footer toggle easter egg
- ✅ **Forest Page** — Seasonal nature scene showcase with randomized trees, birds, and weather effects
- ✅ **Durable Objects** — Real-time caching, tenant coordination, and D1 scaling infrastructure
- ✅ **Feature Flags System** — Tenant-scoped feature toggles with admin dashboard and gradual rollout
- ✅ **Lemon Squeezy Integration** — Payment system migration from Stripe with provider abstraction
- ✅ **Shutter Spec** — Web content distillation design for token efficiency and prompt injection defense

### Foundation (Completed)
- ✅ Blog engine with 185 UI components
- ✅ Multi-tenant database schema (13 migrations, 25+ tables)
- ✅ Heartwood integration with Google OAuth 2.0 + PKCE
- ✅ Lemon Squeezy payments with provider abstraction
- ✅ Forage AI domain search with SSE streaming
- ✅ Security audit completed with critical issues fixed
- ✅ 30+ specification documents, 8 design patterns

### In Progress
- 🔄 Glass design system expansion to remaining pages
- 🔄 Multi-tenant infrastructure testing
- 🔄 Tenant onboarding flow finalization

**Key Links:**
- [Grove Naming System](docs/grove-naming.md) — The philosophy behind Grove's naming
- [Engine Specification](docs/specs/engine-spec.md)
- [Prism Pattern](docs/patterns/prism-pattern.md) — Glassmorphism design system

## 🔍 Internal Tools

### Forage (forage.grove.place)
An AI-powered domain discovery tool that speeds up client consultations from 2-3 weeks to 1-2 days. Before you can plant, you have to search—and Forage does the searching so you can focus on choosing.

**Features:**
- DeepSeek v3.2 via OpenRouter (zero-data-retention compliance)
- Real-time SSE streaming for live progress updates
- Live pricing from Cloudflare Registrar
- Pricing tiers: bundled (≤$30), recommended (≤$50), standard, premium
- Expandable cards with domain evaluation scores
- RDAP metadata (registrar, expiration date)
- Token usage tracking with cost estimation
- Follow-up quiz system for refined searches

**Tech:** SvelteKit + Cloudflare Durable Objects + TypeScript

## 📊 Visual Overview

See [docs/visual-overview.md](docs/visual-overview.md) for:
- Platform architecture diagram
- Development roadmap timeline
- Pricing structure
- Technology stack
- User flow diagrams

## 🌲 Why Grove?

Nobody wants generic blogging platforms. Neurodivergent folks especially hate them—the endless customization rabbit holes, the algorithm-driven feeds, the sense that you're always performing for an audience you can't see.

Grove is different. It's:

- **Queer-friendly infrastructure** — A safe digital space, especially valuable when physical environments feel hostile. Your corner of the internet, without surveillance capitalism.

- **Community-owned, solarpunk-aligned** — Decentralized by design, built to be genuinely helpful rather than exploitative. No investor pressure to enshittify.

- **Portable by philosophy** — Your content lives in markdown files. You can export and migrate anytime. We don't hold your data hostage.

- **Built for people, not engagement metrics** — No dark patterns, no algorithmic manipulation. Just a place to Be.

This isn't just a SaaS—it's about helping people have their own space online, away from big tech algorithms.

## 💰 Pricing

| Plan | Price | Key Features |
|------|-------|--------------|
| **Free** | $0/month | Meadow access, 20 public comments/week, no blog |
| **Seedling** | $8/month | 50 posts, 1GB storage, 3 themes + accent, unlimited comments |
| **Sapling** | $12/month | 250 posts, 5GB storage, 10 themes + accent, email forwarding |
| **Oak** | $25/month | Unlimited posts, 20GB storage, custom domain (BYOD), theme customizer, full email |
| **Evergreen** | $35/month | Unlimited posts, 100GB storage, custom domain included, custom font uploads, 8hrs support |

## 🚀 Development Roadmap

**Phase 1:** Lattice MVP - *In Progress*
- Post limits, analytics, first client onboarding

**Phase 2:** Multi-tenant Infrastructure
- Subdomain routing, tenant isolation, plan management

**Phase 3:** Grove Website
- Marketing site, billing dashboard, customer portal

**Phase 4:** Meadow
- Community feed, post sharing, voting, emoji reactions

**Phase 5:** Polish & Scale
- Additional themes, advanced analytics, comment system

**Goals:**
- 10 clients by Month 3
- 20 clients by Month 6
- $500 MRR by Month 12

## 🛠️ Tech Stack

- **Frontend:** SvelteKit 2.5+, Svelte 5, TypeScript, Tailwind CSS 3.4+
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage, Durable Objects
- **Payments:** Lemon Squeezy (with provider abstraction for future payment providers)
- **Auth:** [Heartwood](https://github.com/AutumnsGrove/GroveAuth) (Google OAuth 2.0 + PKCE)
- **Email:** Resend
- **Markdown:** Marked.js 17+, gray-matter (YAML frontmatter)
- **Charts:** Chart.js 4.5+
- **Icons:** Lucide Svelte
- **UI:** 185 components with bits-ui primitives, glassmorphism design system
- **AI Provider:** DeepSeek v3.2 via OpenRouter (for domain search)
- **Testing:** Vitest 4.0+, Testing Library, happy-dom
- **Build:** Vite 5.4+, pnpm 9+ workspaces
- **Design Patterns:** 8 documented patterns (Prism, Sentinel, Threshold, Loom, Songbird, Firefly, Vineyard)

## 📈 Success Metrics

- Zero data loss incidents
- Page load time < 2 seconds
- < 10 hours support per client/month
- < 5% monthly churn rate
- Net Promoter Score > 50

## 🔧 Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (for deployment)

### Setup

```bash
# Clone the repository
git clone https://github.com/AutumnsGrove/GroveEngine.git
cd GroveEngine

# Install dependencies
pnpm install

# Start development server (engine)
cd packages/engine
pnpm dev

# Start with Cloudflare bindings (D1, R2, KV)
pnpm dev:wrangler

# Start landing page
cd landing
pnpm dev

# Start domain search tool (Forage)
cd domains
pnpm dev
```

### Testing

```bash
# Run tests (engine)
cd packages/engine
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run security tests
pnpm test:security

# Run tests with UI
pnpm test:ui
```

### Building

```bash
# Build engine package for npm
cd packages/engine
pnpm build:package
```

### Database Migrations

```bash
# Apply migrations locally
cd packages/engine
wrangler d1 migrations apply grove-engine-db --local

# Apply migrations to production
wrangler d1 migrations apply grove-engine-db --remote
```

## 📄 License

AGPL-3.0

---

**Project Status:** Phase 1 - MVP Development
**Domain:** grove.place ✅
**Engine Version:** 0.9.5
**Last Updated:** 2026-01-14
