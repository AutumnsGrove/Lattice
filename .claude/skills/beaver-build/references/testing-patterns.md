# Beaver Build — Testing Patterns Reference

## The Testing Trophy

```
                    ╭─────────╮
                    │   E2E   │  ← Few: critical user journeys only
                    ╰────┬────╯
               ╭─────────┴─────────╮
               │   Integration     │  ← Many: this is where confidence lives
               ╰─────────┬─────────╯
                  ╭──────┴──────╮
                  │    Unit     │  ← Some: pure functions, algorithms
                  ╰──────┬──────╯
              ╭──────────┴──────────╮
              │   Static Analysis   │  ← Always on (TypeScript, ESLint)
              ╰─────────────────────╯
```

## What Each Layer Does

**Static Analysis (TypeScript, ESLint):**
- Catches typos, type errors, obvious mistakes
- Zero runtime cost, always running
- First line of defense

**Unit Tests:**
- Pure functions, algorithms, utilities
- Fast, isolated, easy to debug
- Don't mock everything — test real behavior where practical

**Integration Tests (THE SWEET SPOT):**
- Multiple units working together
- Tests behavior users actually experience
- Less brittle than unit tests, faster than E2E
- Most of your tests should live here

**E2E Tests (Playwright):**
- Critical user journeys only: login, checkout, core flows
- Expensive to write and maintain
- Reserve for flows where failure = business impact

## What to Test vs. Skip

**Skip testing:**
| What | Why |
|------|-----|
| Trivial code | Getters, setters, data models with no logic |
| Framework behavior | Trust that SvelteKit routing works |
| Implementation details | Internal state, private methods, CSS classes |
| One-off scripts | Maintenance cost exceeds value |
| Volatile prototypes | Requirements unclear, code will change |

**Test thoroughly:**
| What | Why |
|------|-----|
| Business logic | Core value of the application |
| User-facing flows | What users actually experience |
| Edge cases | Error states, empty states, boundaries |
| Bug fixes | Every bug becomes a test to prevent regression |

## The Guiding Questions

1. **Would I notice if this broke in production?** If yes, test it.
2. **Does this test fail when the feature breaks?** If no, don't write it.
3. **Does this test resemble how users interact with the feature?** If no, reconsider.

> _"The more your tests resemble the way your software is used, the more confidence they can give you."_ — Kent C. Dodds

## Arrange-Act-Assert (AAA)

```typescript
it("should reject invalid email during registration", async () => {
  // Arrange: Set up the scenario
  const invalidEmail = "not-an-email";

  // Act: Do the thing (ONE line)
  const result = await registerUser({
    email: invalidEmail,
    password: "valid123",
  });

  // Assert: Check the outcome
  expect(result.success).toBe(false);
  expect(result.error).toContain("email");
});
```

The Act section should be one line. If it's not, the test is probably doing too much.

## Test User Behavior, Not Implementation

```typescript
// Bad: Testing implementation detail
it("should set isLoading state to true", async () => {
  const { component } = render(LoginForm);
  await fireEvent.click(getByRole("button"));
  expect(component.isLoading).toBe(true); // Tests internal state!
});

// Good: Testing user experience
it("should show loading indicator while logging in", async () => {
  render(LoginForm);
  await fireEvent.click(getByRole("button", { name: /sign in/i }));
  expect(getByRole("progressbar")).toBeInTheDocument();
});
```

## Accessible Queries (Priority Order)

```typescript
getByRole("button", { name: /submit/i }); // How screen readers see it — BEST
getByLabelText("Email");                   // Form fields
getByText("Welcome back");                // Visible text
getByTestId("login-form");               // Last resort only
```

## Good Test Names

**Good:**
- `should reject registration with invalid email`
- `should show error message when API fails`
- `should preserve draft when navigating away`

**Bad:**
- `test email validation` (what about it?)
- `handleSubmit works` (what does "works" mean?)
- `test case 1` (no)

## Test One Thing

Each test should have **one reason to fail**:

```typescript
// Bad: tests multiple things
it('should handle registration', async () => {
  // Tests validation, API call, redirect, AND email sending
});

// Good: focused tests
it('should reject invalid email format', ...);
it('should call API with valid data', ...);
it('should redirect after successful registration', ...);
it('should send welcome email after registration', ...);
```

## Minimal Mocking

```typescript
// Over-mocked: false confidence
vi.mock("./api");
vi.mock("./validation");
vi.mock("./utils");
// You're testing... nothing real

// Better: mock only at boundaries
vi.mock("./external-api"); // Mock the network, not your code
// Let validation, utils, etc. run for real
```

**Rule of thumb:** If you're mocking something you wrote, reconsider.

## Bug → Test Pipeline

Every production bug should become a test:

1. **Bug reported** — User can't check out with certain items
2. **Reproduce locally** — Find the exact conditions
3. **Write failing test** — Captures the bug's conditions
4. **Fix the bug** — Test now passes
5. **Test prevents regression** — Bug can never return

## What Makes a Test Valuable (Kent Beck)

| Property | What It Means |
|----------|---------------|
| **Behavior-sensitive** | Fails when actual functionality breaks |
| **Structure-immune** | Doesn't break when you refactor safely |
| **Deterministic** | Same result every time, no flakiness |
| **Fast** | Gives feedback in seconds, not minutes |
| **Clear diagnosis** | When it fails, you know exactly what broke |
| **Cheap to write** | Effort proportional to code complexity |

## Signpost Error Code Coverage

When testing API routes, verify the error format:

```typescript
const response = await fetch("/api/resource", { method: "POST", body: "{}" });
const data = await response.json();
expect(data.error_code).toMatch(/^GROVE-(API|SITE|ARBOR)-\d{3}$/);
expect(data.error).toBeDefined();
expect(data.error_description).toBeDefined();
```

Error handling checklist for tests:
- [ ] API routes return `buildErrorJson()` format (has `error_code`, `error`, `error_description`)
- [ ] Error messages match catalog `userMessage` (no ad-hoc strings)
- [ ] Client shows `toast.success()` / `toast.error()` for user actions
- [ ] Auth errors don't reveal user existence (same response for valid/invalid)

## The Ice Cream Cone Anti-Pattern (AVOID)

```
        ╭───────────────────────────╮
        │      Many E2E tests       │  ← Slow, brittle, expensive
        ╰───────────┬───────────────╯
              ╭─────┴─────╮
              │ Few int.  │
              ╰─────┬─────╯
                ╭───┴───╮
                │ Few   │
                │ unit  │
                ╰───────╯
```

This is backwards. Integration tests give the best ROI.

## When Tests Break

**Good breaks (expected):**
- Feature changed — test caught that behavior shifted. Update the test.
- Bug fixed — old test was wrong. Fix it.
- Requirement changed — test reflects old requirement. Update it.

**Bad breaks (symptoms of poor tests):**
- Refactored internal code — test was coupled to implementation. Rewrite it.
- Changed CSS class — test was querying implementation details. Use accessible queries.
- Reordered code — test depended on execution order. Make it order-independent.

**If refactoring frequently breaks tests, your tests are testing the wrong things.**
