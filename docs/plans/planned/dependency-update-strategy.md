# Dependency Update Strategy

**Created**: 2026-01-12
**Status**: Proposed
**Priority**: Medium (security maintenance)

## Goal

Safely update all packages to latest versions for security patches and new features, without breaking existing functionality.

## Current State

The monorepo has multiple packages with varying dependency freshness:
- `lucide-svelte`: 0.554.0 (latest: 0.562.0) - missing newer icons like `LayersPlus`
- Various other packages likely behind on security patches
- Some deprecated API warnings appearing in builds

## Risk Assessment

### High Risk Updates (Proceed Carefully)
| Package | Risk | Why |
|---------|------|-----|
| `svelte` | High | Major version changes break component syntax |
| `@sveltejs/kit` | High | Routing/hooks API changes |
| `drizzle-orm` / `drizzle-kit` | High | Schema/migration compatibility |
| `wrangler` | Medium-High | Cloudflare API changes |

### Medium Risk Updates
| Package | Risk | Why |
|---------|------|-----|
| `tailwindcss` | Medium | Class name/config changes |
| `vite` | Medium | Build config changes |
| `typescript` | Medium | Stricter type checking |

### Low Risk Updates (Usually Safe)
| Package | Risk | Why |
|---------|------|-----|
| `lucide-svelte` | Low | Icon additions, rarely breaking |
| `prettier` / `eslint` | Low | Formatting only |
| `@types/*` | Low | Type definitions |
| Security patches (minor) | Low | Bug fixes |

## Staged Update Process

### Phase 1: Audit & Snapshot
```bash
# Create baseline
pnpm outdated --recursive > docs/plans/outdated-snapshot-$(date +%Y%m%d).txt

# Check for security vulnerabilities
pnpm audit --recursive

# Capture current working state
git tag pre-dependency-update-$(date +%Y%m%d)
```

### Phase 2: Low-Risk Updates (Icons, Types, Formatters)
1. Update low-risk packages one category at a time
2. Run full build after each category
3. Test locally before committing

```bash
# Example: Update lucide
pnpm update lucide-svelte --recursive

# Verify
pnpm run build --filter=landing
pnpm run build --filter=engine
```

### Phase 3: Medium-Risk Updates (Build Tools)
1. Update one package at a time
2. Full test suite after each
3. Check for deprecation warnings
4. Review changelogs for breaking changes

### Phase 4: High-Risk Updates (Framework)
1. Read full changelog/migration guide
2. Create dedicated branch
3. Update + fix one package at a time
4. Manual testing of all major flows
5. Deploy to preview environment first

## Pre-Update Checklist

- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] Create git tag for rollback point
- [ ] Read changelogs for major packages
- [ ] Check GitHub issues for known problems
- [ ] Ensure local dev environment matches CI

## Post-Update Verification

### Build Verification
```bash
# Build all packages
pnpm run build --recursive

# Check for new warnings
pnpm run build --recursive 2>&1 | grep -i "warn\|deprecat"
```

### Runtime Verification
- [ ] Landing page loads correctly
- [ ] Engine admin dashboard works
- [ ] Blog post creation/editing works
- [ ] Authentication flow works
- [ ] File uploads work
- [ ] Theme switching works
- [ ] Mobile responsive layouts work

### CI Verification
- [ ] All GitHub Actions pass
- [ ] Cloudflare deployments succeed
- [ ] Preview deployments work

## Rollback Plan

If issues discovered post-deploy:

```bash
# Immediate rollback
git revert HEAD~N  # N = number of update commits

# Or restore from tag
git checkout pre-dependency-update-YYYYMMDD
git checkout -b hotfix/revert-updates
```

## Packages to Update (Current Session Candidates)

### Immediate (Low Risk)
- [ ] `lucide-svelte` 0.554.0 → 0.562.0+ (get `LayersPlus` and other new icons)

### Soon (When Convenient)
- [ ] Security patches from `pnpm audit`
- [ ] TypeScript type definitions (`@types/*`)

### Later (Dedicated Session)
- [ ] Svelte 5 runes stabilization updates
- [ ] SvelteKit updates
- [ ] Tailwind v4 (when ready)

## Notes

- **Never update all at once** - makes debugging impossible
- **Minor versions first** - e.g., 0.554 → 0.559 before 0.554 → 0.562
- **Check peer dependencies** - some packages require specific versions of others
- **Monitor after deploy** - some issues only appear in production

## Related Files

- `pnpm-workspace.yaml` - workspace configuration
- `package.json` (root) - shared dependencies
- `packages/*/package.json` - package-specific dependencies
