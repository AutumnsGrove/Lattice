---
title: The Glossary Alcove
description: Grove speaks its own language. Here's the phrasebook.
category: exhibit
exhibitWing: entrance
icon: book
lastUpdated: '2026-01-22'
---
# The Glossary Alcove

> *Grove speaks its own language. Here's the phrasebook.*

---

## What You're Looking At

Every community develops its own vocabulary. Grove's terminology isn't arbitrary. Each word was chosen to evoke feeling, not just function.

This glossary explains the terms you'll encounter throughout the museum. Some are technical (Loom, Grafts). Some are cultural (Wanderer, Rooted). All are intentional.

---

## Identity Terms

How we name the people in Grove.

| Term | Who They Are | Why This Word |
|------|--------------|---------------|
| **Wanderer** | Any visitor to Grove | Everyone starts by wandering, exploring, finding their way |
| **Rooted** | Someone who has created a blog (paid) | Taking root means committing, staying, growing in place |
| **Pathfinder** | Trusted community guide | Helps others find paths through the forest |
| **Wayfinder** | Autumn (singular) | The grove keeper who shows the way forward |

**Usage Notes:**
- Never use "user" or "member" in user-facing text. Use "Wanderer."
- Never use "subscriber." Use "Rooted" or "the Rooted."
- The symmetry: Wanderers *seek* the way, the Wayfinder *shows* the way.

---

## Subscription Tiers

The levels of commitment, named for growth stages.

| Tier | What It Means | Features |
|------|---------------|----------|
| **Seedling** | Entry tier | Basic blogging, community access |
| **Sapling** | Growing tier | Custom domain, more storage |
| **Oak** | Established tier | Advanced features, priority support |
| **Evergreen** | Highest tier | Everything, forever pricing locked |

**Note:** Creating a blog makes you Rooted. Tiers describe the size of your tree, not whether it exists. All Rooted Wanderers have taken root; tiers reflect how much they've grown.

---

## System Names

The components that make Grove work.

| Name | What It Is | Why This Word |
|------|------------|---------------|
| **Lattice** | The core framework | A structure that supports growth; vines climb it |
| **Heartwood** | Authentication system | The dense core of a tree; where trust lives |
| **Loom** | Durable Objects coordination | Weaves threads of state together |
| **Meadow** | Community feed | Open space where the community gathers |
| **Clearing** | Status page | A gap in the forest; visibility and transparency |
| **Forage** | Domain discovery tool | Searching and gathering what you need |
| **Plant** | Tenant management app | Where you tend your blog garden |

---

## Feature Flag Vocabulary (Grafts)

How we talk about feature management.

| Term | Meaning | Standard Term |
|------|---------|---------------|
| **Graft** | Enable a feature | Feature flag ON |
| **Prune** | Disable a feature | Feature flag OFF |
| **Propagate** | Percentage rollout | Gradual rollout |
| **Cultivate** | Full rollout | 100% enabled |
| **Blight** | Emergency kill switch | Circuit breaker |
| **Splice** | Attach UI component | Component injection |
| **Cultivar** | A/B test variant | Experiment variant |

**Why Nature Words:** Technical terms can feel cold. "We need to blight the comments feature" communicates urgency while fitting Grove's voice.

---

## Personalization Features (Curios)

The old-web elements that make blogs feel personal.

| Curio | What It Does | Old-Web Inspiration |
|-------|--------------|---------------------|
| **Guestbook** | Visitors leave signatures | GeoCities-era guestbooks |
| **Hit Counter** | Shows visitor count | "You are visitor #12,847" |
| **Shrine** | Dedication board | Fan shrines, memorial pages |
| **Link Garden** | Curated link collection | Blogrolls, webrings |
| **Custom Cursor** | Personalized mouse pointer | Sparkle trails, themed pointers |
| **Under Construction** | Classic badge | "This page is under construction" GIFs |

---

## Seasonal Terms

Grove changes with the seasons.

| Season | Mood | Colors |
|--------|------|--------|
| **Spring** | Renewal, fresh starts | Soft pastels, new greens |
| **Summer** | Growth, vibrance | Bright greens, warm yellows |
| **Autumn** | Harvest, reflection | Warm oranges, deep browns (default) |
| **Winter** | Rest, quiet | Cool blues, soft whites |
| **Midnight** | Dreams, queerness | Deep purples, rose accents (easter egg) |

**Finding Midnight:** Cycle through seasons in the theme picker. Keep going past Winter.

---

## Technical Terms

For the architecture-curious.

| Term | Meaning |
|------|---------|
| **D1** | Cloudflare's SQLite database |
| **KV** | Cloudflare's key-value storage |
| **R2** | Cloudflare's object storage (like S3) |
| **Worker** | Cloudflare's serverless function |
| **Pages** | Cloudflare's static site + functions hosting |
| **Durable Objects** | Cloudflare's stateful coordination primitives |
| **PKCE** | OAuth security pattern (pronounced "pixie") |

---

## Patterns Worth Noting

| Pattern | What It Means |
|---------|---------------|
| **Engine-first** | Add to shared engine before app-specific code |
| **Tenant isolation** | Your data can't leak to other blogs |
| **Halfway refresh** | Sessions extend when actively used |
| **Isolated try/catch** | One failing query shouldn't block others |

---

## Continue Your Tour

Now that you speak Grove, pick a wing:

- **[The Architecture Wing](./architecture/WING.md)** — How it's built
- **[The Nature Wing](./nature/WING.md)** — How it looks and feels
- **[The Trust Wing](./trust/WING.md)** — How it keeps you safe
- **[The Data Wing](./data/WING.md)** — How information flows
- **[The Personalization Wing](./personalization/WING.md)** — How you make it yours
- **[The Community Wing](./community/WING.md)** — How we gather

Or return to [the entrance](./MUSEUM.md).

---

*Language shapes experience. Grove's vocabulary was chosen to feel like home.*
