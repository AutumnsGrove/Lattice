# Agent Usage Guide Index

> **Note**: This project uses **Claude Code Skills** as the primary mechanism for specialized workflows. Skills provide concise, actionable guidance and are invoked using the Skill tool.
>
> **Skills are located in:** `.claude/skills/`
>
> **These AgentUsage guides serve as extended reference documentation** for when you need more detail than the skill provides.

---

## Skills vs. AgentUsage Guides

| Skills (Primary) | AgentUsage Guides (Reference) |
|-----------------|------------------------------|
| Concise, actionable instructions | Comprehensive documentation |
| Invoked via Skill tool | Read directly when needed |
| Located in `.claude/skills/` | Located in `AgentUsage/` |
| Use for most tasks | Use for deep dives |

### How to Use Skills

```
# Invoke a skill when you encounter a relevant situation
skill: "secrets-management"
skill: "database-management"
skill: "git-workflows"
```

---

## Quick Reference

### Core Workflows

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [git_guide.md](git_guide.md) | Git operations, commits, branching, conventional commits | Every session with code changes |
| [secrets_management.md](secrets_management.md) | API key handling, security patterns | Setting up projects with external APIs |
| [secrets_advanced.md](secrets_advanced.md) | Advanced secrets patterns, rotation, auditing | Enterprise-grade security implementations |
| [api_usage.md](api_usage.md) | Respectful public API usage, rate limiting, auth | Integrating external APIs |
| [house_agents.md](house_agents.md) | Specialized agent usage (research, coding) | Complex searches or multi-file refactoring |
| [subagent_usage.md](subagent_usage.md) | Creating focused task agents | Breaking down large tasks into subtasks |
| [research_workflow.md](research_workflow.md) | Codebase analysis patterns | Understanding unfamiliar codebases |

### Development

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [db_usage.md](db_usage.md) | SQLite database with database.py interface | Working with databases (MANDATORY) |
| [uv_usage.md](uv_usage.md) | UV package manager workflows | Python dependency management |
| [testing_python.md](testing_python.md) | Python testing with pytest | Writing Python tests |
| [testing_javascript.md](testing_javascript.md) | JS/TS testing with Vitest/Jest | Writing JavaScript/TypeScript tests |
| [testing_go.md](testing_go.md) | Go testing with built-in framework | Writing Go tests |
| [testing_rust.md](testing_rust.md) | Rust testing with cargo test | Writing Rust tests |
| [code_quality.md](code_quality.md) | Linting, formatting, standards | Setting up quality checks |
| [code_style_guide.md](code_style_guide.md) | General code style principles | Writing clean, maintainable code |
| [project_structure.md](project_structure.md) | Directory layouts, file organization | Starting new projects |
| [project_setup.md](project_setup.md) | Project initialization patterns | Setting up new projects from template |
| [rich_formatting.md](rich_formatting.md) | Terminal output with Rich library | Building CLI tools, enhancing print output |
| [svelte5_guide.md](svelte5_guide.md) | Svelte 5 with runes and SvelteKit | Building Svelte web applications |

### Documentation

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [documentation_standards.md](documentation_standards.md) | Writing style, formats, templates | Creating or updating documentation |

### Infrastructure

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [cloudflare_guide.md](cloudflare_guide.md) | Cloudflare Workers, KV, R2, D1, MCP server | Deploying to Cloudflare, serverless apps |
| [docker_guide.md](docker_guide.md) | Container setup and workflows | Dockerizing applications |
| [ci_cd_patterns.md](ci_cd_patterns.md) | GitHub Actions, automation | Setting up CI/CD pipelines |
| [database_setup.md](database_setup.md) | Database configuration patterns | Working with databases |

### Multi-Language Support

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [multi_language_guide.md](multi_language_guide.md) | Patterns for Python, JavaScript, Go, Rust | Multi-language projects or new languages |

### Pre-commit Hooks

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [pre_commit_hooks/setup_guide.md](pre_commit_hooks/setup_guide.md) | Hook setup and configuration | Enforcing code quality on commit |
| [pre_commit_hooks/examples.md](pre_commit_hooks/examples.md) | Language-specific hook patterns | Configuring hooks for specific tech stacks |

## How to Use These Guides

### Recommended Workflow

1. **Use Skills First**: Invoke the relevant skill via the Skill tool for most tasks
2. **Reference Guides for Details**: Read these guides when you need deeper information
3. **Skills point here**: Each skill includes a "Related Resources" section linking to these guides

### Guide Access Pattern

1. **Primary**: Use skill (e.g., `skill: "database-management"`)
2. **If more detail needed**: Read the corresponding guide (e.g., `AgentUsage/db_usage.md`)
3. **Self-Contained**: Each guide stands alone with complete information

## Guide Structure

All guides follow a consistent format:

- **Overview**: What the guide covers
- **When to Use**: Specific triggers and scenarios
- **Core Concepts**: Key principles and patterns
- **Practical Examples**: Real-world code and commands
- **Common Pitfalls**: What to avoid
- **Related Guides**: Cross-references to other relevant guides

## Contributing to Guides

When updating guides:
- Keep examples current and tested
- Maintain the scannable format
- Update cross-references when adding new guides
- Follow documentation standards from documentation_standards.md

## Quick Start Checklist

For new projects, use these skills in order:

1. **`project-scaffolding`** - Initialize project from template
2. **`git-workflows`** - Initialize version control and learn commit standards
3. **`database-management`** - Set up database interface (if using databases)
4. **`secrets-management`** - Configure API keys
5. **`uv-package-manager`** (Python) or relevant language setup
6. **`git-hooks`** - Set up quality checks
7. **`python-testing`** (Python) or relevant testing skill
8. **`docker-workflows`** (if needed) - Containerize application

---

## Skills to Guide Mapping

| Skill | Corresponding Guide |
|-------|---------------------|
| `secrets-management` | secrets_management.md |
| `api-integration` | api_usage.md |
| `database-management` | db_usage.md |
| `git-workflows` | git_guide.md |
| `git-hooks` | pre_commit_hooks/setup_guide.md |
| `uv-package-manager` | uv_usage.md |
| `python-testing` | testing_python.md |
| `javascript-testing` | testing_javascript.md |
| `go-testing` | testing_go.md |
| `rust-testing` | testing_rust.md |
| `code-quality` | code_quality.md |
| `project-scaffolding` | project_setup.md |
| `cicd-automation` | ci_cd_patterns.md |
| `docker-workflows` | docker_guide.md |
| `cloudflare-deployment` | cloudflare_guide.md |
| `svelte5-development` | svelte5_guide.md |
| `rich-terminal-output` | rich_formatting.md |
| `research-strategy` | research_workflow.md |

---

*Last updated: 2025-12-22*
*Total guides: 25*
