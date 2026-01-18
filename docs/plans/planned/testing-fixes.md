# Testing Fixes Plan

**Created**: January 18, 2026
**Priority**: P2 (Medium - Test coverage)
**Status**: Ready for Implementation
**Estimated Effort**: 4-6 hours

---

## Overview

Investigation of ~7 skipped tests across the engine package. All relate to Svelte 5 reactivity patterns not playing well with Vitest's testing utilities.

**Test Suite Status**:
- Total test files: ~178
- Total test cases: ~3,000+
- Skipped tests: 7

---

## Skipped Tests Analysis

### File 1: ContentSearch.test.ts

**Location**: `packages/engine/src/lib/ui/components/forms/ContentSearch.test.ts`

#### Skipped: Screen Reader Announcements (2 tests)

```typescript
// Lines 157-172, 174-189
it.skip("should announce results to screen readers", async () => {
  // TODO: Svelte 5 reactivity + waitFor timing issue with mocked stores
  // ...
});

it.skip("should use correct plural for multiple results", async () => {
  // TODO: Svelte 5 reactivity + waitFor timing issue with mocked stores
  // ...
});
```

**Root Cause**: Svelte 5's `$effect()` runs asynchronously and doesn't integrate well with `waitFor()` from Testing Library when mocked stores are involved.

**Why It Fails**:
1. Test sets `searchQuery` prop
2. Component uses `$effect()` to compute filtered results
3. `$effect()` schedules update in microtask
4. `waitFor()` doesn't catch the timing correctly with mocked `$app/stores`

#### Skipped: Debouncing Tests (3 tests in describe block)

```typescript
// Lines 205-295
describe.skip("Debouncing", () => {
  // TODO: Fake timers don't work well with Svelte 5's $effect() reactivity
  it("should debounce search input by default delay (250ms)", async () => {});
  it("should respect custom debounce delay", async () => {});
  it("should clear previous timer on rapid input changes", async () => {});
});
```

**Root Cause**: Vitest's `vi.useFakeTimers()` doesn't properly intercept the timing of Svelte 5's reactive system.

**Why It Fails**:
1. Test uses `vi.useFakeTimers()`
2. Component uses `setTimeout` for debouncing
3. `$effect()` and `$derived()` use their own microtask scheduling
4. `vi.advanceTimersByTime()` advances timeouts but not microtasks
5. Reactive updates don't propagate as expected

### File 2: sanitize.test.ts

**Location**: `packages/engine/src/lib/utils/sanitize.test.ts`

#### Skipped: Browser-Only DOM Tests (2 tests)

```typescript
it.skip('handles unclosed tags (browser-only)', () => {
  // Requires actual DOMPurify which needs browser DOM
});

it.skip('handles tags split across lines (browser-only)', () => {
  // Requires actual DOMPurify which needs browser DOM
});
```

**Root Cause**: These tests require actual DOMPurify running in a browser environment. In Node/Vitest, the server-safe regex fallback is used instead.

**Why It's Skipped**:
- DOMPurify needs `document`, `window`, etc.
- Vitest runs in Node by default
- Server-safe fallback has different behavior for edge cases

---

## Fix Strategies

### Strategy A: Fix Svelte 5 Timing Issues

#### Approach 1: Use `tick()` Before Assertions

```typescript
import { tick } from 'svelte';

it("should announce results to screen readers", async () => {
  render(ContentSearch, { props: { ... } });

  // Wait for Svelte's reactive system to settle
  await tick();
  await tick();  // Sometimes need multiple ticks

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent('Found 1 result');
});
```

#### Approach 2: Use `flushSync` for Immediate Updates

```typescript
import { flushSync } from 'svelte';

it("should debounce correctly", async () => {
  vi.useFakeTimers();

  render(ContentSearch, { props: { ... } });

  await fireEvent.input(input, { target: { value: 'test' } });

  // Force synchronous update
  flushSync();

  vi.advanceTimersByTime(250);

  // Another flush after timer advance
  flushSync();

  expect(onSearchChange).toHaveBeenCalled();
});
```

#### Approach 3: Use Real Timers with Short Delays

