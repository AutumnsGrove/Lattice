# Python Project Structure Guide

## Overview

Proper project structure is critical for maintainability, collaboration, and scaling. A well-organized project makes it easy to:

- Find code quickly
- Understand dependencies
- Add new features without breaking existing code
- Test effectively
- Package and distribute your code

This guide follows our specific naming conventions and provides battle-tested patterns for Python projects.

## Quick Reference

```
MyProject/
├── src/
│   └── MyProject/
│       ├── __init__.py
│       ├── core/
│       ├── utils/
│       └── config/
├── tests/
├── docs/
├── scripts/
├── data/
├── pyproject.toml
├── README.md
└── .gitignore
```

## Naming Conventions

### Directory Naming Rules

**Default**: Use CamelCase for all directory names

```
✅ Good:
VideoTools/
AudioProcessor/
DataAnalysis/
ConfigManager/
MyAwesomeProject/
WebScraper/
```

**Exception**: Use skewer-case with YYYY-MM-DD format for date-related paths

```
✅ Good (date-related):
logs-2025-01-15/
backup-2025-12-31/
archive-2024-03-20/
exports-2025-10-19/
```

**Never Use**: Spaces or underscores in directory names

```
❌ Avoid:
video_tools/
audio processor/
data-analysis/
config_manager/
logs_2025_01_15/
backup-2024/12/31/
logs-january-2025/
my_project/
```

## Standard Python Project Layout

### Package vs Application Structure

**Package** (for libraries/reusable code):
```
MyLibrary/
├── src/
│   └── MyLibrary/
│       ├── __init__.py
│       ├── core.py
│       └── utils.py
├── tests/
├── pyproject.toml
└── README.md
```

**Application** (for standalone tools):
```
MyApp/
├── MyApp/
│   ├── __init__.py
│   ├── main.py
│   ├── cli.py
│   └── config.py
├── tests/
├── requirements.txt
└── README.md
```

### Complete Directory Tree Example

```
VideoProcessor/
├── src/
│   └── VideoProcessor/
│       ├── __init__.py
│       ├── main.py              # Entry point
│       ├── core/
│       │   ├── __init__.py
│       │   ├── processor.py
│       │   └── encoder.py
│       ├── utils/
│       │   ├── __init__.py
│       │   ├── logging.py
│       │   └── validation.py
│       └── config/
│           ├── __init__.py
│           └── settings.py
├── tests/
│   ├── __init__.py
│   ├── test_processor.py
│   └── test_encoder.py
├── scripts/
│   ├── setup_dev.py
│   └── run_benchmark.py
├── data/
│   ├── samples/
│   └── outputs-2025-10-19/
├── docs/
│   ├── api.md
│   └── usage.md
├── pyproject.toml
├── requirements.txt
├── secrets_template.json
├── .gitignore
├── README.md
└── TODOS.md
```

## Module Organization

### Flat vs Nested Modules

**Flat** (for simple projects):
```
SimpleBot/
└── SimpleBot/
    ├── __init__.py
    ├── bot.py
    ├── commands.py
    ├── utils.py
    └── config.py
```

**Nested** (for complex projects):
```
ApiServer/
└── ApiServer/
    ├── __init__.py
    ├── api/
    │   ├── __init__.py
    │   ├── routes.py
    │   └── middleware.py
    ├── database/
    │   ├── __init__.py
    │   ├── models.py
    │   └── queries.py
    └── services/
        ├── __init__.py
        ├── auth.py
        └── email.py
```

### When to Split Modules

Split when:
- A file exceeds 300-400 lines
- A module has multiple distinct responsibilities
- You need to share code between files
- Testing becomes difficult

## Where to Put Things

### tests/ Directory
```
tests/
├── __init__.py
├── conftest.py              # pytest fixtures
├── unit/
│   ├── test_core.py
│   └── test_utils.py
└── integration/
    └── test_api.py
```

### Configuration Files
```
ProjectRoot/
├── pyproject.toml           # Project metadata + build config
├── requirements.txt         # pip dependencies
├── .env                     # Local environment variables (gitignored)
├── secrets.json             # API keys (gitignored)
├── secrets_template.json    # Template for secrets
└── .gitignore
```

### docs/ Directory
```
docs/
├── README.md
├── api.md
├── usage.md
└── architecture.md
```

