---
title: "Naming Journey: The Engine Split"
status: planned
category: features
---

# Naming Journey: The Engine Split

> The engine is two things. The library stays Lattice. What do we call
> the living, breathing deployment where every Wanderer's grove actually exists?

---

## What IS This Thing?

The thing we're distinguishing:

- The live SvelteKit deployment serving `*.grove.place`
- 262 route files, 127 API handlers, 80+ curio endpoints
- Contains Arbor (admin panel), Sentinel (safety), all public pages
- Where Wanderers write, read, visit, and live
- Currently fused into `libs/engine` alongside the shared library

**What it is, fundamentally:** A place. A living, running, serving place.

**What it does in a Wanderer's life:** It IS the grove they experience. When someone
visits `autumn.grove.place`, this thing renders the page. When they open Arbor, this
thing serves the admin panel. When they interact with a curio, this thing handles
the API call. It's the medium through which every part of the grove becomes real.

---

## The Walk

### Round 1: Bower (Rejected)

First candidate. A bower grows on a lattice — the metaphor was perfect.
But the word doesn't _roll_ in the grove. Too archaic. Catches in the throat.

The Wayfinder's verdict: "Bower is explicitly not allowed. I dislike the name
greatly and it doesn't roll well for the grove."

Lesson: the metaphor must serve the feeling, not the other way around.

### Round 2: Glade, Hollow, Thicket

Three candidates offered. The Wayfinder chose **Thicket** — dense, living,
beautifully tangled. "Step into the thicket." Has energy. Has texture.

### Round 3: Wait — Both Are Lattice

Then the sharper insight landed:

> "It's not the WORST thing that it's named lattice because things grow on
> a lattice. The engine is the lattice, and deployment itself is also a
> lattice. We are getting things off of one lattice and using the other.
> One is static, one is live."

The cost of a full rename (creating `packages/thicket`, updating every
import, new deploy config, new CI workflows, new docs) would be massive
for what is essentially a structural separation, not a new identity.

Both halves ARE lattice. The trellis in the shed is lattice. The trellis
in the garden, covered in vines and life, is also lattice. Same material,
different context. One you build with, one you visit.

---

## The Answer: A Terminology Split, Not a Name

No new Grove name needed. Just clear words:

|             | **Lattice** (the library)  | **The engine** (the deployment)          |
| ----------- | -------------------------- | ---------------------------------------- |
| Package     | `@autumnsgrove/lattice`    | `grove-lattice`                          |
| Lives at    | `libs/engine/src/lib/`     | `libs/engine/src/routes/`                |
| Build       | `svelte-package` → `dist/` | `vite build` → `.svelte-kit/cloudflare/` |
| Consumed by | 10+ packages at build time | Every Wanderer at request time           |
| Future home | `libs/engine/`             | `apps/engine/`                           |

In conversation:

- "**Lattice** exports the component" = the library
- "**The engine** serves the route" = the deployment
- "**Lattice** provides it, **the engine** renders it"

When the physical split happens:

- `libs/engine/` — the library (static lattice, `@autumnsgrove/lattice`)
- `apps/engine/` — the deployment (live lattice, `grove-lattice`)

Both are lattice. One you build with, one you visit.

---

## Names Considered (Archive)

For the record, the names explored during the walk:

| Name        | Relationship to Lattice                  | Why Not                                                               |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------- |
| **Bower**   | A bower grows on a lattice/trellis       | Too archaic, doesn't roll well                                        |
| **Glade**   | Open clearing where light reaches ground | An absence, not a structure; too similar to Clearing                  |
| **Hollow**  | Sheltered depression in landscape        | "Hollow" means empty                                                  |
| **Thicket** | Dense, living cluster of growth          | Good name, but the whole premise was wrong — we don't need a new name |
| **Stand**   | A forestry unit of trees                 | Too many non-forest meanings                                          |

The walk was valuable. We explored the space thoroughly enough to realize
the right answer wasn't a name at all — it was clarity about what we
already have.
