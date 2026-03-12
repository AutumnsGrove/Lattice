---
title: "Documentation Browser & Agent Activity Viewer"
description: "Finding the right name for the local dev server that makes all project knowledge browseable"
category: philosophy
subcategory: naming-research
lastUpdated: "2026-03-12"
---

# Naming Journey: Documentation Browser & Agent Activity Viewer

*Finding the right name for the local dev server that makes all project knowledge browseable*

---

## The Problem

The working name is "Understory." It's accurate — the layer beneath the canopy, where you look closely, where things connect — but it's borrowed from ecology rather than found in the grove. It describes the LOCATION but not the ACT. And it was already used in the spec as a category name.

What we need a name for:
- A local `bun run docs` dev server
- Indexes 897 markdown files across the project
- Parses Crush's 28MB SQLite (45 sessions, 4,110 messages)
- Browses Claude Code's 2,825 JSONL session files
- Makes the inner workings of the project visible
- Full-text search with frontmatter awareness
- A reading room for the project's entire accumulated knowledge

---

## Step 3: Visualize the Grove

```
                              ☀️
                    🌲   🌳   🌲   🌳   🌲
                 (groves — the individual blogs)

    ════════════════════════════════════════════════════
                      GROUND LEVEL
    ════════════════════════════════════════════════════

      🍄 Heartwood     💧 Mycelium    🌿 Lumen
      (auth center)   (connections)  (AI, hollow light)

    ════════════════════════════════════════════════════
         BENEATH: ROOTS, MYCELIUM, HISTORY

         [ specs ]   [ plans ]   [ agent sessions ]
         [ skills ]  [ safaris ] [ conversations  ]
         [ museum ]  [ guides ]  [ 3,400 artifacts ]

              ↑ ↑ ↑
           THIS TOOL brings all of this UP
               to where you can read it
    ════════════════════════════════════════════════════
```

Where existing tools live:
- **Vista** — "a clearing where the canopy opens" — watches LIVE infrastructure
- **Rings** — private analytics for Wanderers — reads personal growth
- **Lumen** — the AI gateway — routes intelligence
- **Glimpse** — quick peek, screenshots — captures moments
- **Mycelium** — invisible connections — the network

---

## Step 4: What IS This Thing?

**Is it a place or a process?**
Both. It's a place (you GO to it) but more importantly it's the ACT of gathering, finding, reading.

**What does it DO in the developer's life?**
- Surfaces what's hidden (agent conversations, buried decisions)
- Makes the scattered cohere (897 files become one searchable space)
- Lets you trace the history of how things were decided
- Gives you a reading room for the project's mind

**What emotion should it evoke?**
- The satisfaction of finding the thing you were looking for
- The quiet pleasure of reading through old conversations
- Relief — "oh, that's where it is"
- A kind of intimacy with the project

---

## Step 5: Walking Through the Forest

I'm in the grove. It's late. I need to find something.

I need to know how the Heartwood auth flow was designed — was there a spec? I need to find the Crush session from three weeks ago where we figured out the Durable Objects routing problem. I need to see every plan related to Blazes before I write the next spec.

Where do I go?

I walk past the Meadow. Past the Arbor. I'm not looking for someone else's grove — I'm looking for the *record*. The accumulated record of this project.

I walk to...

A low building, set back in the trees. Or maybe not a building. Maybe it's more like a stone. A standing stone covered in inscriptions. Or a shelf cut into a hillside where things have been placed and left, waiting to be found.

No — it's more like a FIELD where the harvest has been gathered. After all the writing, all the agent sessions, all the spec work — someone gleaned the field and brought it together.

**Gleaning.** That's the act.

In Ruth: "Let me go to the field and glean among the ears of grain." You walk the harvested field and gather what remains, what was left scattered. You make something whole from fragments.

This tool GLEANS the project. It gathers the scattered fragments — specs here, plans there, Crush sessions in a SQLite file, Claude logs buried in ~/.claude/projects — and makes them findable.

"Let me go to Glean and find that spec."
"I'll glean the crush sessions for mentions of Heartwood."

---

## Step 6: Candidates

**Glean** — to gather grain left after harvest; to learn from scattered sources

- In farming: gleaning is picking up fragments after the main harvest
- Metaphorically: finding meaning in scattered material
- The tool: gathers 897 docs + 3,400 agent artifacts into one findable place
- Tagline: "Glean is where the harvest comes together."
- Vibe: humble, intentional, literary, warm
- Potential issues: some won't know the farming reference immediately

