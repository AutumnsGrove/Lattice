# Project Setup Guide

## Overview

This guide provides step-by-step patterns for initializing new projects from the BaseProject template. It covers technology-specific setup, dependency management, and initial configuration.

For detailed directory structure patterns, see [project_structure.md](project_structure.md). For manual setup instructions, see [NEW_PROJECT_SETUP.md](../NEW_PROJECT_SETUP.md) in the root directory.

## Quick Reference

### Setup Methods

| Method | Best For | Time Required |
|--------|----------|---------------|
| **Automated Script** | Quick starts, standard projects | 2-3 minutes |
| **Claude One-Liner** | Interactive setup with AI guidance | 3-5 minutes |
| **Manual Setup** | Custom configurations, learning | 10-15 minutes |

## Automated Setup (Recommended)

### Using the Setup Script

```bash
# 1. Copy BaseProject to new location
cp -r BaseProject/ ~/Projects/MyNewProject/
cd ~/Projects/MyNewProject/

# 2. Run automated setup
bash setup_new_project.sh
```

**The script handles:**
- Removes old git history
- Updates AGENT.md with project details
- Creates fresh TODOS.md
- Initializes new git repository
- Prompts for project details
- Creates initial commit

## Manual Setup Workflow

### Step 1: Copy Template

```bash
# Copy to new project location
cp -r /path/to/BaseProject ~/Projects/YourProjectName/
cd ~/Projects/YourProjectName/
```

### Step 2: Clean Git History

```bash
# Remove existing git history for fresh start
rm -rf .git
```

### Step 3: Customize AGENT.md

```bash
# Edit with your project details
# Fill in: Project Purpose, Tech Stack, Architecture Notes
nano AGENT.md
```

**Example customization:**

```markdown
## Project Purpose
A REST API for managing inventory across multiple warehouses with real-time stock updates.

## Tech Stack
- Language: Python 3.11+
- Framework: FastAPI
- Key Libraries: SQLAlchemy, Pydantic, Redis
- Package Manager: UV
- Database: PostgreSQL 14+

## Architecture Notes
- Microservices architecture with event-driven updates
- Redis for caching frequently accessed inventory
- PostgreSQL for persistent storage
- WebSocket connections for real-time client updates
```

### Step 4: Initialize Git

```bash
# Create fresh repository
git init

# Verify .gitignore exists
cat .gitignore

# Initial commit
git add .
git commit -m "Initial commit: Setup YourProjectName from BaseProject

- Copied BaseProject structure with AgentUsage guides
- Configured AGENT.md for this specific project
- Initialized git repository"
```

### Step 5: Set Up TODOS.md

```bash
# Create or edit TODOS.md
cat > TODOS.md << 'EOF'
# Project TODOs

## High Priority
- [ ] Set up project dependencies (pyproject.toml / package.json)
- [ ] Configure secrets management (secrets.json)
- [ ] Create initial project structure (src/, tests/)
- [ ] Set up database models/schema

## Medium Priority
- [ ] Implement core business logic
- [ ] Add unit tests
- [ ] Set up CI/CD pipeline
- [ ] Write API documentation

## Low Priority / Future Ideas
- [ ] Performance optimizations
- [ ] Admin dashboard
- [ ] Analytics integration

## Blocked
- [ ] (None currently)
EOF
```

## Technology-Specific Setup

### Python Projects with UV

```bash
# 1. Initialize UV project
uv init

# 2. Create pyproject.toml (use template as base)
cp AgentUsage/templates/pyproject.toml.example pyproject.toml

# Edit pyproject.toml with your project details
nano pyproject.toml

# 3. Add dependencies
uv add fastapi uvicorn sqlalchemy

# 4. Add dev dependencies
uv add --dev pytest pytest-cov black ruff mypy

# 5. Create project structure
mkdir -p src/YourProject/{core,utils,config}
mkdir -p tests/{unit,integration}

# 6. Create __init__.py files
touch src/YourProject/__init__.py
touch src/YourProject/core/__init__.py
touch src/YourProject/utils/__init__.py
touch src/YourProject/config/__init__.py
```

