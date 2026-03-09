---
name: bear-migrate
description: Move mountains with patient strength. Wake from hibernation, gather what must move, carry it carefully, hibernate to verify, and wake again to confirm. Use when migrating anything — data, components, icons, documents, formats, or systems.
---

# Bear Migrate

The bear moves slowly but with unstoppable strength. When it's time to move, the bear doesn't rush — it wakes deliberately, surveys what must be moved, and carries it carefully to the new den. Some journeys take seasons. The bear is patient. Everything arrives intact, or it doesn't arrive at all. Databases, components, icons, documents — the bear carries whatever needs carrying.

## When to Activate

- User asks to "migrate" or "move" anything between systems, formats, or patterns
- User says "upgrade to the new API" or "switch from X to Y"
- User calls `/bear-migrate` or mentions bear/migration
- Database schema changes requiring data migration
- Component API migrations (prop changes, new patterns, framework upgrades)
- Icon or asset migrations (swapping libraries, consolidating sources)
- Document or content format changes (markdown flavors, frontmatter schemas)
- Moving between systems, libraries, or conventions
- Any bulk transformation where safety and completeness matter

**Pair with:** `bloodhound-scout` to understand relationships and dependencies first

---

## The Migration

```
WAKE --> GATHER --> MOVE --> HIBERNATE --> VERIFY
  |          |         |           |           |
Prepare   Inventory  Execute    Review      Confirm
 Plan      & Audit   Safely     Results     Success
```

### Phase 1: WAKE

*The bear stirs from hibernation, deliberate and unhurried, before the long journey begins...*

Set up the migration environment. Document the plan, preserve the original state, and prepare the transformation strategy before touching a single item.

- Document the migration plan: source format/structure, destination format/structure, transformation mappings, edge cases to handle
- Preserve the original — git branch, database backup, file copies — whatever "undo" looks like for this domain
- Identify constraints: what can't be changed in-place? What requires a rebuild? What has downstream dependencies?
- Choose the right domain guide for detailed patterns

**Reference:** Load the appropriate domain guide based on what's being migrated:

| Migrating... | Load |
|---|---|
| Database schemas, tables, rows | `references/domain-database.md` |
| Components, props, imports, APIs | `references/domain-components.md` |
| Icons, assets, files, documents | `references/domain-content.md` |
| Anything else | `references/domain-general.md` |

---

### Phase 2: GATHER

*The bear knows exactly what it carries before lifting a single stone...*

Understand the scope thoroughly before writing transformation logic. Count items, find orphans, check for quality issues, and map dependencies. Surprises during MOVE are costly; surprises during GATHER are free.

- Count everything: how many items, files, records, or references need to migrate?
- Check for edge cases: missing data, inconsistent formats, deprecated patterns, unused items
- Map dependencies: what references what? What order must things move in?
- Estimate effort: simple find-replace, or complex transformation with branching logic?

**Output:** Complete inventory with item counts, dependency map, edge case list, and estimated complexity

---

### Phase 3: MOVE

*The bear carries its load carefully, step by heavy step, never more than it can hold...*

Execute the migration safely. Work in manageable chunks. Make the transformation reversible where possible. Track progress so long migrations are observable.

- For small scope (<50 items): transform everything in one pass, review the diff
- For large scope (>200 items): batch the work, commit checkpoints, log progress
- Apply transformation logic consistently — same rule for every item, no manual one-offs
- Track progress: items completed vs. total, percent logged after each batch or file

**Output:** All items transformed, progress logged, no silent failures

---

### Phase 4: HIBERNATE

*The bear rests in the new den, patient, letting the results settle before declaring success...*

Verify the migration before removing old artifacts. Counts must match. Nothing should be broken, missing, or silently wrong. Do not delete originals until verification is complete.

- Verify counts match between old inventory and new state
- Run integrity checks: do all references resolve? Do all imports work? Are all items accounted for?
- Spot-check samples to verify transformation logic ran correctly
- If any check fails: stop, investigate, do NOT remove originals — the preserved state is your safety net

**Output:** Verification report — counts, integrity checks, spot check results

---

### Phase 5: VERIFY

*The bear wakes again, testing the new den, confirming all is well before settling in for the season...*

Final confirmation: run the full test suite, check for regressions, clean up old artifacts, and generate the migration report.

- Run relevant tests — `gw ci`, type checks, linting, visual inspection, whatever catches regressions
- Check for performance or bundle size regressions if applicable
- Clean up: remove old files, deprecated imports, unused dependencies — only after tests pass
- Generate the migration completion report

