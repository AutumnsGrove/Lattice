# Git Guide - Unified Workflow and Commit Standards

## Overview

A comprehensive git workflow guide emphasizing safety, clean history, and standardized commit messages using Conventional Commits format.

**Core Principles:**
- **Safety First**: Always verify before operations, create backups for major changes
- **Clean History**: Use atomic commits with descriptive messages
- **Conventional Format**: Standard commit types for automated tooling
- **Workflow Clarity**: Clear branching strategies and daily patterns

**When to Use This Guide:**
- Every session with code changes
- Before making any git commit
- When initializing new repositories
- Setting up branching strategies
- Understanding git operations

---

## Quick Reference

### Daily Commands

```bash
# Check status and diff
git status
git diff --stat

# Review recent commits
git log --oneline -5

# Stage and commit
git add .
git commit -m "feat: add user authentication"

# View changes
git diff                  # Unstaged
git diff --cached        # Staged

# Undo operations
git restore <file>              # Discard changes
git restore --staged <file>     # Unstage
git reset HEAD~1                # Undo last commit (keep changes)
```

### Commit Message Format

```
<type>: <brief description>

<optional body with details>
```

### Common Commit Types

```bash
feat: Add user authentication system
fix: Resolve timezone handling bug
docs: Update API documentation
style: Format code with Black
refactor: Extract validation logic
test: Add integration tests
chore: Update dependencies
perf: Optimize database queries
```

---

## Conventional Commits Format

### Commit Structure

```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

**Examples:**
```bash
feat: Add dark mode toggle
fix: Correct password validation
docs(readme): Update installation instructions
style: Run Black formatter
refactor: Simplify validation logic
test(auth): Add authentication tests
chore: Update dependencies
perf: Optimize query performance
```

### Commit Types

| Type | Purpose | Changelog | Example |
|------|---------|-----------|---------|
| `feat` | New feature | Yes | `feat: Add user authentication` |
| `fix` | Bug fix | Yes | `fix: Correct validation error` |
| `docs` | Documentation | No | `docs: Update README` |
| `style` | Code formatting | No | `style: Format with Black` |
| `refactor` | Code restructure | No | `refactor: Extract helper function` |
| `test` | Add/modify tests | No | `test: Add auth tests` |
| `chore` | Maintenance | No | `chore: Update dependencies` |
| `perf` | Performance | Yes | `perf: Optimize query speed` |
| `build` | Build system | No | `build: Update webpack config` |
| `ci` | CI/CD changes | No | `ci: Add GitHub Actions` |

---

## Repository Setup

### For Folders WITHOUT Git Repos

#### Step 1: Create Backup

```bash
# Create timestamped backup directory
mkdir ../backup_$(basename $PWD)_$(date +%Y%m%d_%H%M%S)

# Copy all files
cp -r * ../backup_*/

# Verify backup integrity
diff -r . ../backup_*/
```

**Expected**: No output means backup is successful.

#### Step 2: Initialize Git

```bash
git init

# Create .gitignore
cat > .gitignore << 'EOF'
secrets.json
*.log
__pycache__/
.DS_Store
.venv/
*.pyc
node_modules/
.env
EOF

# Stage and commit
git add .
git commit -m "chore: initialize repository

- Add initial project structure
- Configure .gitignore for common patterns"
```

#### Step 3: Clean Up Backup

```bash
# Verify git repo is working
git status
git log --oneline -1

# Remove backup after confirmation
rm -rf ../backup_*
echo "✅ Backup cleaned up"
```

### For Existing Git Repos

```bash
# Check status
git status
git diff --stat

# Review recent commits for message style
git log --oneline -5

# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add new feature

- Specific implementation detail 1
- Specific implementation detail 2"

# Verify
git status
git log --oneline -1
```

---

## Commit Type Details

### feat: New Features

Use when adding new functionality or capabilities.

```
feat: Add diagram caching system

Implements a caching mechanism to skip regeneration of unchanged
diagrams. This significantly improves performance for large
documentation projects.

- Uses file modification timestamps for change detection
- Implements content hash verification
- Adds cache invalidation on manual refresh
```

**Triggers**: Minor version bump (1.0.0 → 1.1.0)

### fix: Bug Fixes

Use when correcting errors or unexpected behavior.

```
fix: Correct line number tracking in extractor

