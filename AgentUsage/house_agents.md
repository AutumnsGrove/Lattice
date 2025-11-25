# House Agents - Quick Reference

**Purpose**: Auto-invoke specialized agents to save context tokens and keep main conversation focused.

---

## The Five Agents

| Agent | Use For | Auto-Invoke When | Model |
|-------|---------|------------------|-------|
| **house-research** | Codebase searches, pattern finding | Searching 20+ files, finding patterns | Haiku 4.5 |
| **house-bash** | Command execution, verbose output | Running tests, builds, pnpm install, deployments | Haiku 4.5 |
| **house-git** | Git diffs, commit analysis | Reviewing diffs >100 lines, before commits | Haiku 4.5 |
| **house-coder** | Small code patches (0-250 lines) | Import fixes, TODO implementations, bugs <50 lines | Haiku 4.5 |
| **house-planner** | Task orchestration & planning | Multi-file changes (3+), new features, ambiguous tasks | Sonnet 4.5 |

---

## When to Auto-Invoke

### house-research
- "find all [X]" across codebase
- "where is [X] used?"
- Searching TODO/FIXME comments
- Security audits, API endpoint searches
- **Threshold**: 20+ files expected

### house-bash
- Running: tests, builds, linters, deployments
- Installing: pnpm install, pip install, package updates
- Executing: scripts with verbose output
- Starting: dev servers, Docker containers
- **Threshold**: Output >100 lines expected

### house-git
- Before every commit (review changes)
- Diffs >100 lines
- Branch comparisons before merge
- Commit history analysis
- Multi-file refactoring review
- **Threshold**: >100 line diff or multi-file

### house-coder
- **AUTO**: "fix import error" - instant invoke
- **AUTO**: "implement TODO" - instant invoke
- **AUTO**: "fix bug" (if <50 lines) - instant invoke
- Applying diffs, small refactors, config updates
- **Threshold**: 0-250 lines total

### house-planner
- "add [new feature]" (substantial)
- "build [system/dashboard]"
- "refactor [multi-file system]"
- Ambiguous requirements needing clarification
- **Threshold**: 3+ files or complex scope

---

## Quick Trigger Patterns

**house-research**: "find all X", "where is X", "search for X", "locate X"
**house-bash**: "run [cmd]", "execute [script]", "build", "test", "install", "deploy"
**house-git**: "commit", "review changes", "compare branches", "what changed"
**house-coder**: "fix import", "implement TODO", "fix bug" (small)
**house-planner**: "add [feature]", "build [system]", "refactor [layer]"

---

## Token Savings

| Agent | Input (Hidden) | Output (To Main) | Token Savings |
|-------|----------------|------------------|---------------|
| house-research | 70k+ tokens (searches) | 3k summary | ~95% |
| house-bash | 20k+ tokens (output) | 700 summary | ~97% |
| house-git | 43k+ tokens (diffs) | 500 summary | ~99% |
| house-coder | 8k-15k tokens (code+edits) | 1k-1.5k summary | ~85-90% |
| house-planner | 5k-10k tokens (analysis) | 2k-3k plan | ~50-70% |

---

## Size Thresholds

### Use Agent If:
- **house-research**: >20 files to search
- **house-bash**: >100 lines output expected
- **house-git**: >100 line diff or multi-file
- **house-coder**: 0-250 lines changed
- **house-planner**: 3+ files or complex/ambiguous

### Use Main Agent If:
- Single file, known location
- Quick command (<10 lines output)
- Small diff (<50 lines, single file)
- Simple one-line changes
- Clear, single-file task

---

## Example Flows

### Bug Fix Flow
```
User: "Fix the authentication timeout bug"
↓
house-research → finds auth code
Main Agent → analyzes and plans fix
house-coder → implements fix (<250 lines)
house-bash → runs auth tests
house-git → reviews changes
Main Agent → commits
```

### Feature Development Flow
```
User: "Add JWT authentication"
↓
house-planner → asks questions, creates plan
house-research → finds existing auth patterns
house-coder → implements JWT generation (80 lines)
house-coder → updates login endpoint (60 lines)
house-coder → adds tests (100 lines)
house-bash → runs test suite
house-git → reviews all changes
Main Agent → commits
```

### Simple Task Flow
```
User: "Fix import error in utils.py"
↓
house-coder → instantly invoked (auto)
           → fixes import
           → returns summary
Main Agent → done!
```

---

## Don't Use Agents For

- Single file reads (use Read tool)
- Simple one-line changes (main agent faster)
- Interactive debugging (need tight feedback)
- When user wants to see full output
- Learning/exploration tasks

---

## Philosophy

**Be Proactive**: Don't wait for user to say "use house-X" - recognize patterns and invoke automatically.

**Save Context**: Offload verbose operations to agents, keep main conversation focused on decisions and architecture.

**Trust Agents**: They're specialized experts - let them do their job and return condensed results.

---

## Related Guides

- **subagent_usage.md** - Different use cases and patterns
- **git_guide.md** - Git commit standards and workflows
- **../AGENT.md** - Project coding standards

---

*v1.0 | 2025-10-19*
