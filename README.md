---
project: Grove Platform
description: Multi-tenant blog platform with social feed
created: 2025-11-21
status: Phase 1 - MVP Development
domain: grove.place ✅
---

# Grove Platform

A modern, multi-tenant blogging platform where users get their own blogs on subdomains (username.grove.place). Built entirely on Cloudflare infrastructure with SvelteKit, featuring unique gutter annotations, a powerful markdown editor, and an optional community feed.

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@autumnsgrove/groveengine](packages/engine) | 0.5.0 | Multi-tenant blog engine for Cloudflare Workers |
| [example-site](packages/example-site) | 0.1.0 | Demo site showcasing all GroveEngine features |
| [domains](domains) | 0.1.0 | AI-powered domain search tool for client consultations |

### 🌐 Live Sites

| Site | URL | Description |
|------|-----|-------------|
| Grove Landing | [grove.place](https://grove.place) | Landing page with email signup |
| Example Blog | [example.grove.place](https://example.grove.place) | Demo site (The Midnight Bloom Tea Café) |
| Domain Search | [domains.grove.place](https://domains.grove.place) | AI-powered domain search tool |
| CDN | [cdn.grove.place](https://cdn.grove.place) | Content delivery network |
| Auth | [auth.grove.place](https://auth.grove.place) | GroveAuth authentication service |
| Admin | [admin.grove.place](https://admin.grove.place) | GroveAuth admin dashboard |
| Login | [login.grove.place](https://login.grove.place) | GroveAuth login portal |
| Scout | [scout.grove.place](https://scout.grove.place) | GroveScout |
| Music | [music.grove.place](https://music.grove.place) | GroveMusic |
| Search | [search.grove.place](https://search.grove.place) | GroveSearch |

### Related Projects

| Project | Repository | Description |
|---------|------------|-------------|
| GroveAuth | [AutumnsGrove/GroveAuth](https://github.com/AutumnsGrove/GroveAuth) | Authentication service with Google OAuth 2.0 + PKCE |
| GroveScout | [AutumnsGrove/GroveScout](https://github.com/AutumnsGrove/GroveScout) | Scout tool |
| GroveMusic | [AutumnsGrove/GroveMusic](https://github.com/AutumnsGrove/GroveMusic) | Music platform |
| GroveSearch | [AutumnsGrove/GroveSearch](https://github.com/AutumnsGrove/GroveSearch) | Search service |
| GroveDomainTool | [AutumnsGrove/GroveDomainTool](https://github.com/AutumnsGrove/GroveDomainTool) | AI-powered domain search |

## 📁 Project Structure

```
GroveEngine/
├── packages/
│   ├── engine/               # @autumnsgrove/groveengine - Blog engine
│   │   ├── src/
│   │   │   ├── lib/          # Core library code
│   │   │   │   ├── auth/         # JWT and session management
│   │   │   │   ├── components/   # Svelte components (admin, custom)
│   │   │   │   ├── payments/     # Stripe payment system
│   │   │   │   ├── ui/           # 50+ UI components with design system
│   │   │   │   └── utils/        # 12 utility modules
│   │   │   └── routes/       # SvelteKit routes (blog, admin, API, auth)
│   │   └── migrations/       # D1 database migrations (7 migrations)
│   └── example-site/         # Demo site: The Midnight Bloom Tea Café
├── domains/                  # AI-powered domain search tool (domains.grove.place)
├── landing/                  # Marketing site for grove.place
├── docs/                     # Project documentation
│   ├── README.md             # Master project summary
│   ├── specs/                # Technical specifications (7 specs)
│   ├── guides/               # Setup and onboarding guides
│   └── prompts/              # Research and implementation prompts
├── AgentUsage/               # 24+ agent workflow guides
└── assets/                   # Brand assets & visuals
```

## ✨ Key Features

- **Gutter Annotations** - Unique sidebar annotation system for contextual notes on blog posts
- **Markdown Editor** - Full-featured editor with live preview, 7 themes, drag-drop images, slash commands, snippets, and ambient sounds
- **GroveAuth Integration** - Google Sign-In with OAuth 2.0 + PKCE, plus magic code fallback via [GroveAuth](https://github.com/AutumnsGrove/GroveAuth)
- **Multi-Tenant Architecture** - Subdomain-based isolation with per-tenant databases
- **Cloudflare Native** - D1 database, R2 storage, KV caching, Workers deployment
- **50+ UI Components** - Complete design system with primitives, charts, galleries, and form components
- **CDN Admin Uploader** - R2-powered media upload with magic byte validation
- **Stripe Payments** - Payment system with provider abstraction for subscriptions and shop features
- **E-commerce System** - Full shop infrastructure: products, variants, orders, subscriptions, Connect accounts
- **AI-Powered Domain Search** - Multi-provider AI (Claude, DeepSeek, Kimi, Llama 4) with live Cloudflare pricing
- **Accessibility Fonts** - 7 fonts including OpenDyslexic, Atkinson Hyperlegible, and Lexend

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

**Current Phase:** Phase 1 - MVP Development

**Domain Secured:** grove.place ✅

**Completed:**
- ✅ Domain secured (grove.place)
- ✅ Blog engine migrated from AutumnsGrove (v0.4.5)
- ✅ NPM packages published (@autumnsgrove/groveengine)
- ✅ Multi-tenant database schema designed (7 migrations, 25+ tables)
- ✅ GroveAuth integration with Google Sign-In
- ✅ Landing page deployed with "How It Works" section
- ✅ Stripe payments system with provider abstraction
- ✅ E-commerce data model complete (products, orders, subscriptions)
- ✅ CDN admin upload system with R2 storage and magic byte validation
- ✅ Example site showcasing all features
- ✅ AI-powered domain search tool with multi-provider support
- ✅ Security audit completed (2025-12-05) - critical issues fixed
- ✅ SSE streaming for real-time domain search updates

**In Progress:**
- 🔄 First client onboarding (Mom's publishing house)
- 🔄 Basic analytics implementation

**Recently Completed (v0.5.0):**
- ✅ Post limits enforcement (250 for Starter plan) via GroveAuth
- ✅ Google Sign-In with OAuth 2.0 + PKCE

**Key Links:**
- [Master Project Summary](docs/README.md)
- [Engine Specification](docs/specs/engine-spec.md)
- [Development Roadmap](docs/roadmap.md)

## 🔍 Internal Tools

### Domain Search (domains.grove.place)
An AI-powered domain discovery tool that speeds up client consultations from 2-3 weeks to 1-2 days.

**Features:**
- Multi-provider AI swarm (Claude, DeepSeek, Kimi, Llama 4)
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
| **Starter** | $12/month | 250 posts (archived), 1 theme, 5GB storage |
| **Professional** | $25/month | Unlimited posts, 3 themes, 20GB storage, analytics |
| **Business** | $199 + $49/month | Custom domain, 10 themes, 100GB, priority support |

## 🚀 Development Roadmap

**Phase 1:** GroveEngine MVP - *In Progress*
- Post limits, analytics, first client onboarding

**Phase 2:** Multi-tenant Infrastructure
- Subdomain routing, tenant isolation, plan management

**Phase 3:** Grove Website
- Marketing site, billing dashboard, customer portal

**Phase 4:** Grove Social
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
- **Payments:** Stripe (with provider abstraction for future Paddle/LemonSqueezy)
- **Auth:** [GroveAuth](https://github.com/AutumnsGrove/GroveAuth) (Google OAuth 2.0 + PKCE, magic code fallback)
- **Email:** Resend
- **Markdown:** Marked.js 17+, gray-matter (YAML frontmatter)
- **Charts:** Chart.js 4.5+
- **Icons:** Lucide Svelte
- **UI:** 50+ components with bits-ui primitives
- **AI Providers:** Claude, DeepSeek, Kimi, Llama 4 (for domain search)
- **Testing:** Vitest 4.0+, Testing Library, happy-dom
- **Build:** Vite 5.4+, pnpm 9+ workspaces

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

# Start example site
cd packages/example-site
pnpm dev

# Start domain search tool
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

MIT

---

**Project Status:** Phase 1 - MVP Development
**Domain:** grove.place ✅
**Engine Version:** 0.5.0
**Last Updated:** 2025-12-09
