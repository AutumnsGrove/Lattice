---
title: "Testing Infrastructure Specification"
description: "Grove's testing strategy, infrastructure, and subagent-optimized patterns for achieving comprehensive test coverage before v1 launch."
category: specs
specCategory: "reference"
icon: filecode
lastUpdated: "2026-01-22"
aliases: []
date created: Wednesday, January 15th 2026
date modified: Wednesday, January 15th 2026
tags:
  - core
  - infrastructure
  - testing
  - v1-blocker
type: tech-spec
---

# Testing Infrastructure Specification

```
        ╭──────────────────────────────────────╮
        │                                      │
        │     🧪 TEST    ════►   ✓ PASS       │
        │                                      │
        │     Every leaf, every branch,        │
        │     every root—tested.               │
        │                                      │
        ╰──────────────────────────────────────╯
```

> _Testing isn't about finding bugs. It's about building confidence._

This spec defines Grove's testing strategy, infrastructure, and the subagent-optimized pattern for achieving comprehensive coverage before v1 launch.

---

## Overview

### Current State (Jan 2026)

**Test Infrastructure Exists:**

- Vitest configured for engine, landing, plant, clearing, post-migrator
- ~50 test files across packages
- Mock environment for Durable Objects, D1, KV
- Happy-dom for component testing

**Coverage Gaps:**

- Many utility functions untested
- Most Svelte components lack tests
- API routes have minimal coverage
- No E2E test suite

### V1 Goal

Before v1 launch, achieve:

- **80%+ line coverage** on critical paths (auth, payments, content)
- **Unit tests** for all utility functions
- **Integration tests** for all API endpoints
- **Component tests** for interactive UI elements
- **E2E tests** for core user journeys (signup, post creation, publishing)

---

## Test Categories

### 1. Unit Tests

> Test individual functions in isolation

**Scope:** Utility functions, helpers, pure logic
**Location:** Co-located with source (e.g., `utils/sanitize.test.ts` next to `utils/sanitize.ts`)
**Framework:** Vitest

```typescript
// Example: packages/engine/src/lib/utils/slugify.test.ts
import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("converts spaces to hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("handles unicode characters", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });
});
```

### 2. Component Tests

> Test Svelte components in isolation

**Scope:** Interactive UI components, form elements, complex display logic
**Location:** Co-located with component
**Framework:** Vitest + @testing-library/svelte

```typescript
// Example: packages/engine/src/lib/ui/components/ui/GlassCard.test.ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import GlassCard from "./GlassCard.svelte";

describe("GlassCard", () => {
  it("renders with default variant", () => {
    const { container } = render(GlassCard);
    expect(container.querySelector(".glass-card")).toBeTruthy();
  });

  it("applies frosted variant styles", () => {
    const { container } = render(GlassCard, { props: { variant: "frosted" } });
    expect(container.querySelector(".glass-frosted")).toBeTruthy();
  });
});
```

### 3. Integration Tests

> Test API endpoints and service interactions

**Scope:** API routes, database operations, external service calls
**Location:** `tests/integration/` directory or co-located with routes
**Framework:** Vitest with mocked environment

```typescript
// Example: packages/engine/tests/integration/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mockEnv } from "../utils/setup";

describe("Auth API", () => {
  beforeEach(() => {
    mockEnv.DB._tables.clear();
  });

  it("creates session on successful login", async () => {
    const response = await fetch("/api/auth/callback?code=test");
    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toContain("session=");
  });
});
```

### 4. E2E Tests

> Test complete user journeys in a real browser

**Scope:** Critical paths (signup, post lifecycle, payment flow)
**Location:** `tests/e2e/` directory
**Framework:** Playwright

```typescript
// Example: tests/e2e/signup.spec.ts
import { test, expect } from "@playwright/test";

test("user can sign up and create first post", async ({ page }) => {
  await page.goto("/");
  await page.click("text=Get Started");

  // Complete signup flow
  await page.fill("[name=email]", "test@example.com");
  await page.click("text=Continue with Google");

  // Verify dashboard loaded
  await expect(page.locator("h1")).toContainText("Dashboard");

  // Create a post
  await page.click("text=New Post");
  await page.fill("[name=title]", "My First Post");
  await expect(page.locator(".post-editor")).toBeVisible();
});
```

---

## Directory Structure

