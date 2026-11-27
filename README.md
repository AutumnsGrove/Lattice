<h1><img src="assets/logo-social.png" alt="Lattice logo" width="32" height="32" valign="middle">&nbsp;Lattice</h1>

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

Every row here is a directory that exists in `git ls-tree HEAD` — this is a map of what is deployed, not of what is planned. If a piece isn't in this file, it either isn't tracked yet or it's retired.

### Apps

The things a person can visit.

| Name     | Path                           | Package          | What it is                                                                                             |
| -------- | ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------ |
| Aspen    | [apps/aspen](apps/aspen)       | `grove-aspen`    | The tenant site. Serves every `*.grove.place` blog and the `/arbor` panel inside it — the core product |
| Landing  | [apps/landing](apps/landing)   | `grove-landing`  | grove.place: front door, manifesto, pricing, knowledge base, credits                                   |
| Plant    | [apps/plant](apps/plant)       | `grove-plant`    | Signup and onboarding: profile, plan, checkout                                                         |
| Login    | [apps/login](apps/login)       | `grove-login`    | The unified auth hub — Google and email codes, one place                                               |
| Billing  | [apps/billing](apps/billing)   | `grove-billing`  | Plan, payment portal, cancel and resume                                                                |
| Amber    | [apps/amber](apps/amber)       | `grove-amber`    | Media storage frontend for the Amber API                                                               |
| Clearing | [apps/clearing](apps/clearing) | `grove-clearing` | The status page                                                                                        |
| Domains  | [apps/domains](apps/domains)   | `grove-domains`  | Domain search, presented to Wanderers as **Forage**                                                    |

### Services

Long-running Workers and the backend each app leans on.

| Name            | Path                                                 | Package                 | What it is                                                                                             |
| --------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Heartwood       | [services/heartwood](services/heartwood)             | `grove-heartwood`       | Auth: Google OAuth, email codes, sessions, admin gates, bans                                           |
| Passage         | [services/grove-router](services/grove-router)       | `grove-router`          | Routes `*.grove.place` to the right app — every tenant request enters here                             |
| Durable Objects | [services/durable-objects](services/durable-objects) | `grove-durable-objects` | Deploys the DO classes built on Loom: tenants, post meta, post content, exports, rate limits, sentinel |
| Amber           | [services/amber](services/amber)                     | `grove-amber-worker`    | Media API: upload, processing, CDN writes, storage quotas                                              |
| Forage          | [services/forage](services/forage)                   | `grove-forage`          | Domain availability search and registration                                                            |
| Zephyr          | [services/zephyr](services/zephyr)                   | `grove-zephyr`          | Email gateway — the only path mail takes out of Grove                                                  |
| Email Render    | [services/email-render](services/email-render)       | `grove-email-render`    | React Email templates, rendered over a service binding                                                 |
| OG Worker       | [services/og-worker](services/og-worker)             | `grove-og`              | Dynamic social preview images                                                                          |
| Billing API     | [services/billing-api](services/billing-api)         | `grove-billing-api`     | Stripe: checkout, webhooks, subscription lifecycle                                                     |
| Link Worker     | [services/link-worker](services/link-worker)         | `grove-link`            | Short links at `link.grove.place`                                                                      |

### Workers

Scheduled and background work, plus the gateways that hold secrets.

