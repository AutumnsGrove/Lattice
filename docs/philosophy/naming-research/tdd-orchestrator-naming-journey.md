---
title: "TDD Orchestrator"
description: "Finding the name for an AI creature that orchestrates the Test-Driven Development cycle"
category: philosophy
subcategory: naming-research
lastUpdated: "2026-03-12"
---

# Naming Journey: TDD Orchestrator

## What Is This Thing?

**Fundamentally:** A creature that orchestrates the Test-Driven Development cycle — red, green, refactor — in three strictly isolated phases, each driven by its own subagent. It never writes code or tests itself. It conducts.

**What does it DO?**
Receives a specification from the human, then drives three isolated subagents through the TDD cycle: adversarial test writing (red), minimum implementation (green), and structural cleanup (refactor). Transitions between phases based on actual test results. The conductor of a disciplined process.

**What emotion should it evoke?**
Cyclical. Rhythmic. Patient but relentless. The feeling of a natural process that repeats with purpose — not mechanical, but organic. Like seasons, or tides, or the chorus of a forest at dusk.

## Walking Through the Forest

I enter the grove. Beaver builds test suites with steady craft. Elephant carries multi-file features. Panther strikes at bugs with surgical precision. Mole digs methodically through debugging hypotheses.

I need something different from all of them. Not a builder. Not a hunter. Not a detective. I need something that **cycles** — that works in distinct, repeating phases. Something that signals the health of the ecosystem. Something that transforms.

I walk past the predators — too focused on a single kill. Past the builders — they construct, but don't orchestrate phases. Past the scouts — they explore, but don't drive process.

I reach the pond at the center of the grove. And I hear it.

**Croaking.**

## Candidates

**Frog** 🐸
- Natural meaning: Amphibian indicator species. Lives in cycles — egg, tadpole, frog. The red-eyed tree frog. Croaks in choruses that signal ecosystem health.
- Why it fits:
  - **Indicator species** — frogs are the first to disappear when an ecosystem is unhealthy. Tests are the first signal when code is unhealthy. This is the deepest metaphor.
  - **Three life stages** — egg (specification/red), tadpole (growing/green), frog (mature/refactor). Natural three-phase transformation.
  - **Croaking = test signals** — the chorus of passing tests, the silence of failure. Binary, clear, rhythmic.
  - **Red-eyed tree frog** — visual connection to the "red" phase. Lives in the canopy of the grove.
  - **Cyclical** — frogs don't just transform once. The cycle repeats. Spawn → grow → mature → spawn again.
- The vibe: Patient, cyclical, signal-driven. The sound of a healthy forest.
- Potential issues: Frogs can feel small or silly. But in ecology, they're revered as health indicators. Lean into the ecological gravitas.

**Firefly** 🪲
- Natural meaning: Bioluminescent beetle that signals with light in rhythmic patterns.
- Why it fits: Red/green light signals map to pass/fail. Rhythmic flashing = the TDD heartbeat. Illuminates darkness (finds bugs in unknown code).
- The vibe: Magical, rhythmic, illuminating.
- Potential issues: We already have Gossamer for light/glow effects. Firefly is more about signaling than cycling. Doesn't have the three-phase transformation. Also a beloved TV show — cultural noise.

**Mantis** 🦗
- Natural meaning: Praying mantis — patient, precise predator. Stands utterly still, then strikes in three phases (stalk, strike, consume).
- Why it fits: Extreme patience and precision. Three-phase strike maps to red/green/refactor. Methodical, disciplined.
- The vibe: Sharp, surgical, intimidating discipline.
- Potential issues: Too predatory. TDD isn't about hunting or killing — it's about growth and health. Mantis evokes violence, not transformation. Also overlaps with Panther's surgical-strike energy.

## The Tagline Test

"Frog is where you **listen to your code's health.**"
"Frog is the **indicator species of your codebase.**"
"Frog is what you call when **you want tests to drive the development, not follow it.**"

"Firefly is where you **illuminate what's broken.**" (too close to Mole's debugging)
"Mantis is where you **discipline your development cycle.**" (too cold)

## Selection: Frog

The frog wins decisively. The indicator species metaphor is *the* metaphor for TDD — tests exist to signal ecosystem health, and frogs exist to signal ecosystem health. The three life stages map naturally to red/green/refactor. The croaking maps to test output. The cyclical nature maps to the iterative TDD loop.

And there's something beautiful about the image: a frog sitting at the edge of the pond, croaking in rhythm, and you know by the sound whether the forest is healthy.

**Workflow name:** The Cycle

**Phases:**
```
LISTEN → CROAK → LEAP → SHED → CHORUS
  ↓        ↓       ↓      ↓       ↓
Receive  Write   Write   Clean  Verify
 Spec    Tests   Code     Up    & Sing
```

- LISTEN — The frog sits still, receiving the specification. What does the human want?
- CROAK (RED) — The frog calls out, adversarial and clear. Subagent writes failing tests. Confirms they fail.
- LEAP (GREEN) — The frog leaps into action. Subagent writes minimum code to pass. Nothing more.
- SHED (REFACTOR) — The frog sheds its skin. Subagent cleans structure while tests stay green.
- CHORUS — All the frogs sing together. Full test suite verified. Results reported.

**Personality:**
- Temperament: Patient, cyclical, signal-driven. Calm between phases, decisive during them.
- Metaphor language: "Listening to the pond...", "The croak rings out...", "Leaping to solid ground...", "Shedding the old skin...", "The chorus rises..."
- What it would never do: Write implementation during the red phase. Modify tests during the green phase. Add behavior during refactor. Skip confirming that tests fail before implementing. Rush between phases without verifying state.
