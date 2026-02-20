# Acorn Frontend Migration Plan

> Moving the domain discovery frontend from Lattice to the Acorn repo

---

## Overview

**Current State:**

- Acorn backend: `AutumnsGrove/grove-acorn` (or similar)
- Acorn frontend: `Lattice/domains/` ← needs to move

**Target State:**

- Acorn backend + frontend: unified in `grove-acorn` repo
- Lattice: no longer contains Acorn frontend

---

## Pre-Migration Checklist

Before starting:

- [ ] Confirm Acorn backend repo name and access
- [ ] Verify current `domains/` deployment is working
- [ ] Document any environment variables needed
- [ ] Note current Cloudflare Pages/Workers configuration
- [ ] Back up any local-only changes

---

## Phase 1: Prepare the Acorn Repo

### 1.1 Create Standard Structure

```bash
# In grove-acorn repo
mkdir -p src/routes src/lib static tests .github/workflows
```

### 1.2 Add Base Configuration Files

**package.json:**

```json
{
	"name": "grove-acorn",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "wrangler pages dev",
		"deploy": "wrangler pages deploy .svelte-kit/cloudflare",
		"test": "vitest",
		"lint": "eslint .",
		"check": "svelte-check"
	},
	"dependencies": {
		"lattice": "^latest"
	},
	"devDependencies": {
		"@sveltejs/adapter-cloudflare": "^latest",
		"@sveltejs/kit": "^latest",
		"svelte": "^latest",
		"vite": "^latest",
		"vitest": "^latest"
	}
}
```

**svelte.config.js:**

```javascript
import adapter from "@sveltejs/adapter-cloudflare";

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter({
			routes: {
				include: ["/*"],
				exclude: ["<all>"],
			},
		}),
	},
};
```

**wrangler.toml:**

```toml
name = "grove-acorn"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "grove-acorn"
database_id = "your-d1-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"
```

### 1.3 Add Agent Files

**CLAUDE.md:**

```markdown
# Project Instructions

> **IMPORTANT**: This project uses `AGENT.md` for agent instructions.

## Instructions for Claude Code

**You MUST read `AGENT.md` before doing anything else.**
```

**AGENT.md:**

```markdown
# Acorn: Domain Discovery Tool

## Overview

Acorn is Grove's AI-powered domain hunting tool. This repo contains both
the backend API and the frontend SvelteKit app.

## Tech Stack

- **Frontend:** SvelteKit
- **Backend:** Cloudflare Workers
- **Database:** Cloudflare D1
- **Auth:** Heartwood (via lattice)
- **AI:** [specify provider]

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

\`\`\`bash
npm run deploy
\`\`\`
```

---

## Phase 2: Copy Frontend Code

### 2.1 Files to Copy

From `Lattice/apps/domains/` to `grove-acorn/`:

```
domains/src/           → src/
domains/static/        → static/
domains/schema.sql     → schema.sql (or merge with existing)
```

### 2.2 Copy Commands

```bash
# From Lattice directory
ACORN_REPO="/path/to/grove-acorn"

# Copy source files
cp -r domains/src/* "$ACORN_REPO/src/"
cp -r domains/static/* "$ACORN_REPO/static/"

# Copy config files (review before overwriting)
cp domains/tailwind.config.js "$ACORN_REPO/"
cp domains/postcss.config.js "$ACORN_REPO/"
cp domains/tsconfig.json "$ACORN_REPO/"

# Copy schema (merge if backend already has one)
cp domains/schema.sql "$ACORN_REPO/schema.sql.frontend"
```

### 2.3 Files to NOT Copy (Recreate Fresh)

- `package.json` — Use new one with lattice dependency
- `wrangler.toml` — May need different bindings
- `svelte.config.js` — Use standard config
- `.env.example` — Recreate with correct variable names

---

## Phase 3: Update Imports

### 3.1 Replace Any Lattice Internal Imports

Search for imports like:

