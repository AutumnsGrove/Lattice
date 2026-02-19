# BaseProject Template - Complete Usage Guide

> **Note:** This file will be automatically deleted after running `setup.sh`. It contains detailed instructions for using this template to create your new project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Quick Setup (Recommended)](#quick-setup-recommended)
3. [Step-by-Step Manual Setup](#step-by-step-manual-setup)
4. [Customization Guide](#customization-guide)
5. [Multi-Language Support](#multi-language-support)
6. [Feature Configuration](#feature-configuration)
7. [File-by-File Explanation](#file-by-file-explanation)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- **Git** installed (`git --version` to check)
- **Claude Code CLI** installed ([Installation guide](https://docs.claude.com/en/docs/claude-code))
- **Language tools** for your project (optional):
  - Python: [UV](https://github.com/astral-sh/uv) or pip
  - JavaScript/TypeScript: Node.js and npm/yarn
  - Go: Go toolchain
  - Rust: Cargo

### Two Ways to Use This Template

#### Option 1: GitHub Template (Recommended)

1. Click the green **"Use this template"** button on GitHub
2. Create your new repository
3. Clone your new repo: `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git`
4. Jump to [Quick Setup](#quick-setup-recommended)

#### Option 2: Direct Clone

```bash
git clone https://github.com/AutumnsGrove/BaseProject.git YourProjectName
cd YourProjectName
rm -rf .git  # Remove template's git history
git init     # Start fresh
```

---

## Quick Setup (Recommended)

The fastest way to set up your project is using the interactive setup script:

```bash
cd your-project-directory
bash setup.sh
```

### What the Setup Script Does

The script will:

1. **Ask you questions** about your project:
   - Project name (e.g., "MyAwesomeApp")
   - Brief description
   - Primary programming language
   - API keys you'll need
   - Whether to install git hooks

2. **Automatically configure**:
   - Update `AGENT.md` with your project details
   - Create `README.md` with your project name
   - Generate `secrets_template.json` for your API keys
   - Initialize language-specific dependencies
   - Set up project structure (`src/`, `tests/`)

3. **Clean up template files**:
   - Remove this `TEMPLATE_USAGE.md` file
   - Remove `setup.sh` itself
   - Remove template-specific sections from README

4. **Initialize git** (if requested):
   - Create initial commit with proper format
   - Install git hooks for code quality

### Example Setup Session

```bash
$ bash setup.sh

╔══════════════════════════════════════════════════════════════╗
║         BaseProject Template Setup                           ║
╚══════════════════════════════════════════════════════════════╝

This script will help you customize BaseProject for your needs.
All template files will be cleaned up automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Configuration
─────────────────────

📝 Project name: MyWeatherApp
📝 Brief description: A CLI tool for weather forecasting with AI

🔧 Primary language:
   1) Python    2) JavaScript    3) Go    4) Rust    5) Other

   Your choice: 1

🔑 Which API keys will you need? (space-separated numbers)
   1) Anthropic    2) OpenAI    3) OpenRouter    4) AWS    5) Other

   Your choices: 1 3

🎣 Install git hooks for code quality and security? [y/N]: y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setting up your project...

✓ Created backup at .backup-20250119-143022/
✓ Updated AGENT.md with project details
✓ Transformed README.md (removed template sections)
✓ Created secrets_template.json with Anthropic and OpenRouter keys
✓ Initialized Python project with UV (pyproject.toml created)
✓ Created src/ directory with __init__.py
✓ Created tests/ directory with test_example.py
✓ Created TODOS.md with project-specific tasks
✓ Installed git hooks (pre-commit, commit-msg, pre-push)
✓ Git initialized with initial commit
✓ Cleaned up template files (TEMPLATE_USAGE.md, setup.sh)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Setup Complete!

Your project is ready. Next steps:

1. Review AGENT.md - Your main project instructions
2. Check TODOS.md - Initial tasks have been added
3. Set up secrets:
   cp secrets_template.json secrets.json
   # Edit secrets.json with your real API keys

4. Start developing:
   claude "your task here"

5. Explore guides in AgentUsage/ directory

Happy coding! 🚀
```

---

## Step-by-Step Manual Setup

If you prefer full control or the automated script isn't working, follow these manual steps:

### 1. Customize AGENT.md

Open `AGENT.md` and fill in the placeholders:

```markdown
## Project Purpose

[Fill in: What this project does - 1-2 sentences]
```

Replace with:

```markdown
## Project Purpose

A command-line weather forecasting tool that uses AI to provide personalized weather insights.
```

Do the same for:

- **Tech Stack** section (lines 11-15)
- **Architecture Notes** section (line 18)

### 2. Set Up Secrets Management

If your project uses API keys:

```bash
# Create secrets template
cat > secrets_template.json << 'EOF'
{
  "anthropic_api_key": "your-key-here",
  "openai_api_key": "your-key-here",
  "comment": "Copy to secrets.json and add real keys"
}
EOF

# Create your actual secrets file (gitignored)
cp secrets_template.json secrets.json

# Edit with real keys
nano secrets.json
```

### 3. Initialize Your Language Environment

#### Python (with UV)

```bash
uv init
# This creates pyproject.toml
```

#### JavaScript/TypeScript

```bash
npm init -y
# This creates package.json
```

#### Go

```bash
go mod init github.com/yourusername/yourproject
```

#### Rust

```bash
cargo init
```

### 4. Create Project Structure

```bash
# Create source directory
mkdir -p src
touch src/__init__.py  # For Python
# OR
touch src/index.js     # For JavaScript
# OR
touch src/main.go      # For Go

# Create tests directory
mkdir -p tests
touch tests/__init__.py         # For Python
touch tests/test_example.py     # Example test
```

### 5. Install Git Hooks (Optional but Recommended)

```bash
cd AgentUsage/pre_commit_hooks
bash install_hooks.sh

# Follow the prompts - the installer will:
# - Detect your project language automatically
# - Install appropriate hooks (formatters, linters, security scanner)
# - Back up any existing hooks
```

### 6. Update README.md

Remove the template-specific sections (marked with `<!-- TEMPLATE: START -->` and `<!-- TEMPLATE: END -->`):

- Quick Start section (Options 1, 2, Manual Setup)
- Customization Workflow section
- Template-specific troubleshooting items
- Keeping BaseProject Updated section
- What's Next section

Add your project name and description at the top.

### 7. Create Initial TODOS.md

```bash
cat > TODOS.md << 'EOF'
# Project TODOs

## Setup Tasks
- [x] Customize CLAUDE.md
- [x] Set up secrets.json
- [ ] Add project dependencies
- [ ] Write initial tests

## Development Tasks
- [ ] Implement core feature X
- [ ] Add error handling
- [ ] Write documentation

## Testing Tasks
- [ ] Unit tests for core logic
- [ ] Integration tests
- [ ] End-to-end tests
EOF
```

### 8. Clean Up Template Files

```bash
# Remove template-specific files
rm -f TEMPLATE_USAGE.md
rm -f setup.sh
rm -f .github/workflows/setup-template.yml
```

### 9. Initialize Git

```bash
# If not already initialized
git init

# Make initial commit
git add .
git commit -m "feat: initialize project from BaseProject template

- Set up project structure
- Configured CLAUDE.md with project details
- Added secrets management
- Installed git hooks

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: [Model Name] <agent@localhost>"
```

---

## Customization Guide

### AGENT.md Customization

The `AGENT.md` file is your project's main instruction manual for AI agents. Customize these sections:

#### Project Purpose

Be specific about what your project does:

```markdown
## Project Purpose

A REST API for managing restaurant reservations with real-time availability tracking and SMS notifications.
```

#### Tech Stack

List all technologies you're using:

```markdown
## Tech Stack

- Language: Python 3.11+
- Framework: FastAPI
- Key Libraries: SQLAlchemy, Celery, Twilio SDK
- Package Manager: UV
- Database: PostgreSQL
- Message Queue: Redis
```

#### Architecture Notes

Document key architectural decisions:

```markdown
## Architecture Notes

- Microservices architecture with separate services for bookings, notifications, and analytics
- Event-driven communication using Redis pub/sub
- PostgreSQL for transactional data, Redis for caching
- Celery for async task processing (SMS, emails)
```

### Secrets Configuration

Different projects need different API keys. Here's how to set up common scenarios:

#### AI/ML Projects

```json
{
	"anthropic_api_key": "sk-ant-api03-...",
	"openai_api_key": "sk-...",
	"huggingface_token": "hf_...",
	"comment": "Keys for AI model APIs"
}
```

#### Cloud Projects

```json
{
	"aws_access_key_id": "AKIA...",
	"aws_secret_access_key": "...",
	"aws_region": "us-east-1",
	"comment": "AWS credentials for cloud resources"
}
```

#### Web Services

```json
{
	"stripe_api_key": "sk_test_...",
	"sendgrid_api_key": "SG....",
	"google_maps_api_key": "AIza...",
	"comment": "Third-party service API keys"
}
```

---

## Multi-Language Support

BaseProject supports multiple programming languages with language-specific guides and git hooks.

### Python Projects

**Setup:**

```bash
# Using UV (recommended)
uv init
uv add fastapi uvicorn sqlalchemy

# Using pip
pip install -r requirements.txt
```

**Structure:**

```
YourProject/
├── src/
│   ├── __init__.py
│   ├── main.py
│   └── models.py
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── pyproject.toml
└── secrets.json
```

**Git Hooks:** Black (formatter), Ruff (linter), pytest (tests)

**Guides:**

- `AgentUsage/uv_usage.md` - UV package manager
- `AgentUsage/db_usage.md` - Database patterns
- `AgentUsage/testing_strategies.md` - Python testing

### JavaScript/TypeScript Projects

**Setup:**

```bash
npm init -y
npm install express typescript @types/node
```

**Structure:**

```
YourProject/
├── src/
│   ├── index.ts
│   └── routes.ts
├── tests/
│   └── index.test.ts
├── package.json
└── tsconfig.json
```

**Git Hooks:** Prettier (formatter), ESLint (linter), Jest (tests)

**Guides:**

- `AgentUsage/multi_language_guide.md` - JavaScript patterns

### Go Projects

**Setup:**

```bash
go mod init github.com/yourusername/yourproject
go get github.com/gin-gonic/gin
```

**Structure:**

```
YourProject/
├── cmd/
│   └── main.go
├── internal/
│   └── handlers.go
├── go.mod
└── go.sum
```

**Git Hooks:** gofmt (formatter), golint (linter), go test (tests)

### Rust Projects

**Setup:**

```bash
cargo init
cargo add tokio axum
```

**Structure:**

```
YourProject/
├── src/
│   ├── main.rs
│   └── lib.rs
├── tests/
│   └── integration_test.rs
└── Cargo.toml
```

**Git Hooks:** rustfmt (formatter), clippy (linter), cargo test (tests)

### Multi-Language Projects

If your project uses multiple languages (e.g., Python backend + JavaScript frontend):

1. **Run setup for each language** in their respective directories
2. **Install multi-language git hooks:**
   ```bash
   cd AgentUsage/pre_commit_hooks
   cp pre-commit-multi-language ../../.git/hooks/pre-commit
   chmod +x ../../.git/hooks/pre-commit
   ```
3. **Organize by directories:**
   ```
   YourProject/
   ├── backend/          # Python
   │   ├── src/
   │   └── pyproject.toml
   ├── frontend/         # JavaScript
   │   ├── src/
   │   └── package.json
   └── CLAUDE.md         # Root instructions
   ```

---

## Feature Configuration

### Git Hooks (Recommended)

Git hooks provide automatic code quality checks. Choose what to install:

**Code Quality Hooks:**

- `pre-commit` - Format and lint before commits
- `commit-msg` - Validate commit message format
- `pre-push` - Run tests before pushing

**Security Hooks:**

- `pre-commit-secrets-scanner` - Prevent committing API keys

**Workflow Hooks:**

- `post-checkout` - Auto-update dependencies on branch switch
- `post-commit` - Show TODO summary

**Install all:**

```bash
./AgentUsage/pre_commit_hooks/install_hooks.sh
```

**Install specific hooks:**

```bash
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Database Setup

If your project uses a database, follow the `database.py` pattern:

1. **Read the guide:**

   ```bash
   cat AgentUsage/db_usage.md
   ```

2. **Create database.py:**
   - All SQL isolated in one file
   - Function-based interface for the rest of your app
   - See guide for complete template

3. **Update AGENT.md:**
   ```markdown
   ## Architecture Notes

   - SQLite database with isolated database.py interface
   - All SQL queries in database.py, application code uses functions
   ```

### Docker Support

To add Docker to your project:

1. **Read the guide:**

   ```bash
   cat AgentUsage/docker_guide.md
   ```

2. **Add to AGENT.md:**

   ```markdown
   ## Architecture Notes

   - Containerized with Docker for consistent environments
   - Multi-stage builds for production optimization
   ```

3. **Use slash command:**
   ```bash
   claude "/setup-docker-containers --development"
   ```

### CI/CD Workflows

To add GitHub Actions:

1. **Read the guide:**

   ```bash
   cat AgentUsage/ci_cd_patterns.md
   ```

2. **Create `.github/workflows/` directory**

3. **Add workflow files** (see guide for templates)

---

## File-by-File Explanation

### Root Files

| File                    | Purpose                         | Customize?                               |
| ----------------------- | ------------------------------- | ---------------------------------------- |
| `CLAUDE.md`             | Redirect to AGENT.md            | ❌ No - Keep as-is                       |
| `AGENT.md`              | Main instructions for AI agents | ✅ Yes - Fill placeholders               |
| `README.md`             | Project documentation           | ✅ Yes - After setup                     |
| `TODOS.md`              | Task tracking                   | ✅ Yes - Add your tasks                  |
| `.gitignore`            | Files to exclude from git       | ✅ Maybe - Add project-specific patterns |
| `secrets.json`          | API keys (gitignored)           | ✅ Yes - Add your keys                   |
| `secrets_template.json` | Template for API keys           | ✅ Yes - Document needed keys            |
| `TEMPLATE_USAGE.md`     | This file                       | ❌ No - Auto-deleted                     |
| `setup.sh`              | Setup script                    | ❌ No - Auto-deleted                     |

### AgentUsage/ Directory

| Guide                   | When to Read                     |
| ----------------------- | -------------------------------- |
| `README.md`             | Start here - index of all guides |
| `git_guide.md`          | Before making commits            |
| `secrets_management.md` | When handling API keys           |
| `db_usage.md`           | When adding database             |
| `uv_usage.md`           | For Python projects              |
| `testing_strategies.md` | Before writing tests             |
| `house_agents.md`       | For complex codebase searches    |
| `docker_guide.md`       | When containerizing              |
| `ci_cd_patterns.md`     | When setting up automation       |

**Keep this directory as-is** - it's reference material.

### AgentUsage/templates/

Templates for common configuration files:

- `secrets_template.json` - API keys template
- `.env.example` - Environment variables
- `pyproject.toml.example` - Python UV configuration

Copy and customize as needed.

### AgentUsage/pre_commit_hooks/

Git hooks for code quality and security:

- `install_hooks.sh` - Interactive installer
- Various hook files for different checks
- `TROUBLESHOOTING.md` - Hook issues help

Run the installer to set up hooks automatically.

---

## Troubleshooting

### Setup Script Issues

#### "bash: setup.sh: Permission denied"

```bash
chmod +x setup.sh
bash setup.sh
```

#### "UV not found" (Python projects)

```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# OR use pip fallback
python -m pip install uv
```

#### "Git hooks installation failed"

```bash
# Make hooks executable
chmod +x AgentUsage/pre_commit_hooks/*

# Run installer manually
cd AgentUsage/pre_commit_hooks
bash install_hooks.sh
```

### Configuration Issues

#### "AGENT.md not updating"

Make sure you've replaced the `[Fill in: ...]` placeholders with actual text.

#### "Secrets not loading"

1. Verify `secrets.json` exists and has valid JSON
2. Check file permissions: `chmod 600 secrets.json`
3. Make sure `secrets.json` is in `.gitignore`

#### "Git hooks not running"

```bash
# Check hook files exist
ls -la .git/hooks/

# Make them executable
chmod +x .git/hooks/*

# Test manually
.git/hooks/pre-commit
```

### Language-Specific Issues

#### Python: "Module not found"

```bash
# UV
uv sync

# Pip
pip install -r requirements.txt
```

#### JavaScript: "Cannot find module"

```bash
npm install
# OR
yarn install
```

#### Go: "Package not found"

```bash
go mod download
```

### Git Issues

#### "Not a git repository"

```bash
git init
```

#### "Author identity unknown"

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Still Having Issues?

1. **Check hooks troubleshooting:**

   ```bash
   cat AgentUsage/pre_commit_hooks/TROUBLESHOOTING.md
   ```

2. **Review language-specific guide:**

   ```bash
   cat AgentUsage/multi_language_guide.md
   ```

3. **Ask Claude Code for help:**

   ```bash
   claude "I'm having trouble with [specific issue]"
   ```

4. **Open an issue on GitHub:**
   https://github.com/AutumnsGrove/BaseProject/issues

---

## Next Steps After Setup

Once setup is complete:

1. **Review your AGENT.md** - Make sure all sections are filled in
2. **Check TODOS.md** - Initial tasks should be listed
3. **Set up real secrets** - Copy secrets_template.json to secrets.json and add real API keys
4. **Explore the guides** - Read AgentUsage/README.md for the guide index
5. **Start coding!** - Use `claude "your task"` to begin development

---

**Template Version:** 1.0.0
**Last Updated:** 2025-11-02
**Questions?** Open an issue at https://github.com/AutumnsGrove/BaseProject/issues

---

_This file will be automatically deleted when you run `setup.sh`._