**See:** [uv_usage.md](uv_usage.md) for detailed UV workflows

### JavaScript/TypeScript Projects

```bash
# 1. Initialize pnpm project
pnpm init

# 2. Install dependencies
pnpm add express dotenv

# 3. Install dev dependencies
pnpm add -D typescript @types/node @types/express
pnpm add -D jest eslint prettier

# 4. Initialize TypeScript (if using)
npx tsc --init

# 5. Create project structure
mkdir -p src/{routes,controllers,middleware,utils}
mkdir -p tests

# 6. Create main entry point
touch src/index.ts
```

### Go Projects

```bash
# 1. Initialize Go module
go mod init github.com/yourusername/projectname

# 2. Create project structure
mkdir -p cmd/api
mkdir -p internal/{handlers,models,database}
mkdir -p pkg

# 3. Create main.go
touch cmd/api/main.go

# 4. Install dependencies (example)
go get github.com/gin-gonic/gin
go get github.com/lib/pq
```

### Rust Projects

```bash
# 1. Initialize Cargo project
cargo init

# 2. Edit Cargo.toml with dependencies
# Add to [dependencies] section:
# tokio = { version = "1", features = ["full"] }
# axum = "0.6"
# serde = { version = "1", features = ["derive"] }

# 3. Create project structure
mkdir -p src/{routes,models,db}

# 4. Build to verify setup
cargo build
```

## Secrets Management Setup

### Step 1: Create Template

```bash
# Use provided template or create custom
cp AgentUsage/templates/secrets_template.json secrets_template.json

# Edit with your required keys
nano secrets_template.json
```

**Example secrets_template.json:**

```json
{
  "database_url": "postgresql://user:pass@localhost/dbname",
  "api_key": "your-api-key-here",
  "jwt_secret": "your-jwt-secret-here",
  "comment": "Copy this file to secrets.json and fill in real values"
}
```

### Step 2: Create Secrets File

```bash
# Copy template to secrets.json
cp secrets_template.json secrets.json

# Edit with REAL credentials (gitignored)
nano secrets.json

# Verify it's in .gitignore
grep "secrets.json" .gitignore
```

### Step 3: Implement Secrets Loading

**Python example:**

```python
# config/secrets.py
import json
import os
from pathlib import Path

def load_secrets():
    """Load API keys from secrets.json file."""
    secrets_path = Path(__file__).parent.parent / "secrets.json"

    try:
        with open(secrets_path, 'r') as f:
            secrets = json.load(f)
        return secrets
    except FileNotFoundError:
        print(f"Warning: secrets.json not found. Using environment variables.")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing secrets.json: {e}")
        return {}

# Load at startup
SECRETS = load_secrets()

# Use with env var fallback
DATABASE_URL = SECRETS.get("database_url", os.getenv("DATABASE_URL", ""))
API_KEY = SECRETS.get("api_key", os.getenv("API_KEY", ""))
```

**See:** [secrets_management.md](secrets_management.md) for comprehensive patterns

## Pre-commit Hooks Setup (Optional)

```bash
# 1. Navigate to hooks directory
cd AgentUsage/pre_commit_hooks/

# 2. Make hooks executable
chmod +x pre-commit commit-msg

# 3. Copy to git hooks directory
cp pre-commit commit-msg ../../.git/hooks/

# 4. Test hooks work
cd ../..
git commit --allow-empty -m "Test commit"
```

**See:** [pre_commit_hooks/setup_guide.md](pre_commit_hooks/setup_guide.md) for detailed configuration

## Database Setup

### PostgreSQL

```bash
# 1. Install PostgreSQL (if needed)
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# 2. Create database
createdb yourproject_dev

# 3. Add connection string to secrets.json
# "database_url": "postgresql://localhost/yourproject_dev"

# 4. Create migrations directory
mkdir -p database/migrations
```

### SQLite (for development)

```bash
# 1. Create database directory
mkdir -p data

# 2. Add to secrets.json
# "database_url": "sqlite:///./data/app.db"

# 3. Add to .gitignore
echo "data/*.db" >> .gitignore
```