| Name                | Path                                                       | Package                             | What it is                                                                     |
| ------------------- | ---------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| Lumen               | [workers/lumen](workers/lumen)                             | `grove-lumen`                       | AI inference gateway: PII scrubbing, quotas, provider fallback                 |
| Warden              | [workers/warden](workers/warden)                           | `grove-warden`                      | Credential gateway — injects API keys for agents so they never sit in env      |
| Onboarding          | [workers/onboarding](workers/onboarding)                   | `grove-onboarding`                  | Email onboarding sequences, one Durable Object per person                      |
| Patina              | [workers/patina](workers/patina)                           | `grove-patina`                      | Backups and restore (deploys as `grove-backups`)                               |
| Pulse Collector     | [workers/pulse-collector](workers/pulse-collector)         | `grove-pulse-collector`             | Product events from every app, buffered in a DO and flushed to D1              |
| Vista Collector     | [workers/vista-collector](workers/vista-collector)         | `grove-vista-collector`             | Infrastructure metrics behind the Vista dashboard                              |
| Timeline Sync       | [workers/timeline-sync](workers/timeline-sync)             | `grove-timeline-sync`               | Nightly timeline summaries for tenants that opted in                           |
| Subscription Digest | [workers/subscription-digest](workers/subscription-digest) | `@autumnsgrove/subscription-digest` | The digest mailer                                                              |
| Email Catchup       | [workers/email-catchup](workers/email-catchup)             | `grove-email-catchup`               | Weekly catch-up for the email pipeline                                         |
| Webhook Cleanup     | [workers/webhook-cleanup](workers/webhook-cleanup)         | `grove-webhook-cleanup`             | Purges webhook rows past the 120-day retention window                          |
| Paused              | [workers/paused](workers/paused)                           | `grove-paused`                      | The placeholder served for retired subdomains, so nothing half-works in public |

### Libraries

Packages that other packages import. Nothing here deploys on its own.

| Name           | Path                                               | Package                        | What it is                                                                                               |
| -------------- | -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Lattice        | [libs/engine](libs/engine)                         | `@autumnsgrove/lattice`        | The framework: blog rendering, glass UI, Loom, Lumen, auth, email, pricing                               |
| Loom           | [libs/loom](libs/loom)                             | `@autumnsgrove/loom`           | Durable Object framework — typed routing, storage, alarms, WebSockets                                    |
| Prism          | [libs/prism](libs/prism)                           | `@autumnsgrove/prism`          | Design tokens, icon gateway, glass utilities, contrast tools                                             |
| Foliage        | [libs/foliage](libs/foliage)                       | `@autumnsgrove/foliage`        | Per-site theming with guardrails                                                                         |
| Curios         | [libs/curios](libs/curios)                         | `@autumnsgrove/curios`         | Gallery, guestbook, polls, timeline widgets                                                              |
| Infra          | [libs/infra](libs/infra)                           | `@autumnsgrove/infra`          | The D1/KV/R2 boundary every app talks through                                                            |
| Grove Crypto   | [libs/grove-crypto](libs/grove-crypto)             | `@autumnsgrove/grove-crypto`   | Envelope encryption, per-tenant keys, SecretsManager                                                     |
| Grove Errors   | [libs/grove-errors](libs/grove-errors)             | `@autumnsgrove/grove-errors`   | Structured error types and Signpost codes                                                                |
| Grove Markdown | [libs/grove-markdown](libs/grove-markdown)         | `@autumnsgrove/grove-markdown` | Markdown pipeline: parse, sanitize, directives, mentions                                                 |
| Thorn          | [libs/thorn](libs/thorn)                           | `@autumnsgrove/thorn`          | Content moderation SDK                                                                                   |
| Grove Agent    | [libs/grove-agent](libs/grove-agent)               | `@autumnsgrove/grove-agent`    | Autonomous agent framework                                                                               |
| Gossamer       | [libs/gossamer](libs/gossamer)                     | `@autumnsgrove/gossamer`       | ASCII visual effects — threads of light                                                                  |
| Lyra           | [libs/lyra](libs/lyra)                             | `@autumnsgrove/lyra-lumen`     | Lyra on Grove: the Lumen model slot, tenant secrets, and the fakes that test them                        |
| Lumen Registry | [libs/lumen-registry](libs/lumen-registry)         | `@autumnsgrove/lumen-registry` | Model IDs, prices, capabilities, and which model serves which task                                       |
| Shutter        | [libs/shutter/cloudflare](libs/shutter/cloudflare) | `@autumnsgrove/shutter`        | Web page summarisation over OpenRouter. The Python tree above it is the retired reference implementation |

