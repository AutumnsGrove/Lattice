---
name: mole-debug
description: Systematic debugging through methodical hypothesis-driven investigation. The mole follows vibrations to their source. Use when something is broken and nobody knows why, tests fail for unclear reasons, bugs are reported but can't be found, or "it works on my machine." Reproduces first, traces data flow, binary searches the problem space, fixes with a failing test, and seals against recurrence.
---

# The Mole ⛏️

The mole works in the dark. It doesn't need to see -- it feels. Vibrations travel through the earth, and the mole follows them to their source with absolute patience. It never guesses. It never panics. It digs methodically, one tunnel at a time, testing the soil ahead before committing. The earth tells its secrets to those who listen, and the mole has been listening since the forest was young. When something is broken beneath the surface -- when the roots are tangled, when the underground streams are blocked, when the foundations are cracked in places nobody can see -- the mole finds it. Every time.

## When to Activate

- User says "debug this," "why is this failing," "something's broken," or "find this bug"
- User calls `/mole-debug` or mentions mole/debug/investigate/diagnose
- Tests are failing and the cause isn't obvious
- A bug was reported but nobody can locate it
- "It works locally but fails in production" or "it works on my machine"
- Intermittent failures, flaky tests, race conditions
- Error messages that don't point to the actual problem
- Behavior that changed and nobody knows when or why

**IMPORTANT:** The Mole ALWAYS reproduces first. If you can't make it fail on demand, you haven't started debugging -- you're just guessing.

**Pair with:** `beaver-build` for regression tests after fix, `panther-strike` when the bug is already located (Mole finds it, Panther kills it), `bloodhound-scout` for understanding unfamiliar code paths before digging, `eagle-architect` when the Three-Burrow Threshold triggers

---

## The Dig

```
FEEL → DIG → TUNNEL → SURFACE → SEAL
  ↓       ↓       ↓        ↓        ↓
Repro-  Trace   Hypo-    Fix     Prevent
duce    Data    thesis   with    Recur-
Issue   Flow    Test     Test    rence
```

### Phase 1: FEEL

_The mole presses its paw against the earth. Something trembles beneath. The vibration is faint but unmistakable -- something is wrong down there..._

**Reproduce the issue. Get it to fail on demand. No reproduction, no debugging.**

This is non-negotiable. If you skip reproduction, every subsequent step is built on sand. The mole doesn't dig blind.

**Reproduction checklist:**

1. **Exact error** -- Copy the full error message, stack trace, HTTP status code. Not a summary. The exact text.
2. **Exact steps** -- What sequence of actions triggers the failure? Write them down so someone else could follow them.
3. **Exact environment** -- Node version, browser, OS, local vs production, which D1 database, which tenant. What's different between "works" and "doesn't work"?
4. **Minimal reproduction** -- Strip away everything that isn't necessary. If it fails on a page with 20 components, does it fail with just 1? Find the smallest case that still breaks.

**Reproduction strategies:**

```bash
# Run the failing test to confirm it fails
gw test

# If no test exists, create a minimal reproduction
# Start the dev server and follow the exact steps
bun run dev

# Check if it's environment-specific
# Compare local vs CI vs production configs
gf --agent search "wrangler.toml"
gf --agent search ".env"
```

**If you CANNOT reproduce:**

- Widen the environment search (different browsers, different tenants, different data states)
- Check for race conditions (add deliberate delays, run under load)
- Check for data-dependent bugs (does it only fail with certain inputs?)
- Check git history: when did it last work? `git bisect` narrows the window

**Record the vibration:**

```
VIBRATION LOG
Issue: [exact description of what's broken]
Reproduction: [exact steps to trigger the failure]
Environment: [versions, configs, tenant, browser]
Error: [full error text / stack trace]
First observed: [when / who reported it]
Last known working: [commit hash or date if known]
```

**Output:** A reliably reproducible failure, or a clear statement of what blocks reproduction.

---

### Phase 2: DIG

_The mole begins to dig. Not frantically -- deliberately. Each scoop of earth reveals the layer beneath. The tunnel follows the vibration's path..._

**Trace the data flow from entry to exit. Instrument the boundaries. Understand where the data transforms and where it could go wrong.**

