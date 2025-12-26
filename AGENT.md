# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Project Naming

| | |
|---|---|
| **Public name** | Lattice |
| **Internal codename** | GroveEngine |
| **npm package** | @autumnsgrove/groveengine |

Lattice is the core framework that powers the Grove ecosystem. The name evokes a framework that supports growth—vines climb it, gardens are built around it. Use "Lattice" in user-facing documentation and marketing; use "GroveEngine" for internal references, database names, and infrastructure.

---

## Project Purpose
Multi-tenant blog platform where users get their own blogs on subdomains (username.grove.place). Built on Cloudflare infrastructure with SvelteKit, featuring an optional community feed where blogs can share posts, vote, and react with emojis.

**The Why:** This isn't just a SaaS—it's about helping friends have their own space online, away from big tech algorithms. It's solarpunk-aligned (decentralized, community-owned), and built to be genuinely helpful rather than exploitative. Grove provides queer-friendly infrastructure: safe digital spaces, especially valuable when physical environments feel hostile.

## Tech Stack
- **Language:** TypeScript, JavaScript
- **Framework:** SvelteKit 2.0+
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage
- **Infrastructure:** SST (resources), Wrangler (app deployment)
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE)
- **Payments:** Stripe
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm

## Infrastructure & Deployment

### Local Development
```bash
# Start any app locally (auto-creates local D1/KV/R2)
cd landing && pnpm dev      # or wrangler dev
cd packages/engine && pnpm dev
```

### SST (Stripe + Resources)
SST is used for **Stripe integration** (Phase 2) and resource documentation. Apps deploy via wrangler.

**SST Scope:**
- ✅ Stripe products/prices as code (creates real Stripe products)
- ✅ D1/KV/R2 resource definitions (IaC documentation)
- ✅ Isolated staging resources (`pnpm sst:dev`)
- ❌ App deployment (no cloudflare.SvelteKit - use wrangler)

```bash
pnpm sst:dev   # Creates isolated dev resources
pnpm sst:prod  # Imports existing production resources
```

- **Config:** `sst.config.ts` - Stripe + resource definitions
- **Secrets:** `secrets.json` (gitignored) - Cloudflare API token
- **Outputs:** `.sst/outputs.json` - deployed resource IDs

### Production Deployment
Apps auto-deploy via GitHub Actions on push to main. Resource IDs are hardcoded in each app's `wrangler.toml`.

## Design Standards

### Typography
- **Default Font:** Lexend — used across all Grove properties (landing, engine, blogs)
- **Font Fallback:** All font mappings should fall back to `lexend`, not other fonts
- **Available Fonts:** See `packages/engine/static/fonts/` for the full collection

## Architecture Notes
- Multi-tenant architecture with subdomain routing
- Cloudflare-first infrastructure (Workers, D1, KV, R2)
- Phase-based development: Lattice → Multi-tenant → Website → Meadow → Polish
- First client: Mom's publishing house

---

## Essential Instructions (Always Follow)

### Core Behavior
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested

### Naming Conventions
- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`, `backup-2025-12-31`)
- **No spaces or underscores** in directory names (except date-based paths)

### TODO Management
- **Always check `TODOS.md` first** when starting a task or session
- **Check `COMPLETED.md`** for context on past decisions and implementation details
- **Update immediately** when tasks are completed, added, or changed
- **Move completed tasks** from `TODOS.md` to `COMPLETED.md` to keep the TODO list focused
- Keep both lists current and accurate

### Contributing
- **See `CONTRIBUTING.md`** for PR guidelines, commit conventions, and the AI agent section
- Keep Grove's warm, community-focused voice in documentation and user-facing text

### Git Workflow Essentials

**After completing major changes, you MUST commit your work.**

**Conventional Commits Format:**
```bash
<type>: <brief description>