### Tools

Not published, not deployed — the things that help us work.

| Name                  | Path                                                                         | Package         | What it is                                                              |
| --------------------- | ---------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| gw                    | [tools/grove-wrap-go](tools/grove-wrap-go)                                   | `gw`            | The infrastructure CLI: secrets, worktrees, tenants, Warden, publishing |
| Glimpse               | [tools/glimpse](tools/glimpse)                                               | —               | Screenshots and console logs, for looking at what we built              |
| Labels                | [tools/labels](tools/labels)                                                 | `@grove/labels` | Syncs `.github/labels.yml` to the live issue labels                     |
| Verify engine exports | [tools/verify-engine-exports.sh](tools/verify-engine-exports.sh)             | —               | Pre-commit guard on the engine's public surface                         |
| Check accent colours  | [tools/check-accent-colors.sh](tools/check-accent-colors.sh)                 | —               | Pre-commit guard against hardcoded hex outside Prism                    |
| Greenhouse article    | [tools/generate-greenhouse-article.ts](tools/generate-greenhouse-article.ts) | —               | Regenerates the greenhouse knowledge-base entry                         |

---

## Live

[grove.place](https://grove.place) · [status.grove.place](https://status.grove.place) · [login.grove.place](https://login.grove.place) · [billing.grove.place](https://billing.grove.place) · [plant.grove.place](https://plant.grove.place) · [forage.grove.place](https://forage.grove.place) · [amber.grove.place](https://amber.grove.place) · [og.grove.place](https://og.grove.place)

### Related Projects

| Project    | Repository                                                            | Status                                                               |
| ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GroveScout | [AutumnsGrove/GroveScout](https://github.com/AutumnsGrove/GroveScout) | Live, and deliberately its own repo                                  |
| Forage     | [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage)         | **Archived.** The backend moved into `services/forage`               |
| Shutter    | [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter)       | **Archived.** The TypeScript port lives at `libs/shutter/cloudflare` |

---

## Development

```bash
git clone https://github.com/AutumnsGrove/Lattice.git
cd Lattice
pnpm install
```

Then, depending on what you want to see:

```bash
./scripts/dev-stack.sh fast   # everything: workers, Aspen, Landing, Plant, with real D1/KV/R2 and Durable Objects
pnpm dev:aspen                # just a tenant site and /arbor, on HMR
pnpm dev:landing              # just grove.place
```

The stack bit matters: the library on its own is not a working Grove. `libs/engine` is what the app builds on, so `cd libs/engine && pnpm dev` renders components in isolation, not a blog.

Checks, before you push:

```bash
pnpm test          # every package's suite
pnpm lint          # oxlint + eslint
pnpm format:check  # prettier
```

[SETUP.md](SETUP.md) owns the full setup, [CONTRIBUTING.md](CONTRIBUTING.md) the conventions, and these go deeper: [ARCHITECTURE.md](ARCHITECTURE.md) (databases, Warden), [DESIGN.md](DESIGN.md) (tokens, glass, typography), [CODE-STANDARDS.md](CODE-STANDARDS.md) (SDK boundaries, errors), [VERIFICATION.md](VERIFICATION.md) (what "verified" means here), [AGENT.md](AGENT.md) (agent instructions).

---

## Values

- Queer-friendly infrastructure. Safe digital spaces, especially when physical ones feel hostile.
- No algorithms, no engagement metrics. Your feed is chronological. Your worth isn't measured by likes.
- Your words stay yours. Not a dataset. Not a statistic. Exportable in standard markdown, always.
- AI sanctuary. Every crawler blocked at the gate. What you write here is read by humans.
- Solarpunk-aligned, no VC. Built slowly, with care, without investor pressure to enshittify.
- Built to last. Your data is always exportable, your content always portable.

---

## License

[![license](https://img.shields.io/npm/l/@autumnsgrove/lattice.svg?style=flat-square&color=8b5a2b)](LICENSE)

[AGPL-3.0](LICENSE)
