---
name: beaver-build
description: Build robust test dams that catch bugs before they flood production. The beaver surveys the stream, gathers materials wisely, builds with care, reinforces thoroughly, and ships with confidence. Use when writing tests, deciding what to test, or reinforcing code.
---

# Beaver Build 🦫

```
SURVEY → GATHER → BUILD → REINFORCE → FORTIFY
```

Each phase loads one reference. Load it when the phase calls for it, not all at once.

## Reference Routing Table

| Phase     | Reference                            | Load when                                     |
| --------- | ------------------------------------ | --------------------------------------------- |
| SURVEY    | `references/testing-patterns.md`      | Always — the trophy, what to test, what to skip |
| SURVEY    | `references/grove-test-infrastructure.md` | Always — what utilities already exist     |
| GATHER    | `references/testing-patterns.md`      | Deciding skip vs. test thoroughly              |
| BUILD     | `scripts/scaffold-test.sh`            | Generating test boilerplate                    |
| BUILD     | `references/test-templates.md`        | Writing the actual tests                       |
| BUILD     | `references/grove-test-infrastructure.md` | Factory, mock and helper import paths     |
| REINFORCE | `references/testing-patterns.md`      | Mocking strategy, bug-to-test pipeline         |
| FORTIFY   | `references/test-templates.md`        | Self-review checklist                          |

---

## What makes a test worth writing

> _"Write tests. Not too many. Mostly integration."_ — Guillermo Rauch

> _"The more your tests resemble the way your software is used, the more confidence they can give you."_ — Kent C. Dodds

Ask: **does this test fail when the feature breaks?** If it only fails during refactors, it's testing implementation details.

| Property               | Means                                      |
| ---------------------- | ------------------------------------------ |
| **Behaviour-sensitive** | Fails when real functionality breaks       |
| **Structure-immune**    | Survives safe refactors                    |
| **Deterministic**       | Same result every run, no flakes           |
| **Fast**                | Seconds of feedback, not minutes           |
| **Clear diagnosis**     | A failure says exactly what broke          |
| **Cheap to write**      | Effort proportional to complexity          |

The confidence test, before writing anything:

1. Would I notice if this broke in production? If no, skip it.
2. Would the test fail if the feature broke? If no, don't write it.
3. Does it resemble how users touch the feature? If no, reconsider.

---

## Phase 1: SURVEY

Understand the flow before placing a twig.

- What does the feature DO for users — not how it works
- What breaks if it fails (critical paths)
- What confidence level is needed — prototype or production
- The trophy: mostly integration, some unit, few E2E, static analysis always on

`references/grove-test-infrastructure.md` first — factories, mocks and helpers probably already exist. Don't reinvent them.

**Output:** what needs testing, at which layer.

---

## Phase 2: GATHER

Not every twig belongs in the dam. Sort candidates:

- **Skip:** trivial getters, framework behaviour, implementation details, one-off scripts, volatile prototypes
- **Test lightly:** configuration (smoke test), third-party integrations (mock the boundary), visual design (snapshots)
- **Test thoroughly:** business logic, user-facing flows, edge cases, bug fixes

`references/testing-patterns.md` has the full tables and guiding questions.

**Output:** test cases organised by layer.

---

## Phase 3: BUILD

Arrange–Act–Assert, and:

- The Act is one line. If it isn't, the test does too much.
- Test behaviour, not implementation.
- Accessible queries — `getByRole`, `getByLabelText`, `getByText` — never `getByTestId` first.
- Name the test so it says what breaks: "should reject registration with invalid email".
- One test, one reason to fail.

`scripts/scaffold-test.sh <type> <source-file>` generates boilerplate for `service`, `api`, `component` and `worker`, using the right imports and factories. `references/test-templates.md` has the SvelteKit templates; `references/grove-test-infrastructure.md` has the exact factory and mock import paths (`createMockRequestEvent`, `createAuthenticatedTenantEvent`, `createMockD1`, `createMockKV`, `createMockR2`).

**Output:** working tests following AAA.

---

## Phase 4: REINFORCE

- Mock only at external boundaries. If you're mocking your own code, reconsider.
- Every bug becomes a regression test: reproduce → failing test → fix → green → it can't come back.
- Tests live beside the code they test (`login.test.ts` next to `login.ts`).
- API tests verify the Signpost shape: `error_code`, `error`, `error_description`.

### Trust boundaries

Every boundary needs a valid and an invalid case:

| Boundary             | Test                                                    |
| -------------------- | ------------------------------------------------------- |
| Form actions         | Missing fields, wrong types, edge values → `parseFormData()` returns structured errors, never crashes |
| KV reads             | Corrupted or stale JSON → `safeJsonParse()` falls back   |
| Cache reads          | Unexpected shapes → `createTypedCacheReader()` falls back |
| Catch blocks         | Redirects and HTTP errors → `isRedirect()` / `isHttpError()` route correctly |

All from `@autumnsgrove/lattice/server`. `references/testing-patterns.md` has the mocking guide and bug-to-test pipeline.

**Output:** hardened tests with correct boundaries.

---

## Phase 5: FORTIFY

**MANDATORY before shipping:**

```bash
pnpm install
gw ci --affected --fail-fast --diagnose
```

A failure means a leak: read the diagnostics, patch it, re-run. Coverage (optional, after CI): `npx vitest run --coverage`.

Run the self-review checklist in `references/test-templates.md` before calling the tests done.

**Output:** clean suite ready for CI.

---

## When tests break

**Good breaks:** the feature changed, a bug was fixed, a requirement moved. Update the test.

**Bad breaks:** you refactored internals, renamed a CSS class, reordered code. The test was coupled to structure. Rewrite it with accessible queries and no ordering assumptions.

If refactoring regularly breaks your tests, they're testing the wrong thing.

---

## Anti-patterns

The beaver does NOT:

- chase 100% coverage theatre — coverage with bad tests is worse than moderate coverage with good ones
- test implementation details (internal state, private methods, CSS classes)
- mock everything, which removes the confidence you were buying
- write tests that break on safe refactors
- use snapshots for volatile UI
- build the ice cream cone (many E2E, few integration, few unit)

---

## Quick decision guide

| Situation           | Action                                                       |
| ------------------- | ------------------------------------------------------------ |
| New feature         | Integration tests for user-facing behaviour                  |
| Bug fix             | Test that reproduces it first, then fix                      |
| Refactoring         | Run existing tests; breaking on safe changes means bad tests |
| "Need more coverage"| Cover behaviour, not lines                                   |
| Pure function       | Unit test                                                    |
| API endpoint        | Integration test, external services mocked                   |
| UI component        | Component test with Testing Library                          |
| Critical user flow  | E2E                                                          |

---

## Example build

> "Add tests for the login form"

1. **SURVEY** — auth is a critical path; integration is where the confidence is.
2. **GATHER** — invalid email, API error, success redirect, loading state. Skip internal state.
3. **BUILD** — `should reject registration with invalid email`, `should show loading indicator while logging in`, `should redirect to dashboard after successful login`.
4. **REINFORCE** — regression test for the previous password-reset bug; mock only the external API.
5. **FORTIFY** — CI green, 78% coverage is plenty, ship.

---

_Good tests let you ship with confidence. That's the whole point._ 🦫