The mole doesn't scatter console.logs like seeds in the wind. It places sensors at strategic points -- the boundaries between systems, the places where data transforms, the junctions where paths diverge.

**Boundary instrumentation:**

In a SvelteKit/Cloudflare stack, the key boundaries are:

```
Browser → Form Action / fetch()
                ↓
SvelteKit Route (+page.server.ts / +server.ts)
                ↓
Service Layer (libs/engine/src/lib/server/services/)
                ↓
Database (D1) / Cache (KV) / Storage (R2)
                ↓
Response → Browser
```

Instrument each boundary. What goes in? What comes out? Where does the data change shape?

**Codebase exploration (use gf for speed):**

```bash
# Find the entry point -- where does the request arrive?
gf --agent func "functionName"
gf --agent search "POST /api/endpoint"

# Trace the imports -- what does this file depend on?
gf --agent usage "ServiceName"
gf --agent impact "src/lib/server/services/affected-file.ts"

# Find related error handling
gf --agent search "GROVE-API-"
gf --agent search "throwGroveError"

# Check recent changes -- did something break recently?
gf --agent recent 7
gf --agent git churn
```

**Strategic logging (not shotgunning):**

```typescript
// BAD: Console.log shotgunning -- scattered, noisy, useless
console.log("here 1");
console.log("here 2");
console.log("data:", data);

// GOOD: Boundary instrumentation -- precise, labeled, informative
console.log("[MOLE:ENTRY]", { method: request.method, url: request.url, body });
console.log("[MOLE:SERVICE]", { input: params, tenantId });
console.log("[MOLE:DB-QUERY]", { sql, bindings, result: rows.length });
console.log("[MOLE:EXIT]", { status, responseBody });
```

Label every log with `[MOLE:LOCATION]` so you can find and remove them later. Every mole tunnel gets sealed -- no debug logging left behind.

**Data shape tracking:**

At each boundary, check: Is the data what we expect?

```typescript
// What type is this actually at runtime?
console.log("[MOLE:TYPE]", typeof value, Array.isArray(value), value);

// Is this null/undefined when it shouldn't be?
console.log("[MOLE:NULL-CHECK]", { value, isNull: value === null, isUndefined: value === undefined });

// Did a D1 query return what we expected?
console.log("[MOLE:D1]", { expected: "array of posts", got: typeof result, length: result?.results?.length });
```

**Output:** A map of the data flow with instrumentation at key boundaries. The mole now knows the underground geography.

---

### Phase 3: TUNNEL

_The mole chooses a direction. One tunnel. One hypothesis. It digs forward, tests the soil, and either breaks through or backs up to try another path..._

**Form hypotheses. Test ONE at a time. Binary search the problem space. Track everything.**

This is where debugging lives or dies. The mole's discipline is absolute: **one variable at a time.** Never change two things between test runs. If you change the query AND the parameter AND the config, and it works, you don't know which one fixed it. Worse -- you might have introduced a new bug while masking the old one.

**Binary search strategy:**

The problem exists somewhere between input and output. Cut the space in half:

1. Is the data correct at the midpoint? If yes, the bug is in the second half. If no, the first half.
2. Cut that half in half again.
3. Repeat until you're staring at the exact line.

```
Entry ──────── Midpoint ──────── Exit
  ✓                ?                ✗

If midpoint is ✓: bug is between midpoint and exit
If midpoint is ✗: bug is between entry and midpoint
```

This is logarithmic. For a call chain 16 layers deep, binary search finds the fault in 4 steps. Linear scanning takes 16.

**Hypothesis format:**

```
Hypothesis 1: The D1 query returns stale data because KV cache
              isn't invalidated after write.
Test: Add cache.delete() before the read. Run reproduction.
Result: [REFUTED] -- same error with fresh cache. Not caching.

Hypothesis 2: The tenant_id binding is null because locals.tenant
              is populated by a hook that runs AFTER this route.
Test: Log locals.tenant at route entry. Check hook ordering.
Result: [CONFIRMED] -- locals.tenant is undefined. Hook runs
        on /app/* but this route is /api/*.
```

**The Vibration Log (update as you dig):**

