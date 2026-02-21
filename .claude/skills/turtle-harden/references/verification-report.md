# Turtle Harden: Verification & Report Reference

> Loaded by turtle-harden during Phase 5 (SEAL). See SKILL.md for the full workflow.

---

## 5A. Defense-in-Depth Compliance

Verify that security is layered — no single control is the only defense.

```
DEFENSE-IN-DEPTH VERIFICATION:
[ ] Network layer:  TLS enforced, HSTS active, rate limiting at edge (Cloudflare)
[ ] Application layer: Input validation, output encoding, CSP, auth, authz
[ ] Data layer: Encryption at rest, parameterized queries, least-privilege DB access
[ ] Infrastructure layer: Secrets management, isolated environments, secure configuration
[ ] Process layer: Code review, automated scanning, dependency auditing
```

**For each critical function, verify at least 2 layers of defense:**

| Function             | Layer 1               | Layer 2            | Layer 3             |
| -------------------- | --------------------- | ------------------ | ------------------- |
| Prevent XSS          | Output encoding       | CSP nonce-based    | Input validation    |
| Prevent CSRF         | SameSite cookies      | CSRF tokens        | Origin validation   |
| Prevent SQLi         | Parameterized queries | Input validation   | Least-privilege DB  |
| Prevent auth bypass  | Session validation    | Rate limiting      | Brute-force lockout |
| Prevent data leakage | Encryption in transit | Encryption at rest | Access control      |
| Tenant isolation     | App-level scoping     | DB-level RLS       | Cache key isolation |

---

## 5B. Logging & Monitoring Verification

```
LOGGING CHECKLIST:
[ ] Authentication events logged (login, logout, failed attempts, lockouts)
[ ] Authorization failures logged
[ ] Input validation failures logged (potential attack indicator)
[ ] Admin and privileged actions logged
[ ] Logs include: timestamp, user identity, IP, action, resource, result
[ ] Logs do NOT contain: passwords, tokens, session IDs, PII
[ ] Logs protected from tampering (centralized, append-only)
[ ] Alerting configured for: brute force, mass data access, error rate spikes
```

---

## 5C. Build Verification (MANDATORY)

Before generating the hardening report, verify the hardened code still builds and passes all checks.

```bash
# Sync dependencies
pnpm install

# Verify ONLY the packages the turtle touched — lint, check, test, build
gw ci --affected --fail-fast --diagnose
```

**If verification fails:** Hardening introduced a regression. Read the diagnostics, fix the issue (type errors from stricter validation, test failures from tighter security, etc.), re-run verification. The turtle does not seal a broken shell.

---

## 5D. Security-Specific Scan

```bash
# Check for secrets in code
grep -r "sk-live\|sk-test\|AKIA\|ghp_\|password\s*=" --include="*.{ts,js,json}" .

# Check for dangerous patterns
grep -r "eval(\|innerHTML\|dangerouslySetInnerHTML\|__proto__" --include="*.{ts,js,svelte}" .

# Check for disabled security
grep -r "nocheck\|no-verify\|unsafe-inline\|unsafe-eval" --include="*.{ts,js,json}" .

# Audit dependencies
pnpm audit
```

---

## 5E. Generate Hardening Report

```markdown
## TURTLE HARDENING REPORT

### Scope

- **Target:** [Feature/system/files reviewed]
- **Mode:** [Secure-by-design review / Existing code audit]
- **Threat model:** [Public-facing / Internal / Multi-tenant]

### Defense Layers Applied

| Layer                    | Status              | Notes                     |
| ------------------------ | ------------------- | ------------------------- |
| Input Validation         | [PASS/FAIL/PARTIAL] | [Details]                 |
| Output Encoding          | [PASS/FAIL/PARTIAL] | [Details]                 |
| SQL Injection Prevention | [PASS/FAIL/PARTIAL] | [Details]                 |
| Security Headers         | [PASS/FAIL/PARTIAL] | [Details]                 |
| CSP                      | [PASS/FAIL/PARTIAL] | [Details]                 |
| CORS                     | [PASS/FAIL/PARTIAL] | [Details]                 |
| Session Security         | [PASS/FAIL/PARTIAL] | [Details]                 |
| CSRF Protection          | [PASS/FAIL/PARTIAL] | [Details]                 |
| Rate Limiting            | [PASS/FAIL/PARTIAL] | [Details]                 |
| Auth Hardening           | [PASS/FAIL/PARTIAL] | [Details]                 |
| Authorization            | [PASS/FAIL/PARTIAL] | [Details]                 |
| Multi-Tenant Isolation   | [PASS/FAIL/PARTIAL] | [N/A if not multi-tenant] |
| File Upload Security     | [PASS/FAIL/PARTIAL] | [N/A if no uploads]       |
| Data Protection          | [PASS/FAIL/PARTIAL] | [Details]                 |

### Exotic Attack Vectors Tested

| Vector               | Status            | Notes |
| -------------------- | ----------------- | ----- |
| Prototype Pollution  | [CLEAR/FOUND/N/A] |       |
| Timing Attacks       | [CLEAR/FOUND/N/A] |       |
| Race Conditions      | [CLEAR/FOUND/N/A] |       |
| ReDoS                | [CLEAR/FOUND/N/A] |       |
| SSRF                 | [CLEAR/FOUND/N/A] |       |
| CRLF Injection       | [CLEAR/FOUND/N/A] |       |
| Unicode Attacks      | [CLEAR/FOUND/N/A] |       |
| Deserialization      | [CLEAR/FOUND/N/A] |       |
| postMessage          | [CLEAR/FOUND/N/A] |       |
| WebSocket Hijacking  | [CLEAR/FOUND/N/A] |       |
| CSS Injection        | [CLEAR/FOUND/N/A] |       |
| SVG XSS              | [CLEAR/FOUND/N/A] |       |
| Cache Poisoning      | [CLEAR/FOUND/N/A] |       |
| Open Redirects       | [CLEAR/FOUND/N/A] |       |
| Verb Tampering       | [CLEAR/FOUND/N/A] |       |
| Second-Order Attacks | [CLEAR/FOUND/N/A] |       |
| Supply Chain         | [CLEAR/FOUND/N/A] |       |

### Vulnerabilities Found

| ID  | Severity                 | Description | Fix Applied | Verified |
| --- | ------------------------ | ----------- | ----------- | -------- |
|     | CRITICAL/HIGH/MEDIUM/LOW |             | YES/NO      | YES/NO   |

### Defense-in-Depth Compliance

- **Layers verified:** [X/5]
- **Critical functions with 2+ defense layers:** [X/Y]

### Recommendations

- [Any remaining hardening steps]
- [Future considerations]

_The shell holds. Defense runs deep._ 🐢
```
