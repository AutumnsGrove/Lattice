# Domain Guide: General — Bear Migrate Reference

Patterns for migrating configurations, conventions, naming schemes, environment setups, and anything that doesn't fit neatly into database, component, or content domains.

---

## Preservation (WAKE)

```bash
# Branch is always the baseline backup
gw git branch bear/migrate-description
gw git checkout bear/migrate-description

# For config migrations, snapshot current working state
gw ci  # verify everything passes BEFORE touching anything
```

For convention or naming migrations, the git diff IS your audit trail. Commit frequently during MOVE so each step is individually revertable.

---

## Inventory Patterns (GATHER)

### Convention Migration (e.g., naming scheme change)

```bash
# Find all instances of the old convention
gf grep "oldConvention"
gf grep "old-convention"
gf grep "old_convention"

# Check all three common casings — camelCase, kebab-case, snake_case
# Count total occurrences
gf grep "oldPattern" --count
```

### Config Migration

```bash
# Find all config files that reference the old setting
gf glob "**/config.*"
gf glob "**/.env*"
gf glob "**/wrangler.*"

# Check which ones use the old format/keys
gf grep "OLD_KEY_NAME" --include="*.toml,*.json,*.env"
```

### Environment / Tooling Migration

```bash
# Inventory current tool versions and configs
cat package.json | grep -E "(scripts|dependencies)"
gf glob "**/tsconfig*.json"
gf glob "**/.eslintrc*"
gf glob "**/eslint.config.*"
```

### Dependency Migration

```bash
# Find all imports of the old package
gf grep "from \"old-package\""
gf grep "require.*old-package"

# Check which workspace packages depend on it
gf grep "old-package" --include="package.json"
```

---

## Transformation Patterns (MOVE)

### Convention Rename

For renaming a pattern across the codebase:

1. Start with type definitions and interfaces
2. Then implementation files
3. Then tests
4. Then documentation and comments
5. Then config files

**Why this order:** Types catch downstream breakage at compile time. If you rename the type first, every file that uses it will error — giving you a checklist.

### Config Key Migration

```typescript
// Old config shape
{ apiKey: "...", baseUrl: "..." }

// New config shape
{ auth: { key: "..." }, endpoint: { url: "..." } }
```

**Strategy:** Update the config reader/parser first, then update all config files, then remove backward-compat shims.

### Expand-Migrate-Contract (General)

Works for any migration where you can't do a hard cutover:

1. **Expand**: Support both old and new patterns simultaneously
2. **Migrate**: Move all consumers to the new pattern
3. **Contract**: Remove support for the old pattern

```typescript
// Phase 1: Expand — accept both
function getConfig(key: string): string {
  return newConfig[key] ?? legacyConfig[mapLegacyKey(key)];
}

// Phase 2: Migrate — update all callers to use new keys
// Phase 3: Contract — remove legacyConfig fallback
```

### Cross-System Migration

When moving between external systems (e.g., one CI provider to another, one hosting platform to another):

1. Document every feature of the old system that's in use
2. Map each feature to the equivalent in the new system
3. Identify gaps (features with no equivalent — need workarounds)
4. Migrate in dependency order
5. Run both systems in parallel during transition if possible

---

## Verification Patterns (HIBERNATE)

### Convention Check

```bash
# Verify no instances of old convention remain
gf grep "oldConvention"
# Should return 0

# Verify new convention is consistently applied
gf grep "newConvention" --count
# Should match expected count from GATHER
```

### Config Validation

```bash
# Verify app starts with new config
gw ci --affected

# Verify no references to old config keys
gf grep "OLD_KEY_NAME"
# Should return 0
```

### Dependency Check

```bash
# Verify old package is fully removed
gf grep "old-package"
# Should return 0

# Verify no phantom dependency
pnpm why old-package
# Should show "not installed"
```

---

## Migration Completion Report

```markdown
## BEAR MIGRATION COMPLETE

### Migration: [Old Pattern] → [New Pattern]
- Items migrated: [count] [what]
- Files touched: [count]
- Packages affected: [list]

### Validation
- [x] No references to old [convention/config/dependency]
- [x] CI passes
- [x] All affected packages build and test

### Notes
- [Edge cases, follow-up work, or backward-compat shims still in place]
```
