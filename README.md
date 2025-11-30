---
project: Grove Platform
description: Multi-tenant blog platform with social feed
created: 2025-11-21
status: Phase 0.1 - Pre-Launch Preparation
domain: grove.place ✅
---

# Grove Platform

Multi-tenant blog platform where users get their own blogs on subdomains (username.grove.place). Built on Cloudflare infrastructure with SvelteKit, featuring an optional community feed where blogs can share posts, vote, and react with emojis.

## 📁 Project Structure

```
GroveProject/
├── docs/                      # Documentation
│   ├── README.md             # Master project summary
│   ├── visual-overview.md    # Visual diagrams & charts
│   ├── roadmap.md            # Development roadmap & TODOs
│   ├── specs/                # Technical specifications
│   │   ├── engine-spec.md    # GroveEngine (core blog engine)
│   │   ├── website-spec.md   # Grove Website (marketing & billing)
│   │   └── social-spec.md    # Grove Social (community feed)
│   └── research/             # Research & investigation
│       ├── auth-strategy.md
│       ├── comment-system-strategy.md
│       ├── cloudflare-architecture-guide.md
│       └── domain-search-prompt.md
├── assets/visuals/           # Generated diagrams & charts
│   ├── grove-architecture.png
│   ├── grove-roadmap.png
│   ├── grove-userflow.png
│   ├── grove-techstack.png
│   └── grove-pricing.png
└── archives/                 # Legacy/backup files
```

## 🎯 Quick Start

**Current Phase:** Phase 0.1 - Pre-Launch Preparation

**Domain Secured:** grove.place ✅

**Next Steps:**
1. ~~Check domain availability~~ → **DONE: grove.place secured in Cloudflare!**
2. Create `grove-engine` GitHub repository
3. Extract blog functionality from autumnsgrove.com
4. Build MVP with Mom's publishing house as first client

**Key Links:**
- [Master Project Summary](docs/README.md)
- [Visual Overview](docs/visual-overview.md)
- [Development Roadmap](docs/roadmap.md)
- [Engine Specification](docs/specs/engine-spec.md)

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

- **Frontend:** SvelteKit 2.0+, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage
- **Payments:** Stripe
- **Auth:** Lucia Auth
- **Email:** Resend

## 📈 Success Metrics

- Zero data loss incidents
- Page load time < 2 seconds
- < 10 hours support per client/month
- < 5% monthly churn rate
- Net Promoter Score > 50

---

**Project Status:** Phase 0.1 - Pre-Launch Preparation
**Domain:** grove.place ✅
**Last Updated:** November 24, 2025
