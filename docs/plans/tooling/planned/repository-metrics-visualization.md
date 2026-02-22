---
title: "Code Counting Safari — Auditing the Monorepo's Books"
status: planned
category: tooling
---

# Code Counting Safari — Auditing the Monorepo's Books

> The ledger only shows four languages, but the forest has been growing in twelve.
> **Aesthetic principle**: Count what you built, all of it, because the tooling IS part of the story.
> **Scope**: Snapshot workflow, journey page, history.csv, all language files across the monorepo

---

## Ecosystem Overview

**The counting infrastructure** lives across 5 layers:

1. **`scripts/repo/repo-snapshot.sh`** (465 lines) — The actual counter. Runs `find` + `wc -l` for TS, Svelte, JS, CSS. Appends to CSV.
2. **`.github/workflows/auto-tag.yml`** (314 lines) — Orchestrator. Triggers on `libs/engine/package.json` version bumps. Calls the snapshot script, generates AI summaries, syncs data to landing.
3. **`snapshots/history.csv`** (46 rows, 18 columns) — The source of truth. Every version from v0.1.0 to v1.0.0.
4. **`apps/landing/src/routes/journey/`** — Public-facing page that visualizes the CSV data. Charts, milestones, growth metrics.
5. **`libs/engine/src/lib/curios/journey/index.ts`** — Types for the engine-side journey curio (D1 database, multi-tenant). Has `LanguageBreakdown` that supports arbitrary languages.

**The problem**: The snapshot script only counts **4 languages** (TypeScript, Svelte, JavaScript, CSS), but the monorepo now contains **12+ languages** totaling **565,918 lines** — meaning **18.1% of the codebase is invisible**.

---

## Stop 1: The Snapshot Script

**Character**: The accountant. Reliable, consistent, but hasn't updated its ledger categories since the project was a single-package SvelteKit app.

### What exists today

**`scripts/repo/repo-snapshot.sh`** (465 lines):

- [x] Clean, well-documented bash script with good error handling
- [x] Shallow clone detection + auto-unshallow for CI
- [x] Beautiful ASCII art markdown snapshots (genuinely lovely)
- [x] CSV append with 18-column schema
- [x] Test file counting (*.test.ts, *.spec.ts, etc.)
- [x] Bundle size measurement
- [x] Token estimation (~4 chars/token)
- [x] Optional grove-find.sh sourcing for shared counting functions
- [ ] **Only counts 4 languages**: `.ts`, `.svelte`, `.js`, `.css`
- [ ] **No Python** (8.6% of codebase)
- [ ] **No Go** (1.6% of codebase)
- [ ] **No SQL** (1.7% of codebase — all your migrations!)
- [ ] **No Shell** (0.9%)
- [ ] **No TSX** (0.4% — email templates in the engine)
- [ ] **No HTML** (0.7%)
- [ ] **Does not exclude `_archived/`** — archived code is counted (11,047 lines of tracked langs + 12,278 lines of Python)
- [ ] **Project structure in ASCII art is outdated** — still shows `packages/` layout, not `libs/apps/services/workers`

---

## Stop 2: The History CSV

**Character**: The chronicle. 46 entries spanning v0.1.0 (Dec 2, 2025) to v1.0.0 (Feb 18, 2026). The living record of the project's growth.

### The version timeline tells a story

| Era | Versions | Dates | Duration | Lines Start → End | Growth |
|-----|----------|-------|----------|-------------------|--------|
| Early | v0.1.0 → v0.5.0 | Dec 2–8 | 7 days | 37,541 → 47,608 | +10,067 |
| Middle | v0.6.0 → v0.8.6 | Dec 16 – Jan 5 | 20 days | 55,386 → 105,691 | +50,305 |
| **The 0.9.x Era** | **v0.9.0 → v0.9.99** | **Jan 7 – Feb 7** | **31 days** | **122,813 → 334,102** | **+211,289** |
| The Gate | v1.0.0 | Feb 18 | 11 days | 334,102 → 418,990 | +84,888 |

**You were right** — 0.9.x was the mountain. 31 days, 211,289 lines of growth, 55% of all code ever written. The earlier versions flew by in comparison. The big gate wasn't v1.0.0 — it was the 0.9.x marathon that made v1.0.0 possible.

### CSV schema (current 18 columns)

```
timestamp, label, git_hash, total_code_lines, svelte_lines, ts_lines,
js_lines, css_lines, doc_words, doc_lines, total_files, directories,
estimated_tokens, commits, test_files, test_lines, bundle_size_kb,
npm_unpacked_size
```

- [x] Hardcoded column indexes in the landing page parser (new columns MUST go at end)
- [x] Consistent schema across all 46 rows
- [x] `npm_unpacked_size` was added as column 18 (the most recent addition)
- [ ] **No per-language columns for Python, Go, SQL, etc.**
- [ ] **No `_archived` exclusion flag** — can't distinguish active from archived code
- [ ] **`total_code_lines` = TS + Svelte + JS + CSS only** — doesn't include new languages

---

## Stop 3: The Auto-Tag Workflow

