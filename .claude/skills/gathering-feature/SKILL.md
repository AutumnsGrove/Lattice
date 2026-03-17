---
name: gathering-feature
description: The drum sounds. Eight animals gather — each a fresh subagent with its own context, model, and focus. The conductor orchestrates, verifies gates, and ensures every animal actually does its job. Use when building a full feature from exploration to documentation.
---

# Gathering Feature 🌲🐾

The drum echoes through the forest. But this time, it's different. The conductor stands at the center of the clearing — not doing the work, but orchestrating it. Each animal arrives with fresh eyes, reads its own instructions, and works with full attention. No context fatigue. No phoning it in. No "the code documents itself." Eight animals, eight fresh minds, one feature built right.

## When to Summon

- Building a complete feature from scratch
- Major functionality spanning frontend, backend, and database
- Features requiring exploration, implementation, testing, and documentation
- When you want the full lifecycle handled with consistent quality through every phase

**IMPORTANT:** This gathering is a **conductor**. It never writes code, tests, or docs directly. It dispatches subagents — one per animal — each with isolated context and an intentional model. The conductor only manages handoffs and gate checks.

---

## The Gathering

```
SUMMON → DISPATCH → GATE → DISPATCH → GATE → ... → CHORUS
  ↓         ↓        ↓        ↓        ↓              ↓
Spec    Bloodhound  Check  Elephant  Check    Final Verification
(self)   (haiku)     ✓     (opus)    ✓         & Summary
```

### Animals Dispatched

| Order | Animal        | Model  | Role                           | Fresh Eyes?                                    |
| ----- | ------------- | ------ | ------------------------------ | ---------------------------------------------- |
| 1     | 🐕 Bloodhound | haiku  | Scout codebase, map territory  | Yes — sees only the spec                       |
| 2     | 🐘 Elephant   | opus   | Build the feature across files | Yes — sees only spec + territory map           |
| 3     | 🐢 Turtle     | opus   | Harden security (adversarial)  | Yes — sees only file list, not build reasoning |
| 4     | 🦫 Beaver     | sonnet | Write tests from behavior      | Yes — sees only file list, not impl details    |
| 5a    | 🦝 Raccoon    | sonnet | Security audit + cleanup       | Yes — parallel                                 |
| 5b    | 🦌 Deer       | sonnet | Accessibility audit            | Yes — parallel                                 |
| 5c    | 🦊 Fox        | sonnet | Performance optimization       | Yes — parallel                                 |
| 6     | 🦉 Owl        | opus   | Write actual documentation     | Yes — receives full summary                    |

**Reference:** Load `references/conductor-dispatch.md` for exact subagent prompts and handoff formats

---

### Phase 1: SUMMON

_The drum sounds. The conductor steps into the clearing..._

The conductor (this skill) receives the feature request and prepares the dispatch plan:

- Clarify: What does this feature do? Which users benefit? What's in scope?
- Identify affected packages and likely file count
- Determine if Elephant needs multi-agent dispatch (>15 files across multiple packages)
- Confirm the gathering with the human

**Output:** Feature specification, estimated scope, dispatch plan confirmed.

---

### Phase 2: SCOUT (Bloodhound)

_The conductor signals. The Bloodhound enters the forest..._

```
Agent(bloodhound, model: haiku)
  Input:  feature spec only
  Reads:  bloodhound-scout/SKILL.md (MANDATORY)
  Output: territory map
```

Dispatch a **haiku subagent** to scout the codebase. The Bloodhound receives ONLY the feature specification — no opinions, no pre-analysis. It reads its own skill file and executes its full SCENT → TRACK → HUNT → REPORT workflow.

**Handoff to conductor:** Territory map (files to change, patterns found, integration points, existing conventions, potential obstacles).

**Gate check:** Territory map received with at least: file list, pattern summary, integration points. If incomplete, resume the agent with specific questions.

---

### Phase 3: BUILD (Elephant)

_The ground trembles. The Elephant arrives..._

```
Agent(elephant, model: opus)
  Input:  feature spec + territory map (from Bloodhound)
  Reads:  elephant-build/SKILL.md + references (MANDATORY)
  Output: built files list + implementation summary
```

Dispatch an **opus subagent** to build the feature. The Elephant receives the spec and territory map — NOT the Bloodhound's reasoning process, just its structured output.

**Multi-agent dispatch** (when scope > 15 files or spans 3+ packages):

```
Agent(elephant-backend, model: opus)   → API routes, services, migrations
Agent(elephant-frontend, model: opus)  → Svelte components, stores, pages    PARALLEL
Agent(elephant-schema, model: sonnet)  → Database migrations, types

Then: Agent(elephant-wire, model: opus) → Integration wiring across all three
```

Each sub-elephant reads `elephant-build/SKILL.md` and works on its domain only.

**Cross-cutting standards the Elephant MUST follow:**