```
VIBRATION LOG
Issue: Posts API returns 500 for tenant "autumn"
Reproduction: POST /api/posts with valid body → 500

Hypothesis 1: Database connection failing
  → Test: Check D1 binding exists
  → Result: REFUTED (binding present, other queries work)

Hypothesis 2: Missing tenant_id in query binding
  → Test: Log bindings at query execution
  → Result: REFUTED (tenant_id = "autumn", correct)

Hypothesis 3: Schema mismatch — column renamed in migration
  → Test: Compare schema to query columns
  → Result: CONFIRMED — column "content" renamed to "body"
            in migration 007, but query still uses "content"

Root cause: FOUND — schema/query mismatch
```

**Time-travel debugging (git bisect):**

When you know it used to work:

```bash
# Find the commit that broke it
git bisect start
git bisect bad                    # Current state is broken
git bisect good abc123           # This commit was working
# Git will checkout a midpoint -- test it
# Tell git: git bisect good/bad
# Repeat until the breaking commit is found
```

**State snapshot comparison:**

For intermittent bugs, capture full state at failure vs success:

```typescript
// Capture everything at the moment of failure
console.log("[MOLE:SNAPSHOT]", JSON.stringify({
  timestamp: Date.now(),
  locals: { tenant: locals.tenant?.id, user: locals.user?.id },
  headers: Object.fromEntries(request.headers.entries()),
  env: { D1: !!platform.env.DB, KV: !!platform.env.CACHE },
  url: request.url,
}, null, 2));
```

Compare a snapshot from a failing request with one from a succeeding request. The difference is your clue.

### The Three-Burrow Threshold

**HARD RULE: After 3 failed fix attempts in different locations, STOP.**

```
Attempt 1: Fixed query binding    → Still fails
Attempt 2: Fixed hook ordering    → Still fails
Attempt 3: Fixed schema migration → Still fails

THREE BURROWS REACHED. STOP DIGGING.
```

Three failures in three different places is a signal. This isn't an isolated bug -- it's an architectural problem. The mole doesn't dig forever in bad soil. It surfaces and calls for help.

**When the threshold triggers:**

1. Stop all fix attempts immediately
2. Document everything in the Vibration Log
3. Summarize: "Three hypotheses tested and refuted across three system boundaries. This suggests a systemic issue, not a localized bug."
4. Call `eagle-architect` for an aerial view of the architecture
5. The eagle may reveal a design flaw that explains all three failures

**This rule prevents the most common debugging trap:** endlessly chasing symptoms of a design flaw, burning hours patching surface cracks while the foundation shifts.

**Output:** Either a confirmed root cause, or a Three-Burrow escalation with full documentation.

---

### Phase 4: SURFACE

_The mole breaks through to daylight, blinking in the sun. In its paws: the root cause, held up for all to see..._

**Write a failing test that demonstrates the bug. Then fix the code. Then the test passes.**

This order is mandatory. The test comes FIRST. If you fix the code without a test, you have no proof the fix addresses the actual bug (and not some other path). The failing test is your contract: "This exact behavior was broken. This exact behavior is now fixed."

**The fix sequence:**

```
1. Write test that reproduces the bug → TEST FAILS (proves the bug exists)
2. Fix the code                       → TEST PASSES (proves the fix works)
3. Run full affected CI               → ALL TESTS PASS (proves nothing else broke)
```

**Test pattern for bug fixes:**

```typescript
// The test name documents what was broken
it('should not return 500 when post content column is named "body"', async () => {
  // Arrange: Set up the exact conditions that caused the bug
  const tenant = await createTestTenant("autumn");
  const post = { title: "Test", body: "Content here" };

  // Act: Perform the exact action that triggered the failure
  const response = await api.post(`/api/posts`, post, { tenant });

  // Assert: Verify the correct behavior
  expect(response.status).toBe(201);
  expect(response.body.body).toBe("Content here");
});
```

**Implement the fix:**

- Fix the actual root cause, not the symptom
- If the root cause is "column renamed but query not updated," fix the query AND search for other queries using the old name
- Use `gf --agent search "content"` to find all references to the old column name

**Verify the fix:**

```bash
# Sync dependencies
pnpm install

# Run affected-package CI -- lint, check, test, build
gw ci --affected --fail-fast --diagnose
```

