<h1><img src="docs/internal/email-assets/logos/social/logo-summer-1024-social.png" alt="Lattice logo" width="32" height="32" valign="middle">&nbsp;Lattice</h1>

_A forest of voices. Writing and community tools for a quieter corner of the internet._

---

## The Grove

The internet used to be a garden. Not a manicured one. A wild one, full of weird little corners and handmade pages. You could stumble onto someone's space and feel like you'd discovered something real.

Then the walls went up. Friends scattered to different platforms. Words became datasets. The gardens disappeared into algorithmic voids where the only way out was through a gate someone else controlled.

Grove is a place to write, to share, to belong. You get your own blog at `you.grove.place`. Your words live in markdown. No algorithms decide who sees them. No AI scrapes them. You can export everything, anytime. We don't hold your data hostage.

This is a forest, not a factory. We grow at the pace of roots.

_Welcome to the Grove._

---

## The Ecosystem

Everything in Grove has a name. These are the pieces that make up the forest.

### Apps

| Name                        | Path                                             | What it is                                  |
| --------------------------- | ------------------------------------------------ | ------------------------------------------- |
| [Landing](apps/landing)     | [grove.place](https://grove.place)               | The home page, the heart of Grove           |
| [Plant](apps/plant)         | plant.grove.place                                | Where new Wanderers plant their grove       |
| [Meadow](apps/meadow)       | meadow.grove.place                               | Community feed, chronological, no algorithm |
| [Forage](apps/domains)      | forage.grove.place                               | AI-powered domain discovery                 |
| [Clearing](apps/clearing)   | [status.grove.place](https://status.grove.place) | Status page for the whole forest            |
| [Terrarium](apps/terrarium) | terrarium.grove.place                            | Admin and testing sandbox                   |
| [Login](apps/login)         | login.grove.place                                | Unified auth hub                            |
| [Amber](apps/amber)         | amber.grove.place                                | Media storage frontend                      |
| [Ivy](apps/ivy)             | ivy.grove.place                                  | Zero-knowledge email client                 |

### Services

| Name                                    | Path                                     | What it is                                       |
| --------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| [Heartwood](services/heartwood)         | Auth provider                            | OAuth 2.0 + PKCE, magic links, passkeys          |
| [Grove Router](services/grove-router)   | Subdomain routing                        | Routes `*.grove.place` to the right app          |
| [Loom](services/durable-objects)        | Coordination layer                       | Durable Objects for caching and real-time state  |
| [Amber](services/amber)                 | Storage API                              | Media upload, processing, and CDN delivery       |
| [Forage](services/forage)               | Domain service                           | Domain availability search and registration      |
| [Pulse](services/pulse)                 | Analytics                                | Privacy-respecting visitor analytics             |
| [Zephyr](services/zephyr)              | Email gateway                            | Transactional email delivery                     |
| [Zephyr Render](services/email-render)  | Service binding                          | React Email template rendering                   |
| [OG Worker](services/og-worker)         | [og.grove.place](https://og.grove.place) | Dynamic social preview images                    |

### Workers

| Name                                         | Path            | What it is                               |
| -------------------------------------------- | --------------- | ---------------------------------------- |
| [Post Migrator](workers/post-migrator)       | Background cron | Hot/warm/cold storage tiering            |
| [Timeline Sync](workers/timeline-sync)       | Background cron | Meadow timeline synchronization          |
| [Webhook Cleanup](workers/webhook-cleanup)   | Background cron | Expired webhook purge                    |
| [Meadow Poller](workers/meadow-poller)       | Background cron | Community feed polling                   |
| [Email Catchup](workers/email-catchup)       | Background cron | Email delivery retry                     |
| [Vista Collector](workers/vista-collector)   | Background cron | Analytics aggregation                    |
| [Warden](workers/warden)                     | Background cron | Health monitoring and alerting           |

### Libraries

| Name                        | Path                                  | What it is                                                  |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| [Lattice](libs/engine)      | `@autumnsgrove/lattice`               | The core framework. The thing that holds everything else up |
| [Foliage](libs/foliage)     | `@autumnsgrove/lattice/foliage`       | Theme system — personal expression with guardrails          |
| [Gossamer](libs/gossamer)   | `@autumnsgrove/gossamer`              | Shared utilities across the monorepo                        |
| [Shutter](libs/shutter)     | `@autumnsgrove/shutter`               | Image processing and optimization                           |
| [Vineyard](libs/vineyard)   | `@autumnsgrove/vineyard`              | Component showcase for every Grove property                 |

---

## Live

[grove.place](https://grove.place) · [status.grove.place](https://status.grove.place) · [forage.grove.place](https://forage.grove.place) · [og.grove.place](https://og.grove.place) · [scout.grove.place](https://scout.grove.place)

### Related Projects

| Project          | Repository                                                            |
| ---------------- | --------------------------------------------------------------------- |
| GroveScout       | [AutumnsGrove/GroveScout](https://github.com/AutumnsGrove/GroveScout) |
| Forage (backend) | [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage)         |
| Shutter          | [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter)       |

---

## Development

```bash
git clone https://github.com/AutumnsGrove/Lattice.git
cd Lattice
pnpm install
pnpm --filter @autumnsgrove/lattice dev
```

See [SETUP.md](SETUP.md) for the full development guide. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Values

- Queer-friendly infrastructure. Safe digital spaces, especially when physical ones feel hostile.
- No algorithms, no engagement metrics. Your feed is chronological. Your worth isn't measured by likes.
- Your words stay yours. Not a dataset. Not a statistic. Exportable in standard markdown, always.
- AI sanctuary. Every crawler blocked at the gate. What you write here is read by humans.
- Solarpunk-aligned, no VC. Built slowly, with care, without investor pressure to enshittify.
- Built to last. Grow with Grove long enough, and your site earns Centennial status. A hundred years online.

---

## License

[![license](https://img.shields.io/npm/l/@autumnsgrove/lattice.svg?style=flat-square&color=8b5a2b)](LICENSE)

[AGPL-3.0](LICENSE)
