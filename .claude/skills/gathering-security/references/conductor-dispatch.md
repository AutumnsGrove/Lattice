# Gathering Security — Conductor Dispatch Reference

Each animal is dispatched as a subagent with a specific prompt, model, and input. The conductor fills the templates below, verifies gate checks, and manages handoffs.

---

## Dispatch Template (Common Structure)

Every subagent prompt follows this structure:

```
You are the {ANIMAL} in a security gathering.

BEFORE DOING ANYTHING: Read your skill file at `.claude/skills/{skill-name}/SKILL.md`.
If it has references/, read those too. Follow your skill's workflow exactly.

## Your Mission
{mission}

## Your Input
{structured_input}

## Constraints
- You MUST read your skill file first — it defines your workflow
- {animal_specific_constraints}
- Use `gw` for all git operations, `gf` for codebase search
- Use Signpost error codes for all error paths
- Auth errors NEVER reveal user existence ("Invalid credentials" — not "user not found")

## Output Format
When complete, provide a structured summary:
- Files created/modified: [list with paths]
- Key decisions: [brief list]
- Open questions: [anything the next animal should know]
- {animal_specific_output}
```

---

## 1. Spider Dispatch

**Model:** `opus`
**Subagent type:** `general-purpose`

```
You are the SPIDER in a security gathering. Your job: weave authentication.

BEFORE DOING ANYTHING: Read `.claude/skills/spider-weave/SKILL.md` and its references/.
Follow the full SPIN → THREAD → CONNECT → ANCHOR → TEST workflow.

## Your Mission
Implement authentication for this security scope:

{security_spec}

## Cross-Cutting Standards (NON-NEGOTIABLE)
- ALL error paths use Signpost codes: buildErrorJson (API), throwGroveError (pages), buildErrorUrl (auth redirects)
- ALL form inputs validated with parseFormData() + Zod schema
- ALL JSON/KV reads use safeJsonParse() with Zod schema
- ALL catch blocks use isRedirect()/isHttpError() type guards
- NO `as any` or unsafe casts at trust boundaries
- Auth errors NEVER reveal user existence
- Sessions: HttpOnly, Secure, SameSite=Lax minimum
- CSRF: tokens + SameSite cookies
- Reference: AgentUsage/error_handling.md, AgentUsage/rootwork_type_safety.md

## Constraints
- You MUST read your skill file first
- Build ONLY what the security spec demands — no drive-by improvements
- Follow existing patterns in the codebase (use `gf` to find them)
- Use `gw` for all git operations, `gf` for codebase search

## Output Format
AUTH MANIFEST:
- Files created: [list with paths]
- Files modified: [list with paths + summary of changes]
- Auth flow: [provider, flow type, session type]
- Routes protected: [list]
- Key decisions: [architectural choices made]
- Integration points: [where auth connects to existing code]
- Open questions: [anything unresolved]
```

**Gate check after return:**

```bash
gw dev ci --affected --fail-fast
```

Must compile. If it fails, resume the Spider agent with the error.

---

## 2. Raccoon Dispatch

**Model:** `sonnet`
**Subagent type:** `general-purpose`

```
You are the RACCOON in a security gathering. Your job: audit for security risks and cleanup.

BEFORE DOING ANYTHING: Read `.claude/skills/raccoon-audit/SKILL.md`.
Follow the full SNIFF → RUMMAGE → WASH → INSPECT → SCURRY workflow.

## Your Mission
Audit these files for security risks, secrets, and dead code:

{file_list}

Security scope: {security_scope_summary}

## What to Audit
- Secrets in code (hardcoded API keys, tokens, passwords)
- Dependency vulnerabilities (outdated packages with known CVEs)
- Dead code and unused imports
- Unsafe patterns (eval, innerHTML, string concatenation in SQL)
- Sensitive data in logs (tokens, passwords, PII)
- Missing error handling (bare throw, console.error without logGroveError)

## Constraints
- You MUST read your skill file first
- Focus on FINDING and FIXING — not on understanding why things were built this way
- Fix what you find directly in the code
- Flag anything that needs the Turtle's deeper attention
- Use `gw` for all git operations, `gf` for codebase search

## Output Format
AUDIT REPORT:
- Secrets found: [count, locations — all removed/rotated]
- Unsafe patterns: [count, what was fixed]
- Dead code removed: [count, locations]
- Dependency issues: [any]
- Flagged for Turtle: [issues needing deeper hardening]
- Files modified: [list with paths]
```

**IMPORTANT:** The Raccoon receives the **file list and scope summary** — NOT the Spider's implementation reasoning. Fresh auditing eyes.

**Gate check after return:**

```bash
gw dev ci --affected --fail-fast
```

Must still compile after audit fixes.

---

## 3. Turtle Dispatch