- Signpost error codes for all error paths (`buildErrorJson`, `throwGroveError`)
- Rootwork type safety at boundaries (`parseFormData`, `safeJsonParse`)
- Reference: `AgentUsage/error_handling.md`, `AgentUsage/rootwork_type_safety.md`

**Handoff to conductor:** File list (every file created/modified), implementation summary (what was built, key decisions), any open questions.

**Gate check:** Run `gw ci --affected --fail-fast` — must at least compile. If build fails, resume the Elephant agent with error output.

---

### Phase 4: HARDEN (Turtle)

_The Turtle approaches slowly. It sees only what was built — not why..._

```
Agent(turtle, model: opus)
  Input:  file list ONLY (not Elephant's reasoning — fresh adversarial eyes)
  Reads:  turtle-harden/SKILL.md + references (MANDATORY)
  Output: hardening report + applied fixes
```

Dispatch an **opus subagent** for security hardening. The Turtle receives ONLY the file list — not the Elephant's implementation summary. This is intentional: the Turtle should examine the code with adversarial fresh eyes, not sympathize with the builder's reasoning.

**What the Turtle hardens:**

- Input validation (Zod schemas on all entry points)
- Output encoding (context-aware, DOMPurify for rich text)
- Parameterized queries (no string concatenation in SQL)
- Security headers (CSP with nonces, HSTS, X-Frame)
- Signpost error codes (verify Elephant used them correctly)
- Rootwork boundary safety (verify no `as` casts at trust boundaries)

**Handoff to conductor:** Hardening report (what was found, what was fixed, defense layers applied), updated file list.

**Gate check:** Run `gw ci --affected --fail-fast` — must still compile after hardening. If broken, resume Turtle agent.

---

### Phase 5: TEST (Beaver)

_The Beaver surveys the stream. It doesn't know how the dam was built — only what it should hold..._

```
Agent(beaver, model: sonnet)
  Input:  file list + feature spec (NOT implementation details)
  Reads:  beaver-build/SKILL.md + references (MANDATORY)
  Output: test suite + test results
```

Dispatch a **sonnet subagent** to write tests. The Beaver receives the file list and the original feature spec — NOT the Elephant's implementation summary or Turtle's hardening report. Tests should be written from **behavior**, not from reading the code.

**What the Beaver tests:**

- Feature behavior (from the spec, not the code)
- Security regressions (API routes return proper `error_code` fields)
- Boundary validation (rejection of bad input)
- Catch block type guards (`isRedirect`/`isHttpError`)

**Handoff to conductor:** Test file list, test results (pass/fail counts), any behavioral gaps found.

**Gate check:** ALL tests pass. Run `gw ci --affected --fail-fast --diagnose`. If tests fail, resume Beaver agent with failure output. If a test reveals an implementation bug, note it for the conductor to decide: resume Elephant or Turtle?

---

### Phase 6: AUDIT (Raccoon + Deer + Fox — PARALLEL)

_Three animals enter the clearing at once. Each sees with different eyes..._

Dispatch three subagents **simultaneously**:

```
Agent(raccoon, model: sonnet)  → Input: file list + feature scope
  Reads: raccoon-audit/SKILL.md
  Focus: secrets, dead code, dependency audit, unsafe patterns

Agent(deer, model: sonnet)     → Input: UI file list + feature spec      PARALLEL
  Reads: deer-sense/SKILL.md
  Focus: keyboard nav, screen readers, contrast, touch targets

Agent(fox, model: sonnet)      → Input: hot path files + feature spec
  Reads: fox-optimize/SKILL.md
  Focus: bundle size, query performance, lazy loading
```

Each animal works in isolation. They don't see each other's findings. The conductor collects all three reports.

**Handoff to conductor:** Three reports — audit findings, a11y findings, performance findings. Plus any fixes each animal applied.

**Gate check:** Review all three reports. If any animal found issues that need fixing:

- Security issues → conductor applies fixes or re-dispatches targeted agent
- A11y issues → conductor applies fixes
- Performance issues → conductor applies fixes
- Re-run `gw ci --affected --fail-fast --diagnose` after all fixes

---

### Phase 7: DOCUMENT (Owl)

_The Owl opens its eyes. It has heard everything — now it speaks..._

```
Agent(owl, model: opus)
  Input:  FULL gathering summary (spec, territory map, file list,
          hardening report, test results, audit/a11y/perf reports)
  Reads:  owl-archive/SKILL.md + references (MANDATORY)
  Output: actual documentation written to files
```

Dispatch an **opus subagent** to write documentation. The Owl receives the FULL gathering summary — it needs context to write meaningful docs. Opus because documentation requires warmth, voice, and the judgment to know what's worth documenting.

**What the Owl writes:**

- Help article or user-facing documentation (if feature is user-visible)
- API documentation (if new endpoints were created)
- Inline code comments where logic isn't self-evident (NOT "the code documents itself")
- Update any affected existing docs