```
packages/engine/
├── src/lib/
│   ├── utils/
│   │   ├── sanitize.ts
│   │   └── sanitize.test.ts      ← Unit test (co-located)
│   ├── server/
│   │   └── services/
│   │       ├── auth.ts
│   │       └── auth.test.ts      ← Service test (co-located)
│   └── ui/components/
│       └── ui/
│           ├── GlassCard.svelte
│           └── GlassCard.test.ts ← Component test (co-located)
├── tests/
│   ├── utils/
│   │   ├── setup.ts              ← Global test setup
│   │   └── test-helpers.ts       ← Shared test utilities
│   ├── integration/              ← Cross-service tests
│   │   ├── auth-flow.test.ts
│   │   ├── post-crud.test.ts
│   │   └── payment-flow.test.ts
│   ├── durable-objects/          ← DO-specific tests
│   │   ├── TenantDO.test.ts
│   │   └── PostMetaDO.test.ts
│   └── e2e/                      ← End-to-end tests (Playwright)
│       ├── signup.spec.ts
│       ├── post-lifecycle.spec.ts
│       └── admin-panel.spec.ts
└── vitest.config.ts
```

---

## Subagent Test Generation Pattern

> **Purpose:** Scale test coverage quickly using AI agents optimized for parallel work

### The Orchestration Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                          │
│                                                                 │
│  1. Identify files needing tests (coverage report + heuristics)│
│  2. Prioritize by criticality (auth > utils > UI)              │
│  3. Spawn subagents in parallel (up to 5 concurrent)           │
│  4. Collect results, run test suite                            │
│  5. Report coverage improvement                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  SUBAGENT A     │ │  SUBAGENT B     │ │  SUBAGENT C     │
│                 │ │                 │ │                 │
│ Target: auth.ts │ │ Target: kv.ts   │ │ Target: GlassX  │
│                 │ │                 │ │                 │
│ 1. Read file    │ │ 1. Read file    │ │ 1. Read file    │
│ 2. Analyze API  │ │ 2. Analyze API  │ │ 2. Analyze props│
│ 3. Write tests  │ │ 3. Write tests  │ │ 3. Write tests  │
│ 4. Validate     │ │ 4. Validate     │ │ 4. Validate     │
│ 5. Return       │ │ 5. Return       │ │ 5. Return       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Orchestrator Prompt Template

```markdown
# Test Generation Orchestrator

You are orchestrating test generation for Grove's v1 release.

## Current Coverage Report

[Insert coverage report here]

## Priority Order

1. **Critical Path** (auth, payments, security) - MUST have 90%+ coverage
2. **Core Features** (posts, media, admin) - Target 80%+ coverage
3. **UI Components** (Glass, forms, layout) - Target 70%+ coverage
4. **Utilities** (helpers, formatters) - Target 80%+ coverage

## Your Task

1. Review the coverage report
2. Identify the 5 highest-priority files lacking tests
3. For each file, spawn a subagent with this prompt:
   [Include subagent template below]
4. Wait for all subagents to complete
5. Run `pnpm test` to validate
6. Report results

## Subagent Spawn Pattern

Use the Task tool with subagent_type="general-purpose" for each file.
Run up to 5 in parallel to maximize throughput.
```

### Subagent Prompt Template

```markdown
# Test Writer Subagent

You are writing tests for a specific file in Grove's codebase.

## Target File

`{FILE_PATH}`

## Instructions

1. Read the file thoroughly
2. Identify all public exports (functions, classes, components)
3. For each export, write tests that cover:
   - Happy path (normal usage)
   - Edge cases (empty input, null, undefined)
   - Error conditions (invalid input, failures)
4. Follow these patterns:
   - Use `describe()` blocks to group related tests
   - Use clear test names: `it('should X when Y')`
   - Use AAA pattern: Arrange, Act, Assert
5. Write the test file to `{TEST_FILE_PATH}`
6. Validate the file compiles with `pnpm exec tsc --noEmit {TEST_FILE_PATH}`

## Output Format

Return a summary:

- File tested: {FILE_PATH}
- Tests written: N
- Test file: {TEST_FILE_PATH}
- Validation: PASS/FAIL

## Reference: Existing Test Patterns

[Include 1-2 example test files from the codebase for style reference]
```

### Running the Orchestration

```bash
# From Claude Code / agent session:
# 1. Generate coverage report
pnpm --filter @autumnsgrove/groveengine test -- --coverage

# 2. Run orchestrator (via Task tool)
# The orchestrator will spawn subagents automatically

# 3. Validate all tests pass
pnpm test

# 4. Commit results
git add -A && git commit -m "test: add comprehensive test coverage via subagent generation"
```

### Error Handling & Rollback Strategy

When things go wrong during test generation, follow these protocols:

**If a subagent fails to complete:**

1. Orchestrator collects the error and context
2. Retry once with a modified prompt (more specific instructions, simpler scope)
3. If retry fails, mark the file as "needs manual testing"
4. Log the failure and continue with other files
5. Report all failures in the final summary

**If generated tests fail validation:**

1. Subagent runs `pnpm test <test-file>` after writing
2. If tests fail, subagent analyzes the error and attempts to fix
3. Maximum 2 debug/fix attempts before escalating
4. If still failing after retries, the test file is:
   - Kept but marked with a `// FIXME: Test needs manual review` comment
   - Logged in the orchestrator's failure report

