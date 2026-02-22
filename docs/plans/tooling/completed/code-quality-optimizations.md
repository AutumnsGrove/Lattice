# Code Quality Optimizations

**Created**: January 18, 2026
**Priority**: P2 (Medium)
**Status**: Ready for Implementation
**Estimated Effort**: 8-12 hours total

---

## Overview

Three code quality improvements:

1. **Safari Reader Mode** - Verify fix and ensure fallback exists
2. **CSP Headers** - Standardize across all packages
3. **DB Query Isolation** - Audit and fix multi-statement try/catch blocks

---

## 1. Safari Reader Mode Fix

### Current State

**Issue**: Safari Reader Mode strips `backdrop-filter`, making glass card content invisible.

**Existing Fallback** (Found in `apps/domains/src/app.css`):

```css
@supports not (backdrop-filter: blur(12px)) {
	.glass-card {
		background: rgba(255, 255, 255, 0.95);
	}
}
```

**Missing From**: Engine package (main UI library)

### Investigation Tasks

#### Task 1.1: Verify Domains Fix Works

1. Open `domains.grove.place` in Safari
2. Enable Reader Mode (⌘+Shift+R)
3. Verify glass card content is readable

#### Task 1.2: Check Engine Glass Components

**Files to audit**:

- `libs/engine/src/lib/ui/components/glass/GlassCard.svelte`
- `libs/engine/src/lib/ui/styles/grove.css`
- `libs/engine/src/lib/styles/tokens.css`

Look for `@supports not (backdrop-filter: blur())` fallback.

#### Task 1.3: Add Fallback to Engine

If missing, add to `libs/engine/src/lib/ui/styles/grove.css`:

```css
/* Safari Reader Mode fallback */
@supports not (backdrop-filter: blur(12px)) {
	.glass-card,
	.glass-panel,
	[class*="glass-"] {
		background: var(--grove-glass-fallback, rgba(255, 255, 255, 0.95));
	}

	.dark .glass-card,
	.dark .glass-panel,
	.dark [class*="glass-"] {
		background: var(--grove-glass-fallback-dark, rgba(26, 20, 16, 0.95));
	}
}
```

#### Task 1.4: Add Semantic Wrapper

Ensure glass card content is wrapped in semantic elements for Reader Mode parsing:

```svelte
<!-- GlassCard.svelte -->
<div class="glass-card">
	<article class="glass-card-content">
		<slot />
	</article>
</div>
```

### Acceptance Criteria

- [ ] Fallback exists in engine package
- [ ] Safari Reader Mode shows readable content
- [ ] Dark mode fallback also works
- [ ] Tested on Safari iOS and macOS

---

## 2. CSP Headers Standardization

### Current State

CSP headers found in 4 packages:

| Package         | File                  | Status         |
| --------------- | --------------------- | -------------- |
| Plant           | `src/hooks.server.ts` | ✅ Has CSP     |
| Engine          | `src/hooks.server.ts` | ✅ Has CSP     |
| Landing         | `src/hooks.server.ts` | ✅ Has CSP     |
| Domains         | `src/hooks.server.ts` | ✅ Has CSP     |
| Clearing        | `src/hooks.server.ts` | ❓ Needs check |
| Durable Objects | N/A                   | N/A (Worker)   |

### Current Implementation Comparison

**Plant CSP**:

```typescript
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' https://cdn.grove.place data:",
	"frame-src https://challenges.cloudflare.com",
	"connect-src 'self' https://*.grove.place https://api.lemonsqueezy.com",
	"frame-ancestors 'none'",
	"upgrade-insecure-requests",
].join("; ");
```

**Engine CSP** (more comprehensive):

```typescript
const csp = [
	"default-src 'self'",
	"upgrade-insecure-requests",
	`script-src ${scriptSrc}`, // Includes dynamic unsafe-eval for Monaco/Mermaid
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' https://cdn.autumnsgrove.com https://cdn.grove.place data:",
	"font-src 'self' https://cdn.grove.place",
	"connect-src 'self' https://api.github.com https://*.grove.place https://challenges.cloudflare.com",
	"frame-src https://challenges.cloudflare.com",
	"frame-ancestors 'none'",
].join("; ");
```

### Tasks

#### Task 2.1: Create Shared CSP Utility

**File**: `libs/engine/src/lib/security/csp.ts`

