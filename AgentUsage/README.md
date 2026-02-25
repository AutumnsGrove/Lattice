# Agent Usage Guide Index

> **Note**: This project uses **Claude Code Skills** as the primary mechanism for specialized workflows. Skills provide concise, actionable guidance and are invoked using the Skill tool.
>
> **Skills are located in:** `.claude/skills/`
>
> **These AgentUsage guides serve as extended reference documentation** for when you need more detail than the skill provides.

---

## Skills vs. AgentUsage Guides

| Skills (Primary)                 | AgentUsage Guides (Reference) |
| -------------------------------- | ----------------------------- |
| Concise, actionable instructions | Comprehensive documentation   |
| Invoked via Skill tool           | Read directly when needed     |
| Located in `.claude/skills/`     | Located in `AgentUsage/`      |
| Use for most tasks               | Use for deep dives            |

### How to Use Skills

```
# Invoke a skill when you encounter a relevant situation
skill: "secrets-management"
skill: "git-workflows"
skill: "grove-ui-design"
```

---

## Quick Reference

### Core Workflows

| Guide                                          | Description                                   | When to Use                                |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| [git_guide.md](git_guide.md)                   | Git operations via `gw`, commits, branching   | Every session with code changes            |
| [secrets_management.md](secrets_management.md) | API key handling, security patterns           | Setting up projects with external APIs     |
| [secrets_advanced.md](secrets_advanced.md)     | Advanced secrets patterns, rotation, auditing | Enterprise-grade security implementations  |
| [api_usage.md](api_usage.md)                   | REST API usage, rate limiting, auth           | Integrating external APIs                  |
| [error_handling.md](error_handling.md)         | Signpost error codes, Toast notifications     | Building any feature with error handling   |
| [house_agents.md](house_agents.md)             | Grove agents (runner, coder, scout, etc.)     | Complex searches or multi-file refactoring |
| [subagent_usage.md](subagent_usage.md)         | Creating focused task agents                  | Breaking down large tasks into subtasks    |
| [research_workflow.md](research_workflow.md)   | Codebase analysis patterns                    | Understanding unfamiliar codebases         |

### Development

| Guide                                          | Description                               | When to Use                         |
| ---------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| [svelte5_guide.md](svelte5_guide.md)           | Svelte 5 runes, SvelteKit patterns        | Building Svelte web applications    |
| [cloudflare_guide.md](cloudflare_guide.md)     | Workers, KV, R2, D1, MCP server           | Deploying to Cloudflare             |
| [server_sdk_guide.md](server_sdk_guide.md)     | Infrastructure abstraction via Infra SDK  | Building services with GroveContext |
| [ci_cd_patterns.md](ci_cd_patterns.md)         | GitHub Actions, `gw ci`, pnpm workspaces  | CI/CD pipelines for Lattice         |
| [testing_javascript.md](testing_javascript.md) | Vitest/Jest for JS/TS                     | Writing JavaScript/TypeScript tests |
| [testing_python.md](testing_python.md)         | pytest for Python                         | Writing Python tests (tools)        |
| [testing_go.md](testing_go.md)                 | Go testing with built-in framework        | Writing Go tests (gf, tools)        |
| [testing_rust.md](testing_rust.md)             | Rust testing with cargo test              | Writing Rust tests                  |
| [npm_publish.md](npm_publish.md)               | Publishing `@autumnsgrove/lattice` to npm | npm package releases                |
| [code_style_guide.md](code_style_guide.md)     | General code style principles             | Writing clean, maintainable code    |
| [rich_formatting.md](rich_formatting.md)       | Terminal output with Rich library         | Building CLI tools (gw, gf)         |

### Design & Documentation

| Guide                                                    | Description                                               | When to Use                        |
| -------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| [design_context.md](design_context.md)                   | Brand personality, aesthetic direction, design principles | Building UI, user-facing text      |
| [documentation_standards.md](documentation_standards.md) | Writing style, formats, templates                         | Creating or updating documentation |

### Reference

| Guide                                                              | Description                               | When to Use                      |
| ------------------------------------------------------------------ | ----------------------------------------- | -------------------------------- |
| [multi_language_guide.md](multi_language_guide.md)                 | Patterns for Python, JavaScript, Go, Rust | Multi-language projects          |
| [pre_commit_hooks/setup_guide.md](pre_commit_hooks/setup_guide.md) | Hook setup and configuration              | Enforcing code quality on commit |

---

## Skills to Guide Mapping

| Skill                   | Corresponding Guide             |
| ----------------------- | ------------------------------- |
| `secrets-management`    | secrets_management.md           |
| `api-integration`       | api_usage.md                    |
| `git-workflows`         | git_guide.md                    |
| `git-hooks`             | pre_commit_hooks/setup_guide.md |
| `javascript-testing`    | testing_javascript.md           |
| `python-testing`        | testing_python.md               |
| `go-testing`            | testing_go.md                   |
| `rust-testing`          | testing_rust.md                 |
| `cicd-automation`       | ci_cd_patterns.md               |
| `cloudflare-deployment` | cloudflare_guide.md             |
| `svelte5-development`   | svelte5_guide.md                |
| `rich-terminal-output`  | rich_formatting.md              |
| `research-strategy`     | research_workflow.md            |
| _(cross-cutting)_       | error_handling.md               |

---

_Last updated: 2026-02-22_
_Total guides: 21_
