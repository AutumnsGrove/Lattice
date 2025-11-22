# Rich Formatting Guide for Terminal Output

## Overview

Rich is a Python library for creating beautiful, formatted terminal output. It transforms basic print statements into visually appealing, informative displays with colors, tables, progress bars, syntax highlighting, and more.

Using Rich improves:
- **User experience**: Clear, scannable output
- **Debugging**: Better visibility into data structures
- **Professionalism**: Polished CLI applications
- **Productivity**: Faster information comprehension

This guide covers practical Rich patterns for Python projects, from simple upgrades to advanced features.

---

## Quick Reference

```bash
# Install Rich
uv add rich

# Quick test
python -c "from rich import print; print('[bold green]Rich is working![/]')"

# In your code
from rich import print
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import track
```

---

## When to Use Rich

### Primary Triggers

- **Building CLI applications** - Use for all user-facing output
- **Displaying structured data** - Tables for lists, dicts, or API responses
- **Long-running operations** - Progress bars for iterations
- **Error messages** - Panels for important alerts
- **Debug output** - Pretty-print complex objects
- **Log formatting** - Enhanced logging with colors

### When NOT to Use Rich

- **Non-interactive scripts** - Output piped to files or other programs
- **Minimal dependencies required** - When package size matters
- **Server-side logging** - Standard logging is usually better
- **Performance-critical loops** - Rich adds overhead

---

## Core Concepts

### Console Object

The `Console` is Rich's main interface for output. Create one instance and reuse it.

```python
from rich.console import Console

console = Console()

# Basic output
console.print("Hello, World!")

# Styled output
console.print("[bold red]Error:[/] Something went wrong")
console.print("[green]Success![/] Operation completed")

# Multiple styles
console.print("[bold blue]Info:[/] Processing [yellow]data.json[/]")
```

### Markup Syntax

Rich uses a simple markup language for styling:

```python
# Basic styles
"[bold]Bold text[/]"
"[italic]Italic text[/]"
"[underline]Underlined[/]"
"[strike]Strikethrough[/]"

# Colors
"[red]Red text[/]"
"[green]Green text[/]"
"[blue on white]Blue on white background[/]"

# Combined styles
"[bold red on white]Bold red on white[/]"

# Links (clickable in supported terminals)
"[link=https://example.com]Click here[/]"
```

### Print Function Replacement

Rich provides a drop-in replacement for Python's print:

```python
from rich import print

# Works like regular print
print("Normal text")

# But also supports Rich markup
print("[bold cyan]Styled text[/bold cyan]")

# Auto-formats Python objects
data = {"name": "Alice", "age": 30, "active": True}
print(data)  # Pretty-printed with syntax highlighting
```

---

## Installation

### With UV (Recommended)

```bash
# Add to project
uv add rich

# Add as dev dependency (for debugging tools)
uv add --dev rich
```

### In pyproject.toml

```toml
[project]
dependencies = [
    "rich>=13.0.0",
]

# Or as dev dependency
[project.optional-dependencies]
dev = [
    "rich>=13.0.0",
]
```

---

## Practical Examples

### Simple Output Upgrades

Transform basic print statements into Rich output:

```python
# Before: Basic print
print("Processing complete!")
print("Error: File not found")
print("Status: Running")

# After: Rich console
from rich.console import Console

console = Console()

console.print("[bold green]✓[/] Processing complete!")
console.print("[bold red]✗ Error:[/] File not found")
console.print("[bold blue]Status:[/] Running")
```

### Tables for Structured Data

Display lists, dictionaries, or database results:

```python
from rich.console import Console
from rich.table import Table

console = Console()

# Create a table
table = Table(title="User List")

# Add columns
table.add_column("ID", style="cyan", justify="right")
table.add_column("Name", style="magenta")
table.add_column("Email", style="green")
table.add_column("Status", justify="center")

# Add rows
table.add_row("1", "Alice", "alice@example.com", "✓ Active")
table.add_row("2", "Bob", "bob@example.com", "✓ Active")
table.add_row("3", "Charlie", "charlie@example.com", "✗ Inactive")

console.print(table)
```

### Panels for Important Messages

Highlight important information with panels:

```python
from rich.console import Console
from rich.panel import Panel

console = Console()

# Simple panel
console.print(Panel("Operation completed successfully!"))

# Styled panel
console.print(Panel(
    "[green]All tests passed![/]\n\n"
    "Total: 42 tests\n"
    "Time: 3.2s",
    title="Test Results",
    border_style="green"
))

# Error panel
console.print(Panel(
    "[red]Connection refused[/]\n\n"
    "Host: localhost:5432\n"
    "Check that the database is running.",
    title="[bold red]Database Error[/]",
    border_style="red"
))
```

### Progress Bars

Show progress for iterations and long-running tasks:

```python
from rich.progress import track
import time

# Simple iteration with progress bar
for item in track(range(100), description="Processing..."):
    time.sleep(0.01)  # Simulated work

# Processing files
files = ["data1.json", "data2.json", "data3.json"]
for filename in track(files, description="Loading files..."):
    process_file(filename)
```

**Advanced Progress with Multiple Tasks:**