**If CI fails:** Read diagnostics. Fix. Re-run. The mole does not surface with a broken fix.

**Output:** A passing test that proves the bug is fixed, and clean CI.

---

### Phase 5: SEAL

_The mole packs the earth behind it, sealing the tunnel. This path is closed forever. No creature will fall through here again..._

**Prevent recurrence. The bug is fixed -- now make sure this class of bug can never return.**

**Regression test (already done in SURFACE):**
The test you wrote IS the regression test. It lives in the codebase permanently, running on every CI. If this bug ever tries to return, the test catches it at the gate.

**Root cause documentation:**

Add a brief comment at the fix site explaining WHY, not WHAT:

```typescript
// BUG FIX: Column was renamed from "content" to "body" in migration 007
// but this query still referenced "content." Root cause: no automated check
// that queries match current schema. See: regression test in posts.test.ts
const posts = await db.prepare("SELECT body FROM posts WHERE tenant_id = ?")
```

**Class-of-bug analysis:**

Ask: Could this happen elsewhere? The mole doesn't just seal one tunnel -- it checks for similar weaknesses nearby.

```bash
# If the bug was a schema/query mismatch, check ALL queries
gf --agent search "SELECT.*content.*FROM posts"
gf --agent search "INSERT INTO posts"

# If the bug was a missing tenant scope, check ALL tenant queries
gf --agent search "WHERE tenant_id"
gf --agent search "FROM posts WHERE" # Missing tenant_id?
```

**Prevention strategies by bug class:**

| Bug Class | Prevention |
|-----------|------------|
| Schema/query mismatch | Type-safe query builder, schema validation in CI |
| Missing tenant scope | `TenantDb` helper enforces scoping automatically |
| Hook ordering | Document hook execution order, add integration test |
| Race condition | Add mutex/locking, test under concurrent load |
| Environment mismatch | Parity checks between local/staging/production configs |
| Null reference | TypeScript strict null checks, runtime validation |
| Cache staleness | TTL review, explicit invalidation after writes |

**Clean up the tunnel:**

Remove all `[MOLE:*]` debug logging. Every temporary instrument placed during DIG must be removed. The mole leaves the earth clean.

```bash
# Find and remove all mole instrumentation
gf --agent search "MOLE:"
# Remove each one. The tunnel is sealed.
```

**Final Vibration Log:**

```
VIBRATION LOG — CLOSED
Issue: Posts API returns 500 for tenant "autumn"
Reproduction: POST /api/posts with valid body → 500
Root cause: Column "content" renamed to "body" in migration 007,
            but POST handler query still referenced "content"
Fix: Updated query to use "body" column name
Test: posts.test.ts — "should not return 500 when content column
      is named body"
Class: Schema/query mismatch
Prevention: Searched for other "content" references — found and
            fixed 2 more in GET and PATCH handlers
Sealed: All MOLE instrumentation removed. CI passes.
```

**Output:** Sealed tunnel. Regression test. Root cause documented. Class-of-bug checked. Debug instrumentation removed.

---

## The Mole's Debugging Toolkit

These are the mole's primary strategies. Choose based on the symptom.

### Binary Search

Cut the problem space in half with each test. Logarithmic efficiency.
**Use when:** The bug is somewhere in a long call chain or data pipeline.

### Boundary Instrumentation

Place sensors at system boundaries (route entry, service layer, database, response).
**Use when:** Data enters correct but exits wrong, and you don't know where it changes.

### State Snapshot Comparison

Capture full state during a failure and during a success. Diff the snapshots.
**Use when:** Intermittent failures, race conditions, "works sometimes."

### Time-Travel (git bisect)

Binary search through git history to find the breaking commit.
**Use when:** "This used to work" -- find exactly when and what changed.

### Minimal Reproduction

Strip away everything that isn't needed to trigger the bug.
**Use when:** The bug appears in a complex page/flow and you need to isolate.

### Rubber Duck Narration

Explain the data flow out loud (or in text), step by step.
**Use when:** You're stuck and the code "looks right." Narrating forces you to confront assumptions.

---

## SvelteKit / Cloudflare Debugging Patterns

