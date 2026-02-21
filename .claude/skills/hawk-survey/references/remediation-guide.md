# Hawk Survey: Remediation Guide

> Loaded by hawk-survey during Phase 5 (RETURN). See SKILL.md for the full workflow.

---

## When Phase 5 Activates

Phase 5 activates ONLY after the grove keeper has reviewed the report and approved remediation. The Hawk descends from assessment into action. Without explicit approval, the Hawk does not act — it waits.

---

## Phase 5A: Remediation Planning

After the grove keeper reviews findings, plan the remediation pass:

**Step 1: Confirm scope**
- Which findings are approved for remediation now?
- Which are deferred (and why)?
- Which need a different animal to handle?

**Step 2: Route to the right animal**

Many findings are better handled by a specialist. Use this routing table:

| Finding Type | Recommended Animal | Why |
|-------------|-------------------|-----|
| Auth flow redesign, PKCE, session architecture | `spider-weave` | Auth specialist |
| Header hardening, input validation, defense-in-depth | `turtle-harden` | Hardening specialist |
| Secret rotation, git history cleaning, pre-commit hooks | `raccoon-audit` | Secrets specialist |
| Security regression tests after fixes | `beaver-build` | Test specialist |
| Tracking deferred findings as GitHub issues | `bee-collect` | Issue tracking |

**Step 3: Identify what the Hawk fixes directly**

The Hawk can handle directly:
- Configuration changes (cookie attributes, header settings)
- Simple query parameterization fixes
- Rate limiting additions (straightforward cases)
- Infrastructure misconfiguration corrections
- Findings that are isolated and don't require architectural changes

**Step 4: Order the work**

Work in priority order from the report:
1. CRITICAL findings first — before anything else
2. HIGH findings second
3. MEDIUM findings third
4. LOW and INFO last (or defer to backlog)

---

## Phase 5B: Systematic Remediation

Work through approved findings one at a time:

```
For each approved finding:
1. Read the affected code (confirm the finding still exists)
2. Apply the fix described in the remediation
3. Verify the fix addresses the finding
4. Note what was changed (for the remediation summary)
```

**Rules for remediation:**
- Fix one finding at a time — don't batch unrelated changes
- Each fix should be independently verifiable
- Don't introduce new functionality during remediation (fix only)
- If a fix is complex enough to warrant its own feature branch, flag it for a separate session
- If fixing one finding reveals another, log it as a new finding — don't fix it in-flight

---

## Phase 5C: Verification Pass

After all approved fixes are applied, verify thoroughly:

```bash
# Re-scan for the specific patterns from findings
# Run the application's test suite
# Type-check
npx svelte-check --tsconfig ./tsconfig.json

# Dependency audit
pnpm audit
```

For each finding that was fixed:
- [ ] Fix applied
- [ ] Fix verified (the vulnerability no longer exists)
- [ ] No regression introduced
- [ ] Tests pass
- [ ] Type checker clean

---

## Phase 5D: Remediation Summary

Update the report with remediation status. Add this section to the hawk report:

```markdown
## Remediation Summary

| ID | Severity | Finding | Status | Fix Description |
|----|----------|---------|--------|----------------|
| HAWK-001 | CRITICAL | [desc] | FIXED | [what was changed] |
| HAWK-002 | HIGH | [desc] | FIXED | [what was changed] |
| HAWK-003 | HIGH | [desc] | DEFERRED | [reason] |
| HAWK-004 | MEDIUM | [desc] | DELEGATED | Recommend turtle-harden |

### Remaining Risk

[Description of any deferred or delegated findings and their risk]
```

**Status values:**
- **FIXED** — Remediation applied and verified in this session
- **DEFERRED** — Approved to address later; include rationale and target date
- **DELEGATED** — Handed off to a specialist animal; include which animal and when
- **ACCEPTED** — Grove keeper accepts the risk as-is; document the decision

---

## Handoff Templates

When delegating to another animal, provide a clear handoff note:

**To turtle-harden:**
```
Hawk survey identified N hardening findings in [scope].
See hawk-report-[date].md for full details.

Key hardening needs:
- [Finding ID]: [description] at [file:line]
- [Finding ID]: [description] at [file:line]

Priority: fix HAWK-XXX before next deploy.
```

**To raccoon-audit:**
```
Hawk survey found potential secret exposure issues in [scope].
See hawk-report-[date].md for full details.

Secret findings:
- [Finding ID]: [description]
- [Finding ID]: [description]

Check git history for any leaked values before rotating.
```

**To spider-weave:**
```
Hawk survey found auth architecture issues in [scope].
See hawk-report-[date].md for full details.

Auth redesign needed:
- [Finding ID]: [description]
- [Finding ID]: [description]

Current flow is documented in the threat model section of the report.
```

**To beaver-build:**
```
Hawk survey complete on [scope] — [N] findings remediated.
See hawk-report-[date].md for what was fixed.

Security regression tests needed for:
- [What was fixed and should be covered]
- [What was fixed and should be covered]

Prioritize tests for CRITICAL and HIGH findings.
```

---

**Phase 5 Output:** All approved findings remediated and verified. Report updated with remediation summary. Remaining risk documented. The grove is surveyed.
