# Frog — Phase Transitions & Detection Rules

The orchestrator (Frog) manages state between phases. This document defines how to detect the environment, when to transition, and what to do when things go wrong.

---

## Test Runner Detection

The Frog auto-detects the test runner from project files. Check in order:

| Signal                                                | Runner     | Test Command            |
| ----------------------------------------------------- | ---------- | ----------------------- |
| `vitest.config.ts` or `vitest` in package.json        | vitest     | `npx vitest run {file}` |
| `jest.config.*` or `jest` in package.json             | jest       | `npx jest {file}`       |
| `pytest.ini` or `pyproject.toml` with `[tool.pytest]` | pytest     | `uv run pytest {file}`  |
| `Cargo.toml` with `[dev-dependencies]`                | cargo test | `cargo test`            |
| `*_test.go` files                                     | go test    | `go test ./...`         |

**For the Lattice monorepo specifically:**

- TypeScript/Svelte packages → vitest (check each package's `vitest.config.ts`)
- Python projects → pytest via `uv run pytest`
- Go tools → `go test`
- Workers with `@cloudflare/vitest-pool-workers` → vitest with workerd pool

**Running tests in Lattice:**

```bash
# Single test file (preferred during TDD for speed)
npx vitest run src/lib/feature.test.ts

# Full package test suite
pnpm run test:run

# Affected packages only (for CHORUS phase)
gw ci --affected --fail-fast --diagnose
```

---

## Test File Convention Detection

Look for existing test files to match the project's conventions:

| Pattern          | Convention             | Example                            |
| ---------------- | ---------------------- | ---------------------------------- |
| `*.test.ts`      | Vitest/Jest co-located | `email.test.ts` next to `email.ts` |
| `*.spec.ts`      | Angular/alternative    | `email.spec.ts`                    |
| `__tests__/*.ts` | Jest directory         | `__tests__/email.ts`               |
| `test_*.py`      | Pytest                 | `test_email.py`                    |
| `*_test.py`      | Pytest alternative     | `email_test.py`                    |
| `tests/*.py`     | Pytest directory       | `tests/test_email.py`              |
| `*_test.go`      | Go convention          | `email_test.go`                    |

**Rule:** Match whatever the project already uses. Never impose a convention.

---

## Phase Transition Gates

### LISTEN → CROAK

**Prerequisite:** Behavior list exists with at least one testable behavior.

**Gate checks:**

1. Test runner identified
2. Test file path determined
3. Implementation file path determined
4. Each behavior is specific and testable (not vague like "handle errors")
5. User has confirmed the behavior list (or it was clear from the specification)

**If gate fails:** Stay in LISTEN. Ask the human for clarification.

---

### CROAK → LEAP

**Prerequisite:** Tests exist and ALL fail.

**Gate checks:**

1. Test file(s) were written by the CROAK subagent
2. Run tests independently: `{test_command}`
3. ALL tests fail (exit code non-zero)
4. Tests fail for the RIGHT reason (assertion failures, not import/syntax errors)
5. No implementation file was created or modified

**If gate fails:**

- Tests pass without implementation → Specification error. Return to LISTEN.
- Tests have syntax errors → Resume CROAK agent with error output.
- Tests fail for wrong reason (missing imports, bad paths) → Resume CROAK agent.
- Some tests pass, some fail → Investigate which pass and why. May need to return to LISTEN for those behaviors.

---

### LEAP → SHED

**Prerequisite:** ALL tests pass.

**Gate checks:**

1. Implementation file(s) were written by the LEAP subagent
2. Run tests independently: `{test_command}`
3. ALL tests pass (exit code zero)
4. Test files were NOT modified (diff check)
5. No new test files were created

**If gate fails:**

- Some tests still fail → Resume LEAP agent with failure context (up to 3 retries)
- Test files were modified → REJECT. Revert test changes, re-run LEAP with stricter instructions
- After 3 retries → Surface to human. Show which tests fail and what the agent tried.

**Diff check for test immutability:**

```bash
# Before LEAP, snapshot the test file hash
TEST_HASH_BEFORE=$(shasum {test_file_path})

# After LEAP, verify unchanged
TEST_HASH_AFTER=$(shasum {test_file_path})

# If different, test contract was violated
```

---

### SHED → CHORUS

**Prerequisite:** ALL tests still pass. No behavior changed.

**Gate checks:**

1. Run tests independently: `{test_command}`
2. ALL tests pass (exit code zero)
3. Test files were NOT modified
4. No new tests were added
5. Implementation behavior is unchanged (same tests, same results)

**If gate fails:**

- Tests fail after refactor → Revert to pre-SHED state. Re-run SHED with stricter constraints.
- Test files modified → REJECT. Revert all SHED changes.
- New behavior detected → REJECT. Revert to pre-SHED state.

---

### CHORUS → Next Cycle or Done

**Gate checks:**

1. Full test suite passes: `gw ci --affected --fail-fast --diagnose`
2. No regressions in other tests

**If full suite fails:**

- New tests pass but old tests break → The implementation has a side effect. Return to LEAP with regression context.
- Build fails → Fix build issues before declaring CHORUS complete.

**After CHORUS:**

- If more behaviors remain from LISTEN → Start new CROAK phase
- If all behaviors are implemented → Cycle complete. Present summary.
- If user wants to add more → Return to LISTEN for new specification

---

## Error Recovery

### Subagent Timeout

If a subagent doesn't return within a reasonable time:

- CROAK: Re-spawn with a simpler behavior subset
- LEAP: The implementation may be too complex. Split the behavior list.
- SHED: Skip refactoring. Code works. Ship it.

### Subagent Produces Invalid Output

- No files changed → Re-spawn with clearer instructions
- Wrong files touched → Revert and re-spawn with explicit file constraints
- Garbage output → Report to human, skip this phase

### Human Intervention Points

The Frog surfaces to the human when:

1. Specification is ambiguous (LISTEN)
2. Tests pass without implementation (CROAK → LISTEN)
3. LEAP agent stuck after 3 retries
4. Full suite has regressions after CHORUS
5. Any subagent modifies files it shouldn't

---

## Cycle Variants

### Full Cycle (Default)

LISTEN → CROAK → LEAP → SHED → CHORUS
Use for: New features, new functions, greenfield code

### Red Only

LISTEN → CROAK → (stop)
Use for: Writing tests for existing code that has no tests

### Green Only

(existing tests) → LEAP → SHED → CHORUS
Use for: When tests already exist and implementation is needed

### Quick Cycle (Skip Refactor)

LISTEN → CROAK → LEAP → CHORUS
Use for: Urgent fixes where speed matters more than polish

### Multi-Cycle

LISTEN → [CROAK → LEAP → SHED]×N → CHORUS
Use for: Complex features where behaviors build on each other. Run CHORUS only at the end.