### scripts/ Directory
```
scripts/
├── setup_dev.py            # Development setup
├── migrate_data.py         # Data migration
└── deploy.sh               # Deployment script
```

### data/ Directory
```
data/
├── raw/
├── processed/
├── exports-2025-10-19/     # Date-related: use skewer-case
└── backup-2025-10-01/      # Date-related: use skewer-case
```

## Single-File Scripts vs Full Projects

### When to Use Single-File Scripts
- Quick automation tasks
- One-off data processing
- Simple CLI tools
- Prototype or proof-of-concept

```python
# simple_scraper.py
import requests
from bs4 import BeautifulSoup

def scrape_page(url):
    response = requests.get(url)
    return BeautifulSoup(response.text, 'html.parser')

if __name__ == "__main__":
    results = scrape_page("https://example.com")
    print(results.title.string)
```

### When to Use Full Project Structure
- Multiple modules/files needed
- Requires testing infrastructure
- Will be distributed/shared
- Needs configuration management
- Has multiple dependencies

### Transitioning from Script to Project

**Before** (single file):
```python
# video_tool.py (300 lines)
```

**After** (structured):
```
VideoTool/
├── VideoTool/
│   ├── __init__.py
│   ├── cli.py           # CLI interface
│   ├── processor.py     # Core logic
│   ├── utils.py         # Helpers
│   └── config.py        # Configuration
└── tests/
    └── test_processor.py
```

## __init__.py Usage

### When Required
- Python 3.3+: Not strictly required but recommended
- Makes directories importable as packages
- Provides a clean public API

### What to Put in __init__.py

**Minimal** (empty is fine):
```python
# MyPackage/__init__.py
```

**Version and metadata**:
```python
# MyPackage/__init__.py
__version__ = "1.0.0"
__author__ = "Your Name"
```

**Re-exporting for convenience**:
```python
# MyPackage/__init__.py
from .core import Processor
from .utils import validate_input
from .config import load_config

__all__ = ["Processor", "validate_input", "load_config"]
```

This allows users to do:
```python
from MyPackage import Processor  # Instead of from MyPackage.core import Processor
```

## Example Structures

### Simple CLI Tool
```
TextAnalyzer/
├── TextAnalyzer/
│   ├── __init__.py
│   ├── cli.py           # Click/argparse interface
│   ├── analyzer.py      # Core analysis logic
│   └── config.py
├── tests/
│   └── test_analyzer.py
├── pyproject.toml
└── README.md
```

### Web API Project
```
ApiService/
├── ApiService/
│   ├── __init__.py
│   ├── app.py           # FastAPI/Flask app
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── posts.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth.py
│   └── config/
│       ├── __init__.py
│       └── settings.py
├── tests/
├── data/
├── pyproject.toml
└── secrets_template.json
```

### Library/Package
```
DataUtils/
├── src/
│   └── DataUtils/
│       ├── __init__.py
│       ├── csv/
│       │   ├── __init__.py
│       │   └── parser.py
│       ├── json/
│       │   ├── __init__.py
│       │   └── handler.py
│       └── validation/
│           ├── __init__.py
│           └── validators.py
├── tests/
├── docs/
├── pyproject.toml
└── README.md
```

## Common Patterns

### Pattern 1: Separate CLI from Logic
```
MyTool/
├── MyTool/
│   ├── cli.py           # User interface
│   ├── core.py          # Business logic (testable)
│   └── config.py
```

### Pattern 2: Configuration Management
```
MyApp/
├── MyApp/
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── secrets.py   # Loads from secrets.json
│   └── main.py
├── secrets.json         # gitignored
└── secrets_template.json
```

### Pattern 3: Feature-Based Organization
```
WebApp/
└── WebApp/
    ├── users/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── routes.py
    │   └── services.py
    └── posts/
        ├── __init__.py
        ├── models.py
        ├── routes.py
        └── services.py
```

## .gitignore Considerations

Always include:
```gitignore
# Secrets
secrets.json
.env

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
dist/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Data (optional)
data/exports-*/
data/backup-*/
*.log
```

## Related Guides

- [UV Usage Guide](uv_usage.md) - Package management and virtual environments
- [Documentation Standards](documentation_standards.md) - How to document your code
- [Testing Strategies](testing_strategies.md) - Testing best practices
- [Rich Formatting](rich_formatting.md) - Terminal output for CLI applications
