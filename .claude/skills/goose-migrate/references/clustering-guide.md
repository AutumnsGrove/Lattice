# Clustering Guide — Outcome-Based Flocking

## The Core Principle

Cluster by **what a user would notice**, not by what component the code lives in.

Three issues touching `libs/engine/src/lib/thorn/` might be part of three different
outcomes: one is about messaging safety, one is about comment moderation, one is
about rate limiting. Don't cluster them just because they're in the same directory.

## The Outcome Test

For each candidate cluster, ask:

> "If I finished all these issues, I could tell someone: '__________ works now.'"

If you can fill in that blank with something a non-developer would understand,
it's a good cluster. If you have to say something like "the behavioral sublayer
pipeline is wired," it's not — keep looking for the user-facing outcome.

## When to Cluster vs Keep Separate

**Cluster when:**
- Issues are sequential steps toward one outcome (build DO → wire API → add UI)
- Issues can't deliver value independently (moderation without the DM system)
- A user would describe them as one thing ("get messaging working")

**Keep separate when:**
- Issues deliver independent value (fixing two unrelated bugs)
- They could be done in any order without affecting each other
- Combining them would make the task name vague ("improve various things")

## Grove Ecosystem Map

The Grove naming doc (`docs/philosophy/grove-naming.md`) is the source of truth
for what everything is and how it relates. Here's the high-level structure to
help the goose think in terms of user-facing outcomes:

**Core Infrastructure** (the invisible foundation):
- **Lattice** — the framework everything grows from (UI, utilities, shared code)
- **Aspen** — the domain layer (database, auth hooks, payments, moderation)

**Platform Services** (things users interact with directly):
- **Arbor** — admin dashboard (writing, settings, management)
- **Plant** — onboarding (signup → first post)
- **Foliage** / **Prism** — theming and visual identity
- **Amber** — file storage and media management
- **Curios** — fun extras (guestbooks, hit counters, old-web stuff)
- **Lantern** — cross-grove navigation and discovery
- **Rings** — private analytics
- **Clearing** — status page
- **Porch** — support system
- **Wisp** / **Fireside** — writing assistant / conversational drafting
- **Trails** — personal roadmaps
- **Vineyard** — component showcase

**Content & Community** (writing, talking, sharing):
- **Flow** — the writing editor
- **Terrarium** / **Weave** — creative canvas and visual composition
- **Reverie** — AI-powered site customization ("make it cozy")
- **Scribe** — voice-to-text
- **Chirp** — DMs (two robins on a branch)
- **Reeds** — blog comments
- **Thorn** — content moderation (protects Chirp, Reeds, Meadow)
- **Canopy** — opt-in user directory
- **Meadow** / **Notes** / **Blazes** — social feed, short posts, content markers
- **Forests** — themed communities (like GeoCities neighborhoods)

**Standalone Tools** (independent but integrated):
- **Gossamer** — ASCII visual effects library
- **Ivy** — privacy-first email
- **Grafts** — feature flags per tenant
- **Waystone** — contextual help system

**Clustering by user-facing outcome, not by internal structure:**

A Thorn issue might cluster with Chirp work (DM moderation) or with Reeds
work (comment moderation) or with Meadow work (feed moderation) — same
codebase, three different user outcomes. The goose clusters by what the
*wanderer* would notice, not what the *developer* would group.

Similarly, a Prism issue might cluster with Foliage (theme appearance) or
with Curios (visual consistency of fun extras) or with Terrarium (canvas
rendering). Follow the outcome, not the import path.

## Section Naming

Section names should be:
- **2-4 words** — short enough to scan
- **Warm, not technical** — "Make Themes Beautiful" not "Foliage/Prism Overhaul"
- **Outcome-oriented** — what it accomplishes, not what it touches
- **Varied** — not everything is "Fix X" or "Add Y"

Good section names:
- "Broken Things" (bugs)
- "Messaging" (DM system + surrounding work)
- "Make Themes Beautiful" (visual identity)
- "Lantern Discovery" (AI-powered search/chat)
- "Docs & Cleanup" (documentation + housekeeping)
- "Getting Ready to Launch" (pre-launch checklist items)
- "Security & Trust" (hardening, compliance)

## Handling the Long Tail

Not everything clusters neatly. Strategies for stragglers:

- **Lone bugs** → Put in "Broken Things" section even if unrelated to each other
- **Lone enhancements** → If they're small, group as "Quick Wins" or "Polish"
- **Infrastructure** → Can cluster as "Under the Hood" if there are enough
- **Future features** → Defer to next batch. Don't pollute the current view
  with aspirational work unless the user specifically wants to see it.
