# Final Integration & Publishing Prompt

**For use in GroveEngine repository AFTER both migrations are complete**

---

## Context

Both the GroveUI and GroveEngine migrations should now be complete. This prompt handles final integration testing, cleanup, and publishing coordination.

## Prerequisites

Before running this prompt, verify:

- [ ] GroveUI migration completed successfully
  - Gutter system removed
  - Generic CollapsibleSection added
  - 7 generic UI wrappers added
  - IconLegend fixed
  - Version 0.3.0
  - Built successfully

- [ ] GroveEngine migration completed successfully
  - @groveengine/ui dependency added
  - Generic UI components deleted
  - All imports updated
  - Demo sites updated
  - Version 0.3.0
  - Built successfully

---

## Task 1: Verify GroveUI Build

First, ensure GroveUI is properly built and ready to be consumed.

**Navigate to GroveUI**:
```bash
cd /Users/mini/Documents/Projects/GroveUI
```

**Verify**:
1. Check version in `package.json` is `0.3.0`
2. Run `npm run build`
3. Verify `dist/` directory exists and contains:
   - `dist/components/ui/` (with new wrappers, no gutter)
   - `dist/components/ui/CollapsibleSection.svelte.d.ts`
   - All other component directories
4. Run `npm run check` - should pass

**If any issues**, fix them before continuing.

---

## Task 2: Link GroveUI Locally (for testing)

Before publishing, test that GroveEngine can consume the new GroveUI.

**In GroveUI directory**:
```bash
cd /Users/mini/Documents/Projects/GroveUI
npm link
```

**In GroveEngine directory**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
npm link @groveengine/ui
```

This creates a local symlink so GroveEngine uses the local GroveUI build.

---

## Task 3: Verify GroveEngine Build

Now test that GroveEngine builds correctly with the linked GroveUI.

**In GroveEngine directory**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
```

**Build and verify**:
1. Run `npm install` (if not already done)
2. Run `npm run check` - should pass with no type errors
3. Run `npm run build` - should succeed
4. Verify `packages/engine/dist/` no longer contains:
   - `dist/components/ui/Button.svelte`
   - `dist/components/ui/Card.svelte`
   - `dist/components/ui/Badge.svelte`
   - `dist/components/ui/Input.svelte`
   - `dist/components/ui/Textarea.svelte`
   - `dist/components/ui/Skeleton.svelte`
5. Verify it DOES contain:
   - `dist/components/ui/Dialog.svelte` (admin component)
   - `dist/components/custom/*` (gutter system)

---

## Task 4: Test Example Site

Verify the example-site works with the new package structure.

**Navigate to example-site**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine/packages/example-site
```

**Test**:
1. Run `npm install` (if not already done)
2. Run `npm run dev`
3. Open browser to `http://localhost:5173`
4. Verify:
   - Homepage loads
   - All UI components render (buttons, cards, inputs)
   - Blog pages load
   - Admin pages work (if you have auth)
   - Gallery works
   - No console errors about missing components

**If any issues**:
- Check imports in route files
- Verify `@groveengine/ui` is resolved correctly
- Look for any remaining `$lib/components/ui/` imports that weren't updated

---

## Task 5: Test Landing Site

Verify the landing site works with the new package structure.

**Navigate to landing**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine/landing
```

**Test**:
1. Run `npm install` (if not already done)
2. Run `npm run dev`
3. Open browser to the dev URL
4. Verify:
   - Homepage loads
   - All UI components render
   - No console errors

---

## Task 6: Search for Missed Imports

Do a final sweep to ensure no old imports remain.

**Run these searches**:

```bash
cd /Users/mini/Documents/Projects/GroveEngine

# Search for imports from deleted components
grep -r "from '\$lib/components/ui/Button'" packages/
grep -r "from '\$lib/components/ui/Card'" packages/
grep -r "from '\$lib/components/ui/Badge'" packages/
grep -r "from '\$lib/components/ui/Input'" packages/
grep -r "from '\$lib/components/ui/Textarea'" packages/
grep -r "from '\$lib/components/ui/Skeleton'" packages/
grep -r "from '\$lib/components/ui/Separator'" packages/

# Search landing too
grep -r "from '\$lib/components/ui/Button'" landing/
grep -r "from '\$lib/components/ui/Card'" landing/
```

**Expected result**: No matches (all should be updated to `@groveengine/ui/ui`)

**If matches found**: Update those imports.

---

## Task 7: Unlink and Test with Real Package Reference

Before publishing, test that everything works without the symlink.

**Unlink**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
npm unlink @groveengine/ui
```