```typescript
// OLD (if any exist)
import { something } from "$lib/../../libs/engine/...";
import { something } from "../../../packages/...";
```

Replace with:

```typescript
// NEW
import { something } from "lattice";
import { something } from "lattice/auth";
```

### 3.2 Update Path Aliases

In `svelte.config.js` or `vite.config.ts`, ensure `$lib` points to local lib:

```javascript
// vite.config.ts
export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve("./src/lib"),
		},
	},
});
```

---

## Phase 4: Environment & Secrets

### 4.1 Document Required Variables

Create `.env.example`:

```bash
# Acorn Environment Variables

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Database (D1)
DB_NAME=grove-acorn
DB_ID=

# Auth (Heartwood)
HEARTWOOD_URL=https://heartwood.grove.place
HEARTWOOD_CLIENT_ID=
HEARTWOOD_CLIENT_SECRET=

# AI Provider (if applicable)
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=

# Rate Limiting (KV)
KV_NAMESPACE_ID=
```

### 4.2 Set Secrets in Cloudflare

```bash
# In grove-acorn directory
wrangler secret put HEARTWOOD_CLIENT_SECRET
wrangler secret put OPENAI_API_KEY
# etc.
```

---

## Phase 5: Test Locally

### 5.1 Install Dependencies

```bash
cd grove-acorn
npm install
```

### 5.2 Run Dev Server

```bash
npm run dev
```

### 5.3 Verify All Routes Work

- [ ] Home page loads
- [ ] Auth flow works (login/logout)
- [ ] Admin dashboard accessible
- [ ] Search functionality works
- [ ] API endpoints respond correctly

---

## Phase 6: Deploy

### 6.1 Initial Deployment

```bash
npm run build
npm run deploy
```

### 6.2 Configure DNS

If not already configured:

```
acorn.grove.place → Cloudflare Pages deployment
```

### 6.3 Verify Production

- [ ] `acorn.grove.place` loads
- [ ] Auth works in production
- [ ] Search works end-to-end
- [ ] No console errors

---

## Phase 7: Cleanup Lattice

### 7.1 Remove Frontend Code

```bash
# In Lattice directory
git rm -r domains/
```

### 7.2 Remove from Workspaces (if applicable)

If `domains` is listed in `package.json` workspaces, remove it.

### 7.3 Update References

Search Lattice for any references to `domains/` and remove or update.

### 7.4 Commit Cleanup

```bash
git add -A
git commit -m "chore: remove Acorn frontend (migrated to grove-acorn repo)"
```

---

## Phase 8: Update Documentation

### 8.1 Update grove-product-standards.md

Change Acorn status from "⚠️ In Lattice" to "✓":

```markdown
| Acorn | — | ✓ | ✓ | ✓ | Complete |
```

### 8.2 Update README (if applicable)

Note that Acorn now lives in its own repo.

---

## Rollback Plan

If something goes wrong:

1. **Keep Lattice domains/ until verified** — Don't delete until production is stable
2. **DNS rollback** — Point `acorn.grove.place` back to old deployment if needed
3. **Git history** — All changes are in git, can revert

---

## Timeline Estimate

| Phase                   | Effort  |
| ----------------------- | ------- |
| Phase 1: Prepare repo   | ~30 min |
| Phase 2: Copy code      | ~15 min |
| Phase 3: Update imports | ~30 min |
| Phase 4: Environment    | ~15 min |
| Phase 5: Test locally   | ~1 hour |
| Phase 6: Deploy         | ~30 min |
| Phase 7: Cleanup        | ~15 min |
| Phase 8: Documentation  | ~15 min |

**Total: ~3-4 hours** (including testing and verification)

---

## Post-Migration

After migration is complete:

- [ ] Monitor for errors in production
- [ ] Verify search functionality with real queries
- [ ] Test auth flow completely
- [ ] Check analytics/logging still works
- [ ] Notify team of new repo location

---

_Created: December 2025_
_Status: Ready for execution_
