# Multi-Language Development Guide

## Overview

This guide covers the languages used in this workspace:
- **Python (90%)** - Primary language for most projects
- **Go** - Performance-critical tools and concurrent systems
- **Node.js** - Web frontends and JavaScript APIs
- **Rust** - Systems programming and high-performance components

## Quick Reference Table

| Operation | Python (UV) | Go | Node.js | Rust |
|-----------|-------------|-----|---------|------|
| **Init Project** | `uv init` | `go mod init` | `pnpm init` | `cargo new` |
| **Add Dependency** | `uv add package` | `go get pkg` | `pnpm add pkg` | `cargo add crate` |
| **Install Deps** | `uv sync` | `go mod download` | `pnpm install` | `cargo build` |
| **Run Code** | `uv run script.py` | `go run main.go` | `node script.js` | `cargo run` |
| **Run Tests** | `uv run pytest` | `go test ./...` | `pnpm test` | `cargo test` |
| **Build Binary** | N/A | `go build` | N/A | `cargo build --release` |
| **Format Code** | `uv run ruff format` | `go fmt ./...` | `pnpm format` | `cargo fmt` |
| **Lint Code** | `uv run ruff check` | `go vet ./...` | `pnpm lint` | `cargo clippy` |

## Python (Primary Language)

### Package Management with UV

UV is the modern, fast package manager replacing pip/poetry/pipenv.

```bash
# Create new project
uv init my-project
cd my-project

# Add dependencies
uv add requests pandas numpy

# Add dev dependencies
uv add --dev pytest ruff mypy

# Run scripts with dependencies
uv run python main.py
uv run pytest

# Sync environment with pyproject.toml
uv sync
```

### Project Configuration (pyproject.toml)

```toml
[project]
name = "my-project"
version = "0.1.0"
description = "Project description"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31.0",
    "pandas>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "ruff>=0.1.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

### Common Patterns

```python
# Import ordering: stdlib, third-party, local
import os
import sys
from pathlib import Path

import requests
import pandas as pd

from my_module import my_function

# Use pathlib for file operations
data_dir = Path(__file__).parent / "data"
config_file = data_dir / "config.json"

# Context managers for resources
with open(config_file) as f:
    config = json.load(f)
```

**See Also**: [UV Usage Guide](uv_usage.md) for complete UV reference

## Go Basics

### When to Use Go
- Performance-critical CLI tools
- Concurrent/parallel processing
- Network services and APIs
- System utilities

### Project Setup

```bash
# Initialize module
go mod init github.com/username/project

# Add dependency
go get github.com/spf13/cobra

# Tidy dependencies
go mod tidy
```

### go.mod Example

```go
module github.com/username/project

go 1.21

require (
    github.com/spf13/cobra v1.8.0
    golang.org/x/sync v0.5.0
)
```

### Common Commands

```bash
go run main.go              # Run code
go build                    # Build binary
go test ./...              # Run all tests
go fmt ./...               # Format code
go vet ./...               # Static analysis
go mod download            # Download dependencies
```

### Project Structure

```
project/
├── go.mod
├── go.sum
├── main.go
├── cmd/
│   └── cli/
│       └── main.go
├── internal/
│   └── pkg/
│       └── utils.go
└── pkg/
    └── api/
        └── client.go
```

## Node.js Basics

### When to Use Node.js
- Web application frontends (React, Vue, Svelte)
- REST/GraphQL APIs (Express, Fastify)
- Build tools and bundlers
- JavaScript/TypeScript projects

**See Also**: [Svelte 5 Guide](svelte5_guide.md) for Svelte-specific patterns and SvelteKit

### Project Setup

```bash
# Initialize project
pnpm init

# Install dependencies
pnpm add express
pnpm add -D typescript @types/node
```

### package.json Example

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0"
  }
}
```

### Common Commands

```bash
pnpm install               # Install dependencies
pnpm dev                   # Run dev server
pnpm test                  # Run tests
pnpm build                 # Build for production
npx tsc --init             # Initialize TypeScript
```

## Rust Basics

### When to Use Rust
- Maximum performance requirements
- Memory safety critical systems
- Python extensions (PyO3)
- Embedded systems

### Project Setup

```bash
# Create new project
cargo new my-project
cd my-project

# Add dependencies
cargo add serde tokio
cargo add --dev criterion
```

### Cargo.toml Example

```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }

[dev-dependencies]
criterion = "0.5"
```

### Common Commands