```typescript
it("should debounce correctly", async () => {
  // Use real timers but with short debounce
  render(ContentSearch, {
    props: {
      ...props,
      debounceDelay: 10,  // Short for testing
    }
  });

  await fireEvent.input(input, { target: { value: 'test' } });

  // Wait actual time + buffer
  await new Promise(r => setTimeout(r, 50));

  expect(onSearchChange).toHaveBeenCalled();
});
```

### Strategy B: Fix Browser-Only Tests

#### Approach 1: Use `happy-dom` Environment

```typescript
// In test file or vitest.config.ts
/**
 * @vitest-environment happy-dom
 */

it('handles unclosed tags', () => {
  // Now has DOM APIs available
  const result = sanitizeHTML('<p>unclosed');
  expect(result).toBe('<p>unclosed</p>');
});
```

#### Approach 2: Conditional Skip Based on Environment

```typescript
const hasDOMPurify = typeof DOMPurify !== 'undefined';

it.skipIf(!hasDOMPurify)('handles unclosed tags (browser-only)', () => {
  // Only runs in browser-like environment
});
```

#### Approach 3: Separate E2E Tests

Move browser-specific sanitization tests to Playwright:

```typescript
// tests/e2e/sanitize.spec.ts
test('sanitizes unclosed tags in browser', async ({ page }) => {
  // Test in actual browser context
});
```

---

## Implementation Tasks

### Task 1: Fix ContentSearch Timing Tests

**Estimated**: 2-3 hours

1. Try `tick()` approach first
2. If fails, try `flushSync()` approach
3. If still fails, use short real timers
4. Document working pattern for future tests

**Test file**: `packages/engine/src/lib/ui/components/forms/ContentSearch.test.ts`

### Task 2: Fix Sanitize Browser Tests

**Estimated**: 1-2 hours

1. Add `@vitest-environment happy-dom` to test file
2. Verify DOMPurify loads correctly
3. Unskip and verify tests pass
4. If happy-dom insufficient, move to Playwright E2E

**Test file**: `packages/engine/src/lib/utils/sanitize.test.ts`

### Task 3: Document Testing Patterns

**Estimated**: 1 hour

Add to `docs/testing/SVELTE5-TESTING-PATTERNS.md`:

```markdown
# Testing Svelte 5 Components

## Reactivity Timing

Svelte 5's `$effect()` and `$derived()` run asynchronously.
Use these patterns for reliable tests:

### Pattern 1: Multiple ticks
```typescript
await tick();
await tick();
```

### Pattern 2: flushSync
```typescript
import { flushSync } from 'svelte';
flushSync();
```

## Fake Timers

Vitest fake timers don't fully integrate with Svelte 5.
Prefer real timers with short delays for timing tests.
```

---

## Skipped Tests Summary

| File | Test | Skip Reason | Fix Strategy |
|------|------|-------------|--------------|
| ContentSearch.test.ts | announce results to screen readers | Svelte 5 reactivity + waitFor | tick() or flushSync |
| ContentSearch.test.ts | correct plural for results | Svelte 5 reactivity + waitFor | tick() or flushSync |
| ContentSearch.test.ts | Debouncing (3 tests) | Fake timers + $effect() | Real timers with short delay |
| sanitize.test.ts | unclosed tags | Browser-only DOMPurify | happy-dom environment |
| sanitize.test.ts | tags split across lines | Browser-only DOMPurify | happy-dom environment |

---

## Acceptance Criteria

- [ ] All 7 skipped tests unskipped and passing
- [ ] No new test instability introduced
- [ ] Testing patterns documented for future reference
- [ ] CI passes with unskipped tests

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/engine/src/lib/ui/components/forms/ContentSearch.test.ts` | Fix timing, unskip tests |
| `packages/engine/src/lib/utils/sanitize.test.ts` | Add happy-dom, unskip tests |
| `docs/testing/SVELTE5-TESTING-PATTERNS.md` | New documentation |
| `packages/engine/vitest.config.ts` | Potentially add environment config |

---

## Related Resources

- Svelte 5 testing discussion: https://github.com/sveltejs/svelte/discussions/
- Vitest fake timers: https://vitest.dev/guide/mocking.html#timers
- Testing Library waitFor: https://testing-library.com/docs/dom-testing-library/api-async/
- happy-dom: https://github.com/nicolo-ribaudo/happy-dom