```typescript
interface CSPOptions {
	/** Routes needing unsafe-eval (Monaco, Mermaid) */
	unsafeEvalRoutes?: string[];
	/** Additional script sources */
	scriptSrc?: string[];
	/** Additional connect sources */
	connectSrc?: string[];
	/** Additional img sources */
	imgSrc?: string[];
}

const DEFAULT_CSP: CSPOptions = {
	unsafeEvalRoutes: ["/admin/blog", "/admin/pages", "/blog/"],
	scriptSrc: ["https://challenges.cloudflare.com"],
	connectSrc: ["https://*.grove.place", "https://challenges.cloudflare.com"],
	imgSrc: ["https://cdn.grove.place", "https://cdn.autumnsgrove.com", "data:"],
};

export function buildCSP(pathname: string, options: CSPOptions = {}): string {
	const opts = { ...DEFAULT_CSP, ...options };
	const needsUnsafeEval = opts.unsafeEvalRoutes?.some((route) => pathname.startsWith(route));

	const scriptSrc = [
		"'self'",
		"'unsafe-inline'",
		needsUnsafeEval ? "'unsafe-eval'" : "",
		...(opts.scriptSrc || []),
	]
		.filter(Boolean)
		.join(" ");

	return [
		"default-src 'self'",
		"upgrade-insecure-requests",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' ${opts.imgSrc?.join(" ") || ""}`,
		"font-src 'self' https://cdn.grove.place",
		`connect-src 'self' ${opts.connectSrc?.join(" ") || ""}`,
		"frame-src https://challenges.cloudflare.com",
		"frame-ancestors 'none'",
	].join("; ");
}
```

#### Task 2.2: Update All Packages

Update each package to use the shared utility:

```typescript
// In hooks.server.ts
import { buildCSP } from "@autumnsgrove/lattice/security";

const csp = buildCSP(event.url.pathname, {
	// Package-specific overrides
	connectSrc: ["https://api.lemonsqueezy.com"], // Plant only
});

response.headers.set("Content-Security-Policy", csp);
```

#### Task 2.3: Audit Clearing Package

Check if `apps/clearing/src/hooks.server.ts` has CSP headers. If not, add them.

#### Task 2.4: Document CSP Configuration

Add to AGENT.md or security docs:

````markdown
## Content Security Policy

All packages must set CSP headers via the shared utility:

```typescript
import { buildCSP } from "@autumnsgrove/lattice/security";
```
````

**Routes needing `unsafe-eval`**:

- `/admin/blog/*` - Monaco editor
- `/admin/pages/*` - Monaco editor
- `/blog/*` - Mermaid diagrams

````

### Acceptance Criteria

- [ ] Shared CSP utility in engine
- [ ] All packages using shared utility
- [ ] CSP documented in security docs
- [ ] No CSP violations in browser console
- [ ] Verified with CSP evaluator tool

---

## 3. DB Query Isolation Audit

### Current State

AGENT.md documents the pattern:

```typescript
// ❌ BAD - cascading failure pattern
try {
  const settings = await db.prepare("SELECT * FROM settings").all();
  const pages = await db.prepare("SELECT * FROM pages").all();  // Never runs if settings fails
} catch (error) {}

// ✅ GOOD - isolated query pattern
try {
  const settings = await db.prepare("SELECT * FROM settings").all();
} catch (error) { /* graceful fallback */ }

try {
  const pages = await db.prepare("SELECT * FROM pages").all();
} catch (error) { /* graceful fallback */ }
````

### Tasks

#### Task 3.1: Find Violation Patterns

Search for multi-statement try blocks with DB queries:

```bash
# Search for patterns like:
# try { await db.prepare()...await db.prepare() }
grep -rn "try.*{" libs/engine/src --include="*.ts" | \
  xargs -I {} sh -c 'grep -A20 "try" {} | grep -c "db.prepare"'
```

#### Task 3.2: Audit High-Risk Files

**Automated search command**:

```bash
# Find files with multiple db.prepare in same try block
for f in $(find packages -name "*.ts" -type f); do
  if grep -q "try" "$f" && grep -q "db.prepare" "$f"; then
    count=$(grep -A30 "try {" "$f" | grep -c "db.prepare" 2>/dev/null || echo 0)
    if [ "$count" -gt 1 ]; then
      echo "$f: $count db.prepare calls in try block"
    fi
  fi
done
```