<optional body>
```

**Common Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```bash
feat: Add user authentication
fix: Correct timezone bug
docs: Update README
```

**For complete details:** See `AgentUsage/git_guide.md`

---

## When to Use Skills

**This project uses Claude Code Skills for specialized workflows. Invoke skills using the Skill tool when you encounter these situations:**

### Secrets & API Keys
- **When managing API keys or secrets** → Use skill: `secrets-management`
- **Before implementing secrets loading** → Use skill: `secrets-management`
- **When integrating external APIs** → Use skill: `api-integration`

### Cloudflare Development
- **When deploying to Cloudflare** → Use skill: `cloudflare-deployment`
- **Before using Cloudflare Workers, KV, R2, or D1** → Use skill: `cloudflare-deployment`
- **When setting up Cloudflare MCP server** → Use skill: `cloudflare-deployment`

### Package Management
- **When using UV package manager** → Use skill: `uv-package-manager`
- **Before creating pyproject.toml** → Use skill: `uv-package-manager`
- **When managing Python dependencies** → Use skill: `uv-package-manager`

### Version Control
- **Before making a git commit** → Use skill: `git-workflows`
- **When initializing a new repo** → Use skill: `git-workflows`
- **For git workflow and branching** → Use skill: `git-workflows`
- **When setting up git hooks** → Use skill: `git-hooks`

### Database Management
- **When working with databases** → Use skill: `database-management`
- **Before implementing data persistence** → Use skill: `database-management`
- **For database.py template** → Use skill: `database-management`

### Research & Analysis
- **When researching technology decisions** → Use skill: `research-strategy`
- **When analyzing unfamiliar codebases** → Use skill: `research-strategy`
- **For systematic investigation** → Use skill: `research-strategy`

### Testing
- **Before writing JavaScript/TypeScript tests** → Use skill: `javascript-testing`
- **Before writing Python tests** → Use skill: `python-testing`
- **Before writing Go tests** → Use skill: `go-testing`
- **Before writing Rust tests** → Use skill: `rust-testing`

### Code Quality
- **When formatting or linting code** → Use skill: `code-quality`
- **Before major code changes** → Use skill: `code-quality`
- **For Black, Ruff, mypy usage** → Use skill: `code-quality`

### Project Setup & Infrastructure
- **When starting a new project** → Use skill: `project-scaffolding`
- **Setting up CI/CD pipelines** → Use skill: `cicd-automation`
- **When containerizing applications** → Use skill: `docker-workflows`

### Web Development
- **When building Svelte 5 applications** → Use skill: `svelte5-development`
- **For SvelteKit routing and forms** → Use skill: `svelte5-development`

### CLI Development
- **When building terminal interfaces** → Use skill: `rich-terminal-output`
- **For Rich library patterns** → Use skill: `rich-terminal-output`

---

## Quick Reference

### How to Use Skills
Skills are invoked using the Skill tool. When a situation matches a skill trigger:
1. Invoke the skill by name (e.g., `skill: "secrets-management"`)
2. The skill will expand with detailed instructions
3. Follow the skill's guidance for the specific task

### Security Basics
- Store API keys in `secrets.json` (NEVER commit)
- Add `secrets.json` to `.gitignore` immediately
- Provide `secrets_template.json` for setup
- Use environment variables as fallbacks

### Available Skills Reference
| Skill | Purpose |
|-------|---------|
| `secrets-management` | API keys, credentials, secrets.json |
| `api-integration` | External REST API integration |
| `database-management` | SQLite, database.py patterns |
| `git-workflows` | Commits, branching, conventional commits |
| `git-hooks` | Pre-commit hooks setup |
| `uv-package-manager` | Python dependencies with UV |
| `python-testing` | pytest, fixtures, mocking |
| `javascript-testing` | Vitest/Jest testing |
| `go-testing` | Go testing patterns |
| `rust-testing` | Cargo test patterns |
| `code-quality` | Black, Ruff, mypy |
| `project-scaffolding` | New project setup |
| `cicd-automation` | GitHub Actions workflows |
| `docker-workflows` | Containerization |
| `cloudflare-deployment` | Workers, KV, R2, D1 |
| `svelte5-development` | Svelte 5 with runes |
| `rich-terminal-output` | Terminal UI with Rich |
| `research-strategy` | Systematic research |

---

## Code Style Guidelines

### Function & Variable Naming
- Use meaningful, descriptive names
- Keep functions small and focused on single responsibilities
- Add docstrings to functions and classes

### Error Handling
- Use try/except blocks gracefully
- Provide helpful error messages
- Never let errors fail silently

### File Organization
- Group related functionality into modules
- Use consistent import ordering:
  1. Standard library
  2. Third-party packages
  3. Local imports
- Keep configuration separate from logic

---

## Communication Style
- Be concise but thorough
- Explain reasoning for significant decisions
- Ask for clarification when requirements are ambiguous
- Proactively suggest improvements when appropriate

---

## Additional Resources

### Skills Documentation
Skills are the primary way to access specialized knowledge. Use the Skill tool to invoke them.
Skills are located in `.claude/skills/` and provide concise, actionable guidance.

### Extended Documentation
For in-depth reference beyond what skills provide, see:
**`AgentUsage/README.md`** - Master index of detailed documentation

---

*Last updated: 2025-12-25*
*Model: Claude Opus 4.5*
