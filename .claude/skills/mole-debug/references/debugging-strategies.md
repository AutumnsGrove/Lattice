# Debugging Strategies Deep Reference

> **When to load:** Need detailed guidance on a specific debugging technique

---

## Binary Search

Cut the problem space in half with each test. Logarithmic efficiency.

```
Entry ──────── Midpoint ──────── Exit
  ✓                ?                ✗

If midpoint is ✓: bug is between midpoint and exit
If midpoint is ✗: bug is between entry and midpoint
```

For a call chain 16 layers deep, binary search finds the fault in 4 steps. Linear scanning takes 16.

**Use when:** The bug is somewhere in a long call chain or data pipeline.

## Boundary Instrumentation

Place sensors at system boundaries, not scattered through code.

```typescript
// BAD: Shotgunning
console.log("here 1");
console.log("here 2");

// GOOD: Boundary instrumentation
console.log("[MOLE:ENTRY]", { method: request.method, url: request.url, body });
console.log("[MOLE:SERVICE]", { input: params, tenantId });
console.log("[MOLE:DB-QUERY]", { sql, bindings, result: rows.length });
console.log("[MOLE:EXIT]", { status, responseBody });
```

Label every log with `[MOLE:LOCATION]` so you can find and remove them later. **All `[MOLE:*]` logs must be removed before committing.**

**Use when:** Data enters correct but exits wrong, and you don't know where it changes.

## State Snapshot Comparison

Capture full state at failure vs success, then diff:

```typescript
console.log("[MOLE:SNAPSHOT]", JSON.stringify({
  timestamp: Date.now(),
  locals: { tenant: locals.tenant?.id, user: locals.user?.id },
  headers: Object.fromEntries(request.headers.entries()),
  env: { D1: !!platform.env.DB, KV: !!platform.env.CACHE },
  url: request.url,
}, null, 2));
```

**Use when:** Intermittent failures, race conditions, "works sometimes."

## Time-Travel (git bisect)

Binary search through git history to find the breaking commit:

```bash
git bisect start
git bisect bad                    # Current state is broken
git bisect good abc123           # This commit was working
# Git checks out midpoint — test it, then: git bisect good/bad
# Repeat until the breaking commit is found
```

**Use when:** "This used to work" — find exactly when and what changed.

## Minimal Reproduction

Strip away everything that isn't needed to trigger the bug. If it fails on a page with 20 components, does it fail with just 1?

**Use when:** The bug appears in a complex page/flow and you need to isolate.

## Rubber Duck Narration

Explain the data flow step by step in text. Narrating forces you to confront assumptions.

**Use when:** You're stuck and the code "looks right."

---

## Hypothesis Tracking Format

```
Hypothesis 1: The D1 query returns stale data because KV cache
              isn't invalidated after write.
Test: Add cache.delete() before the read. Run reproduction.
Result: [REFUTED] — same error with fresh cache. Not caching.

Hypothesis 2: The tenant_id binding is null because locals.tenant
              is populated by a hook that runs AFTER this route.
Test: Log locals.tenant at route entry. Check hook ordering.
Result: [CONFIRMED] — locals.tenant is undefined. Hook runs
        on /app/* but this route is /api/*.
```

## Vibration Log Template

```
VIBRATION LOG
Issue: [exact description]
Reproduction: [exact steps]
Environment: [versions, configs, tenant, browser]
Error: [full error text / stack trace]
First observed: [when / who]
Last known working: [commit hash or date]

Hypotheses:
  1. [hypothesis] → [test] → [result]
  2. [hypothesis] → [test] → [result]

Root cause: [FOUND / ESCALATED]
```
