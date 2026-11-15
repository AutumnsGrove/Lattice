# Contributing to Grove

Welcome, Wanderer! We're glad you're here.

Grove is a community-focused project building queer-friendly infrastructure for the web. Whether you're reporting a bug, suggesting a feature, or writing code—you're welcome in this space.

## The Golden Rule: Issues First

**Every contribution starts with an issue.**

```
Issue → Discussion → PR → Review → Merge
```

We don't accept PRs that appear out of nowhere. Here's why:

1. **Prevents wasted effort.** You might spend hours on something we've already decided against, or that someone else is working on.
2. **Creates a paper trail.** Issues let us discuss approaches before code is written.
3. **Keeps everyone aligned.** The community can weigh in on direction before implementation.

### How It Works

1. **Find or create an issue** — Check [existing issues](https://github.com/AutumnsGrove/Lattice/issues) first
2. **Discuss the approach** — Comment on the issue with your plan
3. **Get the green light** — Wait for a maintainer to approve the approach
4. **Submit your PR** — Reference the issue number (e.g., "Fixes #123")
5. **Review and merge** — Address feedback, then celebrate!

**Exception:** Typo fixes and tiny documentation corrections can go straight to PR. Use your judgment—if it takes more than 5 minutes, open an issue first.

## Ways to Contribute

### 🐛 Report Bugs

Found something broken? [Open a bug report](https://github.com/AutumnsGrove/Lattice/issues/new?template=bug_report.md) with:

- Clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots if helpful

### 💡 Suggest Features

Have an idea? [Open a feature request](https://github.com/AutumnsGrove/Lattice/issues/new?template=feature_request.md) with:

- What problem does this solve?
- Who would use this?
- Any implementation ideas (optional)

Not every suggestion will be accepted—Grove has a focused vision. But we'll always consider thoughtful proposals.

### 🔍 Test and Explore

Sometimes the most valuable contribution is just _using the thing_.

- Explore the site and report what feels off
- Try edge cases and unusual workflows
- Check accessibility with screen readers
- Test on different devices and browsers

### 📝 Improve Documentation

Clear documentation helps everyone. You can:

- Fix typos and clarify confusing sections
- Add examples where they'd help
- Translate content (talk to us first)
- Write tutorials or guides

### 🛠️ Write Code

Ready to dive in? Check out issues labeled [`good first issue`](https://github.com/AutumnsGrove/Lattice/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) for beginner-friendly tasks.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/AutumnsGrove/Lattice.git
cd Lattice

# Install dependencies
pnpm install

# Start the engine dev server
cd libs/engine
pnpm dev

# Or with Cloudflare bindings (D1, R2, KV)
pnpm dev:wrangler
```

See the [README](README.md) for more detailed setup instructions.

## Code Style

- **TypeScript** for all new code
- **Svelte 5** with runes mode
- **Tailwind CSS** for styling
- Keep functions small and focused
- Meaningful variable names over clever ones
- Comments for _why_, not _what_

We don't enforce strict linting rules—use your judgment. Write code you'd want to read six months from now.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <brief description>

<optional body explaining why>
```

**Types:**

- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation only
- `refactor` – Code change that neither fixes a bug nor adds a feature
- `test` – Adding or updating tests
- `chore` – Maintenance tasks

**Examples:**

```
feat: Add dark mode toggle to settings
fix: Correct timezone handling in post scheduler
docs: Update authentication section in README
```

Keep the subject line under 72 characters. Write in imperative mood ("Add feature" not "Added feature").

## Pull Request Guidelines

### Before Opening a PR

1. **Link to the issue** — Your PR must reference an existing issue
2. **Make sure tests pass** — `pnpm test` in the relevant package
3. **Test your changes locally** — Don't just assume it works
4. **Keep PRs focused** — One feature or fix per PR. Smaller is better.
5. **Update docs if needed** — If you change behavior, update the documentation

### PR Template

```markdown
## Summary

Brief description of what this PR does.

Fixes #<issue number>

## Changes

- Bullet points of specific changes

## Test Plan

How you verified this works.

## Screenshots (if UI changes)

Before/after if applicable.
```

### Review Process

- PRs need at least one approval before merging
- Be open to feedback—it's collaborative, not adversarial
- If changes are requested, address them or explain why you disagree
- Squash commits when merging to keep history clean

## For AI Agents

Hey there, fellow builder! If you're an AI agent (Claude, GPT, Copilot, or otherwise) working on this project:

1. **Read `AGENT.md` first.** It has project-specific instructions, conventions, and context you'll need.
2. **Check [GitHub Issues](https://github.com/AutumnsGrove/Lattice/issues)** for current priorities and in-progress work.
3. **Follow the issue-first workflow.** Don't generate PRs without a corresponding issue.
4. **Self-identify in commits** — Use the Co-Authored-By line to identify yourself:

   ```
   Co-Authored-By: <Harness> (<Model>) <noreply@provider.com>
   ```

   Examples:

   ```
   Co-Authored-By: Claude Code (Opus 4.5) <noreply@anthropic.com>
   Co-Authored-By: Kilo (DeepSeek V3) <noreply@deepseek.com>
   Co-Authored-By: Kilo (MiniMax M2.1) <noreply@minimax.io>
   Co-Authored-By: pi (DeepSeek V4.1 1017) <noreply@deepseek.com>
   ```

   Harness and model is enough — it doesn't have to be a brand name. If the harness
   doesn't know which model it's running, leave the model out rather than guessing.

   This helps with auditing—we want to know _which_ agent wrote _what_.

   Keep attribution in this trailer. Don't append "🤖 Generated with …" footers to
   PR or issue bodies: several harnesses add one automatically, it repeats what the
   trailer already says, and the harness it names is often not the one that did the
   work.

5. **Don't over-engineer.** Do what's asked, nothing more. Resist the urge to refactor adjacent code or add "improvements" that weren't requested.
6. **Ask for clarification** if requirements are ambiguous rather than guessing.
7. **Respect the project's voice.** Grove has a warm, introspective tone. Match it in documentation and user-facing text.

You're part of the team. Build things that help people have their own space online.

## 🐝 The Animal Skills Ecosystem

Grove uses a unique "forest ecosystem" of specialized skills for different tasks. Each animal has a specialty:

**Predators (Precision):**

- `panther-strike` — Fix single issues with surgical precision

**Builders (Creation):**

- `beaver-build` — Write tests and build confidence
- `elephant-build` — Build multi-file features with momentum
- `swan-design` — Craft elegant specifications
- `eagle-architect` — Design system architecture
- `spider-weave` — Weave authentication webs

**Scouts (Exploration):**

- `bloodhound-scout` — Explore and understand codebases

**Shapeshifters (UI):**

- `chameleon-adapt` — Design Grove UI with glassmorphism

**Gatherers (Organization):**

- `bee-collect` — Create GitHub issues from TODOs
- `owl-archive` — Write documentation
- `raccoon-audit` — Security auditing

**Speedsters:**

- `fox-optimize` — Performance optimization

**Heavy Lifters:**

- `bear-migrate` — Data migrations

**Watchers:**

- `deer-sense` — Accessibility auditing

**Guides:**

- `robin-guide` — Navigate the skill ecosystem

**Gathering Chains** combine multiple animals for complex workflows:

- `gathering-feature` — Complete feature lifecycle
- `gathering-architecture` — System design to implementation
- `gathering-ui` — UI design + accessibility
- `gathering-security` — Auth + security audit
- `gathering-migration` — Safe data movement

These skills are located in `.claude/skills/` and provide detailed guidance for their respective domains. When you encounter a task, check if there's an animal for it!

## Code of Conduct

Be kind. Be respectful. Remember there's a human (or a helpful AI) on the other side of every interaction.

Grove is explicitly a queer-friendly space. Bigotry, harassment, and exclusionary behavior have no place here.

## Questions?

- Check the [docs](docs/) folder
- Browse [existing issues](https://github.com/AutumnsGrove/Lattice/issues)
- Open a discussion on GitHub

---

Thanks for contributing to Grove. Every issue, commit, and review helps build something meaningful.

_Here's to queer-friendly infrastructure and solarpunk dreams._
