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
| [@autumnsgrove/groveengine](packages/engine) | 0.1.0 | Multi-tenant blog engine for Cloudflare Workers |
| [example-site](packages/example-site) | - | Demo site showcasing all GroveEngine features |

### Related Projects

| Project | Repository | Description |
|---------|------------|-------------|
| GroveUI | [AutumnsGrove/GroveUI](https://github.com/AutumnsGrove/GroveUI) | Grove Design System - UI components, design tokens, Tailwind preset |

## 📁 Project Structure

```
GroveEngine/
├── packages/
│   ├── engine/               # @autumnsgrove/groveengine - Blog engine
│   │   ├── src/
│   │   │   ├── lib/          # Core library code
│   │   │   │   ├── components/   # Svelte components
│   │   │   │   ├── server/       # Server utilities (auth, db, payments, storage)
│   │   │   │   └── utils/        # Shared utilities
│   │   │   └── routes/       # SvelteKit routes (blog, admin, API)
│   │   └── migrations/       # D1 database migrations (7 migrations)
│   └── example-site/         # Demo site showcasing engine features
├── landing/                  # Marketing site for grove.place
├── docs/                     # Project documentation
│   ├── README.md             # Master project summary
│   ├── specs/                # Technical specifications (7 specs)
│   └── research/             # Architecture research
├── AgentUsage/               # 24+ agent workflow guides
└── assets/                   # Brand assets & visuals
```

> **Note:** The UI/Design System has been split into its own repository: [GroveUI](https://github.com/AutumnsGrove/GroveUI)

## ✨ Key Features

- **Gutter Annotations** - Unique sidebar annotation system for contextual notes on blog posts
- **Markdown Editor** - Full-featured editor with live preview, multiple themes, drag-drop images, and Mermaid diagram support
- **Magic Code Auth** - Passwordless authentication via email verification codes
- **Multi-Tenant Architecture** - Subdomain-based isolation with per-tenant databases
- **Cloudflare Native** - D1 database, R2 storage, KV caching, Workers deployment
- **Grove Design System** - Calm, organic UI components with WCAG 2.1 AA accessibility ([separate repo](https://github.com/AutumnsGrove/GroveUI))
- **CDN Admin Uploader** - R2-powered media upload with AI image analysis
- **Stripe Payments** - Payment system with provider abstraction for subscriptions and shop features

## 🚀 Quick Start

### Installation

```bash
# Install the engine package
pnpm add @autumnsgrove/groveengine

# For UI components, see the GroveUI repo:
# https://github.com/AutumnsGrove/GroveUI
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
- ✅ Blog engine migrated from AutumnsGrove
- ✅ NPM packages published (@autumnsgrove/groveengine)
- ✅ Multi-tenant database schema designed (7 migrations)
- ✅ Grove Design System created and split to [GroveUI](https://github.com/AutumnsGrove/GroveUI)
- ✅ Landing page deployed with "How It Works" section
- ✅ Stripe payments system with provider abstraction
- ✅ CDN admin upload system with R2 storage
- ✅ Example site showcasing all features
- ✅ GitHub Packages publishing configured

**In Progress:**
- 🔄 Post limits enforcement
- 🔄 First client onboarding (Mom's publishing house)
- 🔄 Basic analytics implementation

**Key Links:**
- [Master Project Summary](docs/README.md)
- [Engine Specification](docs/specs/engine-spec.md)
- [Development Roadmap](docs/roadmap.md)

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

**Phase 1:** GroveEngine MVP (Weeks 1-4) - *In Progress*  
**Phase 2:** Multi-tenant Infrastructure (Weeks 5-9)  
**Phase 3:** Grove Website (Weeks 10-15)  
**Phase 4:** Grove Social (Weeks 16-25)  
**Phase 5:** Polish & Scale (Weeks 26-36)

**Goals:**
- 10 clients by Month 3
- 20 clients by Month 6  
- $500 MRR by Month 12

## 🛠️ Tech Stack

- **Frontend:** SvelteKit 2.5+, Svelte 5, TypeScript, Tailwind CSS 3.4+
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage
- **Payments:** Stripe
- **Auth:** Magic Code (passwordless email authentication)
- **Email:** Resend
- **Markdown:** Marked.js, Mermaid diagrams, gray-matter
- **Testing:** Vitest, Testing Library
- **Build:** Vite 5.4+, pnpm workspaces

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

# Start landing page
cd landing
pnpm dev

# Start example site
cd packages/example-site
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
```

### Building

```bash
# Build engine package for npm
cd packages/engine
pnpm build:package
```

## 📄 License

MIT

---

**Project Status:** Phase 1 - MVP Development
**Domain:** grove.place ✅
**Last Updated:** December 2025