```bash
cargo build                # Debug build
cargo build --release      # Optimized build
cargo run                  # Build and run
cargo test                 # Run tests
cargo fmt                  # Format code
cargo clippy              # Linting
cargo doc --open          # Generate and open docs
```

## When to Use Each Language

### Decision Framework

| Use Case | Language | Reason |
|----------|----------|--------|
| Data analysis, ML, automation | Python | Rich ecosystem, readability |
| CLI tools, concurrent processing | Go | Fast, simple concurrency |
| Web frontends, Node APIs | Node.js | JavaScript ecosystem |
| Maximum performance, safety | Rust | Zero-cost abstractions |
| Quick scripts | Python | Fastest to write |
| Cross-platform binaries | Go or Rust | Easy distribution |

### Language Strengths

**Python**: Ecosystem, readability, rapid development
**Go**: Simplicity, concurrency, fast compilation
**Node.js**: JavaScript everywhere, huge package registry
**Rust**: Performance, memory safety, no runtime overhead

## Polyglot Project Structure

### Multiple Languages in One Repository

```
project/
├── pyproject.toml          # Python root
├── src/
│   └── python/
│       └── main.py
├── go/
│   ├── go.mod
│   ├── cmd/
│   └── internal/
├── node/
│   ├── package.json
│   └── src/
├── rust/
│   ├── Cargo.toml
│   └── src/
└── scripts/
    └── build-all.sh
```

### Build Script Example

```bash
#!/bin/bash
# build-all.sh

set -e

echo "Building Python environment..."
cd src/python && uv sync

echo "Building Go binaries..."
cd ../../go && go build -o ../bin/go-tool

echo "Building Node.js app..."
cd ../node && pnpm install && pnpm build

echo "Building Rust components..."
cd ../rust && cargo build --release

echo "All builds complete!"
```

## Calling Between Languages

### Python Calling Go/Rust Binaries

```python
import subprocess
from pathlib import Path

# Call Go binary
result = subprocess.run(
    ["./bin/go-tool", "arg1", "arg2"],
    capture_output=True,
    text=True
)
print(result.stdout)

# Call Rust binary with JSON I/O
import json
input_data = json.dumps({"key": "value"})
result = subprocess.run(
    ["./bin/rust-tool"],
    input=input_data,
    capture_output=True,
    text=True
)
output = json.loads(result.stdout)
```

### Python Extensions in Rust (PyO3)

```rust
// Rust code (Cargo.toml needs pyo3)
use pyo3::prelude::*;

#[pyfunction]
fn fast_calculation(n: usize) -> PyResult<Vec<i64>> {
    Ok((0..n).map(|x| x as i64 * x as i64).collect())
}

#[pymodule]
fn my_rust_module(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(fast_calculation, m)?)?;
    Ok(())
}
```

```python
# Python usage
import my_rust_module

result = my_rust_module.fast_calculation(1_000_000)
```

### Node.js Calling Child Processes

```javascript
const { execSync } = require('child_process');

// Call Go binary
const output = execSync('./bin/go-tool arg1 arg2', {
  encoding: 'utf-8'
});
console.log(output);
```

## Build Tool Comparison

| Feature | UV (Python) | Go Modules | pnpm | Cargo (Rust) |
|---------|-------------|------------|----------|--------------|
| **Speed** | Very Fast | Fast | Fast | Fast |
| **Lock File** | uv.lock | go.sum | pnpm-lock.yaml | Cargo.lock |
| **Global Cache** | Yes | Yes | Yes | Yes |
| **Virtual Env** | Automatic | N/A | N/A | N/A |
| **Version Resolution** | Automatic | Minimal | Smart | Smart |
| **Offline Mode** | Yes | Yes | Yes | Yes |

### Key Differences

- **UV**: Replaces pip, poetry, pyenv - all-in-one Python tool
- **Go Modules**: Minimal, built into Go toolchain
- **pnpm**: Fast, disk-efficient package manager (recommended over npm)
- **Cargo**: Excellent dependency resolution, built-in docs

## Related Guides

- [UV Usage Guide](uv_usage.md) - Complete Python package management reference
- [Project Structure Guide](project_structure.md) - Standard project layouts
- [Git Workflow](git_guide.md) - Version control practices

## Quick Start Cheatsheet

```bash
# Python
uv init && uv add requests && uv run python main.py

# Go
go mod init example.com/app && go run main.go

# Node.js
pnpm init && pnpm add express && node index.js

# Rust
cargo new app && cd app && cargo run
```

---

*This guide prioritizes Python while providing essential references for other languages used in polyglot projects.*