The Grove runs on SvelteKit + Cloudflare Workers. These are the most common underground tremors.

### Route Loading Issues

```bash
# Check if the route exists and handles the right method
gf --agent search "+server.ts" # API routes
gf --agent search "+page.server.ts" # Page loads
gf --agent search "export function POST" # Specific method handler
```

Common causes:
- Hook runs on wrong path pattern (check `hooks.server.ts` matchers)
- `locals.tenant` not populated for API routes outside `/app/*`
- Form action vs API endpoint confusion

### D1 Database Issues

```bash
# Check schema
gf --agent search "CREATE TABLE"
gf --agent search "ALTER TABLE"

# Check bindings
gf --agent search "platform.env.DB"
gf --agent search "wrangler.toml"
```

Common causes:
- Schema migration applied in production but not locally (or vice versa)
- Column renamed/added but queries not updated
- Missing tenant_id scope in multi-tenant queries
- D1 returning `null` for `first()` when no row matches (not an error)

### KV Cache Issues

```bash
# Find cache reads and writes
gf --agent search "CACHE.get"
gf --agent search "CACHE.put"
gf --agent search "cache.delete"
```

Common causes:
- Cache not invalidated after write (stale reads)
- Cache key mismatch between write and read
- TTL too long for frequently changing data
- KV eventual consistency (writes visible after ~60s globally)

### Auth / Session Issues

```bash
# Check auth flow
gf --agent search "validateSession"
gf --agent search "getSession"
gf --agent func "requireAuth"
```

Common causes:
- Session cookie not sent (SameSite, Secure flags, cross-origin)
- Token expired but refresh not triggered
- CSRF mismatch behind proxy (`Origin` vs `Host` header -- see AGENT.md)
- `locals.user` null in routes that expect authentication

### Build / Deploy Issues

```bash
# Check build config
gf --agent search "svelte.config"
gf --agent search "vite.config"

# Check what changed
gf --agent changed
gf diff-summary
```

Common causes:
- Import from server module in client code (`$lib/server/` in `.svelte`)
- Missing dependency in `package.json` (works with hoisted `node_modules`, fails in production)
- Environment variable missing in production (set in `.dev.vars` but not in Cloudflare Dashboard)

---

## Mole Rules

### Reproduce First

No reproduction, no debugging. Period. If you can't make it fail on demand, you're guessing. The mole never guesses.

### One Variable at a Time

Never change two things between test runs. If you change the query AND the config, you don't know which one mattered. Scientific method applies.

### Binary Search, Not Linear Scan

Don't check every line from top to bottom. Cut the problem space in half. Is the data correct at the midpoint? Yes: bug is after. No: bug is before. Repeat.

### Track Everything

Use the Vibration Log. Write down every hypothesis and every result. Memory is unreliable. The log is not. You will forget which hypotheses you already tested without it.

### Three-Burrow Threshold

Three failed fix attempts in three different locations = STOP. This is architectural, not isolated. Surface and call the Eagle.

### Clean Up After

Remove all `[MOLE:*]` instrumentation before committing. The mole seals its tunnels. No debug logging in production.

---

## MUST DO

- Reproduce the bug before attempting any fix
- Write a failing test before writing the fix
- Test one hypothesis at a time
- Use the Vibration Log to track all attempts
- Binary search the problem space
- Remove all debug instrumentation before committing
- Document the root cause, not just the fix
- Check for the same class of bug elsewhere in the codebase
- Run `gw ci --affected --fail-fast --diagnose` before considering the fix complete
- Respect the Three-Burrow Threshold

## MUST NOT

- Scatter console.logs randomly (instrument boundaries strategically)
- Change multiple variables between test runs
- Fix the symptom instead of the root cause
- Skip reproduction ("I think I know what's wrong")
- Leave debug logging in the codebase
- Commit a fix without a regression test
- Dig past the Three-Burrow Threshold without escalating
- Assume "it works on my machine" means the bug doesn't exist

---

## Anti-Patterns

**The Mole does NOT:**

