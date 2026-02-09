<h1><img src="docs/internal/email-assets/logos/social/logo-summer-1024-social.png" alt="GroveEngine logo" width="32" height="32" valign="middle">&nbsp;Lattice</h1>

[![npm version](https://img.shields.io/npm/v/@autumnsgrove/groveengine.svg?style=flat-square&color=4a7c59)](https://www.npmjs.com/package/@autumnsgrove/groveengine)
[![license](https://img.shields.io/npm/l/@autumnsgrove/groveengine.svg?style=flat-square&color=8b5a2b)](LICENSE)

> **Internal codename:** GroveEngine

Lattice is the core framework that powers [Grove](https://grove.place) — a multi-tenant blogging platform where people get their own blogs on subdomains (`username.grove.place`). Built entirely on Cloudflare infrastructure with SvelteKit.

> *A lattice is the framework that supports growth. Vines climb it. Gardens are built around it. It's not the thing you see — it's the thing that holds everything else up.*

---

## Why Grove?

Nobody wants generic blogging platforms. Neurodivergent folks especially hate them — the endless customization rabbit holes, the algorithm-driven feeds, the sense that you're always performing for an audience you can't see.

Grove is different:

- **Queer-friendly infrastructure** — A safe digital space, especially valuable when physical environments feel hostile. Your corner of the internet, without surveillance capitalism.

- **Community-owned, solarpunk-aligned** — Decentralized by design, built to be genuinely helpful rather than exploitative. No investor pressure to enshittify.

- **Portable by philosophy** — Your content lives in markdown. You can export and migrate anytime. We don't hold your data hostage.

- **Built for people, not engagement metrics** — No dark patterns, no algorithmic manipulation. Just a place to *be*.

This isn't just a SaaS — it's about helping people have their own space online, away from big tech algorithms.

---

## Key Features

**Core Platform** — Gutter annotations, full-featured markdown editor with live preview and zen mode, multi-tenant subdomain architecture, Stripe payments, feature flags with gradual rollout.

**Design System** — Glassmorphism component library, seasonal color palettes (spring, summer, autumn, winter, and midnight — the queer fifth season), nature-themed SVG components for atmospheric forest scenes, accessibility-first font collection including OpenDyslexic, Atkinson Hyperlegible, and Luciole.

**Cloudflare Native** — D1 database, R2 storage, KV caching, Workers deployment, Durable Objects for real-time coordination.

**Heartwood Auth** — Google Sign-In with OAuth 2.0 + PKCE, built into the monorepo at [`packages/heartwood`](packages/heartwood).

---

## Packages

| Package | Description |
|---------|-------------|
| [@autumnsgrove/groveengine](packages/engine) | Lattice — the core multi-tenant blog engine |
| [landing](packages/landing) | Marketing site at [grove.place](https://grove.place) |
| [heartwood](packages/heartwood) | Authentication service (Google OAuth 2.0 + PKCE) |
| [plant](packages/plant) | Tenant blog management app |
| [meadow](packages/meadow) | Community feed |
| [domains](packages/domains) | Forage frontend — AI-powered domain discovery |
| [clearing](packages/clearing) | Status page at [status.grove.place](https://status.grove.place) |
| [terrarium](packages/terrarium) | Admin & testing interface |
| [grove-router](packages/grove-router) | Subdomain routing Worker |
| [og-worker](packages/og-worker) | Dynamic OG image generation at [og.grove.place](https://og.grove.place) |
| [durable-objects](packages/durable-objects) | Cloudflare Durable Objects for caching and coordination |
| [post-migrator](packages/post-migrator) | Hot/warm/cold storage migration (cron-triggered) |
| [@autumnsgrove/vineyard](packages/vineyard) | Component showcase library for `/vineyard` routes |
| [workers](packages/workers) | Scheduled workers (health monitoring, timeline sync, webhook cleanup) |


### Live Sites

| Site | URL |
|------|-----|
| Grove Landing | [grove.place](https://grove.place) |
| Vineyard | [grove.place/vineyard](https://grove.place/vineyard) |
| Example Blog | [example.grove.place](https://example.grove.place) |
| Forage | [forage.grove.place](https://forage.grove.place) |
| Auth | [auth.grove.place](https://auth.grove.place) |
| OG Images | [og.grove.place](https://og.grove.place) |
| CDN | [cdn.grove.place](https://cdn.grove.place) |
| Status | [status.grove.place](https://status.grove.place) |
| Scout | [scout.grove.place](https://scout.grove.place) |

### Related Projects

| Project | Repository |
|---------|------------|
| GroveScout | [AutumnsGrove/GroveScout](https://github.com/AutumnsGrove/GroveScout) |
| Forage (backend) | [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage) |
| Shutter | [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter) |

---

## Pricing

| Plan | Price | Posts | Storage |
|------|-------|-------|---------|
| Free | $0/mo | 5 | 50 MB |
| Seedling | $8/mo | 50 | 1 GB |
| Sapling | $12/mo | 250 | 5 GB |
| Oak | $25/mo | Unlimited | 20 GB |
| Evergreen | $35/mo | Unlimited | 100 GB |

Full details at [grove.place/pricing](https://grove.place/pricing).

---

## Where We Are

The platform is deep in active development. The engine is approaching v1.0 with a comprehensive multi-tenant architecture, a full design system, and production infrastructure on Cloudflare.

**What's solid:**
- Multi-tenant blog engine with subdomain routing and per-tenant isolation
- Full design system with glassmorphism, seasonal themes, and nature components
- Heartwood authentication with Google OAuth
- Stripe payment integration with subscription management
- Feature flag system with tenant-scoped gradual rollout
- Durable Objects infrastructure for caching and coordination
- Markdown editor with gutter annotations, live preview, and zen mode
- Comprehensive test suites (security, unit, integration)
- Forage AI domain search with real-time streaming

**What's in progress:**
- Glass design system expansion across all pages
- Tenant onboarding flow
- Multi-tenant infrastructure hardening

### On the Horizon

- **Forests** — Community aggregation inspired by GeoCities neighborhoods, with themed forests across categories
- **Wander** — First-person immersive grove discovery with floating terrariums, seasons, weather, and ambient soundscape
- **Curios** — Cabinet of wonders for old-web personalization (guestbooks, shrines, hit counters, custom cursors, link gardens)
- **Meadow launch** — Community feed where blogs can share posts, vote, and react with emoji

---

## Development

### Quick Start

```bash
git clone https://github.com/AutumnsGrove/GroveEngine.git
cd GroveEngine
pnpm install

# Start the engine
cd packages/engine && pnpm dev

# Start the landing page
cd packages/landing && pnpm dev
```

### Testing

```bash
cd packages/engine
pnpm test              # Run tests
pnpm test:coverage     # With coverage
pnpm test:security     # Security suite
pnpm test:ui           # Vitest UI
```

### Building

```bash
cd packages/engine
pnpm build:package     # Build for npm
```

See [SETUP.md](SETUP.md) for the full development guide, including Cloudflare bindings, database migrations, and the pnpm + bun hybrid workflow.

---

## Tech Stack

- **Framework:** SvelteKit, Svelte 5, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2, Durable Objects
- **Payments:** Stripe
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE)
- **Email:** Resend
- **Markdown:** markdown-it
- **Icons:** Lucide Svelte
- **AI:** DeepSeek via OpenRouter (Forage domain search)
- **Testing:** Vitest, Testing Library, happy-dom
- **Build:** Vite, pnpm workspaces


---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, commit conventions, and workflow details.

## License

[AGPL-3.0](LICENSE)
