---
name: gathering-architecture
description: The drum sounds. Eagle, Crow, Swan, and Elephant gather for system architecture. Use when designing major systems from vision to implementation.
---

# Gathering Architecture 🌲🦅

_The conductor dispatches one subagent per animal, each with isolated context and an intentional model. It manages handoffs and gate checks — it never does the work itself._

## When to Summon

- Designing new systems or services
- Major architectural decisions
- Refactoring core infrastructure
- Creating platforms that other features build upon
- When vision, challenge, specification, and implementation must flow in sequence

**IMPORTANT:** This gathering is a **conductor**. It never designs, challenges, specifies, or builds directly. It dispatches subagents — one per animal — each with isolated context and an intentional model. The conductor only manages handoffs and gate checks.

---

## The Gathering

```
SUMMON → DISPATCH → GATE → DISPATCH → GATE → DISPATCH → GATE → DISPATCH → GATE → CHORUS
  ↓         ↓        ↓        ↓        ↓        ↓        ↓        ↓        ↓        ↓
Spec     Eagle    Check     Crow    Check     Swan    Check   Elephant  Check    Final
(self)   (opus)    ✓      (sonnet)   ✓      (opus)    ✓      (opus)     ✓     Verify
```

### Animals Dispatched

| Order | Animal      | Model  | Role                           | Fresh Eyes?                                               |
| ----- | ----------- | ------ | ------------------------------ | --------------------------------------------------------- |
| 1     | 🦅 Eagle    | opus   | Design high-level architecture | Yes — sees only the system spec                           |
| 2     | 🐦‍⬛ Crow     | sonnet | Challenge the design           | Yes — sees architecture doc only, not Eagle's reasoning   |
| 3     | 🦢 Swan     | opus   | Write detailed specification   | Yes — sees strengthened architecture (Eagle + Crow fixes) |
| 4     | 🐘 Elephant | opus   | Build the foundation           | Yes — sees only Swan's spec                               |

**Reference:** Load `references/conductor-dispatch.md` for exact subagent prompts and handoff formats

---

### Phase 1: SUMMON

The conductor receives the architecture request and prepares the dispatch plan:

**Clarify the System:**

- What problem does this solve?
- What are the scale requirements?
- What are the constraints?
- What's the growth trajectory?

**Nature Metaphor:**

> "Every architecture needs a nature metaphor. What does this system resemble?
> Heartwood (core), Wisp (gentle guide), Porch (gathering place), or something else?"

**Infrastructure Abstractions:**

- Use `GroveDatabase`/`GroveStorage`/`GroveKV`/`GroveServiceBus` from Server SDK for portability
- Use Amber SDK (FileManager, QuotaManager) for user file management — not raw R2
- Use Rootwork utilities at all data boundaries

**Confirm with the human, then proceed.**

**Output:** System specification, dispatch plan confirmed.

---

### Phase 2: DESIGN (Eagle)

```
Agent(eagle, model: opus)
  Input:  system specification only
  Reads:  eagle-architect/SKILL.md + references (MANDATORY)
  Output: architecture overview document
```

Dispatch an **opus subagent** to design the architecture. The Eagle receives ONLY the system specification. It reads its own skill file and executes its full workflow.

**What the Eagle produces:**

- System boundaries and component interactions
- Technology choices with rationale
- Scale constraints and growth strategy
- Data flow diagrams
- Architecture Decision Records (ADRs)
- Nature metaphor for the system

**Handoff to conductor:** Architecture overview document (structured, not conversational).

**Gate check:** Architecture document exists with: system boundaries, component diagram, technology choices, ADRs. If incomplete, resume Eagle with specific questions.

---

### Phase 3: CHALLENGE (Crow)

```
Agent(crow, model: sonnet)
  Input:  architecture document ONLY (not Eagle's reasoning process)
  Reads:  crow-reason/SKILL.md (MANDATORY)
  Output: challenge report + strengthened design recommendations
```

Dispatch a **sonnet subagent** in Red Team mode against the Eagle's architecture. The Crow receives ONLY the architecture document — NOT the Eagle's internal reasoning. This isolation is intentional: the Crow should challenge the design on its own merits, not be persuaded by the architect's justifications.

**What the Crow challenges:**

- Assumptions that aren't proven
- Single points of failure
- Complexity that could be simpler
- Scale claims without evidence
- Missing failure modes
- Operational burden on a small team

**Handoff to conductor:** Challenge report (Roost summary) with specific recommendations. The conductor then decides which challenges require Eagle revision.

**Gate check:** Crow produced challenges with specific, actionable recommendations (not vague concerns). If challenges reveal fundamental design issues, resume Eagle with the Crow's findings for revision.

**Iteration:** If Eagle needs revision:

1. Resume Eagle with Crow's specific findings
2. Eagle produces revised architecture
3. Optionally resume Crow for re-challenge (max 2 iterations)

---

### Phase 4: SPECIFY (Swan)

```
Agent(swan, model: opus)
  Input:  strengthened architecture (Eagle's doc + resolved Crow challenges)
  Reads:  swan-design/SKILL.md + references (MANDATORY)
  Output: complete technical specification
```

Dispatch an **opus subagent** to write the detailed specification. The Swan receives the architecture document as strengthened by the Crow's challenges — it sees the resolved design, not the debate.

**What the Swan produces:**

- API contracts (request/response formats)
- Database schema with relationships
- Flow diagrams for key operations
- Implementation checklist ordered by dependency
- Error handling patterns (Signpost codes)
- Configuration and deployment requirements

**Handoff to conductor:** Complete technical specification document.

**Gate check:** Specification has: API contracts, database schema, flow diagrams, implementation checklist. If missing sections, resume Swan.

---

### Phase 5: BUILD (Elephant)

```
Agent(elephant, model: opus)
  Input:  Swan's technical specification ONLY
  Reads:  elephant-build/SKILL.md + references (MANDATORY)
  Output: built foundation + file list
```

Dispatch an **opus subagent** to build the architectural foundation. The Elephant receives ONLY the Swan's specification — not the Eagle's vision doc or Crow's challenges. The spec is the single source of truth for building.

**What the Elephant builds:**

- Database migrations and schema
- Core services and business logic
- API route skeletons with proper error handling
- Type definitions
- Essential tests for the foundation
- Configuration files

**Cross-cutting standards (NON-NEGOTIABLE):**

- Signpost error codes on all error paths
- Rootwork type safety at all boundaries
- Engine-first pattern (check before duplicating)

**Handoff to conductor:** File list (every file created/modified), implementation summary, any deviations from spec.

**Gate check:**

```bash
pnpm install
node .github/scripts/affected-packages.mjs origin/main \
  | jq '{testMatrix, typecheckMatrix}'
# then run what it prints, and pnpm lint
```

Must compile and pass. If it fails, resume Elephant with the error.

---

### Phase 6: CHORUS

The conductor runs final verification and presents the summary:

Run the VERIFICATION.md's self-verification protocol (affected typechecks, affected tests, `pnpm lint`).

**Completion Report:**

```
🌲 GATHERING ARCHITECTURE COMPLETE

System: [Name]

DISPATCH LOG
  🦅 Eagle (opus)      — [architecture designed, X ADRs written]
  🐦‍⬛ Crow (sonnet)   — [Y challenges raised, Z resolved]
  🦢 Swan (opus)        — [specification written, N sections]
  🐘 Elephant (opus)    — [foundation built, M files across P packages]

GATE LOG
  After Eagle:    ✅ architecture document complete
  After Crow:     ✅ challenges resolved, design strengthened
  After Swan:     ✅ specification complete with all sections
  After Elephant: ✅ compiles clean, foundation tested
  Final CI:       ✅ verification protocol clean

ARTIFACTS
  Architecture: [doc path]
  Specification: [spec path]
  Foundation: [code locations]
  Tests: [test locations]

The forest has a new landmark.
```

---

## Conductor Rules

**Never Do Animal Work.** The conductor dispatches. It does not design, challenge, specify, or build.

**Fresh Eyes Are a Feature.** Crow sees only the architecture document, not Eagle's reasoning. Elephant sees only Swan's spec, not the debate history. This isolation produces better results at every stage.

**Gate Every Transition.** Verify output between every animal. Architecture must be complete before challenge. Challenges must be resolved before specification. Spec must be complete before building.

**Resume, Don't Restart.** If a gate check fails or Crow reveals fundamental design issues, **resume** the relevant agent. Don't spawn new ones.

---

## Anti-Patterns

**The conductor does NOT:**

- Design architecture itself (dispatch Eagle)
- Soften Crow's challenges (pass them to Eagle unfiltered)
- Let Elephant see the design debate (only the final spec)
- Skip the Crow phase ("the design looks fine")
- Let agents skip reading their skill file
- Continue after a gate failure

---

## Quick Decision Guide

| Scope                            | Strategy                                        |
| -------------------------------- | ----------------------------------------------- |
| New system, full design needed   | All four: Eagle → Crow → Swan → Elephant        |
| Spec exists, need implementation | Elephant only (with spec as input)              |
| Design review, no implementation | Eagle → Crow → Swan (skip Elephant)             |
| Quick design, team will build    | Eagle → Crow (skip Swan + Elephant)             |
| Large foundation (20+ files)     | Multi-Elephant dispatch (see gathering-feature) |

---

_From vision to foundation, the forest grows._ 🌲