**See:** [database_setup.md](database_setup.md) for detailed patterns

## Docker Setup (Optional)

```bash
# 1. Create Dockerfile
touch Dockerfile

# 2. Create docker-compose.yml (if needed)
touch docker-compose.yml

# 3. Create .dockerignore
cat > .dockerignore << 'EOF'
.git
.gitignore
__pycache__
*.pyc
secrets.json
.env
node_modules/
.DS_Store
EOF
```

**See:** [docker_guide.md](docker_guide.md) for containerization patterns

## CI/CD Setup

### GitHub Actions

```bash
# 1. Create workflows directory
mkdir -p .github/workflows

# 2. Create CI workflow
touch .github/workflows/ci.yml

# 3. Configure based on your stack
# See AgentUsage/ci_cd_patterns.md for examples
```

**See:** [ci_cd_patterns.md](ci_cd_patterns.md) for detailed workflows

## Verification Checklist

After setup, verify these items:

```bash
# ✅ Git initialized and clean
git status

# ✅ AGENT.md customized (no [Fill in:] markers)
grep "\[Fill in:" AGENT.md

# ✅ TODOS.md exists with project tasks
cat TODOS.md

# ✅ secrets.json in .gitignore
grep "secrets.json" .gitignore

# ✅ Dependencies installed
# Python: uv sync
# JavaScript: pnpm install
# Go: go mod download
# Rust: cargo build

# ✅ Project structure created
tree -L 2 src/  # or appropriate directory

# ✅ Tests run successfully (if any exist)
# Python: uv run pytest
# JavaScript: pnpm test
# Go: go test ./...
# Rust: cargo test
```

## Post-Setup Tasks

### 1. Update TODOS.md

Add project-specific tasks based on requirements.

### 2. Create Initial Code

Set up entry points and basic structure:

```bash
# Python
echo 'def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()' > src/YourProject/main.py

# JavaScript
echo 'console.log("Hello, World!");' > src/index.js

# Test it runs
# Python: uv run python src/YourProject/main.py
# JavaScript: node src/index.js
```

### 3. Set Up Development Environment

- Configure IDE/editor settings
- Install language extensions
- Set up debugger configurations

### 4. Review Relevant Guides

Based on your tech stack, review:
- [uv_usage.md](uv_usage.md) - Python/UV
- [testing_strategies.md](testing_strategies.md) - Testing
- [git_guide.md](git_guide.md) - Git practices and commit standards
- [db_usage.md](db_usage.md) - Database setup (if needed)
- [house_agents.md](house_agents.md) - Claude workflows

## Common Issues

### "Permission denied" on scripts

```bash
chmod +x setup_new_project.sh
chmod +x AgentUsage/pre_commit_hooks/*
```

### Git commit fails

```bash
# Check git is initialized
git status

# Check git user config
git config user.name
git config user.email

# Set if needed
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Dependencies not installing

```bash
# Python/UV: Clear cache
uv cache clean

# JavaScript: Clear cache
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Go: Clear module cache
go clean -modcache

# Rust: Clear target
cargo clean
```

## Related Guides

- [project_structure.md](project_structure.md) - Directory layouts and organization
- [git_guide.md](git_guide.md) - Version control and commit standards
- [db_usage.md](db_usage.md) - Database setup and patterns
- [secrets_management.md](secrets_management.md) - API key handling
- [uv_usage.md](uv_usage.md) - Python UV package manager
- [testing_strategies.md](testing_strategies.md) - Test setup patterns
- [docker_guide.md](docker_guide.md) - Containerization
- [ci_cd_patterns.md](ci_cd_patterns.md) - Automated workflows
- [multi_language_guide.md](multi_language_guide.md) - Language-specific patterns

## Summary

**Key Takeaways:**
- Use automated setup script for standard projects
- Customize AGENT.md with project-specific details
- Set up secrets management before writing code
- Initialize git early and commit often
- Choose setup method based on project complexity
- Review technology-specific guides for detailed patterns
- Keep TODOS.md updated throughout development
