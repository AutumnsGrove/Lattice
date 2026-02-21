# Ground File Format Reference

> **When to load:** Writing or updating `.claude/ground.md`

---

## File Location

`.claude/ground.md` — Lives alongside skills and agents because it's agent context.

**IMPORTANT: Add `.claude/ground.md` to `.gitignore`.** This is per-session agent state, not shared project state. Two agents/sessions writing to the same ground file would silently overwrite each other.

---

## Full Format

```markdown
# Ground — [Project Name]

> Validated assumptions for this project. Updated by the Groundhog.
> Last surfaced: YYYY-MM-DD

## Established Ground

These assumptions are confirmed. Safe to build on.

| # | Assumption | Type | Evidence | Established |
|---|-----------|------|----------|-------------|
| 1 | SvelteKit 2 framework | INFERRED | package.json, svelte.config.js | 2026-02-21 |
| 2 | Cloudflare Workers runtime | INFERRED | wrangler.toml, adapter | 2026-02-21 |
| 3 | D1 (SQLite) database | INFERRED | wrangler.toml D1 binding | 2026-02-21 |
| 4 | pnpm package manager | INFERRED | pnpm-lock.yaml | 2026-02-21 |
| 5 | User wants SSR for new routes | ASSUMED | User confirmed on 2026-02-21 | 2026-02-21 |

## Working Ground

Reasonable inferences. Proceed but verify if challenged.

| # | Assumption | Type | Evidence | Notes |
|---|-----------|------|----------|-------|
| 6 | Auth uses Heartwood | INFERRED | Imports found, no config | Verify if auth issues arise |

## Open Ground

Unresolved. Check with user before building on these.

| # | Assumption | Type | Last Asked |
|---|-----------|------|------------|
| 7 | Test framework preference | ASSUMED | 2026-02-21 |

## Resolved Contradictions

| Contradiction | Resolution | Date |
|--------------|------------|------|
| Jest vs Vitest | Vitest is active, Jest is legacy — user confirmed | 2026-02-21 |

## Shadow Check Baseline

| Check | Value | Confidence | Date |
|-------|-------|------------|------|
| Runtime | Cloudflare Workers (Edge) | ESTABLISHED | 2026-02-21 |
| Database | D1 (SQLite) | ESTABLISHED | 2026-02-21 |
| Auth | Heartwood | WORKING | 2026-02-21 |
| Package manager | pnpm | ESTABLISHED | 2026-02-21 |
| Test framework | Vitest (unconfirmed) | OPEN | 2026-02-21 |
| Deploy target | Cloudflare Pages | ESTABLISHED | 2026-02-21 |
| Monorepo | pnpm workspaces | ESTABLISHED | 2026-02-21 |
| Styling | Tailwind + Grove preset | ESTABLISHED | 2026-02-21 |
```

---

## Burrow Rules

- Only write the ground file AFTER the user has responded to OPEN questions
- If the user doesn't respond to some questions, leave them in Open Ground
- Never overwrite established ground without evidence — only add to it
- Date-stamp everything so future sessions know how fresh the ground is
- If a previous ground file exists, read it first and update incrementally, don't replace
- Types are immutable (audit trail of HOW something was determined)
- Tiers are mutable (change when user provides input)

## Report Format

```markdown
## Groundhog Report

**Project:** [name]
**Date:** [YYYY-MM-DD]
**Trigger:** [why the Groundhog surfaced]

### Assumption Map

| # | Assumption | Type | Tier | Evidence |
|---|-----------|------|------|----------|
| 1 | Framework is SvelteKit 2 | INFERRED | ESTABLISHED | package.json, svelte.config.js |

### Contradictions Found

| Signal A | Signal B | Impact |
|----------|----------|--------|

### Shadow Check Results

| Check | Result | Confidence |
|-------|--------|------------|

### Questions for You

1. **[OPEN #N]** Question?
```

## Example Surfacing Session

**User:** "I want to add a real-time notification system to the grove."

1. **EMERGE** — Scan: SvelteKit 2, wrangler.toml with D1/KV/DO bindings, pnpm monorepo with 12 packages. Previous ground file from 2026-02-15.

2. **SURVEY** — For real-time notifications: CF Workers means no long-lived WebSockets without DO (INFERRED). D1 has no LISTEN/NOTIFY (INFERRED). DO bindings exist but no DO code (INFERRED/WORKING). User wants true real-time vs polling (ASSUMED/OPEN). Notifications per-tenant (ASSUMED/OPEN). Found `notifications` table but no service code (UNCERTAIN/OPEN).

3. **SORT** — Classify by tier. Established: runtime, database. Working: DO available. Open: real-time definition, tenant scope, existing table status.

4. **REPORT** — Present map with 3 direct questions for user.

5. **BURROW** — After user responds, write updated ground file.
