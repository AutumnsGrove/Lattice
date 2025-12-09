# Contributing to Grove

Welcome! We're glad you're here.

Grove is a community-focused project building queer-friendly infrastructure for the web. Whether you're fixing a typo, adding a feature, or just poking around—you're welcome in this space.

## Before You Start

- **Read the room.** Grove is about helping people have their own space online, away from big tech algorithms. Keep that spirit in mind.
- **Check existing issues** before opening a new one. Someone might already be working on it.
- **Start small.** If you're new, a good first contribution might be documentation, tests, or a small bug fix.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/AutumnsGrove/GroveEngine.git
cd GroveEngine

# Install dependencies
pnpm install

# Start the engine dev server
cd packages/engine
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
- Comments for *why*, not *what*

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

1. **Make sure tests pass** – `pnpm test` in the relevant package
2. **Test your changes locally** – Don't just assume it works
3. **Keep PRs focused** – One feature or fix per PR. Smaller is better.
4. **Update docs if needed** – If you change behavior, update the relevant documentation

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows existing patterns in the codebase
- [ ] Commit messages follow conventional commits
- [ ] No unrelated changes bundled in
- [ ] Documentation updated (if applicable)

### Writing a Good PR Description

```markdown
## Summary
Brief description of what this PR does and why.

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
2. **Check `TODOS.md`** for current priorities and in-progress work.
3. **Follow the commit format** including the co-author line:
   ```
   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: [Model Name] <noreply@anthropic.com>
   ```
4. **Don't over-engineer.** Do what's asked, nothing more. Resist the urge to refactor adjacent code or add "improvements" that weren't requested.
5. **Ask for clarification** if requirements are ambiguous rather than guessing.
6. **Respect the project's voice.** Grove has a warm, introspective tone. Match it in documentation and user-facing text.

You're part of the team. Build things that help people have their own space online.

## Reporting Bugs

Open an issue with:
- Clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots if helpful

## Requesting Features

We're open to ideas! Open an issue with:
- What problem does this solve?
- Who would use this?
- Any implementation ideas (optional)

Not every feature request will be accepted—Grove has a focused vision. But we'll always consider thoughtful suggestions.

## Code of Conduct

Be kind. Be respectful. Remember there's a human (or a helpful AI) on the other side of every interaction.

Grove is explicitly a queer-friendly space. Bigotry, harassment, and exclusionary behavior have no place here.

## Questions?

- Check the [docs](docs/) folder
- Open a discussion on GitHub
- Reach out to the maintainers

---

Thanks for contributing to Grove. Every commit, issue, and review helps build something meaningful.

*Here's to queer-friendly infrastructure and solarpunk dreams.*
