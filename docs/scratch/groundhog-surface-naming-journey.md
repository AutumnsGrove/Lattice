# Naming Journey: Assumption Surfacing Animal

## What Is This Thing?

**Fundamentally:**
An assumption surfacer. A context validator. The creature that pauses before everyone charges forward and says, "Wait. What do we actually *know*, and what are we just... hoping?" Not a builder, not an investigator, not a fixer. This animal exists at the boundary between confidence and certainty. It's the difference between "I think this is a SvelteKit project" and "I can see `svelte.config.js`, `package.json` lists SvelteKit 2, and the routing follows SvelteKit conventions — this is a SvelteKit project."

**What does it DO?**
It pops up. It looks around. It tells you what it sees — and more importantly, what it's *assuming*. It reads your project context: config files, directory structure, recent git history, agent instructions. Then it classifies everything it thinks it knows into tiers: things it can prove, things it's inferring, things it's just assuming because nobody said otherwise. It lays it all out in front of you and asks: "Is this right? What am I missing? What did I get wrong?"

**What emotion should it evoke?**
Clarity. Relief. The particular "oh" that comes when you realize the last thirty minutes of confusion happened because Claude assumed you were using PostgreSQL when you're actually on D1 SQLite. Or that you were using npm when you're on pnpm. Or that the auth system is custom when it's actually Heartwood. The Groundhog prevents the kind of wasted work that happens when the invisible foundation is wrong. The feeling it gives you is: "Good thing we checked."

## Walking Through the Forest

I enter the grove on an early February morning. Frost on the ground, the kind of cold that makes you wonder if winter will ever end.

I pass the animals I know:

The **Bloodhound** has its nose to the ground, following a trail through the code. It tracks functions, traces imports, maps dependencies. But the Bloodhound follows what's *there*. It doesn't question whether the trail itself makes sense.

The **Eagle** circles overhead, seeing architecture from altitude. Boundaries, systems, flows. But the Eagle designs based on what it believes is true. If the foundation is wrong, the architecture is wrong, and the Eagle never knows.

The **Crow** perches on the dead oak, ready to challenge your decisions with sharp questions. But the Crow challenges *reasoning*. Before you can reason about something, you have to agree on what's true. The Crow needs the ground to stand on.

There's something missing. Something that should happen *before* anyone starts tracking, designing, or reasoning. Something that checks whether the world we think we're in is the world we're actually in.

The frost cracks. A small mound of earth shifts. A round, cautious face pokes out, blinking in the pale light. It looks left. It looks right. It sniffs the air. It takes stock of the situation with the careful patience of a creature that knows what happens when you assume spring has arrived too early.

**The Groundhog.**

## Candidates

**Groundhog** (groundhog-surface)

- Natural meaning: Emerges from its burrow, checks the world, and reports back. In Punxsutawney, the groundhog tells you whether spring is real or just wishful thinking. It's the original reality checker.
- Why it fits: Groundhog Day is literally about the gap between assumption and reality. "Is it spring yet?" is the same question as "Is this actually a pnpm monorepo?" The groundhog checks, and it tells you the truth, even if the truth is "no, it's still winter, go back inside."
- The vibe: "Pops up, looks around, tells you what's real. Fast, honest, helpful."
- Bonus: The movie *Groundhog Day* adds another layer — the idea of being stuck in a loop because you keep making the same mistakes. The Groundhog breaks that loop by surfacing what you're assuming so you don't repeat the same errors session after session.

**Prairie Dog**

- Natural meaning: Social, alert, pops up from burrows with warning calls.
- Why it doesn't fit: Too similar to the Groundhog, but without the cultural resonance of Groundhog Day. The reality-checking metaphor isn't as clean. Prairie dogs warn about threats — this animal isn't warning about danger, it's surfacing assumptions.

**Chipmunk**

- Natural meaning: Small, quick, cheeks full of acorns. Hoards and organizes.
- Why it doesn't fit: Too playful, too scurrying. The Groundhog needs a certain deliberateness — it pops up, surveys carefully, then reports. A chipmunk darts around. Wrong energy for an assumption validator.

**Gopher**

- Natural meaning: Burrows, digs tunnels, moves underground.
- Why it doesn't fit: Too strongly associated with the Go programming language. In a codebase context, "gopher" triggers the wrong associations entirely. Also, gophers dig; the Groundhog *surfaces*. The verb matters.

**Mole**

- Natural meaning: Blind, underground, feels its way through dirt.
- Why it doesn't fit: Moles are blind. This animal needs to *see* — that's the whole point. It emerges specifically to look around and report. A mole finding things by touch is the wrong metaphor for assumption validation.

## The Tagline Test

"The Groundhog pops up to check what's real."

"Before you build, check your ground."

"Is it spring? Or are we just hoping?"

"The Groundhog surfaces what's hidden underground — the assumptions everything else is built on."

## Selection: Groundhog

The Groundhog is the assumption surfacer of the grove. It pops up at the start of complex work, looks around with careful attention, and tells you what it sees. It distinguishes between what it can prove, what it's inferring, and what it's simply assuming. Then it asks you to validate the uncertain parts before anyone builds on top of them.

**Key differentiator from other animals:**

- Bloodhound tracks code. Groundhog checks whether you're tracking in the right codebase with the right mental model.
- Eagle designs architecture. Groundhog checks whether the architecture is based on correct assumptions about the stack and constraints.
- Crow challenges reasoning. Groundhog establishes the shared ground that reasoning depends on.
- Robin guides you to the right animal. Groundhog makes sure every animal has the right context before they start.

**The Type/Tier System (borrowed from Common Ground):**

The Groundhog's best innovation is the separation between *type* and *tier*:

- **Type** is immutable — it's an audit trail of *how* something was determined. STATED (the user said it), INFERRED (derived from evidence), ASSUMED (taken as default), UNCERTAIN (conflicting signals). Types never change because they represent what happened.
- **Tier** is mutable — it's the current confidence level. ESTABLISHED (safe to build on), WORKING (reasonable but verify if challenged), OPEN (needs user input before proceeding). Tiers change when the user provides input — an ASSUMED/OPEN assumption becomes ASSUMED/ESTABLISHED once the user confirms it. The type stays ASSUMED forever, because that's honestly how it was discovered.

**The Shadow Check:**

Certain assumptions go wrong more often than others. The Groundhog specifically looks for these common blind spots: runtime environment (Node vs Edge/Workers), database type (SQLite/D1 vs PostgreSQL), auth system, package manager, test framework, deployment target, monorepo structure. These are the assumptions that, when wrong, waste the most time.

**Speed:**

The Groundhog is fast. Five minutes, not fifty. Pop up, look around, report, burrow the results. This is a utility you run at the start of complex work, not a deep investigation. If something needs deeper exploration, that's what the Bloodhound is for.

---

*The Groundhog has been underground all winter. It surfaces now because you're about to start building, and it wants to make sure you're building on solid ground.*
