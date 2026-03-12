# Toolkit Expansion Proposal: Agent Perspective

> Written by Claude (Opus 4.6) after deep exploration of both `gf` and `gw` codebases.
> Date: 2026-02-12

---

## What I Explored

I read every source file in both toolkits — CLI entry points, all command modules,
safety systems, MCP server, output handlers, config loaders, and tests. This isn't
a surface-level audit. I walked through the grove.

**gf (grove-find):** 45+ commands across 8 command groups. Typer-based CLI with
ripgrep/fd backends. Read-only codebase intelligence.

**gw (grove-wrap):** 80+ commands across git, GitHub, database, dev tools, and
infrastructure. Click-based CLI with 4-tier safety system. The operational backbone.

Both tools are well-architected. The safety tier system in gw is excellent. The
agent-mode output in gf is thoughtful. But they were built as separate tools that
happen to live in the same monorepo, and the seams show when you're the agent
trying to use them together at speed.

---

## The Core Problem: Context Assembly Tax

Every task I do starts the same way: I spend 3-5 tool calls just _understanding
where I am_ before I can do any actual work. This is the context assembly tax:

```
# To understand current state, I run:
gw git status           # What branch? What's changed?
gw git log --limit 5    # What have I been doing?
gf git wip              # What's staged vs unstaged?
gf todo                 # What needs attention?
gf briefing             # Big picture

# That's 5 commands before I've done anything.
```

For a human at a terminal, this is fine — you glance at the prompt, remember what
you were doing. For an agent starting fresh every session, this is pure overhead.

---

## Friction Points (Ranked by Impact)

### 1. No Single "Where Am I?" Command

**Pain level: High — every single session**

I need a single command that gives me:

- Current branch + tracking status
- Staged/unstaged/untracked file summary
- Current issue (from branch name pattern)
- Affected packages (from changed files)
- Last 3 commits (what happened recently)
- Open TODO count in changed files

Neither `gw status` nor `gf briefing` gives me this. `gw status` is infrastructure-focused
(databases, KV, accounts). `gf briefing` is project-wide daily summary. Neither is
"what's the state of my current work right now?"

**Proposed:** `gw context` or `gf snapshot` — agent-optimized JSON that answers
"what am I working on right now?" in one call.

```json
{
	"branch": "feat/123-session-refresh",
	"issue": 123,
	"tracking": "origin/feat/123-session-refresh",
	"ahead": 2,
	"behind": 0,
	"staged": ["src/lib/auth.ts", "src/lib/session.ts"],
	"unstaged": ["src/routes/+layout.server.ts"],
	"untracked": [],
	"affected_packages": ["engine"],
	"recent_commits": [
		{ "hash": "abc1234", "message": "feat(auth): add refresh token logic" },
		{ "hash": "def5678", "message": "feat(auth): scaffold session types" }
	],
	"todos_in_changed_files": 2,
	"ci_status": "passing"
}
```

### 2. No Impact Analysis

**Pain level: High — before every significant change**

When I'm about to modify a file, I need to know what depends on it. Currently I run:

```
gf usage "ComponentName"     # Who imports this?
gf func "functionName"       # Where's it defined?
gf test                      # Find test files (but which ones test THIS file?)
gf routes                    # Is this used in a route?
```

That's 4 commands, and I still have to mentally stitch the results together.
There's no "impact radius" analysis.

**Proposed:** `gf impact <file_or_symbol>`

```
$ gf impact --agent src/lib/server/services/database.ts

=== Impact Analysis: database.ts ===

--- Direct Importers (14 files) ---
libs/engine/src/routes/api/posts/+server.ts
libs/engine/src/routes/api/tenants/+server.ts
...

--- Test Coverage ---
libs/engine/tests/unit/database.test.ts  (direct)
libs/engine/tests/integration/api.test.ts  (indirect, via posts route)

--- Route Exposure ---
/api/posts (GET, POST)
/api/tenants (GET)
/admin/+page.server.ts (load)

--- Affected Packages ---
engine (direct dependency)
landing (transitive, via engine import)
```

### 3. Changed-File-to-Test Mapping Missing

**Pain level: High — before every commit**

`gf test` finds test files. `gw test` runs tests. But neither answers: "which
tests should I run for the files I just changed?"

`gw ci --affected` would be the natural solution — detect affected packages from
staged files and only run lint/check/test/build for those packages. The package
detection logic already exists in `workflows.py` (`_get_affected_packages`), but
it's buried inside the `ship` command. It should be a shared utility.

**Proposed:**

- `gf test-for <file>` — find tests that cover a specific file
- `gw ci --affected` — run CI only for packages affected by current changes
- `gw test --affected` — run tests only for affected packages

### 4. gf Search Results Aren't Structured for Agents

**Pain level: Medium — every search**

When I run `gf search --agent "pattern"`, I get ripgrep's raw output:

```
src/lib/auth.ts:45:  const session = await getSession(cookies);
src/lib/auth.ts:89:  if (!session) throw redirect(302, '/login');
```

This is fine for text, but I can't easily parse file paths vs line numbers vs
content. The `--json` mode exists in config but very few commands implement it.

