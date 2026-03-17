# Verified Development in Grove

## Research Origin: Leanstral and Formal Verification Patterns

**Date:** March 17, 2026
**Source:** [Leanstral: Open-Source foundation for trustworthy vibe-coding](https://mistral.ai/news/leanstral) — Mistral AI, March 16, 2026
**Status:** Research artifact — foundational development philosophy for Grove

-----

## What Is This Document?

This document captures research from Mistral's Leanstral release and distills it into a practical development philosophy for Grove. Leanstral is a formal proof agent for Lean 4 — a language where code can mathematically prove its own correctness. While Lean 4 doesn't apply directly to Grove's TypeScript/Cloudflare stack, the **patterns** behind it are powerful and adaptable.

The core insight: **cheap AI attempts + an incorruptible verifier = reliable output.** The AI doesn't need to be perfect if something catches every mistake before it lands. This document defines how Grove implements that pattern with its own tools.

-----

## Table of Contents

- [Background: What Leanstral Taught Us](#background-what-leanstral-taught-us)
- [The Verification Philosophy](#the-verification-philosophy)
- [The Four Layers](#the-four-layers)
- [Integration with Existing Grove Systems](#integration-with-existing-grove-systems)
- [The Verified Development Flow](#the-verified-development-flow)
- [Priority Targets](#priority-targets)
- [Agent Instructions](#agent-instructions)
- [Future Directions](#future-directions)
- [Reference: Leanstral Technical Summary](#reference-leanstral-technical-summary)

-----

## Background: What Leanstral Taught Us

### Formal Verification in Brief

In normal development, we test code by checking examples: "does `add(2, 3)` return `5`?" Tests check specific inputs. Formal verification inverts this — you write a **specification** (what the code must do for ALL inputs) and a **proof** that the implementation satisfies the spec. A proof assistant (like Lean 4) then mechanically checks that proof. If it compiles, the code is correct. Not "probably correct." Correct.

### Why Leanstral Matters

Leanstral (120B parameters, 6B active via mixture-of-experts) is the first open-source AI agent trained specifically to write formal proofs in Lean 4 repositories. Its key innovation isn't the model itself — it's the **workflow pattern**:

1. The AI writes a proof attempt (cheap, fast, potentially wrong)
1. Lean 4 checks the proof (incorruptible — either it passes or it doesn't)
1. If it fails, the AI tries again in parallel (pass@N strategy)
1. Any single success is a guaranteed-correct proof

This works because **Lean is a perfect verifier.** There's no ambiguity. The AI can be wrong 15 out of 16 times, and the one correct attempt is provably correct. At $18 per attempt vs. $1,650 for a single Claude Opus run on the same benchmark, brute-force with verification crushes careful-but-unverified.

### The Transferable Pattern

Grove doesn't use Lean 4. But the pattern — **cheap generation + strict automated verification** — translates directly. The question becomes: what's Grove's "Lean"? What can serve as the incorruptible verifier?

The answer: a stack of verification layers, each catching different classes of bugs, that together approach the same guarantee.

-----

## The Verification Philosophy

> **The AI proposes. The system disposes.**

This is the governing principle. No code from any agent — Claude, Codestral, a future Grove-native agent — should be trusted on its own. Every implementation must pass through verification that is:

- **Automated** — no human eyeballing required
- **Strict** — failures block, not warn
- **Layered** — different layers catch different bug classes
- **Pre-defined** — the verification exists BEFORE the implementation

This is an evolution of TDD (test-driven development). In TDD, you write tests first, expect them to fail, then implement until they pass. Verified development extends this: you write **types, schemas, validators, AND property tests first**, creating a multi-layered verification surface. Then the implementation — whether written by a human or an AI agent — must satisfy all layers simultaneously.

-----

## The Four Layers

### Layer 1: Branded Types (Compile-Time Invariants)

TypeScript types disappear at runtime, but at development time they are powerful enforcement tools. Branded types encode **semantic meaning** into the type system so that the compiler itself prevents invalid state transitions.

**The problem with weak types:**

```typescript
// This tells you nothing about validity
function getConfig(subdomain: string): TenantConfig
// Any string passes — empty, malicious, nonexistent
```

**Branded types as enforcement:**

```typescript
// A branded type is a string with a phantom tag
type ValidatedSubdomain = string & { readonly __brand: 'ValidatedSubdomain' }
type SanitizedInput = string & { readonly __brand: 'SanitizedInput' }
type EncryptedPayload = string & { readonly __brand: 'EncryptedPayload' }
type SessionToken = string & { readonly __brand: 'SessionToken' }

// Only accepts pre-validated subdomains — compile error otherwise
function getConfig(subdomain: ValidatedSubdomain): TenantConfig

// The ONLY way to create a ValidatedSubdomain is through a validator
function validateSubdomain(raw: string): ValidatedSubdomain | null {
  if (!raw || raw.length > 63 || !/^[a-z0-9-]+$/.test(raw)) return null
  // ... check existence in D1 ...
  return raw as ValidatedSubdomain
}
```

Now it's a **compile error** to pass an unvalidated string to `getConfig`. The type system enforces that validation happened. This is the closest TypeScript gets to Lean-style type-level guarantees.

**Where to apply branded types in Grove:**

- `ValidatedSubdomain` — any tenant identifier that has been confirmed to exist
- `SessionToken` — a token that has passed Heartwood validation
- `SanitizedInput` — user input that has passed Thorn content screening
- `EncryptedPayload` — data that has been envelope-encrypted via the KEK/DEK system
- `VerifiedTenantId` — a tenant ID confirmed against D1
- `SafeHtml` — HTML content that has been sanitized for XSS

**Rule:** Any value that crosses a trust boundary must have a branded type. If a function accepts `string` where it should accept `ValidatedSubdomain`, that's a verification gap.

### Layer 2: Runtime Validators at Every Boundary (Rootwork Extension)

Rootwork already handles aggressive type checking at Grove's boundaries. This layer formalizes and extends that pattern using schema validators (Zod, Valibot, or equivalent) at **every point where data enters or exits a trust zone.**

**Trust boundaries in Grove's architecture:**

| Boundary                     | Direction | What to Validate                                |
| ---------------------------- | --------- | ----------------------------------------------- |
| HTTP request → Worker        | Inbound   | Request body, query params, headers             |
| Worker → D1                  | Outbound  | Query parameters, data shapes                   |
| D1 → Worker                  | Inbound   | Query results (D1 can return unexpected shapes) |
| Worker → KV                  | Both      | Keys, value shapes                              |
| Worker → Durable Object      | Both      | Message payloads                                |
| DO → DO (Loom pattern)       | Both      | Coordination messages                           |
| Worker → R2                  | Outbound  | Object metadata, content types                  |
| External API → Worker        | Inbound   | Third-party response shapes                     |
| Lumen AI response → Consumer | Inbound   | AI output structure and content                 |

**Schema definition pattern:**

```typescript
import { z } from 'zod'

// Define the schema ONCE, derive the type FROM the schema
const TenantConfigSchema = z.object({
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'seedling', 'canopy']),
  encryptedDek: z.string().base64(),
  createdAt: z.string().datetime(),
  active: z.boolean(),
})

// The TypeScript type is derived, not manually written
type TenantConfig = z.infer<typeof TenantConfigSchema>

// Validation at the boundary — fails loud, never silent
function parseTenantConfig(raw: unknown): TenantConfig {
  return TenantConfigSchema.parse(raw) // Throws ZodError on invalid data
}
```

**Rule:** Data is guilty until proven innocent. Every boundary crossing gets a schema parse. If data arrives without validation, it doesn't exist in the system.

### Layer 3: Property-Based Testing (The Specification Layer)

This is the closest analog to Lean's formal specifications. Instead of writing individual test cases ("does encrypt('hello') return the expected ciphertext?"), you define **properties that must hold for ALL possible inputs**, and a library generates hundreds of random inputs to try to break them.

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (TypeScript-native, works with Vitest/Jest)

**Example properties for Grove:**

```typescript
import fc from 'fast-check'

// PROPERTY: Encryption round-trip — encrypt then decrypt always returns original
fc.assert(
  fc.property(
    fc.string({ minLength: 0, maxLength: 10000 }),
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    (plaintext, key) => {
      const encrypted = encrypt(key, plaintext)
      const decrypted = decrypt(key, encrypted)
      return decrypted === plaintext
    }
  )
)

// PROPERTY: Session validation is idempotent — validating twice gives same result
fc.assert(
  fc.property(
    arbitrarySessionToken(),
    (token) => {
      const first = validateSession(token)
      const second = validateSession(token)
      return deepEqual(first, second)
    }
  )
)

// PROPERTY: Subdomain validation rejects all invalid formats
fc.assert(
  fc.property(
    fc.string().filter(s => s.length > 63 || /[^a-z0-9-]/.test(s) || s.length === 0),
    (invalidSubdomain) => {
      return validateSubdomain(invalidSubdomain) === null
    }
  )
)

// PROPERTY: Rate limiter never allows more than N requests in window
fc.assert(
  fc.property(
    fc.array(fc.date(), { minLength: 1, maxLength: 200 }),
    fc.integer({ min: 1, max: 100 }),
    (timestamps, limit) => {
      const limiter = createRateLimiter({ limit, windowMs: 60000 })
      let allowed = 0
      for (const ts of timestamps.sort()) {
        if (limiter.check(ts)) allowed++
      }
      // In any 60-second window, allowed count must not exceed limit
      return allowed <= limit
    }
  )
)
```

**What makes good properties:**

- **Round-trip properties:** encode → decode, serialize → deserialize, encrypt → decrypt always recovers the original
- **Invariant properties:** "this value is always positive," "this array is always sorted," "this token always has exactly 3 parts"
- **Idempotency properties:** doing something twice gives the same result as doing it once
- **Commutativity/associativity:** order shouldn't matter when it shouldn't matter
- **No-crash properties:** the function never throws for any valid input shape
- **Boundary rejection:** invalid inputs are always rejected, never silently accepted

**Rule:** Every critical function should have at least one property-based test. Properties are the specification — they define what "correct" means before the implementation exists.

### Layer 4: The Agent Verification Loop

This layer ties the other three together into a workflow for AI-assisted development that mirrors Leanstral's pass@N pattern.

**The loop:**

```
┌─────────────────────────────────────────────────┐
│  1. DEFINE — Types, schemas, properties FIRST   │
│     (This is the specification. The "Lean.")     │
├─────────────────────────────────────────────────┤
│  2. GENERATE — AI writes the implementation     │
│     (Cheap, fast, potentially wrong.)            │
├─────────────────────────────────────────────────┤
│  3. VERIFY — Run the full verification stack    │
│     TypeScript compiler (branded types)          │
│     Schema validation tests (Zod/Valibot)        │
│     Property-based tests (fast-check)            │
│     Existing unit/integration tests              │
│     Glimpse visual verification (if UI)          │
├─────────────────────────────────────────────────┤
│  4. PASS? → Ship it. The verifier confirmed.    │
│     FAIL? → Feed errors back to AI, retry.      │
│     (This is the pass@N pattern.)                │
└─────────────────────────────────────────────────┘
```

The critical insight: **the human's job is defining the specification (step 1), not reviewing the implementation (step 2).** If the specification is strong enough and the verifier is strict enough, a passing implementation is correct by construction.

-----

## Integration with Existing Grove Systems

### Rootwork

Rootwork already handles boundary validation — Layer 2 of this stack. This document extends Rootwork's philosophy deeper into the system:

- Rootwork validates at the **edge** (HTTP boundaries)
- This stack adds validation at **internal boundaries** too (Worker ↔ D1, Worker ↔ DO, DO ↔ DO)
- Branded types (Layer 1) extend Rootwork's philosophy into compile time — catching errors before they even reach runtime validation

Think of it as: Rootwork is the front gate. Branded types are locked doors inside the building. Property tests are the security cameras.

### Glimpse

Glimpse provides visual self-verification for agents working on UI — screenshots, DOM analysis, ARIA labels, accessibility checks. In this stack, Glimpse becomes **Layer 5 for UI work**: after the code compiles, after schemas validate, after property tests pass, Glimpse confirms the visual output matches intent.

Glimpse is especially powerful because it catches a class of bugs the other layers can't: "the code is technically correct but the UI is broken/ugly/inaccessible."

### Frog Cycle

Frog Cycle already implements TDD-style red-green-refactor. Verified development is Frog Cycle with sharper teeth:

- **Red phase (Frog Cycle):** Write failing tests → **Verified Development:** Write branded types, schemas, AND property-based tests that define the full specification
- **Green phase (Frog Cycle):** Write implementation to pass → **Verified Development:** Let the agent generate implementation, run full verification stack, retry on failure
- **Refactor phase (Frog Cycle):** Clean up → **Verified Development:** Same, but the verification stack catches regressions automatically during refactor

Frog Cycle and Verified Development are complementary. Frog Cycle is the rhythm. Verified Development is the rigor of what gets written in the red phase.

### Skills and Agent Workflows

Any skill that involves code generation should reference this document's principles. When an agent is working in Grove:

1. **Before writing implementation code**, check: do branded types exist for the values this function handles? Do schemas exist for the boundaries it crosses? Do property tests exist for the invariants it must maintain?
1. **If they don't exist, write them first.** The specification comes before the implementation. Always.
1. **After writing implementation**, run the full stack. Don't just check "does it work for my one test case." Run property tests. Let fast-check throw 100 random inputs at it.

-----

## The Verified Development Flow

### Step-by-Step for Any New Feature or Modification

**Phase 1: Specification (write this BEFORE touching implementation)**

```
□ Define or update branded types for all values in play
□ Define or update Zod/Valibot schemas for all boundary data
□ Write property-based tests expressing what "correct" means
□ Write any additional unit tests for specific edge cases
□ Confirm all new tests FAIL (nothing implements them yet)
```

**Phase 2: Implementation**

```
□ Write the implementation (or let an AI agent generate it)
□ Run TypeScript compiler — all branded type checks must pass
□ Run schema validation tests — all boundary data must parse
□ Run property-based tests — all invariants must hold
□ Run existing test suite — no regressions
□ If UI: run Glimpse verification — visual output must match intent
```

**Phase 3: Verification Gate**

```
□ ALL checks pass? → Ready for review/merge
□ ANY check fails? → Fix or regenerate, return to Phase 2
□ Do NOT skip failed checks. Do NOT weaken schemas to pass.
   The verifier is incorruptible. That's the point.
```

-----

## Priority Targets

These Grove components should adopt verified development first, ranked by the severity of bugs in each:

| Priority     | Component                          | Why                                      | Key Properties to Verify                                                   |
| ------------ | ---------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| 🔴 Critical  | **Heartwood** (auth)               | Auth bugs = security incidents           | Session round-trip, token validation idempotency, tenant isolation          |
| 🔴 Critical  | **Envelope encryption** (KEK/DEK)  | Crypto bugs = data exposure              | Encrypt/decrypt round-trip, key isolation per tenant, no plaintext leakage  |
| 🔴 Critical  | **Warden** (API gateway)           | Gateway bugs = unauthorized access       | Challenge-response validity, rate limit enforcement, route authorization    |
| 🟡 High      | **Thorn** (content moderation)     | Moderation gaps = harmful content served | Flagged content never appears in feeds, false-positive rate bounded         |
| 🟡 High      | **Rootwork** (boundary validation) | Validation gaps = injection/corruption   | Invalid input always rejected, valid input always accepted                  |
| 🟢 Standard  | **Loom DOs** (coordination)        | Coordination bugs = data inconsistency   | Message ordering, state convergence, no lost updates                        |
| 🟢 Standard  | **Amber** (storage)                | Storage bugs = data loss                 | Upload/download round-trip, metadata consistency                            |

-----

## Agent Instructions

If you are an agent working in the Grove codebase, follow these rules:

1. **Before implementing any function that handles auth, encryption, API gating, content moderation, or data validation:** check if branded types, schemas, and property tests exist for that function's inputs and outputs. If they don't, write them first.
1. **When generating implementation code:** treat the verification stack as your judge. Write code, run verification, iterate. Do not ask a human to review code that hasn't passed the full stack.
1. **When modifying existing code:** run the full verification stack BEFORE and AFTER your changes. If tests fail after your change, your change is wrong — not the tests.
1. **Never weaken a type, schema, or property test to make implementation easier.** The specification is the source of truth. If the spec seems wrong, flag it for human review — don't silently relax it.
1. **Use `fast-check` for property-based testing.** It's available in the Grove dev environment. When writing properties, think: "what must ALWAYS be true about this function, no matter what input it receives?"
1. **Reference Rootwork for boundary validation patterns.** Reference Glimpse for visual verification patterns. Reference Frog Cycle for the red-green-refactor rhythm. This document defines the rigor of what goes into each phase.

-----

## Future Directions

### Near-Term (Actionable Now)

- Adopt `fast-check` in Grove's test suite for critical paths
- Introduce branded types systematically, starting with Heartwood and encryption
- Extend Rootwork patterns to internal boundaries (Worker ↔ D1, DO ↔ DO)
- Update Frog Cycle skill to reference this document's Phase 1 specification step

### Medium-Term (Watch and Evaluate)

- Monitor Lean 4 ecosystem for TypeScript interop tooling
- Evaluate [Aeneas](https://github.com/AeneasVerif/aeneas) if any Grove component is rewritten in Rust (e.g., WASM Workers)
- Track Leanstral's MCP integration patterns — Mycelium may eventually interface with formal verification agents
- Explore [Effect-TS](https://effect.website/) or similar libraries that bring stronger type-level guarantees to TypeScript

### Long-Term (The Vision)

- AI agents that can both generate code AND generate verification layers
- Mycelium as an MCP bridge between Grove and specialized verification agents
- A world where "the AI proposes, the system disposes" is the default — not just for critical paths, but for everything

-----

## Reference: Leanstral Technical Summary

For context on the original research that inspired this document:

- **Model:** Leanstral-120B-A6B (120B total params, 6B active via sparse mixture-of-experts)
- **License:** Apache 2.0 (open weights)
- **Purpose:** Writing formal proofs in Lean 4 inside real repositories
- **Key benchmark (FLTEval):** Evaluates proof completion on the Fermat's Last Theorem formalization project
- **Cost comparison:** Leanstral pass@16 ($290) approaches Claude Opus ($1,650) quality at 82% lower cost
- **Key innovation:** pass@N strategy leveraging Lean as a perfect verifier — if any attempt passes, the proof is guaranteed correct
- **MCP integration:** Trained with `lean-lsp-mcp` for real-time interaction with Lean's language server
- **Availability:** Free API endpoint (`labs-leanstral-2603`), Mistral Vibe integration, downloadable weights

-----

*This document is a living research artifact. As Grove's verification practices evolve, update it. As the formal verification ecosystem matures and new tools emerge that bridge to TypeScript/Cloudflare, extend the Future Directions section. The philosophy is stable; the tools will sharpen.*
