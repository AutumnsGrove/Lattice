# Agent Usage Guide Index

This directory contains guides for working with AI agents on this SvelteKit/Cloudflare project.

## Quick Reference

### Core Workflows

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [git_guide.md](git_guide.md) | Git operations, commits, branching, conventional commits | Every session with code changes |
| [secrets_management.md](secrets_management.md) | API key handling, security patterns | Setting up projects with external APIs |
| [secrets_advanced.md](secrets_advanced.md) | Advanced secrets patterns, rotation, auditing | Enterprise-grade security implementations |
| [api_usage.md](api_usage.md) | Respectful public API usage, rate limiting, auth | Integrating external APIs |
| [house_agents.md](house_agents.md) | Specialized agent usage (research, coding) | Complex searches or multi-file refactoring |
| [research_workflow.md](research_workflow.md) | Codebase analysis patterns | Understanding unfamiliar codebases |

### Development

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [db_usage.md](db_usage.md) | SQLite/D1 database patterns | Working with databases (MANDATORY) |
| [testing_javascript.md](testing_javascript.md) | JS/TS testing with Vitest/Jest | Writing JavaScript/TypeScript tests |
| [testing_strategies.md](testing_strategies.md) | General testing strategies | Planning test coverage |
| [code_style_guide.md](code_style_guide.md) | General code style principles | Writing clean, maintainable code |
| [project_structure.md](project_structure.md) | Directory layouts, file organization | Starting new projects |
| [project_setup.md](project_setup.md) | Project initialization patterns | Setting up new projects from template |
| [svelte5_guide.md](svelte5_guide.md) | Svelte 5 with runes and SvelteKit | Building Svelte web applications |

### Documentation

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [documentation_standards.md](documentation_standards.md) | Writing style, formats, templates | Creating or updating documentation |

### Infrastructure

| Guide | Description | When to Use |
|-------|-------------|-------------|
| [cloudflare_guide.md](cloudflare_guide.md) | Cloudflare Workers, KV, R2, D1 | Deploying to Cloudflare, serverless apps |
| [ci_cd_patterns.md](ci_cd_patterns.md) | GitHub Actions, automation | Setting up CI/CD pipelines |

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

## Quick Start Checklist

For new Grove sites, reference these guides in order:

1. **project_setup.md** - Initialize project from template
2. **project_structure.md** - Set up directory layout
3. **git_guide.md** - Initialize version control and commit standards
4. **db_usage.md** - Set up D1 database interface
5. **secrets_management.md** - Configure API keys
6. **svelte5_guide.md** - SvelteKit patterns
7. **cloudflare_guide.md** - Deploy to Cloudflare
8. **testing_javascript.md** - Write tests
9. **pre_commit_hooks/setup_guide.md** - Set up quality checks

---

*Last updated: 2025-12-10*
*Total guides: 15*
