# Domain Guide: Content — Bear Migrate Reference

Icon migrations, asset swaps, document format changes, and file-based content transformations.

---

## Preservation (WAKE)

```bash
# Branch before content migrations
gw git branch bear/migrate-content-description
gw git checkout bear/migrate-content-description

# For large binary assets, verify git LFS status first
git lfs ls-files
```

For icon/asset migrations, the git branch is your backup. For document format migrations that touch user-facing content, consider exporting a snapshot first.

---

## Inventory Patterns (GATHER)

### Icon Library Migration

```bash
# Find all icon imports from the old library
gf grep "from \"lucide-svelte\""
gf grep "from \"@iconify"
gf grep "from \"svelte-icons"

# Count unique icons used
gf grep "import.*from \"lucide-svelte\"" | sort -u

# Find dynamic icon usage (harder to migrate automatically)
gf grep "Icon.*name={"
gf grep "\[iconName\]"
```

Build a mapping table:

| Old Icon | New Icon | Used In | Dynamic? |
|----------|----------|---------|----------|
| `Cherry` | `cherry` (GlassCard prop) | 5 files | No |
| `Settings` | `settings` | 3 files | No |
| `iconMap[type]` | — | 2 files | Yes — needs manual review |

### Asset File Migration

```bash
# Find all references to the old asset path
gf grep "static/icons/"
gf grep "/images/old-path/"

# Inventory the actual files
ls -la static/icons/ | wc -l
```

### Document Format Migration

```bash
# Find all files in the old format
gf glob "**/*.mdx"
gf glob "docs/**/*.md"

# Check frontmatter structure
gf grep "^---" --include="*.md" | head -20

# Find format-specific syntax that needs changing
gf grep "import.*from" --include="*.mdx"  # MDX imports
gf grep "{{.*}}" --include="*.md"          # Template syntax
```

---

## Transformation Patterns (MOVE)

### Icon Import → Prop Migration

```svelte
<!-- Old: explicit icon import and rendering -->
<script>
  import { Cherry } from "lucide-svelte";
</script>
<div class="card-header">
  <Cherry size={20} class="text-grove-500" />
  <h3>{title}</h3>
</div>

<!-- New: icon as a prop on the parent component -->
<GlassCard icon="cherry" title={title} />
```

**Strategy:**
1. Build the old→new icon name mapping table
2. For each file: remove icon import, add icon prop, remove wrapper markup
3. Handle dynamic icons separately (they need a different pattern)

### Icon Library Swap

When switching from one icon library to another entirely:

```typescript
// Create a mapping file first
const ICON_MAP: Record<string, string> = {
  "lucide:cherry": "phosphor:tree",
  "lucide:settings": "phosphor:gear",
  "lucide:user": "phosphor:user",
  // ... complete the map during GATHER
};
```

### Asset Path Migration

```bash
# After moving files to new locations, update all references
# Use gf grep to find references, then update each file
gf grep "static/old-icons/" --files-with-matches
```

### Document Frontmatter Migration

```typescript
// Transform frontmatter schema
function transformFrontmatter(old: OldFrontmatter): NewFrontmatter {
  return {
    title: old.title,
    slug: old.slug || slugify(old.title),
    publishedAt: old.date || old.published_at,  // normalize field name
    tags: old.categories || old.tags || [],      // consolidate
    draft: old.published === false,              // invert boolean
  };
}
```

### Bulk File Rename

```bash
# Rename pattern: kebab-case to camelCase, or similar
# Always dry-run first
for f in static/icons/*.svg; do
  newname=$(echo "$f" | sed 's/-\([a-z]\)/\U\1/g')
  echo "Would rename: $f → $newname"
done

# Then execute (after GATHER confirms the plan)
```

---

## Verification Patterns (HIBERNATE)

### Icon Rendering Check

```bash
# Verify no old icon imports remain
gf grep "from \"lucide-svelte\""
# Should return 0 (or only intentionally kept usages)

# Verify new icons resolve
cd libs/engine && bun svelte-check
```

Visual spot check: navigate to 3-5 pages and confirm icons render correctly at the right size and color.

### Asset Reference Check

```bash
# Verify no broken references to old paths
gf grep "old-path/"
# Should return 0

# Verify new files exist
ls static/new-path/ | wc -l
# Should match inventory count from GATHER
```

### Document Format Check

```bash
# Verify all documents parse in new format
# (specific to your tooling — markdown parser, frontmatter validator, etc.)
gf glob "**/*.md" | wc -l
# Should match count from GATHER
```

---

## Migration Completion Report

```markdown
## BEAR MIGRATION COMPLETE

### Migration: [Old Source] → [New Pattern]
- Items migrated: [count] [type]
- Items skipped: [count] — [reason]
- Files updated: [count]

### Validation
- [x] No references to old [icons/paths/format]
- [x] All new items resolve correctly
- [x] Visual spot check ([N] pages)
- [x] Type check / lint passes

### Mapping
[Link to or summary of the old→new mapping used]
```