**If generated tests are flaky:**

1. Run the test 3 times to detect inconsistency
2. Flaky tests are flagged with `// FLAKY: Needs investigation` comment
3. Common causes to check:
   - Timing-dependent assertions
   - Global state pollution
   - Mock cleanup issues

**Rollback procedure:**

```bash
# If test generation causes widespread failures:
git checkout -- packages/engine/src/  # Revert test files
git clean -fd packages/engine/tests/  # Remove new test files

# Or selectively revert:
git checkout HEAD -- path/to/broken.test.ts
```

---

## Test Environment Setup

### Mock Environment (Already Implemented)

**Location:** `packages/engine/tests/utils/setup.ts`

Provides mocks for:

- `mockEnv.TENANTS` - Durable Object namespace
- `mockEnv.POST_META` - Post metadata DO
- `mockEnv.POST_CONTENT` - Post content DO
- `mockEnv.DB` - D1 database
- `mockEnv.CACHE_KV` - KV namespace

### Vitest Configuration

**Location:** `packages/engine/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./tests/utils/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

### Adding Test Dependencies (if missing)

```bash
pnpm --filter @autumnsgrove/groveengine add -D \
  @testing-library/svelte \
  @testing-library/jest-dom \
  @playwright/test
```

### Setting Up Playwright (E2E Tests)

Playwright requires browser binaries to be installed separately from the npm package.

**Initial Setup:**

```bash
# Install Playwright and browser binaries
pnpm --filter @autumnsgrove/groveengine add -D @playwright/test
pnpm exec playwright install

# Install only specific browsers (faster, smaller)
pnpm exec playwright install chromium  # Just Chrome
pnpm exec playwright install chromium firefox  # Chrome + Firefox
```

**Configuration:** Create `playwright.config.ts` in the engine package:

```typescript
// packages/engine/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Running E2E Tests:**

```bash
# Run all E2E tests
pnpm exec playwright test

# Run with UI mode (great for debugging)
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/e2e/signup.spec.ts

# Generate test report
pnpm exec playwright show-report
```

**Add to package.json scripts:**

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run tests with coverage
        run: pnpm --filter @autumnsgrove/groveengine test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./packages/engine/coverage/coverage-final.json
```

---

## Priority Files for V1

### Critical Path (MUST have tests)

| File                                    | Current | Target | Notes               |
| --------------------------------------- | ------- | ------ | ------------------- |
| `lib/server/services/auth.ts`           | Partial | 90%    | Core auth flow      |
| `lib/payments/lemonsqueezy/provider.ts` | None    | 90%    | Payment processing  |
| `lib/server/rate-limits/*.ts`           | ✅ Good | 95%    | Already well-tested |
| `lib/utils/sanitize.ts`                 | ✅ Good | 95%    | Security critical   |
| `lib/groveauth/*.ts`                    | ✅ Good | 90%    | OAuth flow          |

### Core Features (Should have tests)

| File                           | Current | Target | Notes                  |
| ------------------------------ | ------- | ------ | ---------------------- |
| `lib/utils/markdown.ts`        | None    | 80%    | Content rendering      |
| `lib/server/services/posts.ts` | None    | 80%    | CRUD operations        |
| `lib/server/services/media.ts` | None    | 80%    | Image handling         |
| `lib/utils/imageProcessor.ts`  | None    | 80%    | Client-side processing |

### UI Components (Nice to have)

| Component       | Current  | Target | Notes                |
| --------------- | -------- | ------ | -------------------- |
| `GlassCard`     | None     | 70%    | Core UI element      |
| `GlassButton`   | None     | 70%    | Interactive          |
| `Logo`          | ✅ Basic | 80%    | Season switching     |
| `ContentSearch` | ✅ Basic | 80%    | Search functionality |

---

## Success Metrics

**V1 Launch Gate:**

- [ ] All critical path files have 90%+ coverage
- [ ] All tests pass in CI
- [ ] No flaky tests (100% deterministic)
- [ ] E2E tests cover signup and post creation flows

**Post-V1 Goals:**

- [ ] 80% overall line coverage
- [ ] E2E tests for all user-facing features
- [ ] Performance benchmarks in CI
- [ ] Visual regression testing for UI components

---

## Commands Reference

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @autumnsgrove/groveengine test

# Run tests with coverage
pnpm --filter @autumnsgrove/groveengine test -- --coverage

# Run tests in watch mode
pnpm --filter @autumnsgrove/groveengine test -- --watch

# Run specific test file
pnpm --filter @autumnsgrove/groveengine test src/lib/utils/sanitize.test.ts

# Run E2E tests (when configured)
pnpm --filter @autumnsgrove/groveengine test:e2e
```

---

_Last Updated: January 2026_
