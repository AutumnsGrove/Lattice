---
name: gathering-migration
description: The drum sounds. Bear and Bloodhound gather for safe migration. Use when migrating anything that requires both careful movement and codebase understanding.
---

# Gathering Migration 🌲🐻🐕

The drum echoes through the valleys. The conductor stands at the pass, orchestrating two very different strengths. The Bloodhound arrives first with fresh eyes — no assumptions about what's connected, just a nose for dependencies. Then the Bear wakes, receiving a map it didn't draw — no shortcuts, no "I already know where things are." Together they move mountains safely, each with isolated context, each trusting only what it verified itself.

## When to Summon

- Complex migrations requiring codebase exploration before execution
- Moving between systems, libraries, or architectural patterns
- Schema changes affecting multiple relationships
- Component or API migrations spanning many files
- Icon, asset, or content migrations with downstream dependencies
- Any migration where you need to understand the territory before moving

**IMPORTANT:** This gathering is a **conductor**. It never scouts or migrates directly. It dispatches subagents — one per animal — each with isolated context and an intentional model. The conductor only manages handoffs and gate checks.

---

## The Gathering

```
SUMMON → DISPATCH → GATE → DISPATCH → GATE → VERIFY
  ↓         ↓        ↓        ↓        ↓        ↓
Spec    Bloodhound  Check    Bear    Check    Final
(self)   (haiku)     ✓     (opus)    ✓     Verify
```

### Animals Dispatched

| Order | Animal        | Model | Role                              | Fresh Eyes?                                         |
| ----- | ------------- | ----- | --------------------------------- | --------------------------------------------------- |
| 1     | 🐕 Bloodhound | haiku | Scout dependencies, map territory | Yes — sees only the migration spec                  |
| 2     | 🐻 Bear       | opus  | Execute migration safely          | Yes — sees only territory map, not scouting process |

**Reference:** Load `references/conductor-dispatch.md` for exact subagent prompts and handoff formats

---

### Phase 1: SUMMON

_The drum sounds. The valley listens..._

The conductor receives the migration request and prepares the dispatch plan:

**Clarify the Migration:**

- What needs to migrate? (data, components, icons, config, conventions...)
- From where to where? (old pattern → new pattern)
- What downstream dependencies exist?
- What does "undo" look like if something goes wrong?

**Determine the Bear's domain guide:**

| Migration Type                         | Domain Guide           |
| -------------------------------------- | ---------------------- |
| Database schema, tables, D1/SQLite     | `domain-database.md`   |
| Component props, API upgrades, imports | `domain-components.md` |
| Icons, assets, documents, file formats | `domain-content.md`    |
| Config, conventions, dependencies      | `domain-general.md`    |

**Confirm with the human, then proceed.**

**Output:** Migration specification, domain guide identified, dispatch plan confirmed.

---

### Phase 2: SCOUT (Bloodhound)

_The conductor signals. The Bloodhound puts its nose to the ground..._

```
Agent(bloodhound, model: haiku)
  Input:  migration specification only
  Reads:  bloodhound-scout/SKILL.md (MANDATORY)
  Output: territory map
```

Dispatch a **haiku subagent** to scout the codebase. The Bloodhound receives ONLY the migration specification — no pre-analysis, no assumptions. It reads its own skill file and executes its full SCENT → TRACK → HUNT → REPORT → RETURN workflow.

**What the Bloodhound maps:**

- Every reference to the items being migrated
- Dependency relationships (what depends on what)
- Downstream consumers
- Edge cases and unusual usage patterns
- Current state counts (how many items, how many references)

**Handoff to conductor:** Territory map (affected files, dependency graph, edge cases, current state counts, risk assessment).

**Gate check:** Territory map has: file lists, dependency relationships, item counts, edge cases identified. If incomplete, resume Bloodhound with specific questions.

---

### Phase 3: MIGRATE (Bear)

_The Bear wakes. It receives a map it didn't draw..._

```
Agent(bear, model: opus)
  Input:  migration spec + territory map (from Bloodhound)
  Reads:  bear-migrate/SKILL.md + references/{domain-guide} (MANDATORY)
  Output: migration results + file list
```

Dispatch an **opus subagent** to execute the migration. The Bear receives the spec and the Bloodhound's territory map — NOT the Bloodhound's scouting process, just its structured output.

**What the Bear does:**

- Preserve original state (branch, backup, or snapshot)
- Execute migration in manageable chunks
- Validate after each chunk
- Verify item counts match (source vs destination)
- Run integrity checks (references resolve, imports work, no orphans)

**Handoff to conductor:** Migration results (items migrated, items skipped, validation reports), file list.

**Gate check:**

```bash
pnpm install
gw dev ci --affected --fail-fast --diagnose
```

Must compile and pass. If it fails, resume Bear with the error.

---

### Phase 4: VERIFY

_The journey ends. The conductor confirms safe arrival..._

**Validation Checklist:**

- [ ] Bloodhound: All dependencies mapped
- [ ] Bloodhound: All references found
- [ ] Bloodhound: Edge cases documented
- [ ] Bear: Original state preserved (branch, backup, or snapshot)
- [ ] Bear: Item counts match (source vs destination)
- [ ] Bear: Integrity checks pass (references resolve, imports work, no orphans)
- [ ] Bear: Tests pass (`gw dev ci --affected`)
- [ ] Bear: Rollback path documented

**Completion Report:**

```
🌲 GATHERING MIGRATION COMPLETE

Migration: [Description]

DISPATCH LOG
  🐕 Bloodhound (haiku) — [territory mapped, X files identified, Y dependencies found]
  🐻 Bear (opus)         — [Z items migrated, domain guide: {guide}]

GATE LOG
  After Bloodhound: ✅ territory map complete
  After Bear:       ✅ compiles clean, migration verified
  Final CI:         ✅ gw dev ci --affected passes

MIGRATION RESULTS
  Items migrated: [count]
  Items skipped: [count, reason]
  Item count match: ✅ [source] = [dest]
  Integrity checks: ✅
  Rollback: [branch/backup location]

Everything found its new home.
```

---

## Conductor Rules

### Never Do Animal Work

The conductor dispatches. It does not scout dependencies or execute migrations.

### Fresh Eyes Are a Feature

The Bear receives the territory map, not the Bloodhound's scouting process. It trusts the map but verifies what it finds during migration.

### Gate Every Transition

Territory map must be complete before Bear starts. CI must pass after Bear finishes.

### Resume, Don't Restart

If a gate check fails, resume the failing agent. The Bear especially benefits from resumption — it has the migration context and can fix issues faster than starting fresh.

---

## Anti-Patterns

**The conductor does NOT:**

- Scout the codebase itself
- Execute migration steps directly
- Let Bear start without a complete territory map
- Skip count validation (source must equal destination)
- Skip rollback documentation

---

## Quick Decision Guide

| Migration Scope                      | Strategy                                 |
| ------------------------------------ | ---------------------------------------- |
| Simple rename (< 5 files)            | Bear only (no Bloodhound needed)         |
| Cross-cutting migration (5-50 files) | Standard: Bloodhound → Bear              |
| Large migration (50+ files)          | Bloodhound → Bear with chunked execution |
| Unknown scope ("migrate X")          | Always start with Bloodhound             |

---

_When no single animal suffices, the gathering answers._ 🌲🐾
