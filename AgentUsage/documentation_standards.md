# Documentation Standards

## Overview

Good documentation is essential for maintainable code. This guide outlines when and how to document your code effectively.

### Documentation Philosophy

**Documentation exists at multiple levels:**
- **Type hints**: Document function signatures and variable types
- **Docstrings**: Explain what functions/classes do and how to use them
- **Comments**: Explain why code does something (not what it does)
- **README.md**: High-level project overview, setup, and usage
- **TODOS.md**: Track tasks, priorities, and blockers

**Key principle**: Code should be self-documenting through clear naming and structure. Documentation should add value, not repeat what the code already says.

---

## Quick Reference: When to Document What

| What | When | How |
|------|------|-----|
| **Functions** | All public functions | Docstring (Google style) |
| **Classes** | All classes | Docstring with attributes |
| **Type hints** | All function signatures | Python type annotations |
| **Comments** | Complex logic, non-obvious decisions | Inline comments |
| **README** | Every project | Markdown file in root |
| **TODOS** | Active development | TODOS.md in project root |

---

## Python Docstring Formats

We use **Google-style docstrings** for consistency and readability.

### Function Docstring Example

```python
def calculate_discount(price: float, discount_percent: float, max_discount: float = 100.0) -> float:
    """Calculate the final price after applying a discount.

    This function applies a percentage-based discount to a price,
    ensuring the discount does not exceed the specified maximum.

    Args:
        price: The original price before discount.
        discount_percent: The discount percentage (0-100).
        max_discount: Maximum discount amount in currency units. Defaults to 100.0.

    Returns:
        The final price after applying the discount.

    Raises:
        ValueError: If price is negative or discount_percent is not between 0-100.

    Example:
        >>> calculate_discount(200.0, 10.0)
        180.0
        >>> calculate_discount(200.0, 60.0, max_discount=100.0)
        100.0
    """
    if price < 0:
        raise ValueError("Price cannot be negative")
    if not 0 <= discount_percent <= 100:
        raise ValueError("Discount percent must be between 0 and 100")

    discount_amount = (price * discount_percent) / 100
    discount_amount = min(discount_amount, max_discount)
    return price - discount_amount
```

### Class Docstring Example

```python
class DataProcessor:
    """Process and transform data from multiple sources.

    This class handles loading, cleaning, and transforming data
    from various file formats. It maintains state for batch processing.

    Attributes:
        source_path: Path to the data source directory.
        output_path: Path where processed data will be saved.
        batch_size: Number of records to process at once.
        cache: Internal cache for processed data (dict).

    Example:
        >>> processor = DataProcessor("/data/input", "/data/output")
        >>> processor.load_data("dataset.csv")
        >>> processor.process()
    """

    def __init__(self, source_path: str, output_path: str, batch_size: int = 100):
        """Initialize the data processor.

        Args:
            source_path: Path to the data source directory.
            output_path: Path where processed data will be saved.
            batch_size: Number of records to process at once. Defaults to 100.
        """
        self.source_path = source_path
        self.output_path = output_path
        self.batch_size = batch_size
        self.cache = {}
```

### When to Use Docstrings

**ALWAYS write docstrings for:**
- Public functions and methods
- All classes
- Complex private functions
- Module-level documentation (top of file)

**Skip docstrings for:**
- Trivial getters/setters (unless they have side effects)
- Private helper functions with obvious names
- One-line utility functions with type hints

---

## README.md Structure and Essentials

Every project should have a README.md in the root directory.

### Essential Sections

```markdown
# Project Name

Brief one-sentence description of what this project does.

## Overview

A paragraph explaining the purpose and context of this project.

## Installation

```bash
pip install -r requirements.txt
# or
pnpm install
```

## Quick Start

```python
from myproject import MainClass

processor = MainClass()
result = processor.run()
```

## Configuration

- Environment variables needed
- Config file format
- API keys setup (reference secrets.json pattern)

## Usage

Detailed examples of common use cases.

## Project Structure

```
project/
├── src/          # Main source code
├── tests/        # Test files
└── docs/         # Additional documentation
```

## Testing

```bash
pytest tests/
```

## Contributing

Guidelines for contributions (if applicable).

## License

License information.
```

---

## Type Hints as Documentation

Type hints serve as inline documentation, making code self-explanatory.

### Why Type Hints Help

- **Clarity**: Instantly see what types a function expects
- **IDE Support**: Enable autocomplete and error checking
- **Self-documenting**: Reduce need for verbose explanations

### Example

