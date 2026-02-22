# Grove 1.0 Security Remediation - Parallel Execution Plan

```
    ╭──────────────────────────────────────────────────────────────╮
    │                                                              │
    │  🔍 SCOUT  ──►  🐝 SWARM  ──►  ✓ VALIDATE  ──►  📦 COMMIT  │
    │                                                              │
    │     Parallel agent execution for security remediation        │
    │                                                              │
    ╰──────────────────────────────────────────────────────────────╯
```

**Created**: January 16, 2026
**Based On**: `1.0-critical-high-remediation.md` (35 issues, ~21 hours)
**Strategy**: Parallel agent execution with scout-first verification

---

## Overview

This plan transforms the sequential 21-hour remediation into a parallel execution
that can be completed in ~4-5 hours wall-clock time using concurrent agents.

### Execution Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: SCOUT                                  │
│                                                                         │
│  Single agent scans ALL issues, verifies they still exist,              │
│  understands root causes, and drafts solution approaches.               │
│  Output: Verified issue list with fix strategies                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHASE 2: SWARM                                  │
│                                                                         │
│  Spawn 7 parallel agents, one per security domain:                      │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Content │ │ Storage │ │  Auth   │ │ Infra   │ │ Privacy │           │
│  │ Security│ │ Security│ │  Fixes  │ │  Fixes  │ │  Fixes  │           │
│  │ (P0)    │ │ (P0)    │ │ (P1)    │ │ (P1)    │ │ (P0)    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                         │
│  ┌─────────┐ ┌─────────┐                                               │
│  │  A11y   │ │  Social │                                               │
│  │  Fixes  │ │  Fixes  │                                               │
│  │ (P1)    │ │ (P1)    │                                               │
│  └─────────┘ └─────────┘                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PHASE 3: VALIDATE                                 │
│                                                                         │
│  Each agent runs tests after fixes. Orchestrator collects results.      │
│  Any failing tests are logged and agent attempts retry.                 │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 4: COMMIT                                  │
│                                                                         │
│  Orchestrator reviews all changes, runs full test suite,                │
│  creates comprehensive commit with all fixes.                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Scout Agent

### Purpose

Verify all 35 issues still exist, understand root causes, and prepare fix strategies.

### Prompt Template

```markdown
# Security Remediation Scout

You are auditing Grove's codebase to verify and prepare fixes for security issues.

## Your Task

For EACH issue in the list below:

1. **Verify**: Read the file and confirm the issue still exists
2. **Analyze**: Understand the root cause and any related code
3. **Draft**: Write a brief fix strategy (1-3 sentences)
4. **Flag**: Note any dependencies or risks

## Issues to Verify

### Critical (P0) - 9 Issues

1. **Content Security: SSR Sanitization Bypass**
   - File: `libs/engine/src/lib/utils/sanitize.ts`
   - Lines: 34-36, 86-89, 188-190
   - Issue: All sanitization returns unsanitized HTML during SSR

2. **Content Security: Blog Posts Not Sanitized**
   - File: `libs/engine/src/lib/utils/markdown.ts`
   - Lines: 310-327
   - Issue: `parseMarkdownContent()` doesn't call sanitization

3. **Content Security: Recursive Markdown XSS**
   - File: `libs/engine/src/lib/utils/markdown.ts`
   - Lines: 186-212
   - Issue: Code blocks with `markdown`/`md` language recursively parse without sanitization

4. **Storage Security: No Tenant Isolation in R2**
   - File: `libs/engine/src/routes/api/images/upload/+server.ts`
   - Lines: 150, 167
   - Issue: Files stored without tenant ID prefix

5. **Storage Security: No Ownership Verification on Delete**
   - File: `libs/engine/src/routes/api/images/delete/+server.js`
   - Lines: 62-68
   - Issue: Any authenticated user can delete any file

6. **Storage Security: No Tenant Filtering in R2 List**
   - File: `libs/engine/src/routes/api/images/list/+server.ts`
   - Lines: 62-66
   - Issue: List operation doesn't scope to tenant

7. **Analytics Privacy: PII Logged in Auth Callback**
   - File: `libs/engine/src/routes/auth/callback/+server.ts`
   - Lines: 265, 272
   - Issue: User email logged to console

8. **UI A11y: SearchInput Missing Label**
   - File: `libs/engine/src/lib/ui/components/forms/SearchInput.svelte`
   - Lines: 48-57
   - Issue: Textarea has no accessible label

9. **UI A11y: MarkdownEditor Missing Label**
   - File: `libs/engine/src/lib/components/admin/MarkdownEditor.svelte`
   - Lines: 579-592
   - Issue: Main textarea lacks accessible label

### High (P1) - 26 Issues

[Include all 26 high-priority issues from the original plan]

## Output Format

For each issue, provide:
```

### Issue X.Y: [Name]

- **Status**: VERIFIED / NOT_FOUND / ALREADY_FIXED
- **Root Cause**: [Brief explanation]
- **Fix Strategy**: [1-3 sentences describing the fix]
- **Risk Level**: LOW / MEDIUM / HIGH
- **Dependencies**: [Any other files or issues this depends on]

```

At the end, provide a summary:
- Total issues verified: X/35
- Already fixed: X
- Need manual review: X
- Ready for parallel fix: X
```

### Scout Output

The scout agent produces a verified issue list with fix strategies, which is then
distributed to the swarm agents.

---

## Phase 2: Swarm Agents

### Agent Configuration

| Agent | Domain              | Issues | Priority | Est. Time |
| ----- | ------------------- | ------ | -------- | --------- |
| A     | Content Security    | 6      | P0       | 45 min    |
| B     | Storage Security    | 6      | P0       | 45 min    |
| C     | Authentication      | 4      | P1       | 30 min    |
| D     | Core Infrastructure | 3      | P1       | 20 min    |
| E     | Analytics Privacy   | 3      | P0+P1    | 20 min    |
| F     | UI Accessibility    | 7      | P0+P1    | 40 min    |
| G     | Social & Federation | 2      | P1       | 15 min    |

