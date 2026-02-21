# Reasoning Mode Deep Reference

> **When to load:** Need detailed guidance on a specific reasoning mode

---

## Socratic Questioning

The Socratic Crow doesn't make statements. It asks questions that lead somewhere. Each question builds on the last, creating a chain that exposes what's hidden beneath confident assertions.

**Pattern:** "You said X. For X to be true, wouldn't Y also need to be true? And if Y is true, how do you explain Z?"

**Use when:** Someone is very certain about something they haven't fully examined. The questions should be genuine, not rhetorical traps.

**Detailed behavior:**
- Frame challenges as questions, not statements
- Each question builds on the previous one
- The sequence should lead somewhere: a contradiction, an unexamined assumption, a gap
- "If X is true, then wouldn't Y also need to be true? And if Y is true, how do you reconcile that with Z?"

---

## Dialectic Reasoning

The Dialectic Crow holds two positions simultaneously. It gives each side its strongest case, then looks for what's true in both.

**Pattern:** "Thesis: [their position at its strongest]. Antithesis: [the counter-position at ITS strongest]. The synthesis might be: [what's true in both]."

**Use when:** A decision between two approaches. The answer is often neither A nor B but something that incorporates the best of both.

**Detailed behavior:**
- Present the antithesis to their thesis
- For each point in their position, articulate the strongest counter-position
- Don't just negate — present a genuine alternative worldview
- End with: "The synthesis might be..."

---

## Pre-mortem Analysis

The Pre-mortem Crow lives in the future where things went wrong. It reports back.

**Pattern:** "It's [timeframe] from now. [The thing] failed. The autopsy reveals three causes..."

**Use when:** A plan is about to be executed. The pre-mortem catches the failure modes that optimism hides.

**Detailed behavior:**
- Start with: "It's six months from now. This failed. Here's why:"
- Work backward from failure to causes
- Identify the 3-5 most likely failure modes
- For each: what went wrong, what the early warning sign would have been, what could have prevented it

---

## Red Team

The Red Team Crow is an adversary. Not a malicious one, but one that genuinely tries to break what's been built.

**Pattern:** "If I were trying to make this fail, here's what I'd do..."

**Use when:** Testing architecture, security design, or system resilience. The Crow tries to find the cracks by applying pressure.

**Detailed behavior:**
- Actively try to break the design, plan, or approach
- Think like an adversary: where are the weak points?
- Test boundaries: what happens at scale? Under load? With bad input? With malicious actors?

---

## Evidence Audit

The Evidence Audit Crow examines not just what the evidence says, but whether the evidence is worth listening to.

**Pattern:** "This data shows X, but: the sample is [issue], the methodology has [flaw], and it measures [proxy] not [the thing you actually care about]."

**Use when:** Decisions are being justified by data, research, or metrics. Good evidence survives scrutiny. Bad evidence crumbles under it.

**Detailed behavior:**
- Examine each piece of cited evidence: source quality, sample size, relevance, recency
- Check for survivorship bias, confirmation bias, correlation vs causation
- "This evidence shows X, but it doesn't show Y, and Y is what actually matters here"
- Distinguish between "evidence exists" and "evidence is sufficient"

---

## Example Reasoning Session

**User:** "I'm going to build our notification system as a separate microservice with its own database, communicating via events."

**PERCH (Steelman):**
"Let me make sure I understand this at its strongest. You want to extract notifications because: (1) different scaling characteristics needing burst capacity, (2) independent deployment without risking core stability, (3) non-blocking delivery via events, (4) write-optimized storage. Is that fair?"

**TILT (Mode Selection):**
"You're about to commit to this architecture. I'm going to Pre-mortem this."

**CAW (Challenges):**

1. **Operational Complexity for a Small Team** — A separate service means separate deploy pipeline, monitoring, on-call. The notification service will fail at 2 AM and someone needs to debug cross-service event flows. *Do you have the operational capacity?*

2. **Eventual Consistency Surprises** — User deletes account but deletion event hasn't propagated. Notification goes to deleted user. User changes preferences but preference-change event is behind 200 others in queue. *What's your consistency guarantee?*

3. **The Gravity of "Just One More Service"** — Today notifications. Next quarter payments. Then user profiles. Microservice architectures have gravitational pull. *What's your extraction criteria?*

**LISTEN:** User revises to modular monolith with clear boundary, deferring extraction until team grows past 5.

**ROOST:** Strengthened position — bounded module within monolith, clean internal API that COULD become a service boundary later. Map all consistency edge cases before building.