---

**Cairn** — stacked stones left by travelers to mark the trail

- In wilderness: cairns guide you through uncertain terrain
- Accumulate over time: each traveler adds a stone
- The project's docs/sessions ARE cairns — "someone was here, here's what they found"
- Tagline: "Follow the cairns. Find your way."
- Vibe: outdoor, navigational, cumulative
- Potential issues: more outdoor/adventure than reading-room

---

**Lantern** — carried light, the intimate illumination for one person

- You carry it into dark places to see
- Warm, directional — illuminates exactly what you're looking at
- Set it down to read by its glow
- But: Lumen is already the "light" name in the ecosystem
- Tagline: "Carry the lantern. See what's there."
- Potential issues: thematic overlap with Lumen

---

**Dew** — morning moisture that makes the invisible visible

- Spiderwebs appear. Fine grass structures revealed.
- What was always there, now suddenly visible
- Tagline: "What was always there, now you can see it."
- Potential issues: ephemeral (dew disappears) — opposite of what the tool is

---

**Glade** — a small clearing in the forest, surrounded on all sides, open to sky

- A quiet reading space within the forest
- Open, calm, present — surrounded by the dense docs
- But: Vista is already the "clearing" metaphor
- Tagline: "Come into the glade and read."

---

**Moss** — grows everywhere, connects surfaces, ancient, patient

- Covers everything quietly
- Navigation trick: moss grows on the north side of trees
- "Reading the moss" = finding your orientation
- Tagline: "Where knowledge accumulates."
- Potential issues: too passive, not about finding/searching

---

**Pore** — to pore over documents; also: pores are how a plant breathes

- "Poring over" = deep, absorbed reading
- The tool is exactly what you do when you pore over docs
- But: pores in skin — competing physical meaning
- Tagline: "Pore: where you sit and read deeply."

---

## Step 7: Testing the Taglines

"Glean is where ______"
→ "Glean is where the scattered project comes together." ✓
→ "Glean is where you find what you were looking for." ✓

"Glean is the ______"
→ "Glean is the harvest of scattered knowledge." ✓
→ "Glean is the place after the work, where you read what remains." ✓

"Cairn is where ______"
→ "Cairn is where the trail markers live." ✓ (but a bit abstract)
→ "Cairn is where you follow the path back." ✓

"Lantern is where ______"
→ "Lantern is how you read in the dark." ✓ (but: Lumen overlap)

---

## Step 8: The Winner

**Cairn** wins.

Because:
1. A cairn is built stone by stone by everyone who passes through a place. Each stone is a step taken. The docs, plans, specs, and agent conversations ARE cairns — markers left by previous work showing where decisions were made and paths were found.
2. "Follow the cairns" is exactly what you do in this tool — you trace the history, follow the markers back to understand how you got here.
3. The cumulative quality is perfect: each session, each spec, each plan adds a stone. Over time the cairn grows. The tool makes the whole pile visible.
4. It evokes outdoor navigation but intimately — cairns are quiet, patient, there when you need them.
5. It's not in the existing ecosystem.
6. One syllable. Stone-solid. Memorable.

---

## The Cairn Entry

### Cairn

**Documentation Browser & Agent Activity Viewer** · _Developer tool_
**Package:** `tools/cairn/`
**CLI:** `bun run cairn` or `bun run docs`
**Standard:** Documentation Browser

A cairn is a stack of stones built by travelers to mark a trail. Each person who passes through a place adds a stone — slowly, over time, the pile grows. When you're uncertain where to go next, you look for cairns. You follow the markers left by everyone who came before. The path becomes readable.

Cairn is a local dev server that makes the entire project's knowledge browseable and searchable. 897 markdown files, 54 agent skills, AI session histories from three different coding tools — all indexed and available at `localhost:4321`. Every spec written, every plan made, every agent conversation had: another stone on the pile. Cairn makes the whole trail visible at once. Search for anything. Follow a decision back through time. Browse the skill ecosystem. See which files the agents touched most. The project's cairns, finally in one place.

_Follow the cairns. Find your way._

---

## Conflicts Check

- ✅ Not in the current naming ecosystem
- ✅ Not similar to existing service names
- ✅ Easy to say aloud: "open Cairn" / "search Cairn" / "I checked Cairn"
- ✅ Works as a metaphor: "every session is another stone"
- ✅ `tools/cairn/` fits the existing `tools/` pattern alongside Glimpse