**Output:** Migration report with items migrated, duration, transformations applied, and verification results

---

## Reference Routing Table

| Domain | Reference | Load When |
|--------|-----------|-----------|
| Database | `references/domain-database.md` | Schema changes, table migrations, D1/SQLite/Kysely |
| Components | `references/domain-components.md` | Prop changes, API upgrades, framework migrations |
| Content | `references/domain-content.md` | Icons, assets, documents, file formats |
| General | `references/domain-general.md` | Anything else — config, conventions, systems |

---

## Bear Rules

### Patience
Large migrations take time. Don't rush. Work in batches to avoid mistakes and cognitive overload. A migration that takes an hour safely beats one that takes five minutes and misses 12 edge cases.

### Safety
Always preserve the original state. Always test rollbacks where possible. Never migrate production without a way back. If the migration is lossy, document what's lost and where the backup lives.

### Thoroughness
Verify everything. Item counts, reference integrity, test results. A migration that looks complete but has 3 broken imports will surface at the worst possible time.

### Communication
Use migration metaphors:
- "Waking from hibernation..." (preparation)
- "Gathering the harvest..." (inventory)
- "Carrying the load..." (execution)
- "Resting in the new den..." (verification)
- "The den is ready." (migration complete)

---

## Anti-Patterns

**The bear does NOT:**
- Migrate without preserving the original state
- Skip verification steps (count checks, integrity checks, spot checks)
- Migrate production without testing on staging/dev first
- Delete old artifacts before verifying new ones are complete and correct
- Rush large migrations (missed items, broken references, silent failures)
- Assume the migration is "just a simple find-replace" without gathering first
- Treat non-database migrations as second-class — every migration deserves the full flow

---

## Examples

### Example 1: Database Migration

**User:** "Split the user's full name into first and last name fields"

**Bear flow:**

1. 🐻 **WAKE** — "Create migration script, backup database. Plan: split `full_name` on first space, handle nulls, preserve all other columns."

2. 🐻 **GATHER** — "15,423 users. 234 emails with mixed case. 12 users with null names (default to null first/last). No orphaned records."

3. 🐻 **MOVE** — "Batch migration (1000 records/batch). Transform: lowercase emails, split names, calculate account_age_days."

4. 🐻 **HIBERNATE** — "Row counts match (15,423/15,423). No null created_at. FK integrity intact. 10 spot-checked users look correct."

5. 🐻 **VERIFY** — "Tests pass. EXPLAIN QUERY PLAN shows index use. Backup archived. The den is ready."

### Example 2: Component Migration

**User:** "Migrate all icon rendering from inline Lucide imports to GlassCard's icon prop"

**Bear flow:**

1. 🐻 **WAKE** — "Create feature branch. Plan: replace `<Icon>` component usage with GlassCard `icon` prop across all roadmap cards."

2. 🐻 **GATHER** — "Found 23 files with inline Lucide icon imports. 4 use dynamic icon selection (need special handling). 2 use icons outside GlassCard (leave alone)."

3. 🐻 **MOVE** — "Migrating file by file. Remove Lucide imports, add icon prop to GlassCard, verify each file compiles. 21/23 files migrated, 2 skipped (not GlassCard contexts)."

4. 🐻 **HIBERNATE** — "21 files migrated, 2 intentionally skipped. All GlassCards render icons. No orphaned Lucide imports. Spot-checked 5 pages — icons render correctly."

5. 🐻 **VERIFY** — "svelte-check passes. No unused imports. Bundle size decreased by 2KB (shared icon resolution). The den is ready."

---

## Quick Decision Guide

| Scenario | Approach |
|----------|----------|
| Database schema change (add column) | Standard migration — domain-database guide |
| Database with data transformation | Batch processing — domain-database guide |
| Component prop API change | File-by-file with type checking — domain-components guide |
| Framework version upgrade | Codemod + manual review — domain-components guide |
| Icon library swap | Inventory → mapping table → bulk replace — domain-content guide |
| Document format change | Template + batch transform — domain-content guide |
| Config or convention change | Grep → plan → execute — domain-general guide |
| Zero downtime required | Expand-Migrate-Contract — domain-database or domain-general guide |
| Simple find-replace (<10 items) | Still GATHER first, but single-pass MOVE is fine |

---

## Integration with Other Skills

**Before Migrating:**
- `bloodhound-scout` — Understand dependencies and relationships before migrating them

**After Migrating:**
- `beaver-build` — Write regression tests for the new state
- `fox-optimize` — If migration has performance implications

---

*The bear moves slowly, but nothing is left behind.*
