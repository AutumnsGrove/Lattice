# Agent Usage Guide Index

This directory contains comprehensive guides for working with AI agents on development projects. Each guide is self-contained and focused on specific workflows or technologies.

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

1. **On-Demand Reference**: Read guides when you need specific knowledge
2. **Self-Contained**: Each guide stands alone with complete information
3. **Cross-Referenced**: Related topics link to each other
4. **Start with AGENT.md**: Check parent directory for trigger patterns

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

For new projects, reference these guides in order:

1. **project_setup.md** - Initialize project from template
2. **project_structure.md** - Set up directory layout
3. **git_guide.md** - Initialize version control and learn commit standards
4. **db_usage.md** - Set up database interface (if using databases)
5. **secrets_management.md** - Configure API keys
6. **uv_usage.md** (Python) or relevant language guide
7. **pre_commit_hooks/setup_guide.md** - Set up quality checks
8. **testing_python.md** (Python) or relevant language testing guide
9. **docker_guide.md** (if needed) - Containerize application

---

*Last updated: 2025-11-28*
*Total guides: 25*
