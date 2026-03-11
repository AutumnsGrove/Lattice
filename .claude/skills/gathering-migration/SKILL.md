---
name: gathering-migration
description: The drum sounds. Bear and Bloodhound gather for safe migration. Use when migrating anything that requires both careful movement and codebase understanding.
---

# Gathering Migration 🌲🐻🐕

The drum echoes through the valleys. The Bloodhound sniffs the terrain first, understanding every path, connection, and dependency. Then the Bear wakes from long slumber, gathering strength for the journey ahead. Together they move mountains safely — nothing lost, nothing broken, everything finding its new home. Whether it's database tables, component APIs, icon libraries, or document formats, no single animal can both map the territory AND carry the load.

## When to Summon

- Complex migrations requiring codebase exploration before execution
- Moving between systems, libraries, or architectural patterns
- Schema changes affecting multiple relationships
- Component or API migrations spanning many files
- Icon, asset, or content migrations with downstream dependencies
- Any migration where you need to understand the territory before moving
- User says "migrate" and the scope touches multiple files or systems
- User calls `/gathering-migration`

---

## Grove Tools for This Gathering

Use `gw` and `gf` throughout. Quick reference:

```bash
# Find references, dependencies, and affected code
gf --agent search "pattern"       # Find references to affected items
gf grep "import.*OldThing"        # Track imports and usage

# Commit completed migrations
gw git ship --write -a -m "feat: migrate description"
```

---

## The Gathering

```
SUMMON → ORGANIZE → EXECUTE → VALIDATE → COMPLETE
   ↓         ↲          ↲          ↲          ↓
Receive  Dispatch   Animals    Verify   Migration
Request  Animals    Work       Results  Complete
```

### Animals Mobilized

1. **🐕 Bloodhound** (`bloodhound-scout`) — Scout the codebase, map dependencies and relationships
2. **🐻 Bear** (`bear-migrate`) — Migrate with patient strength using the appropriate domain guide

### Dependencies

```
Bloodhound ──→ Bear
     │            │
Scout          Migrate
Territory      Safely
```

Bloodhound must complete before Bear. The territory map becomes the Bear's migration plan.

---

### Phase 1: SUMMON

*The drum sounds. The animals gather at the clearing...*

Receive and parse the request:

**Clarify the Migration:**

- What needs to migrate? (data, components, icons, config, conventions...)
- From where to where? (old pattern → new pattern)
- What downstream dependencies exist?
- What does "undo" look like if something goes wrong?

**Scope Check:**

> "I'll mobilize a migration gathering for: **[migration description]**
>
> This will involve:
>
> - 🐕 Bloodhound scouting the codebase
>   - Map dependencies and relationships
>   - Find all references to affected items
>   - Identify integration points and edge cases
>   - Document current patterns
> - 🐻 Bear migrating with the appropriate domain guide
>   - Preserve original state before touching anything
>   - Transform in manageable chunks
>   - Validate after each phase
>   - Verify complete migration
>
> Proceed with the gathering?"

---

### Phase 2: ORGANIZE

*The animals prepare for the journey...*

Dispatch in sequence:

- Bloodhound begins scouting: find every reference, dependency, and edge case
- Bear waits for the territory map before waking
- Determine which Bear domain guide applies (database, components, content, or general)

**Handoff protocol:** Bloodhound produces a territory map → Bear uses it as its WAKE/GATHER foundation

**Output:** Scout dispatched, domain guide identified

---

### Phase 3: EXECUTE

*The paths are known. The migration begins...*

Execute each animal's full workflow by loading their dedicated skill:

---

**🐕 BLOODHOUND — SCOUT**

Load skill: `bloodhound-scout`

Execute the full Bloodhound SCENT → TRACK → HUNT → REPORT → RETURN workflow focused on the migration target: find every reference, map relationships, identify edge cases, and document the current state.

Handoff: complete territory map (dependency map, affected files, edge cases, risk assessment) → Bear

---

**🐻 BEAR — MIGRATE**

Load skill: `bear-migrate`

Execute the full Bear WAKE → GATHER → MOVE → HIBERNATE → VERIFY workflow, using:
- The Bloodhound's territory map as the migration plan foundation
- The appropriate domain guide from `bear-migrate/references/`:
  - `domain-database.md` — for schema changes, table migrations, D1/SQLite
  - `domain-components.md` — for prop changes, API upgrades, import rewrites
  - `domain-content.md` — for icons, assets, documents, file formats
  - `domain-general.md` — for config, conventions, dependencies, anything else