**Note**: At this point, GroveEngine will fail to build because @groveengine/ui@0.3.0 isn't published yet. This is expected.

---

## Task 8: Review Changes Before Publishing

**In GroveUI** (`/Users/mini/Documents/Projects/GroveUI`):

Review the git diff:
```bash
git status
git diff
```

Verify:
- [ ] Gutter system removed
- [ ] CollapsibleSection added to ui/
- [ ] 7 UI wrappers added
- [ ] IconLegend imports updated
- [ ] Exports updated
- [ ] Version 0.3.0
- [ ] CHANGELOG updated
- [ ] README updated

**In GroveEngine** (`/Users/mini/Documents/Projects/GroveEngine`):

Review the git diff:
```bash
git status
git diff
```

Verify:
- [ ] @groveengine/ui dependency added
- [ ] Generic UI components deleted
- [ ] Imports updated throughout
- [ ] Demo sites updated
- [ ] Exports updated
- [ ] Version 0.3.0
- [ ] CHANGELOG updated
- [ ] Migration guide created
- [ ] README updated

---

## Task 9: Commit All Changes

If everything looks good, commit both repos.

**In GroveUI**:
```bash
cd /Users/mini/Documents/Projects/GroveUI
git add -A
git commit -m "feat: Separate UI from domain logic, remove circular dependency

BREAKING CHANGE: Gutter system moved to GroveEngine

- Remove gutter system (ContentWithGutter, LeftGutter, etc.)
- Add generic CollapsibleSection for UI library
- Add generic UI wrappers from GroveEngine (Button, Card, Badge, Input, Textarea, Skeleton)
- Fix circular dependency in IconLegend
- Update exports and version to 0.3.0
- Add BELONGS_IN_UI.md decision guide

The gutter annotation system is Grove-specific and has been moved to
@autumnsgrove/groveengine where it belongs. GroveUI now contains only
generic, reusable UI components with no domain-specific logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**In GroveEngine**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
git add -A
git commit -m "feat: Migrate generic UI to @groveengine/ui package

BREAKING CHANGE: Generic UI components now imported from @groveengine/ui

- Add @groveengine/ui@^0.3.0 dependency
- Remove generic UI components (Button, Card, Badge, Input, Textarea, Skeleton)
- Update all imports to use @groveengine/ui/ui
- Update example-site and landing dependencies
- Update package exports
- Version bump: 0.1.0 → 0.3.0
- Add migration guide (MIGRATION_V0.1_TO_V0.3.md)

GroveEngine now focuses on domain-specific features (content management,
auth, payments, gutter system) while generic UI comes from @groveengine/ui.

Admin-specific components (Dialog, Sheet, Select, Table, Tabs, Accordion,
Toast) remain in GroveEngine as they're optimized for admin interfaces.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Tag Versions

Create git tags for both versions.

**In GroveUI**:
```bash
cd /Users/mini/Documents/Projects/GroveUI
git tag -a v0.3.0 -m "Release v0.3.0: Separate UI from domain logic"
```

**In GroveEngine**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
git tag -a v0.3.0 -m "Release v0.3.0: Migrate to @groveengine/ui"
```

---

## Task 11: Push to GitHub

Push commits and tags to GitHub.

**In GroveUI**:
```bash
cd /Users/mini/Documents/Projects/GroveUI
git push origin main
git push origin v0.3.0
```

**In GroveEngine**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
git push origin main
git push origin v0.3.0
```

---

## Task 12: Publish to npm

**CRITICAL**: Publish in this exact order!

### Step 1: Publish GroveUI FIRST

GroveEngine depends on GroveUI, so GroveUI must be published first.

```bash
cd /Users/mini/Documents/Projects/GroveUI

# Verify version
npm version  # Should show 0.3.0

# Dry run (optional - see what would be published)
npm publish --dry-run

# Actual publish
npm publish
```

**Verify**: Check https://www.npmjs.com/package/@groveengine/ui shows version 0.3.0

### Step 2: Publish GroveEngine

Now that GroveUI 0.3.0 exists, GroveEngine can be published.

```bash
cd /Users/mini/Documents/Projects/GroveEngine

# Verify version
npm version  # Should show 0.3.0

# Build before publishing
npm run build

# Dry run (optional)
npm publish --dry-run

# Actual publish
npm publish
```

**Verify**: Check https://www.npmjs.com/package/@autumnsgrove/groveengine shows version 0.3.0

---

## Task 13: Verify Published Packages Work

Create a test project to verify the published packages work together.

**Create test project**:
```bash
cd /tmp
npm create svelte@latest grove-test
cd grove-test

