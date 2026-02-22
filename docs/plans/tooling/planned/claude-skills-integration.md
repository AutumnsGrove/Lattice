---
title: "Skills Safari: Jeffallan/claude-skills Analysis"
status: planned
category: tooling
---

# Skills Safari: Jeffallan/claude-skills Analysis

> What can the wild teach us? What should we bring home to the Grove?
> **Aesthetic principle**: Steal the engineering, keep the soul
> **Scope**: Full comparison of 66 external skills vs 65 Grove skills

---

## Ecosystem Overview

**External repo**: [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills)
**66 skills** across 12 categories, **365 reference files**, **9 workflow commands**
**License**: MIT (everything is fair game)
**Lineage**: Adapted behavioral patterns from [obra/superpowers](https://github.com/obra/superpowers)

**Our ecosystem**: 68 entries in `.claude/skills/`
**24 animals** + 1 anomalous flat file (hummingbird), **6 gatherings**, **37 utility/Grove-specific skills**

---

## 1. The Fool's Mirror (External Skills)

### 1a. Structure & Architecture

Their skills follow a **progressive disclosure** architecture:

```
skill-name/
  SKILL.md              # 80-100 lines, the "menu"
  references/
    topic-a.md          # 100-600 lines, deep reference
    topic-b.md          # loaded only when needed
    topic-c.md
```

**SKILL.md anatomy:**
- YAML frontmatter (name, description, license, metadata)
- Role definition ("You are a senior X with Y years experience")
- "When to Use" triggers
- 5-step core workflow
- **Reference routing table** (topic → file → load condition)
- MUST DO / MUST NOT DO constraints
- Output templates
- Knowledge reference (one-liner of domain knowledge)

**Key insight — The Description Trap**: Skill descriptions must be *trigger-only*. When descriptions contain process steps, agents follow the brief summary instead of reading the full skill content. Format: `Use when [specific triggering conditions]`. This was learned from obra/superpowers and is well-documented in their research.

**Token efficiency**: ~80-100 line SKILL.md loads first. References (100-600 lines each) load *only when the routing table says they're needed*. Estimated 50% token reduction through selective loading.

### 1b. Skill Categories

| Category | Count | Examples |
|----------|-------|---------|
| Language Specialists | 12 | Python Pro, TypeScript Pro, Rust Engineer, Go Pro |
| Backend Frameworks | 7 | NestJS, Django, FastAPI, Spring Boot, Laravel |
| Frontend & Mobile | 7 | React, Next.js, Vue, Angular, Flutter |
| Infrastructure & Cloud | 5 | Kubernetes, Terraform, Postgres, Cloud Architect |
| API & Architecture | 7 | GraphQL, API Designer, WebSocket, MCP Developer |
| Quality & Testing | 4 | Test Master, Playwright, Code Reviewer, Documenter |
| DevOps & Operations | 5 | DevOps, Monitoring, SRE, Chaos, CLI Developer |
| Security | 2 | Secure Code Guardian, Security Reviewer |
| Data & ML | 6 | Pandas, Spark, ML Pipeline, Prompt Engineer, RAG |
| Platform | 4 | Salesforce, Shopify, WordPress, Atlassian |
| Specialized | 3 | Legacy Modernizer, Embedded Systems, Game Dev |
| Workflow | 3 | Feature Forge, Spec Miner, The Fool |

### 1c. Standout Skills (Binoculars Up)

#### The Fool — Critical Reasoning (No Grove Equivalent)
- 5 structured reasoning modes: Socratic questioning, Hegelian dialectic, Pre-mortem analysis, Red team adversarial, Falsification/evidence audit
- Steelmans the user's position before challenging it
- Drives toward synthesis, never leaves just objections
- Uses AskUserQuestion for mode selection (structured choices, not open-ended)
- **Verdict**: Genuinely novel. We have nothing like this.

#### Feature Forge — Requirements Gathering (Partial overlap: swan-design)
- Dual perspective: PM Hat + Dev Hat
- EARS format for functional requirements (Easy Approach to Requirements Syntax)
- Structured interview via AskUserQuestion
- Multi-agent pre-discovery for complex features
- **Verdict**: Our swan-design does specs but not structured requirements gathering. The EARS format and dual-hat approach are worth stealing.

#### Spec Miner — Reverse Engineering (Partial overlap: bloodhound-scout)
- "Software archaeologist" framing
- Read-only (allowed-tools: Read, Grep, Glob, Bash)
- Outputs EARS-format specs from existing code
- Distinguishes observed facts vs inferences
- **Verdict**: Bloodhound scouts but doesn't produce specs. Spec Miner is the "read backward" complement to Feature Forge's "write forward."

#### Debugging Wizard — Systematic Debugging (No Grove Equivalent)
- Scientific methodology: Reproduce → Isolate → Hypothesize → Fix → Prevent
- Three-fix threshold (3 failures = architectural review, not more fixes)
- References from obra/superpowers' systematic debugging methodology
- **Verdict**: We don't have a dedicated debugger. This is a gap.

#### Common Ground — Assumption Surfacing (No Grove Equivalent)
- Surfaces Claude's hidden assumptions about the project
- Three confidence tiers: ESTABLISHED, WORKING, OPEN
- Reasoning graph visualization (mermaid diagrams of decision trees)
- Persisted ground file per project
- **Verdict**: Brilliant concept. Addresses a real problem — when Claude silently assumes the wrong thing.

### 1d. Workflow Commands

Their `/project:*` workflow commands manage epics through a full lifecycle:

```
Discovery → Planning → Execution → Retrospectives
```

Deeply integrated with Jira/Confluence (Atlassian MCP). Impressive scope but tightly coupled to Atlassian infrastructure. Our gatherings are more flexible.

### 1e. From obra/superpowers (Their Lineage)

Key patterns they borrowed:
- **The 1% Rule**: If there's even a 1% chance a skill applies, read it. Non-negotiable.
- **TDD Iron Laws**: No production code without failing test first. Period.
- **Verification Before Completion**: No claims without fresh verification evidence.
- **The Description Trap**: Trigger-only descriptions.
- **Subagent-Driven Development**: Fresh subagent per task + two-stage review.
- **Three-Fix Threshold**: 3 failed fixes = stop and review architecture.

---

## 2. The Grove's Reflection (Our Skills)

### 2a. Our Architecture

Our skills are predominantly **single-file**:

```
skill-name/
  skill-name.md         # Full skill, 100-400+ lines, everything in one file
```

Some exceptions (hummingbird-compose.md is a standalone file, not a directory).

**No YAML frontmatter**. Descriptions live in the system-reminder skill listing.
**No reference routing tables**. Everything loads at once.
**Rich narrative voice**. Immersive, themed, fun.

### 2b. The Animal Kingdom (24 Animals + Hummingbird)

| Animal | Lines | Role | Equivalent External Skill |
|--------|-------|------|--------------------------|
| Panther | ~215 | Surgical issue fixing (6 phases) | — (no equivalent) |
| Elephant | ~563 | Multi-file feature building | Fullstack Guardian (loosely) |
| Bloodhound | ~427 | Codebase exploration | Spec Miner (partially) |
| Eagle | ~342 | System architecture | Architecture Designer |
| Fox | ~487 | Performance optimization | — (monitoring-expert loosely) |
| **Turtle** | **~1,118** | **Security hardening (19 exotic vectors)** | Secure Code Guardian |
| Raccoon | ~425 | Security auditing | Security Reviewer |
| Beaver | ~486 | Test building (Testing Trophy) | Test Master |
| Owl | ~557 | Documentation archiving (Grove voice) | Code Documenter |
| Swan | ~519 | Spec/design writing (ASCII art) | Feature Forge (partially) |
| Deer | ~669 | Accessibility sensing (WCAG 2.1 AA) | — (no equivalent) |
| Spider | ~716 | Auth web weaving (OAuth/PKCE) | — (no equivalent) |
| Robin | ~421 | Skill guide/navigator | — (no equivalent) |
| **Hawk** | **~992** | **Comprehensive security survey (14 domains, STRIDE)** | Security Reviewer (broader) |
| **Raven** | **~847** | **Cross-codebase security (6 parallel sub-agents)** | — (no equivalent) |
| Lynx | ~515 | PR review feedback (author-side) | Code Reviewer (loosely) |
| Osprey | ~673 | Project estimator (proposals) | — (no equivalent) |
| Vulture | ~430 | Issue board cleanup | — (no equivalent) |
| Bear | ~573 | Data migration (Kysely, batch) | Legacy Modernizer (loosely) |
| **Chameleon** | **~883** | **UI theming (glassmorphism, seasons)** | — (no equivalent) |
| Badger | ~533 | Issue triage/prioritization (6 phases) | — (no equivalent) |
| Bee | ~390 | Brain dump → GitHub issues | — (no equivalent) |
| Druid | ~607 | Meta: creates new animals | — (no equivalent) |
| Safari | ~428 | Systematic collection review | — (no equivalent) |
| Hummingbird | ~243 | Email composition (flat file) | — (no equivalent) |

**Size champions** (progressive disclosure candidates):
- turtle-harden: 1,118 lines (19 exotic attack vectors)
- hawk-survey: 992 lines (14 audit domains)
- chameleon-adapt: 883 lines (extensive palette/component reference)
- raven-investigate: 847 lines (6-sub-agent parallel fan-out)

**Druid ecosystem map is STALE**: Lists 18 animals, actual count is 24+1. Missing from map: safari-explore, osprey-appraise, hawk-survey, raven-investigate, lynx-repair, hummingbird-compose. Emoji mismatch: Druid uses cat emoji for Lynx; actual lynx-repair uses black cat emoji.

### 2c. Gatherings (Multi-Animal Compositions)

| Gathering | Animals Combined | External Equivalent |
|-----------|-----------------|-------------------|
| gathering-architecture | Eagle + Swan + Elephant | Architecture Designer + Fullstack Guardian |
| gathering-feature | Bloodhound + Elephant + Turtle + Beaver + Raccoon + Deer + Fox + Owl | Feature Forge → Fullstack Guardian → Test Master → Security Reviewer |
| gathering-migration | Bear + Bloodhound | Legacy Modernizer |
| gathering-planning | Bee + Badger | Feature Forge + workflow commands |
| gathering-security | Spider + Raccoon + Turtle | Secure Code Guardian + Security Reviewer |
| gathering-ui | Chameleon + Deer | — |

### 2d. What We Have That They Don't

1. **Animal personality system** — Immersive, memorable, fun. People don't forget "call the panther to strike" or "the beaver builds tests."
2. **Gatherings** — Multi-skill compositions that call multiple animals together. Their "skill combinations" are just suggestions; ours actually orchestrate.
3. **Grove-specific integration** — Skills deeply tied to our SvelteKit/Cloudflare/D1 stack.
4. **Druid** — Meta-skill for creating new animals. They have no "skill creator" skill.
5. **Safari (this skill!)** — Systematic review of collections. No external equivalent.
6. **Emotional voice** — Warmth, queer identity, authenticity baked into documentation skills.
7. **Vineyard** — Showcase/demo page builder.
8. **Walking Through the Grove** — Naming philosophy skill.
9. **Osprey** — Project estimation (unique in the wild).
10. **Museum documentation** — Narrative-driven documentation style.

---

## 3. Gap Analysis

### 3a. What They Have, We Lack

| Gap | Their Skill | Severity | Recommendation |
|-----|------------|----------|----------------|
| **Critical reasoning / devil's advocate** | The Fool | High | Create new animal |
| **Systematic debugging** | Debugging Wizard | High | Create new animal |
| **Assumption surfacing** | Common Ground | High | Create new command or animal |
| **Requirements gathering (structured)** | Feature Forge | Medium | Enhance swan-design |
| **Reverse-engineering specs** | Spec Miner | Medium | Enhance bloodhound-scout |
| **Progressive disclosure** | All skills | Medium | Adopt pattern across all skills |
| **Language-specific deep knowledge** | 12 language skills | Low | Not needed (we're SvelteKit-focused) |
| **Platform-specific skills** | Salesforce, Shopify, etc. | None | Not relevant to Grove |
| **Verification discipline** | MODELCLAUDE.md patterns | Medium | Adopt in AGENT.md or CLAUDE.md |
| **EARS format requirements** | Feature Forge | Medium | Add to swan-design references |

### 3b. What We Have, They Lack

| Advantage | Our Skill | Notes |
|-----------|----------|-------|
| Animal personality | All animals | Makes skills memorable and fun |
| Multi-skill orchestration | Gatherings | Their "combinations" are just lists |
| Accessibility specialist | Deer | They mention a11y in passing |
| Auth specialist | Spider | They have scattered auth references |
| Performance hunter | Fox | Their monitoring-expert is ops-focused |
| Issue board maintenance | Vulture | No equivalent |
| Project estimation | Osprey | No equivalent |
| PR review response | Lynx | Their code-reviewer is reviewer-side only |
| Naming philosophy | Walking Through the Grove | Unique to Grove |
| Codebase-integrated security | Hawk + Raven | More sophisticated than their 2 security skills |

---

## 4. Structural Improvements to Adopt

### 4a. Progressive Disclosure Architecture

**What**: Split large skills into SKILL.md (menu) + references/ (deep content)
**Why**: Token efficiency. Our skills often load 200-400 lines when only 80 are needed.
**How**: For each animal skill, extract deep-dive content into reference files with a routing table.

Example transformation for `panther-strike`:
```
panther-strike/
  panther-strike.md          # 80 lines: phases, workflow, constraints
  references/
    investigation-patterns.md  # Deep investigation guidance
    fix-strategies.md          # Fix patterns by issue type
    verification.md            # How to verify the fix
```

**Priority**: Medium. Worth doing for the biggest skills (elephant, gathering-feature, hawk-survey).

### 4b. YAML-like Metadata Headers

**What**: Add structured metadata to skill files.
**Why**: Enables discovery, routing, and tooling.
**How**: Not necessarily YAML frontmatter (our skills aren't processed by a YAML parser), but a consistent header block:

```markdown
<!-- metadata
triggers: security, audit, vulnerability, OWASP
domain: security
role: auditor
related: turtle-harden, spider-weave
-->
```

**Priority**: Low. Nice-to-have for tooling, not urgent.

### 4c. MUST DO / MUST NOT DO Constraint Blocks

**What**: Explicit constraint sections in every skill.
**Why**: Prevents common failure modes. Their skills are very disciplined about this.
**How**: Add to animals that lack them.

**Priority**: Medium. Our animals have personality but could use more guardrails.

### 4d. Reference Routing Tables

**What**: Tables mapping topics → reference files → load conditions.
**Why**: Explicit guidance on when to load what.
**How**: Add to skills that get progressive disclosure treatment.

```markdown
| Topic | Reference | Load When |
|-------|-----------|-----------|
| Investigation patterns | `references/investigation.md` | Complex multi-file issues |
| SvelteKit-specific fixes | `references/sveltekit.md` | SvelteKit route/component issues |
```

**Priority**: Medium. Goes hand-in-hand with progressive disclosure.

### 4e. Trigger-Only Descriptions

**What**: Ensure our skill descriptions in the system-reminder listing don't summarize the workflow.
**Why**: The Description Trap — agents follow the summary instead of reading the skill.
**How**: Audit all skill descriptions. Rewrite any that contain process steps.

**Priority**: High. This is a quick win with high impact.

---

## 5. New Animals for the Druid

### 5a. The Crow — Critical Reasoning (inspired by The Fool)

**Character**: The crow that perches on the highest branch and sees what others miss. Known for intelligence, problem-solving, and an unflinching willingness to call things as they are. Not mean — just honest.

**Phases**:
1. PERCH — Identify and steelman the position
2. TILT — Select reasoning mode (Socratic / Dialectic / Pre-mortem / Red team / Evidence audit)
3. CAW — Deliver 3-5 strongest challenges
4. LISTEN — Wait for user response
5. ROOST — Synthesize into a strengthened position

**Why**: We have no critical reasoning / devil's advocate skill. The Fool is one of the most novel skills in the external repo. A Crow would fill this gap perfectly within Grove's animal metaphor.

**Gathering potential**: `gathering-architecture` could include the Crow for architecture review.

### 5b. The Mole — Systematic Debugging

**Character**: The mole that burrows through the earth, following vibrations to their source. Patient, thorough, never guesses — only digs. Works in the dark and finds what's hidden.

**Phases**:
1. FEEL — Reproduce the issue, sense the vibrations
2. DIG — Trace the data flow, instrument boundaries
3. TUNNEL — Form and test hypotheses (one variable at a time)
4. SURFACE — Implement the fix with a failing test first
5. SEAL — Prevent recurrence with regression tests

**Three-burrow threshold**: After 3 failed fixes, the mole surfaces and calls the eagle for architectural review.

**Why**: We have no debugger animal. This is a real gap — debugging is one of the most common tasks.

### 5c. The Groundhog — Assumption Surfacing (inspired by Common Ground)

**Character**: The groundhog that pops up, looks around, and reports what it sees. "Is it still winter?" Surfaces what's hidden underground — the assumptions Claude is operating on.

**Phases**:
1. EMERGE — Scan project context (config files, patterns, history)
2. SURVEY — Classify assumptions by confidence (ESTABLISHED / WORKING / OPEN)
3. REPORT — Present assumptions for user validation
4. BURROW — Persist ground file for future sessions

**Why**: Common Ground is brilliant. When Claude silently assumes the wrong tech stack, wrong patterns, or wrong conventions, everything downstream is wrong. This solves that.

**Alternative**: This could be a **command** rather than an animal — `/common-ground` or `/groundhog` — since it's more of a utility than a workflow.

### 5d. Enhanced Bloodhound — Spec Mining Capability

Rather than a new animal, enhance `bloodhound-scout` with an optional `--spec` mode that outputs EARS-format specifications from its exploration findings.

**Why**: The Bloodhound already explores codebases. Adding spec output is a natural extension, and it avoids animal proliferation.

### 5e. Enhanced Swan — EARS Requirements Format

Add EARS format reference content to `swan-design` for structured requirements gathering.

**Why**: Swan already does specs. Adding the dual-hat (PM + Dev) interview approach and EARS syntax would make it more rigorous without creating a new animal.

---

## 6. Patterns to Steal (Implementation-Ready)

### 6a. The 1% Rule

Add to AGENT.md or CLAUDE.md:
> If there is even a 1% chance a skill applies to what you are doing, you ABSOLUTELY MUST read the skill. This is not negotiable.

**Why**: Prevents agents from rationalizing their way out of using skills.

### 6b. Verification Before Completion

Add to AGENT.md:
> NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.
> Before asserting any task is complete: Identify → Execute → Examine → Confirm → Then state.
> Forbidden language until verified: "should work", "probably done", "I think this fixes it", "Done!"

### 6c. Three-Fix Threshold

Add to debugging guidance:
> After 3 failed fix attempts in different locations → STOP. Three failures signal architectural problems, not isolated bugs. Question the architecture.

### 6d. Two-Stage Review

Add to lynx-repair or code review guidance:
> Stage 1: Spec Compliance — Does it meet requirements? Nothing more, nothing less?
> Stage 2: Code Quality — Only after spec compliance passes.
> Don't waste time reviewing code quality on code that doesn't meet spec.

### 6e. Anti-Agreement Theater

Already partially in our CLAUDE.md via the obra/superpowers lineage, but worth reinforcing:
> Never use: "You're absolutely right!", "Great point!", "Excellent feedback!"
> Instead: "Fixed. [description]" — Actions demonstrate understanding.

---

## 7. Deep-Dive: Security & DevOps Chain

Scout report on 8 additional skills plus Common Ground and superpowers research:

### The Operational Reliability Chain

Five skills form a coherent pipeline mapping to Grove's infrastructure maturity:

```
secure-code-guardian → security-reviewer → devops-engineer → sre-engineer → chaos-engineer
(write secure code)    (audit existing)     (deploy safely)   (define SLOs)   (stress test)
```

**secure-code-guardian**: "Thinks defensively, assumes all input is malicious." Not a checklist — a mindset. OWASP reference has copy-paste TypeScript with `// Bad` / `// Good` annotations. Our `turtle-harden` could adopt this annotated pattern library format.

**devops-engineer**: "Three hats" model (Build / Deploy / Ops) — maps to Grove: Wrangler builds, Cloudflare Workers deployment, D1/KV/R2 reliability.

**sre-engineer**: Key insight — "sustainable reliability that enables feature velocity." Reliability isn't the opposite of shipping; it's what allows shipping to continue. Error budget as policy object.

**chaos-engineer**: "Steady state first" — you can't know a system degraded unless you documented what normal looks like. Grove-relevant: "What happens when D1 is unavailable?", "What does the editor do if KV cache is cold?"

### MCP Developer — Future Grove Opportunity

A Grove MCP server exposing posts, seasonal themes, or notifications to Claude agents would enable powerful content workflows. SSE transport is the right choice for Cloudflare Workers.

### Common Ground — Architectural Elegance

The **immutable type + mutable tier** separation:
- **Types** (stated/inferred/assumed/uncertain) = audit trail, cannot be changed
- **Tiers** (ESTABLISHED/WORKING/OPEN) = confidence levels, user-adjustable
- The reasoning graph (`--graph`) externalizes Claude's decision tree into a manipulable Mermaid diagram

### Prompt Engineer — If Grove Builds AI Features

Treats prompts as versioned engineering artifacts. Evaluation frameworks are first-class citizens. If Grove builds AI writing assistance, this skill's patterns should be the standard.

---

## 8. What NOT to Copy

### 7a. Generic Language Skills
Their 12 language-specialist skills (Python Pro, Go Pro, etc.) are generic. We're a SvelteKit/TypeScript/Cloudflare shop. We don't need a Go Pro or Rust Engineer skill — we have `svelte5-development` which is far more specific and useful for us.

### 7b. Platform Skills
Salesforce, Shopify, WordPress, Atlassian — irrelevant to Grove.

### 7c. Jira/Confluence Integration
Their workflow commands are deeply coupled to Atlassian. Our gatherings and GitHub-based workflow are more aligned with our infrastructure.

### 7d. Role Definition Framing
"You are a senior engineer with 15+ years experience" — our animals have personalities, not resumes. The Grove voice is warmer than a role definition.

### 7e. Stripping Personality for Efficiency
Their skills are efficient but clinical. "Expert debugger applying systematic methodology" vs "The mole that burrows through the earth, following vibrations to their source." We should never trade personality for token efficiency. Progressive disclosure lets us have both.

---

## Expedition Summary

### By the numbers

| Metric | Count |
|--------|-------|
| Total stops (external skills examined) | 66 |
| Deep-read skills | 20 |
| Reference files examined | ~50 |
| Thriving (worth stealing) | 5 (The Fool, Common Ground, Debugging Wizard, Feature Forge, Spec Miner) |
| Growing (patterns to adopt) | 6 (progressive disclosure, routing tables, constraints, verification, 1% rule, description trap) |
| Wilting (partially useful) | 15 (language/framework skills with some reference content worth browsing) |
| Barren (not relevant) | 40 (platform-specific, generic, or already covered) |

### Recommended trek order

1. **Immediate** — Create The Crow (critical reasoning animal). Highest novelty, fills biggest conceptual gap.
2. **Immediate** — Create The Mole (debugging animal). Most common task without dedicated skill.
3. **Soon** — Add Groundhog/common-ground capability. Assumption surfacing prevents whole categories of wasted work.
4. **Soon** — Audit and fix skill descriptions (description trap). Quick win.
5. **Soon** — Add verification discipline to AGENT.md. Quick win.
6. **Later** — Progressive disclosure for largest skills (elephant, gathering-feature, hawk-survey).
7. **Later** — Enhance Swan with EARS format.
8. **Later** — Enhance Bloodhound with --spec mode.
9. **Eventually** — Add MUST DO/MUST NOT DO to all animals.
10. **Eventually** — Reference routing tables for skills that get progressive disclosure.

### Cross-cutting themes

**Theme 1: Discipline vs. Personality**
They have discipline (iron laws, verification, constraints). We have personality (animals, narratives, warmth). The best skills have both. Progressive disclosure lets us keep the personality in the SKILL.md while adding disciplined reference content underneath.

**Theme 2: Token Efficiency**
Their progressive disclosure saves ~50% tokens. Our single-file skills load everything. For large skills (400+ lines), this matters. For small skills (100 lines), it doesn't.

**Theme 3: Composability**
Their "skill combinations" are suggestions. Our gatherings are actual orchestrations. We're ahead here. The challenge is making gatherings work well with progressive disclosure.

**Theme 4: The obra/superpowers DNA**
Both ecosystems draw from obra/superpowers. We should read the source directly too: https://github.com/obra/superpowers

**Theme 5: Community vs. Bespoke**
Their repo is MIT, community-facing, generic. Ours is bespoke, personality-driven, Grove-specific. Neither is wrong — they serve different purposes. But we can steal their engineering without losing our soul.

### Top 8 borrowable micro-patterns (from deep-read analysis)

These are specific, implementation-ready patterns — not broad concepts but concrete techniques:

1. **Three-Fix Threshold** (debugging-wizard) — After 3 failed fixes in different locations, stop debugging and question the architecture. Named escape hatch for stuck loops.

2. **Two-step mode selection with signal mapping** (the-fool) — Category first ("Question assumptions" / "Build counter-arguments"), then refine. Maps user language signals ("I'm about to commit to X" → Dialectic, "Studies show..." → Evidence Audit) to modes.

3. **Pre-discovery subagent launches** (feature-forge) — Before the main workflow starts, launch Task subagents with relevant skills to front-load technical context. The interview then focuses on decisions, not exploration.

4. **Observed vs. inferred distinction** (spec-miner) — Hard constraint: mark every finding as "observed" (code evidence) or "inferred" (interpretation). Prevents hallucinated documentation.

5. **Anti-pattern reference format** (test-master) — Name the anti-pattern, show bad code, show good code, explain the fix. The `testing-anti-patterns.md` (232 lines) is the most practically useful reference in the set.

6. **Receiving-feedback perspective** (code-reviewer) — Six-Step Process for *handling* review feedback as the author: Read → Restate → Check codebase → Evaluate → Respond → Implement one at a time. Most review skills only cover the reviewer side.

7. **Explicit skill handoff protocol** (fullstack-guardian) — "Hand off to Test Master for QA, DevOps for deployment." Treats skills as a pipeline, not isolated prompts.

8. **Pre-computed quantified NFR targets** (architecture-designer) — 99% availability = 3.65 days/year downtime, 99.999% = 5.26 minutes. Having the math pre-computed removes lookup friction.

### The sister-skill pattern

Feature Forge (forward: requirements → spec) and Spec Miner (backward: code → spec) produce the same artifact (EARS-format specs) from opposite directions. This **sister-skill pattern** is elegant and worth replicating:

| Forward Skill | Backward Skill | Shared Artifact |
|--------------|---------------|-----------------|
| Feature Forge | Spec Miner | EARS-format specification |
| *Swan Design* | *Bloodhound Scout* | *Could share a spec format* |
| *Beaver Build* | *— (no reverse)* | *Test suites* |

Our Swan (writes specs forward) and Bloodhound (explores backward) could adopt a shared output format to become sister skills.

---

> *The fire dies to embers. The journal is full — 66 stops, 5 new animals sketched, 10 structural improvements mapped, the whole landscape charted. Tomorrow, the Druid walks the forest to meet the new creatures. The Crow finds its branch. The Mole begins to dig. But tonight? Tonight was the drive. And it was glorious.*