**Priority files to audit**:

| File                                                 | Risk   | Reason                | Expected Queries       |
| ---------------------------------------------------- | ------ | --------------------- | ---------------------- |
| `libs/engine/src/hooks.server.ts`                | High   | Runs on every request | Tenant, user, settings |
| `libs/engine/src/routes/+page.server.ts`         | High   | Homepage loader       | Posts, pages           |
| `libs/engine/src/routes/blog/+page.server.ts`    | High   | Blog listing          | Posts, categories      |
| `libs/engine/src/routes/admin/+layout.server.ts` | High   | Admin shell           | User, tenant, perms    |
| `apps/plant/src/routes/+layout.server.ts`        | High   | Plant shell           | User, onboarding       |
| `libs/engine/src/routes/api/curios/*/+server.ts` | Medium | Curio APIs            | Config, data           |

**Specific patterns to find**:

```typescript
// Pattern 1: Sequential queries in same try
try {
  const a = await db.prepare(...).first();
  const b = await db.prepare(...).all();  // ❌ Blocked if first fails
}

// Pattern 2: Queries with dependent data
try {
  const tenant = await db.prepare('SELECT ...').first();
  const settings = await db.prepare('SELECT ... WHERE tenant_id = ?')
    .bind(tenant.id).all();  // ❌ Throws if tenant is null
}
```

#### Task 3.3: Fix Identified Violations

For each violation:

1. Split into separate try/catch blocks
2. Add appropriate fallback values
3. Log errors appropriately

**Example fix**:

```typescript
// Before
try {
	const tenant = await db.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first();
	const settings = await db.prepare("SELECT * FROM settings WHERE tenant_id = ?").bind(id).all();
	const pages = await db.prepare("SELECT * FROM pages WHERE tenant_id = ?").bind(id).all();
} catch (e) {
	console.error("Failed to load data");
}

// After
let tenant = null;
let settings: Setting[] = [];
let pages: Page[] = [];

try {
	tenant = await db.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first();
} catch (e) {
	console.error("Failed to load tenant:", e);
}

try {
	settings = await db.prepare("SELECT * FROM settings WHERE tenant_id = ?").bind(id).all();
} catch (e) {
	console.warn("Failed to load settings, using defaults");
	settings = getDefaultSettings();
}

try {
	pages = await db.prepare("SELECT * FROM pages WHERE tenant_id = ?").bind(id).all();
} catch (e) {
	console.warn("Failed to load pages");
	pages = [];
}
```

#### Task 3.4: Add ESLint Rule (Optional)

Consider adding a custom ESLint rule to warn on multiple `db.prepare()` calls in a single try block.

### Acceptance Criteria

- [ ] All multi-statement try blocks audited
- [ ] High-risk files fixed
- [ ] Each DB query has its own error handling
- [ ] Appropriate fallback values provided
- [ ] No cascading failures possible

---

## Summary

| Item               | Priority | Effort | Current Status           |
| ------------------ | -------- | ------ | ------------------------ |
| Safari Reader Mode | P2       | 2-3h   | Partial (domains only)   |
| CSP Headers        | P2       | 3-4h   | Working but inconsistent |
| DB Query Isolation | P2       | 3-5h   | Needs audit              |

---

## Files to Modify

### Safari Reader Mode

| File                                                           | Change           |
| -------------------------------------------------------------- | ---------------- |
| `libs/engine/src/lib/ui/styles/grove.css`                  | Add fallback     |
| `libs/engine/src/lib/ui/components/glass/GlassCard.svelte` | Semantic wrapper |

### CSP Headers

| File                                      | Change             |
| ----------------------------------------- | ------------------ |
| `libs/engine/src/lib/security/csp.ts` | New utility        |
| `packages/*/src/hooks.server.ts`          | Use shared utility |

### DB Query Isolation

| File                      | Change           |
| ------------------------- | ---------------- |
| Various `+page.server.ts` | Split try blocks |
| Various `hooks.server.ts` | Split try blocks |

---

## Related Documents

- AGENT.md DB query isolation pattern
- Security audit: `docs/security/SECURITY_AUDIT_REPORT.md`
- Query isolation audit (completed): `docs/plans/completed/query-isolation-audit.md`