# Install published packages
npm install @groveengine/ui@^0.3.0
npm install @autumnsgrove/groveengine@^0.3.0

# Create test file
cat > src/routes/+page.svelte << 'EOF'
<script>
  import { Button, Card } from '@groveengine/ui/ui';
  import { ContentWithGutter } from '@autumnsgrove/groveengine';
</script>

<Card>
  <h1>Test Page</h1>
  <Button>It Works!</Button>
</Card>
EOF

# Run dev
npm run dev
```

**Verify**:
- Project builds without errors
- Page loads in browser
- Components render correctly

---

## Task 14: Announce the Release

Consider announcing the breaking change:

### GitHub Releases

**GroveUI Release** (https://github.com/AutumnsGrove/GroveUI/releases):
```markdown
# v0.3.0 - Separate UI from Domain Logic

## Breaking Changes
- Gutter system removed (moved to GroveEngine)
- Added generic CollapsibleSection

## Added
- Generic UI wrappers: Button, Card, Badge, Input, Textarea, Skeleton
- BELONGS_IN_UI.md decision guide

## Fixed
- Circular dependency with GroveEngine

See [CHANGELOG.md](./CHANGELOG.md) for full details.
```

**GroveEngine Release** (https://github.com/AutumnsGrove/GroveEngine/releases):
```markdown
# v0.3.0 - Migrate to @groveengine/ui

## Breaking Changes
- Generic UI components moved to @groveengine/ui package
- See [MIGRATION_V0.1_TO_V0.3.md](./MIGRATION_V0.1_TO_V0.3.md)

## Added
- @groveengine/ui dependency
- Migration guide
- Decision guides (BELONGS_IN_ENGINE.md, SITE_SPECIFIC_CODE.md, CUSTOMER_TEMPLATE.md)

## Changed
- Admin components remain in GroveEngine
- Clear separation between UI and domain logic

See [CHANGELOG.md](./CHANGELOG.md) for full details.
```

### Documentation

Update any external documentation or tutorials to reflect the new import patterns.

---

## Task 15: Update Example Projects (if any)

If you have example projects or customer sites using GroveEngine:

1. Update their `package.json`:
   ```json
   {
     "dependencies": {
       "@groveengine/ui": "^0.3.0",
       "@autumnsgrove/groveengine": "^0.3.0"
     }
   }
   ```

2. Update imports following the migration guide

3. Test thoroughly

---

## Task 16: Clean Up

**In GroveEngine**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine

# Remove migration prompts (no longer needed)
rm PROMPT_GROVEUI_MIGRATION.md
rm PROMPT_GROVEENGINE_MIGRATION.md
rm PROMPT_FINAL_INTEGRATION.md

# Commit cleanup
git add -A
git commit -m "chore: Remove migration prompts"
git push origin main
```

---

## Success Criteria

Verify all of these:

- [ ] GroveUI v0.3.0 builds successfully
- [ ] GroveEngine v0.3.0 builds successfully
- [ ] Example-site works with new structure
- [ ] Landing site works with new structure
- [ ] No old imports remain in codebase
- [ ] Both packages committed to git
- [ ] Both packages tagged (v0.3.0)
- [ ] Both packages pushed to GitHub
- [ ] GroveUI v0.3.0 published to npm
- [ ] GroveEngine v0.3.0 published to npm
- [ ] Test project using published packages works
- [ ] GitHub releases created
- [ ] Documentation updated

---

## Rollback Plan (if needed)

If something goes wrong:

1. **Unpublish** (within 72 hours of publishing):
   ```bash
   npm unpublish @groveengine/ui@0.3.0
   npm unpublish @autumnsgrove/groveengine@0.3.0
   ```

2. **Revert git commits**:
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Delete tags**:
   ```bash
   git tag -d v0.3.0
   git push origin :refs/tags/v0.3.0
   ```

---

## Post-Release Monitoring

After publishing, monitor:

- [ ] npm download stats
- [ ] GitHub issues for migration problems
- [ ] User feedback in community channels

Be ready to publish patch releases (0.3.1) if issues are discovered.

---

## Summary

This migration achieves:

✅ **Clear separation** between UI (GroveUI) and domain logic (GroveEngine)
✅ **No circular dependencies** - IconLegend uses local CollapsibleSection
✅ **No component duplication** - Generic UI in GroveUI, domain features in GroveEngine
✅ **Better maintainability** - Clear boundaries and decision guides
✅ **Reusable UI library** - GroveUI can be used independently

**Congratulations on completing the migration!** 🎉

---

**Last Updated**: 2025-12-03
**GroveUI Version**: 0.3.0
**GroveEngine Version**: 0.3.0
