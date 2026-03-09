# Grove Weekly Summary — March 2–8, 2026

## At a Glance

| Metric            | Value          |
| ----------------- | -------------- |
| Total commits     | 77             |
| PRs referenced    | 20             |
| Issues closed     | 7              |
| Files changed     | 376            |
| Lines added       | +21,742        |
| Lines deleted     | -8,821         |
| Net new lines     | +12,921        |
| Codebase total    | 863,677 lines  |
| Codebase files    | 4,166          |

## Commits by Day

```
Mar 06 (Thu)  ████                                          4
Mar 07 (Fri)  ██████████████████████                       22
Mar 08 (Sat)  █████████████████████████████████████████████ 51
```

## Commits by Type

```
feat      31  (40%)   ██████████████████████████████
fix       28  (36%)   ████████████████████████████
docs       5  ( 6%)   █████
census     3  ( 4%)   ███
merge      3  ( 4%)   ███
rename     2  ( 3%)   ██
test       1          █
refactor   1          █
perf       1          █
```

## Focus Areas (by scope)

```
gw (Grove Wrap CLI)    35 commits   ██████████████████████████████████
engine                 11 commits   ███████████
prism (design system)   5 commits   █████
lighthouse              3 commits   ███
ci                      3 commits   ███
ui                      2 commits   ██
skills                  2 commits   ██
```

## Issues Closed

- **#1363** — Add optional waystone prop to GlassCard
- **#1380** — Unify Lattice publish workflow
- **#1381** — `gw update` self-updating command
- **#1382** — Skill launcher hotkeys for issue browser
- **#1383** — Auto-create worktree before skill launch
- **#1402** — Pagination in gh issue/pr/run list
- **#1408** — Add bear-migrate skill to TUI registry

## Lines Changed by Language

| Language   | Added  | Deleted | Net     |
| ---------- | ------ | ------- | ------- |
| Go         | 5,849  | 208     | +5,641  |
| TypeScript | 5,262  | 3,766   | +1,496  |
| Markdown   | 3,775  | 102     | +3,673  |
| Svelte     | 3,597  | 2,898   | +699    |
| JSON       | 1,029  | 824     | +205    |
| JavaScript | 580    | 554     | +26     |
| YAML       | 510    | 8       | +502    |
| HTML       | 462    | 126     | +336    |
| CSS        | 399    | 330     | +69     |
| Python     | 184    | 3       | +181    |
| SQL        | 80     | 1       | +79     |

## Census: Codebase Growth

| Date   | Total Lines | Total Files |
| ------ | ----------- | ----------- |
| Mar 02 | 832,569     | 4,020       |
| Mar 03 | 840,260     | 4,069       |
| Mar 04 | 847,925     | 4,098       |
| Mar 05 | 850,603     | 4,116       |
| Mar 07 | 859,746     | 4,155       |
| Mar 08 | 863,677     | 4,166       |

> Mar 06 census recorded 1.96M lines / 10,918 files — likely a snapshot anomaly
> (possibly ran from a worktree that included node_modules or build artifacts).

## Narrative

**Grove Wrap (`gw`) dominated the week** with 35 of 77 commits. The CLI tooling
got a major interactive upgrade:

- Interactive issue browser and PR browser with skill launcher hotkeys
- Full worktree lifecycle management (create, clean, prune, auto-create)
- Project board integration
- Unified publish workflow (npm + GitHub Release in one command)
- Self-updating command (`gw update`)
- TUI settings menu, pagination, scrollable viewport, TTY guards

**Engine** saw important housekeeping and features:

- "Free" tier renamed to "Wanderer" for naming consistency
- Color palette fully migrated to Grove tokens
- Friends system decoupled from Lantern into its own feature
- `human.json` protocol support added
- Auth + routing parallelized for performance (edge caching)

**Prism was formalized** as Grove's official design system:

- Consolidated color tokens with subpath exports
- Seasonal palette constants as typed exports
- WCAG contrast validation tests for all curated themes

**CI & DevEx** got quieter but meaningful improvements:

- Specialized PR reviewers and test failure analysis
- Build order fixes (gossamer before engine)
- Lighthouse audit refinements
- Commit-msg hook updated to allow merge/revert commits

**Saturday was a marathon** — 51 of the week's 77 commits landed on a single day,
covering everything from gw worktree management to Prism's design system birth
to engine migration cleanups.
