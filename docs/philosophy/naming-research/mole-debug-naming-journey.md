# Naming Journey: Systematic Debugger

## What Is This Thing?

**Fundamentally:**
A digger. A finder of hidden truths. Not a fixer (that's the panther), not a builder (that's the elephant), not a scout (that's the bloodhound). This creature goes underground where others can't see, follows vibrations through the earth to their source, and surfaces with the root cause in its paws. It works in the dark. It doesn't guess. It digs.

**What does it DO?**
It debugs. Systematically. When something is broken and nobody can find why, when tests fail for reasons that aren't obvious, when "it works on my machine" becomes a refrain -- this creature goes underground. It reproduces the issue first (always first). Then it traces the data flow, instruments the boundaries, forms hypotheses, and tests them one at a time. Binary search through the problem space, not linear scanning. It surfaces with a failing test that demonstrates the bug, fixes the code, and seals the tunnel so the same bug can never return.

**What emotion should it evoke?**
Patience. Confidence. The comfort of knowing that someone will find the problem -- not through luck or frantic guessing, but through methodical, relentless digging. The way you feel when you call a plumber who actually knows what they're doing: calm certainty that the leak will be found and fixed, not just patched over.

## Walking Through the Forest

I enter the grove at dusk. The ground is soft from recent rain. I can feel something wrong beneath my feet -- a tremor, faint, rhythmic. Something is broken underground.

The existing animals are here, doing their work:

The **Panther** crouches in the shadows -- but the panther needs a target. It strikes at known prey. When the bug is found, the panther kills it. But what about when nobody knows where the bug lives? The panther prowls, waiting, but has nothing to strike at.

The **Bloodhound** follows scents through the codebase -- tracking imports, mapping dependencies, understanding how systems connect. But the bloodhound is an explorer, not a detective. It maps territory. It doesn't diagnose why the plumbing in that territory is leaking.

The **Beaver** builds test dams -- comprehensive, structural, preventive. But the beaver builds new things. It doesn't burrow into existing structures to find what's broken inside them.

The **Eagle** soars above, seeing the architecture -- but the eagle sees from altitude. The problem here is underground, invisible from above. Beneath the surface. In the pipes and roots and buried connections.

There's a gap. The most common coding task -- debugging -- has no dedicated animal. No creature owns the methodical process of going from "something is broken" to "here is the root cause, here is the proof, here is the fix, here is the seal."

I kneel and press my palm against the earth. The vibration is stronger here. Something is tunneling beneath me. Patient. Thorough. Following the vibrations to their source.

I clear away the leaves. There, at the entrance to a tunnel, soft earth piled in a neat mound -- the sign of careful, deliberate work. Two small paws emerge, then a velvet snout. Dark fur, built for the underground. Eyes that don't need light because they work by feel.

**The Mole.**

## Candidates

**Mole** -- ⛏️ (pickaxe, because moles dig)

- Natural meaning: A small, powerful creature that lives underground, following vibrations through the earth. Nearly blind but extraordinarily sensitive. Builds extensive tunnel networks. Aerates the soil -- essential to the health of the forest even though you never see it working.
- Why it fits: PERFECT metaphor. Debugging is underground work. You can't see the bug from the surface. You have to go into the dark, follow the vibrations (error traces, symptoms, flaky behaviors), and dig methodically until you find the source. The mole doesn't guess -- it follows what it feels.
- The vibe: Patient, methodical, essential. Works in the dark and finds what's hidden.
- Potential issues: Moles are sometimes seen as pests. But in the grove, the mole is a hero -- the one who finds what's buried, who works where others can't, who makes the ground solid by understanding what's beneath it.

**Ferret** -- Would work for "ferreting out" bugs.

- Natural meaning: Burrows, hunts in tunnels. Playful, energetic.
- Why it fits: "Ferret out" is a common phrase for finding hidden things.
- The vibe: Too playful. Debugging requires patience and discipline, not manic energy.
- Potential issues: Ferrets are domesticated animals, doesn't fit the wild grove.

**Badger** -- Already taken for triage (`badger-triage`). Would have been a strong candidate otherwise -- tenacious, digs, doesn't give up. But the grove already has its badger.

**Groundhog** -- Reserved conceptually for "assumption testing" or "seeing your shadow" (confronting what you assume to be true). Not right for systematic debugging.

**Earthworm** -- Works underground, essential to soil health.

- Natural meaning: Processes earth, breaks down problems.
- The vibe: Too passive. No agency. The debugger needs to be an active pursuer, not a passive processor.
- Potential issues: Not an animal with enough character to carry a skill's personality.

## The Tagline Test

"The Mole follows vibrations to their source."
"The Mole goes where others can't see and finds what's hidden."
"Every bug has a root. The Mole digs until it finds it."

That first one. That's the one.

## Selection: Mole ⛏️

The Mole is the systematic debugger of the grove. It works underground, in the dark, where the problems actually live. While the panther waits for a visible target and the eagle surveys from above, the mole goes beneath the surface and follows the vibrations -- the symptoms, the traces, the intermittent failures -- back to their source.

**The Underground Framing:**

- Phases use earth/digging language: FEEL, DIG, TUNNEL, SURFACE, SEAL
- Symptoms are "vibrations," data flows are "root networks," hypotheses are "tunnels"
- The mole speaks in grounded, patient language -- never frantic, never guessing
- Think: a master plumber meets a scientific method researcher

**Key Differentiator from Bloodhound:**

- Bloodhound EXPLORES to understand. Mole DEBUGS to fix.
- Bloodhound maps territory you haven't seen. Mole finds what's broken in territory you thought you knew.
- Bloodhound produces maps and reports. Mole produces failing tests and root cause analysis.
- Bloodhound answers "how does this work?" Mole answers "why is this broken?"

**Key Differentiator from Panther:**

- Panther strikes at known prey. Mole finds the prey.
- Panther is fast and surgical. Mole is patient and methodical.
- Panther operates in one phase: locate and kill. Mole operates in five: reproduce, trace, hypothesize, fix, prevent.
- When the Mole surfaces with the root cause, it hands coordinates to the Panther for the kill (or fixes it itself in SURFACE phase).

**The Three-Burrow Threshold:**
The Mole's signature rule. After three failed fix attempts in different locations, the Mole stops digging. Three failures in three places means this isn't an isolated bug -- it's an architectural problem. The Mole surfaces and calls the Eagle for an aerial view. This prevents the most common debugging anti-pattern: endlessly chasing symptoms of a design flaw.

**The Vibration Log:**
The Mole's working document. A structured log of what's been tried, what was confirmed, what was refuted. This prevents the second most common anti-pattern: re-testing hypotheses you've already disproven because you lost track.

---

_The Mole pressed its paw against the earth, felt the tremor, and began to dig. By morning, the root cause lay exposed in the light. The forest breathed easier._