**Handoff to conductor:** Documentation file list, summary of what was documented.

**Gate check:** Verify documentation files exist and have actual content (not stubs).

---

### Phase 8: CHORUS

_Dawn breaks. The conductor raises their hands. The forest sings..._

The conductor runs final verification and presents the summary:

```bash
# Final verification — the whole gathering's work proven sound
pnpm install
gw ci --affected --fail-fast --diagnose
```

**Component Audit Gate (for features with UI components):**

Before page-level verification, audit every UI component built or modified by the Elephant in isolation using Showroom:

```bash
# For each component built or modified:
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/[path-to-component].svelte

# For new components, scaffold fixtures first:
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/[path-to-component].svelte --scaffold
```

All Showroom compliance violations must be resolved before proceeding. If violations are found, resume the Elephant with specific findings.

**Visual Verification (for features with UI):**

```bash
uv run --project tools/glimpse glimpse matrix \
  "http://localhost:5173/[feature-page]?subdomain=midnight-bloom" \
  --seasons autumn,winter --themes light,dark --logs --auto
```

**Completion Report:**

```
🌲 GATHERING FEATURE COMPLETE

Feature: [Name]

DISPATCH LOG
  🐕 Bloodhound (haiku)  — [territory mapped, X files identified]
  🐘 Elephant (opus)      — [Y files built across Z packages]
  🐢 Turtle (opus)        — [N hardening fixes applied, M defense layers]
  🦫 Beaver (sonnet)      — [P tests written, all passing]
  🦝 Raccoon (sonnet)     — [audit clean / N issues fixed]
  🦌 Deer (sonnet)        — [a11y verified / N issues fixed]
  🦊 Fox (sonnet)         — [performance verified / N optimizations]
  🦉 Owl (opus)           — [documentation written at: paths]

GATE LOG
  After Scout:    ✅ territory map complete
  After Build:    ✅ compiles clean
  After Harden:   ✅ compiles clean, hardening applied
  After Test:     ✅ all tests pass
  After Audit:    ✅ findings resolved
  After Document: ✅ docs written (not stubs)
  Showroom:       ✅ all components pass compliance audit
  Final CI:       ✅ gw ci --affected passes

The forest grows. The feature lives.
```

---

## Conductor Rules

### Never Do Animal Work

The conductor dispatches. It does not scout, build, harden, test, audit, or document. If you catch yourself writing code, stop — you should be dispatching a subagent.

### Fresh Eyes Are a Feature

Turtle and Beaver intentionally receive LESS context than the full history. Turtle doesn't see Elephant's reasoning (adversarial fresh eyes). Beaver doesn't see implementation details (behavioral testing). This isolation produces better results.

### Gate Every Transition

Run verification between every animal. Don't let bad state cascade — catch it early.

### Parallel When Possible

Raccoon, Deer, and Fox run simultaneously. Three fresh agents, three different concerns, zero context sharing.

### Multi-Agent for Heavy Phases

If Elephant would touch 15+ files across multiple packages, split into domain-focused sub-elephants. Each reads the skill, each handles its domain, then a wiring agent integrates.

### Resume, Don't Restart

If a gate check fails, **resume** the failing agent with the error context. Don't spawn a new one — the resumed agent has its prior work in context.

### Communication

- "The drum sounds..." (summoning)
- "Dispatching [animal]..." (spawning subagent)
- "Gate check: [result]..." (verifying between phases)
- "The chorus rises..." (final verification)

---

## Anti-Patterns

**The conductor does NOT:**

- Write code, tests, or documentation itself (dispatch subagents)
- Pass full conversation history to every agent (structured handoffs only)
- Skip gate checks ("I'm sure it's fine")
- Run all animals in the same context (the whole point is isolation)
- Let agents skip reading their skill file (MANDATORY in every prompt)
- Declare documentation "complete" without verifying files exist with content
- Continue after a gate failure without fixing it

---

## Quick Decision Guide

| Scope                                  | Dispatch Strategy                                        |
| -------------------------------------- | -------------------------------------------------------- |
| Small feature (< 10 files)             | Standard: one agent per animal                           |
| Medium feature (10-20 files)           | Standard, but consider parallel sub-elephants            |
| Large feature (20+ files, 3+ packages) | Multi-elephant dispatch + parallel audit phase           |
| UI-only feature                        | Skip Fox, emphasize Deer, add Glimpse verification       |
| API-only feature                       | Skip Deer, emphasize Turtle + Raccoon                    |
| Feature with existing tests            | Beaver reviews + extends instead of writing from scratch |

---

## Integration

**Before:** `swan-design` or `eagle-architect` for spec/architecture
**During:** `mole-debug` if a gate check reveals mysterious failures
**After:** `crow-reason` to challenge the result before shipping

---

_When the drum sounds, the forest answers — with fresh eyes, full attention, and no animal phoning it in._ 🌲
