---
name: update-reverie-inventory
description: Update the Reverie domain schema inventory when schemas are added or removed. Use when adding new domains, after CI flags inventory mismatches, or periodically to ensure docs match the registry.
---

# Update Reverie Inventory Skill

## When to Activate

Activate this skill when:

- Adding new Reverie domain schemas
- Removing or deprecating domains
- The reverie-inventory CI check fails
- You want to verify inventory matches the schema registry
- After modifying field counts in existing schemas
- Adding or removing atmosphere entries

## Files Involved

| File                                              | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `.github/reverie-inventory.json`                  | Source of truth for schema counts and metadata |
| `libs/engine/src/lib/reverie/index.ts`            | Schema registry and domain catalog             |
| `libs/engine/src/lib/reverie/types.ts`            | DomainId type union and type definitions       |
| `libs/engine/src/lib/reverie/atmosphere.ts`       | Atmosphere manifold entries                    |
| `libs/engine/src/lib/reverie/schemas/**/*.ts`     | Individual domain schema files                 |
| `docs/specs/reverie-spec.md`                      | Reverie specification                          |

## Inventory Structure

The inventory tracks schemas with full metadata:

```json
{
  "schemas": {
    "total": 32,
    "implemented": 32,
    "planned": 0,
    "breakdown": {
      "identity": 3,
      "appearance": 6,
      "content": 3,
      "social": 4,
      "curios": 14,
      "infra": 2
    },
    "byPhase": { "1": 5, "2": 6, "3": 6, "4": 12, "5": 3 }
  },
  "fields": {
    "total": 176,
    "byGroup": { ... }
  },
  "atmospheres": {
    "total": 14,
    "keywords": ["cozy", "cottagecore", ...]
  },
  "domains": [
    { "id": "foliage.accent", "group": "appearance", "phase": 1, "fieldCount": 1, "file": "appearance/accent.ts" }
  ]
}
```

## Step-by-Step Process

### 1. Count Schema Files

```bash
# Count all schema .ts files (excluding index.ts, types.ts, atmosphere.ts)
find libs/engine/src/lib/reverie/schemas -name "*.ts" -type f | wc -l

# List all schema files by group
find libs/engine/src/lib/reverie/schemas -name "*.ts" -type f | sort
```

### 2. Count Fields in Each Schema

```bash
# Count fields per schema (look for field definitions in the fields object)
# Each key in the fields: { ... } object is a field
grep -c "type:" libs/engine/src/lib/reverie/schemas/**/*.ts
```

### 3. Count Atmospheres

```bash
# Count atmosphere entries in the manifold
grep -c "keyword:" libs/engine/src/lib/reverie/atmosphere.ts
```

### 4. Compare with Inventory

```bash
# Read current inventory totals
jq '.schemas.total, .schemas.implemented, .fields.total, .atmospheres.total' .github/reverie-inventory.json
```

### 5. Identify Discrepancies

Look for:

- **New schemas**: Schema files that exist but aren't in the inventory
- **Removed schemas**: Inventory entries without corresponding files
- **Field count changes**: Schema field counts that don't match inventory
- **Missing DomainId**: Schema IDs not in the DomainId type union
- **Missing registry entries**: Schemas not in SCHEMA_REGISTRY
- **Missing catalog entries**: Schemas not in DOMAIN_CATALOG

### 6. Update Inventory JSON

Edit `.github/reverie-inventory.json`:

1. **Update schema counts**:
   ```json
   "schemas": {
     "total": <file count>,
     "implemented": <implemented count>,
     "planned": <planned count>,
     "breakdown": { <group counts> }
   }
   ```

2. **Update field counts**:
   ```json
   "fields": {
     "total": <sum of all fieldCount>,
     "byGroup": { <group field sums> }
   }
   ```

3. **Add/remove domain entries**
4. **Update atmospheres if changed**
5. **Update metadata**:
   ```json
   "lastUpdated": "YYYY-MM-DD",
   "lastAuditedBy": "claude/<context>"
   ```

### 7. Update DomainId Type (if adding new domains)

Edit `libs/engine/src/lib/reverie/types.ts`:

```typescript
export type DomainId =
  // Identity
  | "identity.profile"
  | "identity.newdomain"  // Add new domain
  // ...
```

### 8. Update Schema Registry (if adding new domains)

Edit `libs/engine/src/lib/reverie/index.ts`:

1. Add import for the new schema
2. Add entry to `SCHEMA_REGISTRY`
3. Add/update entry in `DOMAIN_CATALOG`

### 9. Commit Changes

```bash
git add .github/reverie-inventory.json libs/engine/src/lib/reverie/
git commit -m "docs: update reverie inventory

- Add <domain_id> to inventory
- Update schema total: X -> Y
- Update field total: X -> Y"
```

## Quick Reference Commands

```bash
# Count schema files
find libs/engine/src/lib/reverie/schemas -name "*.ts" -type f | wc -l

# List all domain IDs from schema exports
grep -rh "id:" libs/engine/src/lib/reverie/schemas/ | grep -oP '"[a-z]+\.[a-z]+"' | sort -u

# Count atmosphere keywords
grep -c "keyword:" libs/engine/src/lib/reverie/atmosphere.ts

# Count total fields across all schemas
grep -rh "type:" libs/engine/src/lib/reverie/schemas/ | grep -v "import\|export\|DomainSchema\|cursorType\|pollType" | wc -l

# Show inventory summary
jq '{schemas: .schemas.total, implemented: .schemas.implemented, fields: .fields.total, atmospheres: .atmospheres.total}' .github/reverie-inventory.json

# List schemas by group
jq -r '.domains[] | "\(.group)\t\(.id)\t\(.fieldCount) fields"' .github/reverie-inventory.json | sort
```

## Adding a New Domain (Full Checklist)

When adding a new domain schema:

- [ ] Create schema file: `libs/engine/src/lib/reverie/schemas/{group}/{domain}.ts`
- [ ] Export the schema constant with the `DomainSchema` type
- [ ] Add the domain ID to `DomainId` type in `types.ts`
- [ ] Import and add to `SCHEMA_REGISTRY` in `index.ts`
- [ ] Add `CatalogEntry` to `DOMAIN_CATALOG` in `index.ts`
- [ ] Add domain entry to `.github/reverie-inventory.json` domains array
- [ ] Update inventory counts (schemas.total, fields.total, breakdowns)
- [ ] Update `lastUpdated` and `lastAuditedBy`
- [ ] Re-export any domain-specific constants from `index.ts`
- [ ] Commit all changes together

## CI Integration

The `.github/workflows/reverie-inventory.yml` workflow:

- Runs on PRs touching `libs/engine/src/lib/reverie/**`
- Counts schema files and compares to inventory
- Counts field definitions and compares to inventory
- Counts atmosphere entries and compares to inventory
- Comments on PRs when there's a mismatch
- Creates issues for drift on scheduled runs (Fridays)

When CI fails, run this skill to fix the mismatch.

## Checklist

Before finishing:

- [ ] Schema file count matches inventory `schemas.total`
- [ ] All schema files have entries in inventory `domains` array
- [ ] All domain IDs exist in the `DomainId` type union
- [ ] All schemas are in `SCHEMA_REGISTRY`
- [ ] All schemas have `DOMAIN_CATALOG` entries
- [ ] Field counts are accurate per schema
- [ ] Group breakdowns sum to total
- [ ] Phase breakdowns sum to total
- [ ] Atmosphere count matches manifold entries
- [ ] `lastUpdated` date is today
- [ ] Changes committed with descriptive message