```python
from rich.progress import Progress

with Progress() as progress:
    task1 = progress.add_task("[red]Downloading...", total=100)
    task2 = progress.add_task("[green]Processing...", total=100)
    task3 = progress.add_task("[cyan]Uploading...", total=100)

    while not progress.finished:
        progress.update(task1, advance=0.9)
        progress.update(task2, advance=0.6)
        progress.update(task3, advance=0.3)
        time.sleep(0.02)
```

### Syntax Highlighting

Display code with syntax highlighting:

```python
from rich.console import Console
from rich.syntax import Syntax

console = Console()

code = '''
def hello_world():
    """Print a greeting."""
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
'''

syntax = Syntax(code, "python", theme="monokai", line_numbers=True)
console.print(syntax)
```

### Tree Displays

Show hierarchical data like file structures:

```python
from rich.console import Console
from rich.tree import Tree

console = Console()

# Create a tree
tree = Tree("[bold blue]MyProject/[/]")

# Add branches
src = tree.add("[bold]src/[/]")
src.add("main.py")
src.add("config.py")

utils = src.add("[bold]utils/[/]")
utils.add("helpers.py")
utils.add("validation.py")

tests = tree.add("[bold]tests/[/]")
tests.add("test_main.py")
tests.add("conftest.py")

console.print(tree)
```

### Combining Features

Wrap a table in a panel for polished output:

```python
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

# Create table
table = Table(show_header=True, header_style="bold magenta")
table.add_column("Service", style="cyan")
table.add_column("Status")

table.add_row("api", "[green]● Running[/]")
table.add_row("worker", "[green]● Running[/]")
table.add_row("scheduler", "[red]● Stopped[/]")

# Wrap in panel
console.print(Panel(table, title="[bold]Status[/]", border_style="blue"))
```

---

## Logging Integration

### Rich Handler for Logging

```python
import logging
from rich.logging import RichHandler

# Configure logging with Rich
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True)]
)

logger = logging.getLogger("myapp")

# Use normally
logger.info("Application started")
logger.warning("Cache miss for key: user_123")
logger.error("Failed to connect to database")
```

### Pretty Tracebacks

Rich automatically enhances tracebacks:

```python
from rich.traceback import install

# Install Rich traceback handler (call once at startup)
install(show_locals=True)

# Now all exceptions have beautiful tracebacks
def buggy_function():
    data = {"key": "value"}
    return data["missing_key"]  # KeyError with rich traceback
```

---

## Common Pitfalls

### 1. Creating Multiple Console Instances

```python
# ❌ Bad: Creating new Console each time
def print_status(message):
    console = Console()  # Wasteful
    console.print(message)

# ✅ Good: Reuse single instance
console = Console()

def print_status(message):
    console.print(message)
```

### 2. Mixing print() and console.print()

```python
# ❌ Bad: Inconsistent output
print("Starting process...")
console.print("[green]Done![/]")

# ✅ Good: Use console consistently
console.print("Starting process...")
console.print("[green]Done![/]")
```

### 3. Not Escaping User Input

```python
# ❌ Bad: User input with brackets breaks markup
username = "user[admin]"
console.print(f"[blue]{username}[/]")  # Broken

# ✅ Good: Escape user input
from rich.markup import escape
console.print(f"[blue]{escape(username)}[/]")
```

### 4. Over-styling

```python
# ❌ Bad: Too many colors/styles
console.print("[bold red on yellow blink]WARNING[/] [blue]Check[/] [green]your[/] [magenta]config[/]")

# ✅ Good: Consistent, minimal styling
console.print("[bold yellow]Warning:[/] Check your configuration")
```

### 5. Forgetting Non-TTY Environments

```python
# ❌ Bad: Assumes terminal
console = Console()

# ✅ Good: Handle non-TTY gracefully
console = Console(force_terminal=False)  # Respects environment

# Or check explicitly
if console.is_terminal:
    console.print("[green]Interactive mode[/]")
else:
    print("Non-interactive mode")
```

---

## Performance Considerations

Rich adds overhead for high-frequency output (thousands of prints/second) or very large tables. For non-interactive use, disable formatting:

```python
import sys
console = Console(force_terminal=sys.stdout.isatty())
```

---

## Integration Patterns

### CLI Application Pattern

```python
# myapp/cli.py
import click
from rich.console import Console
from rich.panel import Panel

console = Console()

@click.group()
def cli():
    """My CLI Application."""
    pass

@cli.command()
@click.argument('filename')
def process(filename):
    """Process a file."""
    console.print(f"[bold]Processing:[/] {filename}")

    with console.status("[bold green]Working..."):
        result = do_processing(filename)

    if result.success:
        console.print(Panel(f"[green]Processed {result.count} items[/]", title="Success"))
    else:
        console.print(f"[red]Error:[/] {result.error}")
```

---

## Related Guides

- **[testing_strategies.md](testing_strategies.md)** - Use Rich for enhanced test output
- **[project_structure.md](project_structure.md)** - CLI application patterns
- **[code_style_guide.md](code_style_guide.md)** - Code organization principles
- **[uv_usage.md](uv_usage.md)** - Installing Rich with UV

---

*Last updated: 2025-10-19*