Fixes an off-by-one error that caused incorrect line numbers
in error messages when processing multi-line code blocks.

- Adjust index calculation for multi-line blocks
- Add unit tests for edge cases
- Update error message formatting

Closes #123
```

**Triggers**: Patch version bump (1.0.0 → 1.0.1)

### docs: Documentation

Use for documentation-only changes.

```
docs: Add API documentation for file_handler module

- Add docstrings for all public functions
- Include usage examples
- Update README with new module information
```

**No version bump**

### refactor: Code Restructuring

Use when changing code structure without affecting behavior.

```
refactor: Extract validation logic into separate function

No functional changes, just improves code organization and
makes the validator reusable across modules.

- Create validate_input() function
- Update all callers to use new function
- Add type hints for better IDE support
```

**No version bump**

### perf: Performance Improvements

Use when optimizing code for speed or resource usage.

```
perf: Optimize markdown file scanning

Use os.scandir instead of os.walk for faster directory
traversal on large projects.

Benchmarks:
- Before: 2.3s for 1000 files
- After: 0.7s for 1000 files
```

**Triggers**: Patch version bump (1.0.0 → 1.0.1)

### test: Tests

Use when adding or modifying tests.

```
test: Add comprehensive unit tests for authentication

Covers:
- Token generation and validation
- Password hashing verification
- Edge cases for expired tokens
- Invalid credentials handling

Test coverage increased from 67% to 94%
```

**No version bump**

### chore: Maintenance Tasks

Use for maintenance tasks that don't modify source code.

```
chore: Update Python dependencies

- Upgrade pytest to 8.0.0
- Update black to 24.1.0
- Pin anthropic SDK to 0.8.0
```

**No version bump**

---

## Breaking Changes

When introducing breaking changes, use the `BREAKING CHANGE:` footer or add `!` after type.

### Method 1: Footer

```
refactor: Change CLI argument format

BREAKING CHANGE: The --output flag now requires a directory path
instead of a filename pattern. Update your scripts accordingly.

Migration:
  Old: --output "diagrams/*.png"
  New: --output "diagrams" --format png
```

### Method 2: Exclamation Mark

```
feat!: Replace XML config with YAML

Completely removes XML configuration support. All configuration
files must be migrated to YAML format.

See migration guide in docs/migration/xml-to-yaml.md
```

**Triggers**: Major version bump (1.0.0 → 2.0.0)

---

## Branching Strategies

### Feature Branches

```bash
# Create and switch to feature branch
git checkout -b feature/user-auth

# Work and commit
git add .
git commit -m "feat: add JWT authentication"

# Switch back to main
git checkout main

# Merge feature
git merge feature/user-auth

# Delete branch
git branch -d feature/user-auth
```

### Branch Naming Conventions

```
feature/feature-name    # New features
fix/bug-description     # Bug fixes
experiment/new-idea     # Experiments
release/v1.0.0         # Releases
```

### Dev/Main Branch Strategy (Optional)

For projects with ongoing development and production releases, consider a two-branch strategy:

**`main` branch** - Production-ready code
- Only receives merges from dev when stable
- Always in deployable state
- Users/clients clone from this branch

**`dev` branch** - Active development
- All development work happens here
- Experimental features and work-in-progress
- Testing and iteration

**Workflow:**
```bash
# Daily development in dev branch
git checkout dev
git pull origin dev

# Create feature branches off dev
git checkout -b feature/new-feature

# Work and commit
git add .
git commit -m "feat: implement new feature"

# Merge back to dev
git checkout dev
git merge feature/new-feature

# When ready for production
git checkout main
git merge dev
git push origin main

# Continue development in dev
git checkout dev
```

**When to use:**
- Template repositories
- Projects with external users
- Applications with production deployments
- Open source projects with stable releases

**When NOT to use:**
- Simple personal projects
- Rapid prototypes
- Single-developer projects without production needs

---

## Scopes (Optional)

Add scope to provide additional context:

```bash
feat(api): Add rate limiting middleware
fix(auth): Correct token expiration check
docs(readme): Update installation instructions
test(parser): Add edge case coverage
```

**Common scopes:**
- Component names: `auth`, `api`, `cli`, `ui`
- Module names: `parser`, `validator`, `renderer`
- File types: `readme`, `config`, `tests`

---

## Daily Workflows

### Standard Development

```bash
# Start of day
git pull origin main