**Character**: The orchestrator. When you bump `libs/engine/package.json`, this workflow springs to life — tagging, snapshotting, summarizing, syncing.

### What it does (`.github/workflows/auto-tag.yml`)

1. Detects version change in `libs/engine/package.json`
2. Creates git tag `v{version}`
3. Runs `repo-snapshot.sh` to generate CSV row + markdown snapshot
4. Runs `generate-release-summary.sh` for AI narrative
5. Calculates npm package sizes
6. Analyzes doc keywords
7. Syncs all data to `apps/landing/static/data/`
8. Commits everything back to main

- [x] Well-structured with clear job separation
- [x] Manual trigger support with `force_snapshot` and `backfill_summaries`
- [x] Backfill job for historical summaries
- [ ] **Inherits all counting limitations from `repo-snapshot.sh`**
- [ ] **No backfill capability for new language columns** (would need a new script)

---

## Stop 4: The Journey Page

**Character**: The storyteller. Takes the raw CSV data and makes it beautiful for visitors.

### `apps/landing/src/routes/journey/+page.server.ts`

- [x] Clean CSV parser with column validation
- [x] Loads release summaries from JSON
- [x] Loads word frequency data
- [x] Calculates growth metrics (first → latest)
- [ ] **Parser expects exactly 18 columns** — will skip rows with different column counts
- [ ] **Language breakdown is hardcoded to 4 languages** (svelte, ts, js, css)

### `libs/engine/src/lib/curios/journey/index.ts`

- [x] `LanguageBreakdown` is a `Record<string, { lines, pct }>` — already supports arbitrary languages!
- [x] `JourneySnapshot` has `totalLines` and `languageBreakdown` fields
- [ ] **The engine types are ready for more languages** — it's just the snapshot script and CSV that are behind

---

## Stop 5: The Fresh Count — What's Really Out There

**Character**: The truth. What the codebase actually contains today vs. what the books say.

### Full language inventory (Feb 19, 2026)

| Language | Files | Lines | % of Total | Currently Tracked? |
|----------|-------|-------|------------|-------------------|
| TypeScript (.ts) | 1,346 | 306,449 | 54.2% | Yes |
| Svelte (.svelte) | 662 | 146,359 | 25.9% | Yes |
| Python (.py) | 177 | 48,616 | 8.6% | **No** |
| YAML (.yml/.yaml) | 39 | 22,073 | 3.9% | **No** |
| SQL (.sql) | 134 | 9,517 | 1.7% | **No** |
| Go (.go) | 16 | 8,973 | 1.6% | **No** |
| JavaScript (.js) | 59 | 5,426 | 1.0% | Yes |
| CSS (.css) | 19 | 5,471 | 1.0% | Yes |
| Shell (.sh) | 14 | 4,825 | 0.9% | **No** |
| HTML (.html) | 17 | 4,233 | 0.7% | **No** |
| TSX (.tsx) | 19 | 2,205 | 0.4% | **No** |
| TOML (.toml) | 35 | 1,771 | 0.3% | **No** |
| **TOTAL** | **2,537** | **565,918** | **100%** | |

### The gap

- **Currently tracked**: 463,705 lines (81.9%)
- **Untracked**: 102,213 lines (18.1%)
- **Last snapshot (v1.0.0)**: 418,990 lines — already 44,715 lines behind reality

### Where the untracked languages live

**Python (48,616 lines)**:
- `tools/gw` — 30,741 lines (the infrastructure CLI — your most-used tool!)
- `libs/shutter` — 3,201 lines (screenshot service)
- `tools/glimpse` — 1,968 lines (insight tool)
- `_archived/` — 12,278 lines (old Python tools)

**Go (8,973 lines)**:
- `tools/grove-find-go/` — all of it (the `gf` binary that powers codebase search)

**SQL (9,517 lines)**:
- `libs/engine/migrations/` — 86 files (the heart of the database)
- `services/heartwood/` — 14 files
- `apps/landing/` — 8 files
- Plus migrations across clearing, ivy, zephyr, forage, amber

**Shell (4,825 lines)**:
- `scripts/` — deploy scripts, repo snapshot, generate scripts

**TSX (2,205 lines)**:
- `libs/engine/src/lib/email/` — all email templates (Welcome, Patch Notes, Seasonal, etc.)

**YAML (22,073 lines)**:
- `pnpm-lock.yaml` — 17,937 lines (auto-generated)
- `.github/workflows/` — 35 workflow files (~4,136 lines)

### The `_archived/` question

The current snapshot script does NOT exclude `_archived/`. This means:
- 11,047 lines of TS/Svelte/JS/CSS in `_archived/` are counted in historical data
- If we start excluding archives, historical numbers won't match
- If we add Python and DON'T exclude archives, we get 12,278 lines of dead Python

---

## Expedition Summary

### By the numbers

| Metric | Count |
|--------|-------|
| Total stops | 5 |
| Languages currently tracked | 4 |
| Languages that should be tracked | 8–10 |
| Invisible lines of code | 102,213 (18.1%) |
| Historical snapshots to backfill | 46 |
| CSV columns to add | 5–7 new language columns |