### Swarm Agent Prompt Template

````markdown
# Security Fix Agent: {DOMAIN}

You are fixing security issues in the {DOMAIN} domain for Grove.

## Your Task

Fix ALL issues in your domain. For each issue:

1. **Read** the file and understand the context
2. **Implement** the fix following the provided strategy
3. **Test** by running: `cd packages/engine && pnpm test:run`
4. **Validate** the fix doesn't break existing functionality

## Issues to Fix

{ISSUES_FROM_SCOUT}

## Fix Guidelines

- **Minimal changes**: Only change what's necessary
- **Preserve behavior**: Don't change unrelated functionality
- **Add tests**: If fixing a security issue, add a test case
- **Document**: Add brief comments explaining security-critical code

## After Each Fix

Run tests to validate:

```bash
cd packages/engine && pnpm test:run
```
````

If tests fail:

1. Analyze the failure
2. Adjust the fix
3. Re-run tests
4. Maximum 2 retry attempts before flagging for manual review

## Output Format

For each issue fixed:

```
### Issue X.Y: [Name]
- **Status**: FIXED / NEEDS_MANUAL_REVIEW
- **Files Changed**: [list]
- **Lines Changed**: [approx count]
- **Test Result**: PASS / FAIL
- **Notes**: [any important context]
```

At the end, provide:

- Issues fixed: X/Y
- Tests passing: YES / NO
- Needs review: [list any issues that need manual attention]

````

---

## Phase 3: Validation

After all swarm agents complete:

### Orchestrator Validation Steps

1. **Collect Results**
   - Gather output from all 7 agents
   - Compile list of fixed issues and any failures

2. **Run Full Test Suite**
   ```bash
   pnpm test
````

3. **Run Type Check**

   ```bash
   pnpm -r check
   ```

4. **Run Build**

   ```bash
   pnpm -r build
   ```

5. **Manual Verification** (if time permits)
   - XSS test with malicious markdown
   - Cross-tenant access test
   - Accessibility audit with axe-core

### Handling Failures

If any agent's fixes cause test failures:

1. **Isolate**: Identify which fix broke tests
2. **Revert**: Temporarily revert that fix
3. **Retry**: Spawn a new agent to re-attempt with more context
4. **Escalate**: If retry fails, flag for manual review

---

## Phase 4: Commit

### Commit Message Template

```
fix(security): complete P0/P1 security remediation for v1

Critical fixes (P0):
- Content Security: SSR sanitization, markdown XSS
- Storage Security: Tenant isolation in R2, ownership verification
- Analytics Privacy: Remove PII logging
- UI Accessibility: Add missing ARIA labels

High-priority fixes (P1):
- Auth: Cookie domain handling, Turnstile signing
- Infrastructure: Type safety improvements
- Social: RSS feed URL, CSRF validation

35 issues addressed. See docs/plans/1.0-critical-high-remediation.md
for full issue details.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Orchestrator Execution Script

### How to Run This Plan

```markdown
# Run the 1.0 Security Remediation

Execute this plan using the parallel agent pattern:

## Step 1: Scout Phase

Spawn a single scout agent to verify all issues:
```

Use Task tool with subagent_type="general-purpose"
Prompt: [Scout Agent Prompt from above]

```

## Step 2: Swarm Phase

After scout completes, spawn 7 agents IN PARALLEL:

```

Use Task tool with subagent_type="haiku-coder" for each domain:

- Agent A: Content Security
- Agent B: Storage Security
- Agent C: Authentication
- Agent D: Core Infrastructure
- Agent E: Analytics Privacy
- Agent F: UI Accessibility
- Agent G: Social & Federation

IMPORTANT: Spawn all 7 in a SINGLE message with multiple Task tool calls
to maximize parallelism.

````

## Step 3: Validate

After all agents complete:
1. Run `pnpm test`
2. Run `pnpm -r check`
3. Run `pnpm -r build`

## Step 4: Commit

If all validations pass:
```bash
git add -A
git commit -m "[commit message from template]"
````

```

---

## Time Estimates

| Phase | Sequential | Parallel |
|-------|------------|----------|
| Scout | 2 hours | 2 hours |
| Swarm | 17 hours | 1 hour* |
| Validate | 1 hour | 1 hour |
| Commit | 0.5 hours | 0.5 hours |
| **Total** | **~21 hours** | **~4.5 hours** |

*All 7 agents run simultaneously

---

## Risk Mitigation

### Merge Conflicts
With 7 agents editing different files, conflicts are unlikely. However:
- Each domain has clear file ownership
- Scout phase identifies any shared dependencies
- Agents edit different directories (sanitize.ts ≠ storage.ts)

### Test Flakiness
- Run tests 2x if initial run shows unexpected failures
- Flaky tests are flagged, not blocking

### Incomplete Fixes
- Any issue that can't be fixed in 2 attempts is flagged for manual review
- Partial progress is still committed (better than nothing)

---

## Summary

This parallel execution plan transforms a 21-hour sequential task into a
~4.5-hour parallel execution using:

1. **Scout Phase**: Single agent verifies all issues (2h)
2. **Swarm Phase**: 7 agents fix in parallel (1h wall-clock)
3. **Validate Phase**: Full test suite (1h)
4. **Commit Phase**: Single comprehensive commit (0.5h)

The original `1.0-critical-high-remediation.md` remains as the source of truth
for issue details. This plan provides the execution strategy.

---

*Last Updated: January 16, 2026*
```