# Create feature branch
git checkout -b feature/today-work

# Work and commit frequently
git add file.py
git commit -m "feat: add initial structure"

# More work
git add .
git commit -m "feat: implement core logic"

# Merge back at end of day
git checkout main
git merge feature/today-work
git branch -d feature/today-work
```

### Experimental Changes

```bash
# Save current work
git stash push -m "Current progress"

# Create experiment branch
git checkout -b experiment/new-approach

# Try experimental code
# ...

# If successful, merge
git checkout main
git merge experiment/new-approach

# If failed, discard
git checkout main
git branch -D experiment/new-approach

# Restore original work
git stash pop
```

---

## Stashing Changes

### When to Stash

- Switch branches without committing
- Pull latest changes with uncommitted work
- Quickly test something on clean directory

### Stash Commands

```bash
# Stash current changes
git stash

# Stash with message
git stash push -m "WIP: auth feature"

# List stashes
git stash list

# Apply most recent
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Delete stash
git stash drop stash@{0}
```

---

## Reviewing History

### Git Log

```bash
# Basic log
git log --oneline -10

# Graph view
git log --graph --oneline --all

# Search commits
git log --grep="authentication"

# By author
git log --author="[Model Name]"

# Date range
git log --since="2025-01-01"

# With file changes
git log --stat
```

### Git Diff

```bash
# Working directory changes (unstaged)
git diff

# Staged changes
git diff --cached

# Between commits
git diff abc1234 def5678

# Specific file
git diff file.py

# Summary
git diff --stat
```

---

## Undoing Changes

### Git Restore (Recommended)

```bash
# Discard working changes
git restore file.py

# Discard all changes
git restore .

# Unstage file
git restore --staged file.py

# Restore from specific commit
git restore --source=abc1234 file.py
```

### Git Reset (Use Carefully)

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1

# Undo last commit, discard changes (DANGEROUS)
git reset --hard HEAD~1
```

**Warning**: Never use `--hard` on pushed commits.

### Git Revert (Safe for Shared History)

```bash
# Create new commit undoing changes
git revert abc1234

# Revert without committing
git revert --no-commit abc1234
```

---

## Handling Merge Conflicts

### Identifying Conflicts

```bash
# Attempt merge
git merge feature-branch

# If conflicts, git shows:
# CONFLICT (content): Merge conflict in file.py

# Check which files conflict
git status
```

### Resolution

**Option 1: Manual resolution**
```bash
# Edit file, resolve conflicts between:
# <<<<<<< HEAD
# Your changes
# =======
# Incoming changes
# >>>>>>> feature-branch

# Stage resolved file
git add file.py

# Complete merge
git commit
```

**Option 2: Accept one side**
```bash
# Accept current branch
git checkout --ours file.py

# Accept incoming branch
git checkout --theirs file.py

# Stage and commit
git add file.py
git commit
```

---

## Best Practices

### Commit Message Guidelines

1. **Keep subject under 50 characters**
2. **Use imperative mood** ("Add" not "Added")
3. **Don't end subject with period**
4. **Be specific but concise**

```bash
# Good
feat: Add user session timeout
fix: Prevent memory leak in parser

# Bad
feat: Added new feature
fix: bug fix.
```

### Body (Optional but Recommended)

- **Explain what and why, not how**
- **Wrap at 72 characters**
- **Use bullet points for multiple changes**

```
feat: Implement rate limiting for API

Add configurable rate limiting to prevent API abuse:
- Default: 100 requests per minute
- Configurable per-endpoint
- Returns 429 status when exceeded

Resolves #456
```

### Footer (Optional)

Use for:
- Breaking changes (`BREAKING CHANGE:`)
- Issue references (`Fixes #123`, `Closes #456`)
- Co-authors (`Co-authored-by: Name <email>`)

---

## When to Commit

**Commit changes immediately after:**

- ✅ Completing a significant feature or bug fix
- ✅ Adding new functionality that works correctly
- ✅ Making configuration or structural improvements
- ✅ Implementing user-requested features
- ✅ Fixing critical errors or security issues

**Don't commit:**

- ❌ Broken code that doesn't compile/run
- ❌ Incomplete features (use feature branches)
- ❌ Debug code or commented-out experiments
- ❌ Secrets, API keys, or sensitive data

