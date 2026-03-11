---
title: The Glossary Alcove
description: Grove speaks its own language. Here's the phrasebook.
category: exhibit
exhibitWing: entrance
icon: book
lastUpdated: '2026-03-10'
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
| **Wanderer** | Free tier | Basic blogging, community access, everyone can wander |
| **Seedling** | Entry paid tier | More blooms, curated themes, your own corner |
| **Sapling** | Growing tier | More storage, email forwarding, room to stretch |
| **Oak** | Established tier | Unlimited blooms, theme customizer, custom domain, analytics |
| **Evergreen** | Highest tier | Everything, dedicated support, always flourishing |

**Note:** Creating a blog makes you Rooted. Tiers describe the size of your tree, not whether it exists. All Rooted Wanderers have taken root; tiers reflect how much they've grown. Everyone starts as a Wanderer, and Wanderers can blog too.

---

## System Names

The components that make Grove work.

| Name | What It Is | Why This Word |
|------|------------|---------------|
| **Lattice** | The core framework | A structure that supports growth; vines climb it |
| **Aspen** | The live deployment | Clonal colonies, shared roots, resilience through connection |
| **Heartwood** | Authentication system | The dense core of a tree; where trust lives |
| **Loom** | Durable Objects coordination | Weaves threads of state together |
| **Meadow** | Community feed | Open space where the community gathers |
| **Canopy** | Wanderer directory | What you see looking at the forest from above; opt-in visibility |
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

21 old-web elements that make blogs feel personal. A cabinet of wonders. 45 database tables. "Someone lives here."

### Built

| Curio | What It Does |
|-------|--------------|
| **Timeline** | AI-powered daily GitHub activity summaries with voice presets |
| **Journey** | Repository evolution tracking with code metrics and AI release summaries |
| **Gallery** | R2-backed image gallery with tags, collections, and display styles |

### Social

| Curio | What It Does | Old-Web Inspiration |
|-------|--------------|---------------------|
| **Guestbook** | Visitors leave signatures with moderation | GeoCities-era guestbooks |
| **Link Gardens** | Curated link collections with 88x31 buttons | Blogrolls |
| **Blogroll** | RSS-powered blog recommendations with latest posts | Classic blogrolls |
| **Badges** | Collectible achievements, auto-award and custom | Forum badges, profile flair |
| **Web Ring Hub** | Webring navigation with Prev/Hub/Next links | Webrings! |

### Decoration

| Curio | What It Does | Old-Web Inspiration |
|-------|--------------|---------------------|
| **Hit Counter** | Nostalgic page view counter with display styles | "You are visitor #12,847" |
| **Status Badges** | Site status indicators | "Under Construction" GIFs |
| **Custom Cursors** | Cursor themes with trail effects | Sparkle trails, themed pointers |
| **Mood Ring** | Visual mood indicator, time-based or manual | Mood GIFs, "current mood:" |
| **Clip Art Library** | Decorative drag-and-drop assets | GeoCities clip art, but good |

### Interactive

| Curio | What It Does | Old-Web Inspiration |
|-------|--------------|---------------------|
| **Polls** | Interactive voting with live results, embeddable | Forum polls |
| **Weird Artifacts** | Magic 8-Ball, fortune cookies, dice, tarot | The chaos corner |
| **Ambient Sounds** | Optional background audio, nature and lo-fi | MIDI autoplay, but tasteful |

### Media & Integration

| Curio | What It Does | Old-Web Inspiration |
|-------|--------------|---------------------|
| **Now Playing** | Spotify/Last.fm currently listening display | "Now playing" sidebar widgets |
| **Shrines** | Dedication boards for things you love | Fan shrines, memorial pages |
| **Bookmark Shelf** | Visual bookshelf-style reading list | "What I'm reading" pages |
| **Activity Status** | Discord-style "currently doing" indicator | AIM away messages |
| **Custom Uploads** | Your own images for customizing curios | "My Homepage" energy |

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