Handoff: migration complete (transformed items, validation reports, updated codebase) → VALIDATE phase

---

### Phase 4: VALIDATE

*The journey ends. Both animals confirm safe arrival...*

**Validation Checklist:**

- [ ] Bloodhound: All dependencies mapped
- [ ] Bloodhound: All references found
- [ ] Bloodhound: Edge cases documented
- [ ] Bear: Original state preserved (branch, backup, or snapshot)
- [ ] Bear: Item counts match (source vs destination)
- [ ] Bear: Integrity checks pass (references resolve, imports work, no orphans)
- [ ] Bear: Spot check confirms transformation correctness
- [ ] Bear: Tests pass (`gw ci --affected` or relevant suite)
- [ ] Bear: Rollback verified or documented

**Domain-Specific Checks:**

The Bear's domain guide (loaded in EXECUTE) defines the specific verification patterns — SQL queries for databases, `svelte-check` for components, visual inspection for icons, etc. Defer to the domain guide rather than hardcoding checks here.

---

### Phase 5: COMPLETE

*The gathering disperses. Everything found its new home...*

**Completion Report:**

```markdown
## 🌲 GATHERING MIGRATION COMPLETE

### Migration: [Description]

### Animals Mobilized

🐕 Bloodhound → 🐻 Bear

### Territory Mapped (Bloodhound)

- Items affected: [count] [type]
- Dependencies found: [count]
- Files referencing migrated items: [count]
- Edge cases identified: [list]

### Migration Executed (Bear)

- Domain guide used: [database / components / content / general]
- Items migrated: [count]
- Items skipped (intentional): [count] — [reason]
- Duration: [time]
- Errors: [count]

### Validation Results

- Item count match: ✅ [source] = [dest]
- Integrity checks: ✅
- Tests passing: ✅ [suite]
- Spot check: ✅ [N samples verified]

### Rollback Status

- Original preserved at: [branch / backup / snapshot]
- Rollback path: [how to undo]

### Files Updated

- [list of changed files or summary]

_Everything found its new home._ 🌲
```

---

## Examples

### Example 1: Database Migration

**User:** "/gathering-migration Move user preferences from users table to separate table"

**Gathering flow:**

1. 🌲 **SUMMON** — "Mobilizing for: Split user preferences. Move theme, notifications from users table to user_preferences table."

2. 🌲 **ORGANIZE** — "Bloodhound scouts → Bear migrates with `domain-database.md`"

3. 🌲 **EXECUTE** —
   - 🐕 Bloodhound: "Found 15,423 users. 234 have theme set. 12 have notifications disabled. Referenced in dashboard, settings, 3 API routes."
   - 🐻 Bear: "Backup created. Migrated in 16 batches. All rows accounted for. FK constraints maintained."

4. 🌲 **VALIDATE** — "15,423 source = 15,423 dest. No orphans. All tests pass."

5. 🌲 **COMPLETE** — "Preferences migrated. Code updated. Backup retained."

### Example 2: Icon System Migration

**User:** "/gathering-migration Migrate all inline Lucide icon imports to use the icon registry pattern"

**Gathering flow:**

1. 🌲 **SUMMON** — "Mobilizing for: Icon import migration. Replace per-file Lucide imports with centralized icon registry lookups."

2. 🌲 **ORGANIZE** — "Bloodhound scouts icon usage → Bear migrates with `domain-content.md`"

3. 🌲 **EXECUTE** —
   - 🐕 Bloodhound: "Found 47 files importing from @lucide/svelte. 31 unique icons used. 3 files use dynamic icon selection. 2 barrel re-exports in ui/index.ts."
   - 🐻 Bear: "Feature branch created. Migrated 44 files to registry pattern. 3 dynamic-icon files handled manually. All svelte-check passes."

4. 🌲 **VALIDATE** — "47 source files, 44 migrated + 3 manual = 47 accounted. Zero remaining @lucide/svelte imports. Visual spot check on 5 pages — all icons render."

5. 🌲 **COMPLETE** — "Icon registry migration complete. Bundle size reduced. Branch ready for review."

---

## Integration with Other Gatherings

**Precedes:** `gathering-feature` — Migrations often unblock new features built on the new pattern

**Follows:** `gathering-architecture` — Architecture decisions often require migrations to implement

**Animals available for extension:**
- `beaver-build` — Add regression tests after migration
- `fox-optimize` — Profile performance if migration touches hot paths
- `deer-sense` — Audit accessibility if migrating UI components

---

*When no single animal suffices, the gathering answers.* 🌲🐾
