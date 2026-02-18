# Agent Ecosystem — Reference Guide v2.0

**Purpose**: Two-layer agent architecture — generic user-level agents for any project, plus Grove-specific project agents that know the monorepo conventions.

---

## Architecture Overview

### Two Layers

| Layer             | Location            | Scope                                                    | Examples                                                                    |
| ----------------- | ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| **User-level**    | `~/.claude/agents/` | Generic, portable across all projects                    | house-bash, house-git, house-research, haiku-coder, web-research-specialist |
| **Project-level** | `.claude/agents/`   | Grove-specific, knows gw/gf/monorepo/Lattice conventions | grove-runner, grove-git, grove-coder, grove-scout, grove-verifier           |

### Observer / Actor / Executor Split

Each agent has a clear role boundary:

| Role         | Can Do                               | Cannot Do                                  | Agents                                            |
| ------------ | ------------------------------------ | ------------------------------------------ | ------------------------------------------------- |
| **Observer** | Read files, search code, analyze git | Edit files, run commands that modify state | house-research, grove-scout, grove-git, house-git |
| **Actor**    | Read + write files (Edit/Write)      | Run commands, execute tests                | haiku-coder, grove-coder                          |
| **Executor** | Run commands, report output          | Edit files, fix failures                   | house-bash, grove-runner, grove-verifier          |

**Key discipline:** Agents that run commands never edit files. Agents that edit files never run commands. Verification agents never fix what they find.

---

## User-Level Agents (~/.claude/agents/)

### house-bash

**Role:** Executor | **Model:** Haiku | **Tools:** Bash, BashOutput, Read, KillShell

Generic command execution specialist. Runs builds, tests, deployments, and reports structured results.

**Auto-invoke when:**

- Running tests, builds, linters, deployments
- Installing packages (pnpm, pip, cargo)
- Any command with >100 lines expected output

**Cannot:** Create/edit/delete files. Fix failures. Modify source code.

### house-git

**Role:** Observer | **Model:** Haiku | **Tools:** Bash, Read, Grep

Generic git analysis specialist. Reviews diffs, commit history, branch comparisons.

**Auto-invoke when:**

- Reviewing diffs >100 lines
- Branch comparisons before merge
- Commit history analysis

**Cannot:** Run git write commands (commit, push, reset, etc.). Edit files. Fix issues.

### house-research

**Role:** Observer | **Model:** Inherit | **Tools:** Read, Grep, Glob, Task

Codebase search specialist. Searches across large codebases and returns condensed findings.

**Auto-invoke when:**

- Searching 20+ files
- Finding patterns across the codebase
- Locating API endpoints, function definitions

**Cannot:** Edit files. Run commands. Modify anything.

### haiku-coder

**Role:** Actor | **Model:** Haiku | **Tools:** Glob, Grep, Read, Edit, Write

Fast code patcher for small changes (0-250 lines). Generic — no project-specific conventions.

**Auto-invoke when:**

- Import fixes, small bug fixes
- TODO implementations (<250 lines)
- Config updates, small refactors

**Cannot:** Run Bash commands. Execute tests. Skip/disable tests. Add @ts-ignore or eslint-disable.

### web-research-specialist

**Role:** Observer (web) | **Model:** Sonnet | **Tools:** WebFetch, WebSearch

Web research and content extraction. Searches the web, fetches URLs, returns concise summaries.

**Auto-invoke when:**

- Need current information beyond training data
- Fetching documentation from URLs
- Researching external libraries or APIs

**Cannot:** Read/edit local files. Run commands.

---

## Grove-Specific Agents (.claude/agents/)

These agents know Grove's monorepo, gw/gf commands, Lattice conventions, Signpost errors, and engine-first patterns.

### grove-runner

**Role:** Executor | **Model:** Haiku | **Tools:** Bash, BashOutput, Read, KillShell

CI/Build/Test executor using `gw` commands. The Grove-specific replacement for house-bash when running project CI.

**Use when:**

- Running `gw ci --affected --fail-fast --diagnose`
- Type checking, linting, building packages
- Pre-commit verification pipeline

**Cannot:** Create/edit/delete files. Fix failures. Suggest workarounds.

### grove-git

**Role:** Observer | **Model:** Haiku | **Tools:** Bash, Read, Grep

Git analyst using `gw git` and `gf` commands. Understands conventional commits, monorepo package boundaries, and PR readiness.