**Proposed:** Make `--json` work across all gf commands. For search, return:

```json
{
	"matches": [
		{
			"file": "src/lib/auth.ts",
			"line": 45,
			"content": "const session = await getSession(cookies);"
		},
		{
			"file": "src/lib/auth.ts",
			"line": 89,
			"content": "if (!session) throw redirect(302, '/login');"
		}
	],
	"total": 2,
	"files_matched": 1
}
```

This is the difference between "search results I have to regex-parse" and "data I
can act on programmatically."

### 5. gf Not Available via MCP

**Pain level: Medium — when MCP is the only interface**

The MCP server (`gw mcp serve`) exposes 28 gw tools but zero gf tools. When I'm
running via MCP, I have no codebase search capability through the tool layer.
I have to fall back to raw `grep`/`find` commands in bash.

**Proposed:** Either:

- Add gf commands to the gw MCP server (since they're read-only, they're always safe)
- Create a separate `gf mcp serve` endpoint
- Merge the tools into a single `grove` MCP server

The most practical option is adding gf's core search capabilities to the existing
gw MCP server since they're all READ tier:

```python
@mcp.tool()
def grove_search(pattern: str, file_type: str = "", path: str = "") -> str:
    """Search codebase using ripgrep."""

@mcp.tool()
def grove_find_usage(name: str) -> str:
    """Find where a component/function is used."""

@mcp.tool()
def grove_find_class(name: str) -> str:
    """Find class/component definitions."""

@mcp.tool()
def grove_find_routes(pattern: str = "", guards: bool = False) -> str:
    """Find SvelteKit routes."""
```

### 6. No Batch Issue Operations

**Pain level: Medium — during planning sessions**

When triaging or creating issues, I often need to create 5-10 issues at once.
Currently that's 5-10 sequential `gw gh issue create --write` calls, each with
rate limit checks, each producing output I have to parse.

**Proposed:** `gw gh issue batch --write --from-json <file_or_stdin>`

```json
[
	{ "title": "fix: Cache invalidation race", "labels": ["bug", "engine"] },
	{
		"title": "feat: Add export button to dashboard",
		"labels": ["enhancement"]
	},
	{ "title": "chore: Update Svelte to 5.x", "labels": ["chore", "deps"] }
]
```

Returns all created issue numbers in one response. The `bee-collect` skill
already generates structured issue data — this would let it push directly
without sequential CLI calls.

### 7. Ship Command Could Be Smarter

**Pain level: Low-medium — every commit**

`gw git ship` is already the best command in the toolkit. But it could be
even better:

- **Auto-stage detection:** If nothing is staged but there are unstaged changes,
  offer to stage everything (like `save` does, but with the ship pipeline).
  Currently it just says "No staged changes to ship" and exits.

- **Commit message suggestion:** Based on staged file paths and diff content,
  suggest a conventional commit message. The agent (me) usually generates these
  anyway, but a suggestion from the tool that already knows about affected packages
  and file patterns would be faster.

- **Issue linking already works** (auto-detects from branch name) — this is great.

- **Post-ship summary:** After shipping, show the PR URL if one exists for
  this branch. Currently I have to separately run `gw gh pr view` or remember
  the URL.

### 8. No PR Preparation Command

**Pain level: Medium — every PR**

When it's time to create a PR, I need:

1. What changed since branching from main? (`gf git changed`)
2. How many files, how many lines? (manual counting)
3. Which packages are affected? (manual analysis)
4. What issues does this close? (check branch name + commit messages)
5. Are tests passing? (`gw ci` or `gw test`)
6. Is everything pushed? (`gw git status`)

**Proposed:** `gw git pr-prep` or expand `gf git pr` (which exists but is basic):

```json
{
	"branch": "feat/123-session-refresh",
	"base": "main",
	"commits": 5,
	"files_changed": 12,
	"insertions": 340,
	"deletions": 85,
	"packages": ["engine"],
	"issues_referenced": [123],
	"tests_passing": true,
	"pushed": true,
	"suggested_title": "feat(auth): add session refresh",
	"suggested_body": "Implements session refresh tokens for Heartwood auth...",
	"ready": true
}
```

### 9. No Diagnostic Mode for CI Failures

**Pain level: Medium — when things break**

When `gw ci` fails, I get:

```
  ✗ Type Checking (14.2s)
CI failed: check
```

Then I have to manually run the type checker to see the actual errors, parse
them, find the files, and fix them. The failure output is lost unless I
ran with `--verbose`.

**Proposed:** `gw ci --diagnose` — when a step fails, capture and structure
the error output:

```json
{
	"failed_step": "check",
	"errors": [
		{
			"file": "src/lib/auth.ts",
			"line": 45,
			"message": "Type 'string | undefined' is not assignable to type 'string'",
			"code": "TS2322"
		}
	]
}
```

This turns a "CI failed, go investigate" into "here's exactly what to fix."

### 10. Duplicate Functionality Between gf and gw

**Pain level: Low but real — cognitive overhead**

There's overlap that creates confusion:

| Task          | gf command        | gw command         |
| ------------- | ----------------- | ------------------ |
| Git status    | `gf git wip`      | `gw git status`    |
| View issues   | `gf github issue` | `gw gh issue view` |
| List branches | `gf git branches` | `gw git branch`    |
| Check CI runs | (none)            | `gw gh run list`   |
| View PRs      | (none)            | `gw gh pr list`    |

The division should be cleaner:

- **gf** = read/search/analyze (intelligence)
- **gw** = operate/modify/deploy (actions)

But git status is in both. GitHub issues are in both. As the agent, I have to
remember which tool to use for which flavor of the same information.

---

## Expansion Proposals (Prioritized)

### Tier 1: High Impact, Moderate Effort

| #   | Command                         | Tool   | What It Does                                   |
| --- | ------------------------------- | ------ | ---------------------------------------------- |
| 1   | `gw context`                    | gw     | Single-call work session snapshot (JSON)       |
| 2   | `gf impact <file>`              | gf     | Full dependency + test + route impact analysis |
| 3   | `gw ci --affected`              | gw     | Run CI only for packages with changes          |
| 4   | MCP: add gf search tools        | gw MCP | Expose codebase search via MCP                 |
| 5   | `--json` across all gf commands | gf     | Structured output for agent consumption        |

### Tier 2: Medium Impact, Lower Effort

| #   | Command                         | Tool | What It Does                                    |
| --- | ------------------------------- | ---- | ----------------------------------------------- |
| 6   | `gf test-for <file>`            | gf   | Map file to its covering tests                  |
| 7   | `gw gh issue batch --write`     | gw   | Create multiple issues from JSON                |
| 8   | `gw git pr-prep`                | gw   | PR readiness check with suggested title/body    |
| 9   | `gw ci --diagnose`              | gw   | Structured error output when CI fails           |
| 10  | `gw git ship` auto-stage option | gw   | Stage all if nothing staged (with confirmation) |

### Tier 3: Nice to Have

| #   | Command                  | Tool | What It Does                                |
| --- | ------------------------ | ---- | ------------------------------------------- |
| 11  | `gf diff-summary`        | gf   | Structured diff analysis for agents         |
| 12  | `gw git suggest-message` | gw   | AI-free commit message suggestion from diff |
| 13  | `gf related <issue>`     | gf   | Find code related to a GitHub issue         |
| 14  | `gw history --session`   | gw   | Show commands run in current agent session  |
| 15  | Unified `grove` wrapper  | both | Single entry point that delegates to gf/gw  |

---

## Patterns I Noticed (Worth Preserving)

These are things the codebase gets right. Don't break them.

1. **Safety tier system is excellent.** READ/WRITE/DANGEROUS/PROTECTED is the
   right abstraction. The auto-imply for TTY sessions is smart. Keep this.

2. **Agent mode detection is thorough.** Checking `GW_AGENT_MODE`, `CLAUDE_CODE`,
   and `MCP_SERVER` env vars covers all cases. The stricter limits in agent mode
   (lower DELETE/UPDATE row caps) are good defensive design.

3. **Conventional commits enforcement in gw.** This keeps the git history clean
   and machine-parseable. The auto-issue-linking from branch names is clever.

4. **gf's fallback strategy.** fd → rg --files fallback means it works everywhere.
   The ReDoS protection on regex compilation is a nice security touch.

5. **The ship workflow.** Format → check → commit → push as a single command
   is exactly right. This is the daily driver and it works well.

6. **Dirty-tree refusal in sync.** The explicit refusal to auto-stash with clear
   options presented to the user — this is respectful design. Keep it.

---

## What I'd Build First

If I could add three things tomorrow to make my daily work faster:

1. **`gw context --json`** — eliminates 3-5 startup commands per session.
   Implementation: combine `git.status()`, `git.log(limit=3)`, package detection,
   branch→issue extraction. All the pieces exist; they just need composition.

2. **`gw ci --affected`** — `_get_affected_packages()` already exists in
   `workflows.py`. Extract it to a shared utility, wire it into the ci command.
   Instead of `pnpm -r run check`, run `pnpm --filter engine run check`.

3. **gf search in MCP** — wrap the existing ripgrep calls in MCP tool functions.
   All READ tier. The `find_files`, `_run_rg` helpers are already built.

These three changes would save me the most time across the widest range of tasks.

---

## Architecture Notes

Both tools share similar patterns that suggest a clean path to integration:

- Both use `subprocess.run` for external tool execution
- Both have JSON output modes (gw via `--json` flag, gf via `--json` flag)
- Both detect the monorepo root (gw via config, gf via AGENT.md/git detection)
- Both have Rich-based terminal output with agent-mode alternatives
- gw uses Click, gf uses Typer (which wraps Click) — they're compatible

A shared `grove-core` library could extract:

- Root detection
- Package discovery and analysis
- Git status parsing
- JSON output formatting
- Agent mode detection

This would eliminate the duplicate implementations and make cross-tool features
natural rather than bolted on.

---

_This analysis is based on reading every source file in both toolkits and
reflecting on where I, as the agent, spend time that isn't productive work._