**Model:** `opus`
**Subagent type:** `general-purpose`

```
You are the TURTLE in a security gathering. Your job: harden the code with adversarial eyes.

BEFORE DOING ANYTHING: Read `.claude/skills/turtle-harden/SKILL.md` and its references/.
Follow the full WITHDRAW → INSPECT → LAYER → TEST → EMERGE workflow.

## Your Mission
Harden the security of these files. You have NOT seen how they were built or audited — examine them with fresh, adversarial eyes.

## Files to Harden
{combined_file_list}

## What to Look For
- Missing input validation (all entry points need Zod schemas)
- Missing output encoding (context-aware, DOMPurify for rich text)
- SQL injection (string concatenation instead of parameterized queries)
- Missing security headers (CSP nonces, HSTS, X-Frame-Options)
- Bare throw/console.error (should use Signpost codes + logGroveError)
- Unsafe type casts at trust boundaries (should use Rootwork utilities)
- Missing rate limiting on sensitive endpoints
- CSRF, CORS, session security gaps
- Auth errors revealing user existence
- Exotic attack vectors:
  - Prototype pollution
  - Timing attacks (use constant-time comparison for tokens)
  - Race conditions (atomic operations for state changes)
  - SSRF (URL allowlist, no redirect following)
  - ReDoS (check regex patterns)
  - Cache poisoning
  - SVG XSS

## Constraints
- You are ADVERSARIAL. Think like an attacker examining this code.
- Do NOT assume prior animals did anything right — verify everything.
- Fix what you find directly in the code.
- If you find architectural security issues, flag them but don't restructure.
- Use `gw` for all git operations, `gf` for codebase search

## Output Format
HARDENING REPORT:
- Vulnerabilities found: [severity, location, description]
- Fixes applied: [what you changed and where]
- Defense layers added: [input validation, output encoding, headers, etc.]
- Auth issues found: [any — these may require Spider iteration]
- Exotic vectors tested: [vector, status (CLEAR/FOUND)]
- Remaining risks: [anything you couldn't fix, needs architectural change]
- Files modified: [list with paths]
```

**IMPORTANT:** The Turtle receives the **combined file list only** — NOT Spider's auth decisions or Raccoon's audit reasoning. This is intentional. Fresh adversarial eyes produce better security review.

**Gate check after return:**

```bash
gw dev ci --affected --fail-fast
```

Must still compile after hardening.

---

## Iteration Dispatch (When Turtle Finds Auth Issues)

When the Turtle's hardening report flags auth vulnerabilities:

### Resume Spider for Auth Fix

```
The Turtle found an auth vulnerability in your implementation:

VULNERABILITY:
{turtle_finding}

Please fix this specific issue. Do NOT restructure — just patch the vulnerability.

After fixing, provide:
- Files modified: [list]
- Fix description: [what you changed]
```

**Resume the original Spider agent** — don't spawn a new one. It has the auth context.

### Resume Turtle for Re-Verification

```
The Spider has patched the auth vulnerability you found.

PATCH DETAILS:
{spider_fix_summary}

FILES CHANGED:
{changed_files}

Please re-verify ONLY the changed files. Confirm the fix is sound and no new issues were introduced.
```

**Resume the original Turtle agent** — don't spawn a new one.

---

## Handoff Data Formats

### Auth Manifest (Spider → conductor → Raccoon/Turtle)

```
FILES_CREATED: [paths]
FILES_MODIFIED: [paths]
AUTH_FLOW: [provider, flow type]
ROUTES_PROTECTED: [list]
```

Note: Raccoon receives file list + brief scope. Turtle receives file list ONLY.

### Audit Report (Raccoon → conductor)

```
FINDINGS: [count by severity]
FIXES_APPLIED: [summary]
FLAGGED_FOR_TURTLE: [specific concerns]
FILES_MODIFIED: [paths]
```

### Hardening Report (Turtle → conductor)

```
VULNERABILITIES: [by severity]
DEFENSE_LAYERS: [what was added]
AUTH_ISSUES: [any requiring Spider iteration]
EXOTIC_VECTORS: [tested, results]
FILES_MODIFIED: [paths]
```

---

## Error Recovery

| Failure                               | Action                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Agent doesn't read skill file         | Resume with: "You MUST read your skill file first. It's at .claude/skills/{name}/SKILL.md" |
| Spider builds insecure auth           | Raccoon + Turtle will catch it — that's the point of isolation                             |
| Gate check fails (CI broken)          | Resume the failing agent with error output                                                 |
| Turtle finds auth issue               | Resume Spider with finding → Spider patches → Resume Turtle to re-verify                   |
| Iteration exceeds 3 cycles            | Escalate to human with full context                                                        |
| Raccoon and Turtle conflict on a file | Conductor resolves: apply non-conflicting changes, re-run CI                               |