```python
# Without type hints - unclear what this expects
def process_records(data, threshold, verbose):
    # What types are these? Hard to tell!
    pass

# With type hints - crystal clear
def process_records(
    data: list[dict[str, Any]],
    threshold: float,
    verbose: bool = False
) -> tuple[list[dict], int]:
    """Process records above threshold.

    Returns:
        Tuple of (filtered_records, count).
    """
    pass
```

---

## Code Comments: When and When Not

### Good Comments (Explain WHY)

```python
# Good: Explains reasoning
# Use exponential backoff to avoid overwhelming the API during retries
retry_delay = 2 ** attempt

# Good: Clarifies non-obvious business logic
# Discount only applies to orders over $100 per marketing policy
if order_total > 100:
    apply_discount()

# Good: Documents workaround
# TODO: Remove this hack once upstream library fixes the bug (issue #123)
result = result.replace('\x00', '')
```

### Bad Comments (Obvious or Outdated)

```python
# Bad: States the obvious
# Increment counter
counter += 1

# Bad: Repeats what code says
# Loop through users
for user in users:
    pass

# Bad: Outdated comment
# Returns user ID  (actually returns user object now!)
def get_user():
    return User()
```

### When to Comment

**DO comment when:**
- Code implements a complex algorithm
- There's a non-obvious reason for doing something
- You're working around a bug or limitation
- Business logic requires explanation

**DON'T comment when:**
- The code is self-explanatory
- Variable/function names already explain intent
- You're just restating what the code does

---

## TODO Management

You MUST actively maintain the `TODOS.md` file in the project root. This is a critical part of the workflow.

### TODO File Rules:

1. **Always check TODOS.md first** when starting a new task or session
2. **Update TODOS.md immediately** when:
   - A task is completed (mark with ✅ or remove)
   - A new task is identified (add it)
   - A task's priority or status changes
   - You discover subtasks or dependencies

3. **Format for TODOS.md:**
   ```markdown
   # Project TODOs

   ## High Priority
   - [ ] Task description here
   - [x] Completed task (keep for reference)

   ## Medium Priority
   - [ ] Another task

   ## Low Priority / Future Ideas
   - [ ] Nice to have feature

   ## Blocked
   - [ ] Task blocked by X (waiting on...)
   ```

4. **Use clear task descriptions** that include:
   - What needs to be done
   - Why it's important (if not obvious)
   - Any dependencies or blockers

5. **Keep it current**: Remove or archive completed tasks regularly to keep the list manageable

### Example Workflow:

1. Session starts → Check TODOS.md
2. User asks you to do something → Check if it's already in TODOs
3. Complete a task → Update TODOS.md to mark it complete
4. Discover a new issue → Add it to TODOS.md
5. Before session ends → Review and update TODOS.md

---

## API Documentation with Docstrings

Public APIs need especially thorough documentation.

### What to Include

```python
def public_api_function(param1: str, param2: int = 0) -> dict[str, Any]:
    """High-level description of what this does.

    More detailed explanation if needed, including:
    - How it fits into the larger system
    - Important behavioral notes
    - Performance considerations

    Args:
        param1: Description including valid values/formats.
        param2: Description with default behavior.

    Returns:
        Description of return value structure with example.

    Raises:
        SpecificError: When and why this error occurs.

    Example:
        >>> result = public_api_function("test", 5)
        >>> print(result["status"])
        'success'

    Note:
        Any important warnings or caveats.
    """
    pass
```

### Documentation Tools

- **Sphinx**: Generate HTML docs from docstrings
- **MkDocs**: Markdown-based documentation site generator
- **pdoc**: Lightweight auto-documentation for Python

---

## Examples of Well-Documented Code

### Before: Poorly Documented

```python
def p(d, t):
    r = []
    for i in d:
        if i["v"] > t:
            r.append(i)
    return r
```

### After: Well Documented

```python
def filter_records_by_value(
    records: list[dict[str, Any]],
    threshold: float
) -> list[dict[str, Any]]:
    """Filter records that exceed a value threshold.

    Args:
        records: List of record dictionaries with 'value' key.
        threshold: Minimum value for records to be included.

    Returns:
        Filtered list of records where value > threshold.
    """
    return [record for record in records if record["value"] > threshold]
```

**What improved:**
- Clear function name describes purpose
- Type hints show data structures
- Docstring explains behavior
- Variable names are descriptive
- More Pythonic implementation

---

## Related Guides

- **project_structure.md**: Organizing code and directories
- **code_quality.md**: Writing clean, maintainable code
- **../AGENT.md**: Full project guidelines including git workflow

---

*Remember: The best documentation is clear code. Document to add value, not to repeat what's obvious.*