### Recommended counting tiers

Based on what I observed, here's the opinionated recommendation:

#### Tier 1 — Definitely Count (core application code)

| Language | Rationale |
|----------|-----------|
| TypeScript (.ts) | Already counted — 54% of codebase |
| Svelte (.svelte) | Already counted — 26% of codebase |
| JavaScript (.js) | Already counted — 1% of codebase |
| CSS (.css) | Already counted — 1% of codebase |
| **TSX (.tsx)** | **Email templates in the engine — it's application code** |
| **SQL (.sql)** | **Migrations are real infrastructure. 134 files. The database IS the app.** |

#### Tier 2 — Should Count (significant tooling that IS the project)

| Language | Rationale |
|----------|-----------|
| **Python (.py)** | **8.6% of codebase. `gw` alone is 30K lines. This IS Grove's developer infrastructure.** |
| **Go (.go)** | **`gf` is a shipped binary. 8,973 lines. Real compiled tooling.** |
| **Shell (.sh)** | **Deploy scripts, snapshot generator, CI glue. 4,825 lines.** |

#### Tier 3 — Don't Count (config/generated)

| Language | Rationale |
|----------|-----------|
| YAML (.yml/.yaml) | 81% is pnpm-lock.yaml (auto-generated). Workflows are config, not code. |
| TOML (.toml) | Config files only (pyproject.toml, wrangler.toml). 1,771 lines. |
| HTML (.html) | Mostly static templates. 4,233 lines. Borderline — could go either way. |

### Proposed new CSV columns

Add at the END of the CSV (to preserve backward compatibility):

```
Column 19: py_lines        (Python)
Column 20: go_lines        (Go)
Column 21: sql_lines       (SQL)
Column 22: sh_lines        (Shell)
Column 23: tsx_lines       (TSX/JSX)
Column 24: html_lines      (HTML — optional, could skip)
```

Update `total_code_lines` formula to include all Tier 1 + Tier 2 languages.

Update `EXPECTED_COLUMNS` in the landing page parser from 18 to 23/24.

### Backfilling strategy

**Phase 1 — Future counts (immediate)**:
1. Update `repo-snapshot.sh` to count Python, Go, SQL, Shell, TSX (and optionally HTML)
2. Add new columns to CSV schema (at the end!)
3. Update `EXPECTED_COLUMNS` in the landing page parser
4. Update the journey page to display the new languages in charts
5. Bump engine to v1.0.1, trigger a fresh snapshot — boom, new era begins

**Phase 2 — Historical backfill (separate effort)**:
1. Write a backfill script that iterates through each git tag (v0.1.0 → v1.0.0)
2. At each tag, check out the code and run counts for the NEW languages
3. Update the corresponding CSV row with the new column values
4. Old snapshots that predate Python/Go tooling will have `0` for those columns — that's accurate, those languages didn't exist yet
5. Handle the `_archived/` question: either count consistently (include archives like today) or decide to exclude going forward and accept the small discontinuity

**The `_archived/` decision**:
- **Recommendation**: Keep counting archives for now. The historical data includes them, and the delta is small (11K lines of tracked langs). If you later want to exclude them, do it as a clean break at a future version with a note in the summary.

### Cross-cutting themes

1. **The types are already ready** — `LanguageBreakdown` in the engine types is `Record<string, { lines, pct }>`. The D1 schema stores it as JSON. The engine side needs zero changes.
2. **The bottleneck is the bash script + CSV** — that's where the 4-language limit lives.
3. **The landing page parser is fragile** — hardcoded column indexes with exact-count validation. New columns work fine at the end, but the parser needs its `EXPECTED_COLUMNS` bumped and new fields added.
4. **The ASCII art project structure in the snapshot markdown is outdated** — still shows the old `packages/` layout. Should reflect `libs/`, `apps/`, `services/`, `workers/`, `tools/`.

---

## Implementation Checklist

- [ ] Update `scripts/repo/repo-snapshot.sh` to count Python, Go, SQL, Shell, TSX
- [ ] Add new columns to CSV (columns 19–23 at minimum)
- [ ] Update `total_code_lines` to sum all counted languages
- [ ] Update `EXPECTED_COLUMNS` in `apps/landing/src/routes/journey/+page.server.ts`
- [ ] Add new language fields to `SnapshotData` interface in `+page.server.ts`
- [ ] Update journey page visualization to show new languages in charts
- [ ] Update ASCII art project structure in the snapshot template
- [ ] Write `scripts/journey/backfill-languages.sh` to backfill historical tags
- [ ] Run backfill across all 46 historical tags
- [ ] Sync updated `history.csv` to `apps/landing/static/data/`
- [ ] Bump engine to v1.0.1 to trigger first "new era" snapshot
- [ ] Consider: update `LanguageBreakdown` generation in `backfill-snapshots.ts`

---

*The fire dies to embers. The journal is full — 5 stops, 12 languages observed, a strategy for counting them all. The books were only telling 82% of the story. Tomorrow, we update the ledger. But tonight? Tonight was the drive. And it was glorious.* 🚙