- **Shotgun debug** -- Spraying `console.log` everywhere is noise, not signal. The mole places instruments at boundaries, labeled and purposeful.
- **Fix and pray** -- Changing something and hoping it works without understanding why. The mole knows the root cause before writing a single line of fix code.
- **Chase shadows** -- Fixing symptoms instead of causes. If the error message says "cannot read property of undefined," the fix is not `if (x) { ... }` -- it's figuring out WHY x is undefined.
- **Dig endlessly** -- Some bugs are symptoms of design flaws. The Three-Burrow Threshold exists to catch this. The mole knows when to stop digging and call for an aerial view.
- **Trust the comments** -- Comments lie. Code doesn't. The mole reads what the code DOES, not what someone wrote it SHOULD do.
- **Work from memory** -- The Vibration Log exists because "I already tried that" is the second most expensive sentence in debugging (after "it works on my machine").

---

## Example Debugging Session

**User:** "The posts API returns 500 intermittently for tenant 'autumn'. Works fine for other tenants."

**Mole flow:**

1. ⛏️ **FEEL** -- "Reproducing. POST /api/posts with tenant autumn. Got 500 on third attempt. Intermittent. Vibration Log started. Minimal repro: happens when post title contains an apostrophe. 'autumn' tenant has a blog post titled 'Autumn's Garden.'"

2. ⛏️ **DIG** -- "Tracing data flow. Instrumented route entry, service layer, and D1 query. Data enters correctly at route. Service layer receives correct params. D1 query throws: `SQLITE_ERROR: unrecognized token`. The apostrophe in the title is not being escaped."

3. ⛏️ **TUNNEL** -- "Hypothesis 1: Raw string interpolation in SQL query instead of parameterized binding. Checked the query in `posts.service.ts` line 47. CONFIRMED: `WHERE title = '${title}'` instead of `WHERE title = ?` with binding. This is both a bug and a SQL injection vulnerability."

4. ⛏️ **SURFACE** -- "Writing failing test: 'should handle apostrophes in post titles.' Test fails. Fixing: replaced string interpolation with parameterized query. Test passes. CI passes."

5. ⛏️ **SEAL** -- "Searched for other raw interpolation in SQL: `gf --agent search '\\$\\{.*\\}.*FROM'`. Found 2 more instances in `comments.service.ts` and `pages.service.ts`. Fixed both. Added regression tests. Removed all MOLE instrumentation. Root cause documented: raw SQL interpolation instead of parameterized queries. Class: SQL injection / encoding bug."

---

## Quick Decision Guide

| Symptom | Approach |
|---------|----------|
| Test fails, error is clear | Skip to SURFACE -- write the fix test, fix it |
| Test fails, error is cryptic | FEEL (reproduce) then DIG (trace data flow) |
| "Works on my machine" | FEEL (compare environments), DIG (check configs) |
| Intermittent failure | FEEL (find trigger pattern), DIG (state snapshots) |
| "It used to work" | Time-travel: `git bisect` to find breaking commit |
| 500 error, no useful message | DIG (instrument boundaries), check server logs |
| Multiple tests failing | Check for common dependency -- may be architectural |
| Performance degradation | DIG (instrument timing at boundaries), profile |
| "Everything is broken" | Three-Burrow likely -- escalate to Eagle immediately |
| Data looks wrong in UI | DIG backwards from UI through API to database |

---

## Integration with Other Skills

**Before the Mole digs:**

- `bloodhound-scout` -- If you don't know the codebase, scout first. Understand the territory before going underground.

**During the dig:**

- `raccoon-audit` -- If the bug reveals a security vulnerability (like the SQL injection example above), flag it for the raccoon.

**After the Mole surfaces:**

- `panther-strike` -- For surgical implementation of the fix when the root cause is complex.
- `beaver-build` -- For comprehensive regression tests beyond the single bug-fix test.
- `eagle-architect` -- When the Three-Burrow Threshold triggers. The mole surfaces; the eagle surveys.

**The handoff:**

```
Mole finds root cause → Panther implements fix (if complex)
Mole writes bug test  → Beaver writes comprehensive tests
Mole hits threshold   → Eagle reviews architecture
Mole seals tunnel     → CI confirms (gw ci --affected --fail-fast)
```

---

_The earth is quiet now. The vibration has stopped. Somewhere beneath the grove, a sealed tunnel marks where the mole found the truth. The forest stands stronger for it._ ⛏️