---

## Anti-Patterns to Avoid

### ❌ Vague Messages

```
chore: Update files
fix: Fix things
feat: Changes
```

**Why bad**: Provides no information.
**Fix**: Be specific about what and why.

### ❌ Too Many Concerns

```
feat: Add feature X, fix bug Y, update docs, refactor Z
```

**Why bad**: Makes git bisect useless, hard to revert.
**Fix**: Split into 4 separate commits.

### ❌ Wrong Type

```
feat: Fix typo in README  # Should be "docs" or "fix"
fix: Add authentication   # Should be "feat"
```

**Why bad**: Misleading about the change type.
**Fix**: Use correct commit type.

### ❌ Past Tense

```
feat: Added new feature
fix: Fixed the bug
```

**Why bad**: Not standard imperative mood.
**Fix**: Use imperative: "feat: Add", "fix: Fix"

### ❌ No Context

```
refactor: Update config
```

**Why bad**: Which config? What changed? Why?

**Fix:**
```
refactor(db): Update connection pooling configuration

- Increase max connections from 10 to 50
- Add connection timeout of 30 seconds
- Enable connection recycling to prevent leaks
```

---

## Troubleshooting

### "Detached HEAD state"

```bash
# Create branch from current state
git checkout -b recovery-branch

# Or return to main
git checkout main
```

### Committed to Wrong Branch

```bash
# Note commit hash
git log --oneline -1  # abc1234

# Switch to correct branch
git checkout correct-branch
git cherry-pick abc1234

# Remove from wrong branch
git checkout wrong-branch
git reset --hard HEAD~1
```

### Committed Secrets

```bash
# If NOT pushed yet
git reset --hard HEAD~1

# If already pushed
# 1. Rotate secrets immediately
# 2. Use BFG Repo-Cleaner or git-filter-branch
# 3. Force push (coordinate with team)
```

### Lost Commits

```bash
# Git keeps deleted commits for ~30 days
git reflog

# Find lost commit
# abc1234 HEAD@{5}: commit: My lost work

# Recover
git checkout abc1234
git checkout -b recovery-branch
```

---

## Integration with Semantic Versioning

Conventional Commits maps directly to SemVer:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor | 1.0.0 → 1.1.0 |
| `fix:` | Patch | 1.0.0 → 1.0.1 |
| `perf:` | Patch | 1.0.0 → 1.0.1 |
| `BREAKING CHANGE:` | Major | 1.0.0 → 2.0.0 |
| Others | No bump | - |

---

## Tools and Automation

### Commitlint

Enforce conventional commits:

```bash
# Install
pnpm add -D @commitlint/cli @commitlint/config-conventional

# Configure (.commitlintrc.json)
{
  "extends": ["@commitlint/config-conventional"]
}

# Add to package.json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

### Standard Version

Automated changelog and versioning:

```bash
# Install
pnpm add -D standard-version

# Use
pnpm release

# Generates:
# - Updates version in package.json
# - Generates CHANGELOG.md
# - Creates git tag
# - Commits changes
```

---

## Repository Publishing

**Note**: The user handles `git push` operations. Claude focuses on local commits and version control.

```bash
# Typical push workflow (user-managed)
git push origin main
git push origin feature-branch
git push --tags
```

---

## Related Guides

- **[secrets_management.md](secrets_management.md)** - Keeping secrets out of version control
- **[house_agents.md](house_agents.md)** - Using house-git for large operations
- **[pre_commit_hooks/setup_guide.md](pre_commit_hooks/setup_guide.md)** - Automated commit validation

---

## Summary: The Golden Rules

1. ✅ **Use conventional commit format** (`type: description`)
2. ✅ **One logical change per commit**
3. ✅ **Descriptive subject line (under 50 chars)**
4. ✅ **Use imperative mood** ("Add" not "Added")
5. ✅ **Don't end subject with period**
6. ✅ **Add body for complex changes**
7. ✅ **Be specific, not vague**
8. ✅ **Mark breaking changes explicitly**
9. ✅ **Reference issues in footer**

**Following these guidelines creates a clean, professional git history that enables automated tooling, clear communication, and effective collaboration.**

---

*Last updated: 2025-11-02*
*Unified from: git_commit_guide.md, git_workflow.md, git_conventional_commits.md*