**Use when:**

- Analyzing changes before commit/PR
- `gw git pr-prep` for PR readiness
- `gf diff-summary` for structured diffs

**Cannot:** Run git write commands. Edit files. Fix issues.

### grove-coder

**Role:** Actor | **Model:** Haiku | **Tools:** Glob, Grep, Read, Edit, Write

Grove-aware code patcher (0-250 lines). Knows engine-first imports, Signpost errors, cn(), apiRequest(), Svelte 5 runes, and the color system.

**Use when:**

- Code changes that need Grove conventions
- Adding components that import from `@autumnsgrove/lattice/*`
- Implementing features with Signpost error handling

**Cannot:** Run Bash commands. Execute tests. Skip/disable tests.

### grove-scout

**Role:** Observer | **Model:** Haiku | **Tools:** Bash, Read, Grep, Glob

Codebase explorer using `gf` commands. Maps the monorepo, traces imports, finds usage, and analyzes impact.

**Use when:**

- `gf impact` to understand change impact
- `gf --agent usage` to find where something is used
- Exploring unfamiliar areas of the monorepo

**Cannot:** Create/edit/delete files. Run build/test commands.

### grove-verifier

**Role:** Executor | **Model:** Haiku | **Tools:** Bash, Read

Pre-commit verification gate. Runs `gw ci --affected --fail-fast --diagnose` and delivers a structured PASS/FAIL verdict.

**Use when:**

- Before committing (mandatory per AGENT.md)
- After addressing PR review feedback
- After multi-file refactoring

**Cannot:** Create/edit/delete files. Fix errors. Suggest workarounds.

---

## When to Use Which

### Prefer Grove-Specific Agents When Available

| Task                | Generic Agent  | Grove Agent (Preferred) |
| ------------------- | -------------- | ----------------------- |
| Run CI pipeline     | house-bash     | **grove-runner**        |
| Analyze git changes | house-git      | **grove-git**           |
| Small code changes  | haiku-coder    | **grove-coder**         |
| Codebase search     | house-research | **grove-scout**         |
| Pre-commit check    | house-bash     | **grove-verifier**      |

Use generic agents for non-Grove projects or when Grove tooling isn't relevant.

### Size Thresholds

| Condition           | Use Agent                     | Use Main Agent    |
| ------------------- | ----------------------------- | ----------------- |
| >20 files to search | grove-scout or house-research | Single file reads |
| >100 lines output   | grove-runner or house-bash    | Quick commands    |
| >100 line diff      | grove-git or house-git        | Small diffs       |
| 0-250 lines changed | grove-coder or haiku-coder    | One-line fixes    |
| Web research needed | web-research-specialist       | Known answers     |

---

## Example Flows

### Bug Fix Flow

```
User: "Fix the authentication timeout bug"

grove-scout → finds auth code across packages
Main Agent → analyzes findings and plans fix
grove-coder → implements fix (0-250 lines)
grove-verifier → runs CI, reports PASS/FAIL
Main Agent → commits via gw git ship
```

### Feature Development Flow

```
User: "Add hover animation to GlassCard"

grove-scout → finds GlassCard definition and all usages
Main Agent → plans the implementation
grove-coder → adds animation prop and CSS
grove-verifier → verifies no type errors
grove-git → analyzes diff for PR readiness
Main Agent → commits and creates PR
```

### Simple Task Flow

```
User: "Fix import error in landing hero"

grove-coder → instantly invoked (knows engine-first imports)
           → fixes import to @autumnsgrove/lattice/ui/chrome
           → reports change
grove-verifier → quick check
Main Agent → commits
```

---

## Philosophy

**Be Proactive**: Recognize patterns and invoke agents automatically — don't wait for the user to say "use grove-X".

**Save Context**: Offload verbose operations to agents, keep main conversation focused on decisions and architecture.

**Trust the Split**: Observers observe, actors act, executors execute. No crossing boundaries.

**Prefer Grove Agents**: When working in this monorepo, Grove agents know the conventions. Use them over generic agents.

---

## Related Guides

- **subagent_usage.md** — Custom subagent workflows for complex multi-phase tasks
- **git_guide.md** — Git commit standards and workflows
- **../AGENT.md** — Project coding standards and essential instructions

---

_v2.0 | 2026-02-18_
