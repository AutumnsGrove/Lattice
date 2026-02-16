---
name: raven-investigate
description: Cross-codebase security detective that fans out parallel sub-agents to rapidly audit ANY codebase's security posture. The noir investigator of the grove. Use when auditing an unfamiliar codebase, offering security review services, or needing a comprehensive security posture assessment fast.
---

# The Raven 🐦‍⬛

A dark figure arrives at a codebase it's never seen before. It doesn't panic. It doesn't rush. It perches, observes, and begins to piece together the story — every secret this code is hiding, every lock left open, every window left cracked. The Raven is the noir detective of the grove: methodical, sharp, comfortable in the unknown. Where the Hawk surveys territory it knows intimately across 14 deep domains, the Raven flies into _unfamiliar_ codebases and delivers a complete security posture assessment in a fraction of the time — by dispatching parallel investigators across every security domain simultaneously. When the case is closed, you know exactly where you stand: what's solid, what's cracked, and what needs immediate attention.

## When to Activate

- Auditing ANY codebase you haven't seen before
- Providing security review services to external projects
- Quick security posture assessment for a new client or repo
- User says "audit this codebase" or "security check" or "what's the security posture"
- User calls `/raven-investigate` or mentions security detective / security audit
- Pre-acquisition code review or due diligence
- Assessing whether an LLM/agent-maintained codebase follows security best practices
- Onboarding to a new project and wanting to know the security baseline

**IMPORTANT:** The Raven investigates ANY codebase — it is NOT Grove-specific. All checks are language-agnostic and framework-adaptive. The Raven detects the tech stack first, then applies the right checks for that stack.

**IMPORTANT:** The Raven's superpower is **parallel fan-out**. Phase 2 (CANVAS) launches multiple sub-agents simultaneously. This is not optional — it's the core design. Sequential investigation is the anti-pattern.

**Pair with:** `hawk-survey` for deep single-codebase assessment after Raven identifies areas of concern, `turtle-harden` for remediation of findings, `raccoon-audit` for secret cleanup

---

## The Investigation

```
ARRIVE → CANVAS → INTERROGATE → DEDUCE → CLOSE
   ↓        ↓          ↓           ↓        ↓
 Scope   Fan Out    Deep-Dive   Grade    Report
 Scene   Parallel   Findings    Posture  & Hand Off
         Agents
```

### Phase 1: ARRIVE

_A dark silhouette against the terminal glow. The Raven lands on the edge of an unfamiliar codebase. It doesn't touch anything yet — just watches. Listens. Takes in the shape of the place._

Establish the scene before investigating. Every case starts with knowing where you are.

**1A. Identify the Codebase**

```bash
# What are we looking at?
ls -la
cat README.md 2>/dev/null || cat readme.md 2>/dev/null
```

Record:

- **Project name** and purpose
- **Primary language(s)** (check file extensions, package files)
- **Framework(s)** in use
- **Rough size** (file count, line count if reasonable)

**1B. Detect the Tech Stack**

Look for these markers to identify the stack. Check ALL that apply:

| Marker File                                              | Stack                             | Security Implications                   |
| -------------------------------------------------------- | --------------------------------- | --------------------------------------- |
| `package.json`                                           | Node.js / JavaScript / TypeScript | npm audit, XSS, prototype pollution     |
| `tsconfig.json`                                          | TypeScript                        | strict mode, any usage                  |
| `requirements.txt` / `pyproject.toml` / `Pipfile`        | Python                            | pip audit, injection, pickle            |
| `go.mod`                                                 | Go                                | govulncheck, race conditions            |
| `Cargo.toml`                                             | Rust                              | cargo audit, unsafe blocks              |
| `Gemfile`                                                | Ruby                              | bundler-audit, mass assignment          |
| `pom.xml` / `build.gradle`                               | Java/Kotlin                       | OWASP dependency-check, deserialization |
| `composer.json`                                          | PHP                               | SQL injection, file inclusion           |
| `*.csproj`                                               | C# / .NET                         | NuGet audit, deserialization            |
| `Dockerfile` / `docker-compose.yml`                      | Containerized                     | image security, secrets in layers       |
| `wrangler.toml`                                          | Cloudflare Workers                | edge security, binding exposure         |
| `svelte.config.js` / `next.config.js` / `nuxt.config.ts` | Frontend framework                | CSP, CSRF, SSR security                 |
| `.env` / `.env.example`                                  | Environment config                | Secrets exposure risk                   |

**1C. Map the Architecture**

```bash
# Directory structure (top 3 levels)
find . -maxdepth 3 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' -not -path '*/venv/*' | head -80

# Is it a monorepo?
ls packages/ apps/ services/ 2>/dev/null
```

Identify:

- **Entry points** (API routes, server files, main functions)
- **Monorepo vs single package**
- **Database layer** (ORM, raw queries, which DB)
- **Auth system** (if visible from structure)
- **Public-facing surfaces** (routes, endpoints, static files)

**1D. Check for Existing Security Posture**

Quick pulse check — does this codebase ALREADY care about security?

```bash
# Security-adjacent files
ls .pre-commit-config.yaml .husky/ .git/hooks/ SECURITY.md .snyk .trivyignore .gitleaks.toml 2>/dev/null

# CI/CD security
ls .github/workflows/ .gitlab-ci.yml Jenkinsfile .circleci/ 2>/dev/null

# Gitignore health
cat .gitignore 2>/dev/null | head -30
```

**Output:** A "Scene Report" — tech stack, architecture shape, existing security signals. This determines what the parallel investigators will look for in Phase 2.

---

### Phase 2: CANVAS

_The Raven spreads its wings. From one, many — dark shapes fan out across the codebase, each investigating a different corner of the neighborhood simultaneously. The canvassing has begun._

**THIS IS THE CORE OF THE RAVEN'S POWER.** Launch parallel sub-agents using the `Task` tool. Each agent investigates one security domain independently. They run simultaneously, not sequentially.

**IMPORTANT IMPLEMENTATION NOTE:** Use the `Task` tool with `subagent_type: "general-purpose"` for each beat. Launch ALL beats in a single message as parallel tool calls. Each agent gets a self-contained prompt with specific search patterns for its domain. Agents report findings back as structured text.

**Fan out the following 6 investigation beats IN PARALLEL:**

---

#### Beat 1: Secrets & Credentials 🔑

**Agent prompt template:**

> Investigate this codebase for secrets, credentials, and sensitive data exposure. You are a security auditor. Search THOROUGHLY using Grep and Read tools. Report ALL findings.
>
> **Search for these patterns in ALL files (excluding node_modules, vendor, venv, .git, dist, build):**
>
> 1. **Hardcoded secrets** — Search for patterns:
>    - API keys: `sk-ant-`, `sk-`, `sk-or-`, `AIza`, `AKIA`, `ghp_`, `gho_`, `glpat-`, `xoxb-`, `xoxp-`
>    - Generic secrets: `secret`, `password`, `passwd`, `token`, `api_key`, `apikey`, `api-key`, `private_key`, `access_key`
>    - Connection strings: `mongodb://`, `postgres://`, `mysql://`, `redis://`, `amqp://`
>    - Private keys: `BEGIN.*PRIVATE KEY`
>    - JWTs: `eyJ[a-zA-Z0-9]`
> 2. **Secret file exposure** — Check if these exist AND are NOT in .gitignore:
>    - `.env`, `secrets.json`, `credentials.json`, `service-account*.json`
>    - `id_rsa`, `id_ed25519`, `*.pem`, `*.key`
>    - `.aws/credentials`, `.ssh/`
> 3. **Gitignore health** — Read `.gitignore` and check for:
>    - `.env` variants covered?
>    - `secrets*` covered?
>    - `*.key`, `*.pem` covered?
>    - IDE files (`.idea/`, `.vscode/` with settings)?
>    - OS files (`.DS_Store`, `Thumbs.db`)?
> 4. **Environment variable handling** — How does the codebase load secrets?
>    - `process.env.*` / `os.environ` / `os.Getenv` patterns
>    - Are there fallbacks to hardcoded values?
>    - Is there a secrets template file?
>
> **Report format:**
>
> ```
> ## Beat 1: Secrets & Credentials
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

#### Beat 2: Dependencies & Supply Chain 📦

**Agent prompt template:**

> Investigate this codebase's dependency security posture. You are a security auditor.
>
> **Check the following:**
>
> 1. **Lock file presence** — Does a lock file exist?
>    - `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`
>    - `Pipfile.lock` / `poetry.lock` / `uv.lock`
>    - `go.sum` / `Cargo.lock` / `Gemfile.lock` / `composer.lock`
>    - Is the lock file committed to git? (check .gitignore)
> 2. **Dependency audit** — Run the appropriate audit command if tools are available:
>    - `npm audit --json 2>/dev/null` or `pnpm audit --json 2>/dev/null`
>    - `pip audit 2>/dev/null`
>    - `govulncheck ./... 2>/dev/null`
>    - `cargo audit 2>/dev/null`
>    - If tools unavailable, read the lock file for known-vulnerable patterns
> 3. **Dependency hygiene:**
>    - How many direct dependencies? (read package manifest)
>    - Any pinned vs floating versions?
>    - Are dev dependencies separate from production?
>    - Any deprecated packages visible?
> 4. **Supply chain signals:**
>    - Is there a `renovate.json` / `dependabot.yml` for automated updates?
>    - Are there SRI hashes or integrity checks?
>    - Any vendored dependencies?
>    - Is there an `.npmrc` / `.yarnrc` with registry configuration?
>
> **Report format:**
>
> ```
> ## Beat 2: Dependencies & Supply Chain
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

#### Beat 3: Authentication & Access Control 🔐

**Agent prompt template:**

> Investigate this codebase's authentication and authorization posture. You are a security auditor.
>
> **Search for and evaluate:**
>
> 1. **Authentication patterns:**
>    - How are users authenticated? (sessions, JWTs, OAuth, API keys, basic auth)
>    - Search for: `login`, `signin`, `sign_in`, `authenticate`, `passport`, `auth`, `session`, `jwt`, `jsonwebtoken`, `bcrypt`, `argon2`, `pbkdf2`
>    - Password handling: hashing algorithm, salt usage, plain text storage
>    - Session management: cookie settings (HttpOnly, Secure, SameSite), expiry, regeneration
>    - OAuth/OIDC: PKCE usage, state parameter, token storage
>    - MFA/2FA: any multi-factor patterns?
> 2. **Authorization patterns:**
>    - How are routes/endpoints protected?
>    - Search for: `middleware`, `guard`, `protect`, `authorize`, `role`, `permission`, `isAdmin`, `isAuthenticated`, `requireAuth`
>    - Is there default-deny or default-allow?
>    - IDOR prevention: are resource accesses scoped to the authenticated user?
>    - Role-based access control (RBAC) or attribute-based (ABAC)?
> 3. **Session/Token security:**
>    - Cookie configuration: read any cookie-setting code
>    - Token expiry and refresh patterns
>    - Session invalidation on logout
>    - CSRF token usage
> 4. **Auth anti-patterns:**
>    - Credentials in URLs or query strings
>    - Auth bypass in test/debug modes
>    - Hardcoded admin accounts
>    - User enumeration via different error messages for "user not found" vs "wrong password"
>
> **Report format:**
>
> ```
> ## Beat 3: Authentication & Access Control
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

#### Beat 4: Input Validation & Injection 💉

**Agent prompt template:**

> Investigate this codebase for input validation and injection vulnerabilities. You are a security auditor.
>
> **Search for and evaluate:**
>
> 1. **SQL injection:**
>    - Search for string concatenation in queries: `"SELECT.*" +`, `` `SELECT.*${` ``, `f"SELECT`, `"SELECT.*%s`
>    - Parameterized queries: `?` placeholders, `$1` placeholders, named parameters
>    - ORM usage vs raw queries
>    - Any `exec()`, `eval()`, `raw()`, `unsafe()` in query context
> 2. **XSS (Cross-Site Scripting):**
>    - Search for: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `{@html`, `|safe`, `mark_safe`, `raw()`
>    - Template rendering: auto-escaped or manual?
>    - User input rendered in HTML context
>    - Sanitization libraries: `DOMPurify`, `sanitize-html`, `bleach`
> 3. **Command injection:**
>    - Search for: `exec(`, `spawn(`, `system(`, `popen(`, `subprocess`, `child_process`, `os.system`, `os.exec`
>    - Are user inputs passed to shell commands?
>    - Is there input sanitization before execution?
> 4. **Other injection vectors:**
>    - LDAP injection: `ldap` query construction
>    - XML injection / XXE: XML parsing configuration
>    - Path traversal: `../` handling, file path construction from user input
>    - Template injection (SSTI): user input in template strings
>    - Regex DoS (ReDoS): complex regex patterns with user input
> 5. **Validation patterns:**
>    - Is there a validation library? (Zod, Joi, Yup, class-validator, Pydantic, etc.)
>    - Server-side validation present? (not just client-side)
>    - Input length/range limits?
>    - Allowlists vs blocklists?
>    - Content-Type validation on uploads?
>
> **Report format:**
>
> ```
> ## Beat 4: Input Validation & Injection
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

#### Beat 5: HTTP Security & Error Handling 🛡️

**Agent prompt template:**

> Investigate this codebase's HTTP security headers, CSRF protection, CORS configuration, and error handling. You are a security auditor.
>
> **Search for and evaluate:**
>
> 1. **Security headers:**
>    - Content-Security-Policy (CSP): search for `Content-Security-Policy`, `csp`, `helmet`
>    - HSTS: `Strict-Transport-Security`
>    - X-Content-Type-Options: `nosniff`
>    - X-Frame-Options: `DENY` or `SAMEORIGIN`
>    - X-XSS-Protection (legacy but notable)
>    - Referrer-Policy
>    - Permissions-Policy
>    - Is there a security headers middleware? (helmet, secure-headers)
> 2. **CSRF protection:**
>    - CSRF tokens in forms?
>    - SameSite cookie attribute?
>    - Origin/Referer validation?
>    - Framework CSRF middleware enabled?
>    - Double-submit cookie pattern?
> 3. **CORS configuration:**
>    - Search for: `Access-Control-Allow-Origin`, `cors`, `CORS`
>    - Wildcard `*` origins?
>    - Credentials with wildcard? (critical misconfiguration)
>    - Origin reflection (reflecting request origin back)?
>    - Specific allowlist of origins?
> 4. **Error handling & information leakage:**
>    - Stack traces exposed to users in production?
>    - Search for: `stack`, `stackTrace`, `traceback`, `debug`, `DEBUG`
>    - Generic error messages for users vs detailed logs for operators?
>    - Custom error pages vs framework defaults?
>    - Sensitive data in error responses (internal paths, DB info, credentials)?
>    - `console.log` / `print` statements with sensitive data?
> 5. **Rate limiting:**
>    - Any rate limiting middleware? (express-rate-limit, slowapi, throttle)
>    - Rate limiting on auth endpoints?
>    - Rate limiting on API endpoints?
>    - DDoS protection configuration?
>
> **Report format:**
>
> ```
> ## Beat 5: HTTP Security & Error Handling
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

#### Beat 6: Development Hygiene & CI/CD 🧹

**Agent prompt template:**

> Investigate this codebase's development hygiene, CI/CD security, and operational security posture. You are a security auditor.
>
> **Search for and evaluate:**
>
> 1. **Pre-commit hooks:**
>    - `.pre-commit-config.yaml` — what hooks are configured?
>    - `.husky/` directory — what hooks exist?
>    - `.git/hooks/` — any custom hooks?
>    - `lefthook.yml` / `lint-staged` config?
>    - Is there secrets scanning in pre-commit? (gitleaks, detect-secrets, trufflehog)
>    - Commit message validation? (commitlint, conventional commits)
> 2. **CI/CD security:**
>    - Read ALL workflow files (`.github/workflows/*.yml`, `.gitlab-ci.yml`, etc.)
>    - Secrets in CI? (should use secrets manager, not env vars in config)
>    - Pinned action versions? (`uses: actions/checkout@v4` vs `@main`)
>    - Security scanning in CI? (SAST, DAST, dependency scanning)
>    - Branch protection mentioned in docs?
>    - Automated testing before deploy?
>    - Deployment secrets management?
> 3. **Code quality signals:**
>    - Linter configuration? (ESLint, Ruff, golint, clippy)
>    - Formatter configuration? (Prettier, Black, gofmt, rustfmt)
>    - Type checking? (TypeScript strict mode, mypy, type hints)
>    - Test coverage? (any coverage config or reports)
> 4. **Operational security:**
>    - `SECURITY.md` — vulnerability disclosure policy?
>    - `CODEOWNERS` — who reviews security-sensitive files?
>    - Docker security: running as root? secrets in Dockerfile? multi-stage builds?
>    - `.dockerignore` present and comprehensive?
>    - Logging configuration: structured logs? PII in logs?
>    - Monitoring/alerting configuration?
> 5. **Git hygiene:**
>    - `.gitignore` completeness
>    - Large files committed? (check for binaries, media, databases)
>    - Sensitive files in git history? (even if now gitignored)
>    - Branch naming conventions?
>    - Signed commits?
>
> **Report format:**
>
> ```
> ## Beat 6: Development Hygiene & CI/CD
> ### Findings
> - [CRITICAL/HIGH/MEDIUM/LOW/INFO] Description — file:line
> ### What's Present (Good)
> - [list of good practices found]
> ### What's Missing
> - [list of expected practices not found]
> ### Grade: [A/B/C/D/F]
> ```

---

**Output:** All 6 beat reports returned from parallel agents. The Raven now has the full picture.

---

### Phase 3: INTERROGATE

_The dark shapes return, one by one, dropping their findings at the Raven's feet. Some findings are damning. Some need a closer look. The Raven picks up each one, turns it over in its talons, and asks: "Is this what it appears to be?"_

Review findings from all 6 beats. Not everything reported is a real problem. The Raven validates.

**3A. Triage the Findings**

Sort ALL findings from ALL beats into severity:

| Severity     | Definition                                                                              | Action          |
| ------------ | --------------------------------------------------------------------------------------- | --------------- |
| **CRITICAL** | Actively exploitable, immediate risk (exposed secrets, SQL injection, no auth on admin) | Must fix NOW    |
| **HIGH**     | Significant vulnerability, exploitation likely (weak auth, missing headers, IDOR)       | Fix this sprint |
| **MEDIUM**   | Real risk but requires specific conditions (missing rate limiting, weak CORS)           | Plan to fix     |
| **LOW**      | Minor issue or defense-in-depth gap (info leakage in errors, missing HSTS)              | Good to fix     |
| **INFO**     | Observation, not a vulnerability (no SECURITY.md, no commit signing)                    | Nice to have    |

**3B. Validate Critical & High Findings**

For each CRITICAL or HIGH finding, the Raven MUST:

1. **Read the actual code** at the reported file:line
2. **Verify it's real** — not a false positive, not in test code, not behind auth
3. **Assess exploitability** — can this actually be reached by an attacker?
4. **Check for mitigating controls** — is there a WAF, middleware, or framework protection?

**3C. Cross-Reference Between Beats**

Some vulnerabilities compound:

- Missing CSRF + session cookies without SameSite = amplified risk
- SQL injection + no rate limiting = easy automated exploitation
- Exposed secrets + no rotation policy = prolonged compromise window
- No pre-commit hooks + no CI scanning = secrets WILL leak eventually

Note any compounding risks as **escalated findings**.

**Output:** Validated, triaged finding list with false positives removed and compounding risks identified.

---

### Phase 4: DEDUCE

_The Raven perches motionless. Every clue, every witness statement, every piece of evidence arranged in its mind. The picture forms. The deduction begins._

Synthesize all findings into a security posture assessment.

**4A. Grade Each Domain**

Assign a letter grade to each investigation beat:

| Grade | Meaning                                                           |
| ----- | ----------------------------------------------------------------- |
| **A** | Excellent — proactive security practices, no significant findings |
| **B** | Good — solid fundamentals, minor gaps                             |
| **C** | Adequate — basics present but notable gaps exist                  |
| **D** | Poor — significant vulnerabilities or missing fundamentals        |
| **F** | Failing — critical vulnerabilities or no security practices       |

**Grading rubric:**

- **A**: No CRITICAL/HIGH findings. 0-2 MEDIUM. Strong existing practices.
- **B**: No CRITICAL. 0-1 HIGH. Some MEDIUM. Good practices with minor gaps.
- **C**: No CRITICAL. 1-2 HIGH. Several MEDIUM. Basic practices present.
- **D**: 0-1 CRITICAL or 3+ HIGH. Fundamental practices missing.
- **F**: Multiple CRITICAL. No security practices evident. Active risk.

**4B. Calculate Overall Posture**

The overall grade is NOT an average — it's weighted:

1. **Secrets & Credentials** — weight 1.5x (leaked secrets = game over)
2. **Auth & Access Control** — weight 1.5x (broken auth = game over)
3. **Input Validation & Injection** — weight 1.25x (injection = RCE risk)
4. **HTTP Security & Error Handling** — weight 1.0x
5. **Dependencies & Supply Chain** — weight 1.0x
6. **Development Hygiene & CI/CD** — weight 0.75x (important but less immediate risk)

Calculate weighted score (A=4, B=3, C=2, D=1, F=0), divide by max possible. Map back to letter grade.

**4C. Identify the Narrative**

Every codebase tells a security story. The Raven deduces which narrative fits:

| Narrative              | Profile                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| **"Fort Knox"**        | A/A — Security-first culture, proactive practices, defense in depth      |
| **"Good Citizen"**     | B+ — Solid fundamentals, cares about security, minor blind spots         |
| **"Best Effort"**      | B-/C+ — Tried but inconsistent, some practices present, gaps in coverage |
| **"Bolted On"**        | C — Security added after the fact, visible but incomplete                |
| **"Wishful Thinking"** | D — .gitignore exists but that's about it                                |
| **"Open Season"**      | F — No meaningful security practices, actively dangerous                 |

**Output:** Graded domains, overall posture, narrative classification.

---

### Phase 5: CLOSE

_The Raven opens the case file one last time. Every finding documented. Every grade justified. Every recommendation actionable. The file is sealed with black wax. The case is closed._

Write the final report. This is the deliverable — the thing the client receives.

**5A. Write the Case File**

Create the report at the root of the INVESTIGATED codebase (or wherever the user specifies):

```markdown
# Security Posture Assessment — [Project Name]

> **Investigator:** The Raven 🐦‍⬛
> **Date:** [YYYY-MM-DD]
> **Codebase:** [repo name/URL]
> **Tech Stack:** [detected stack]
> **Overall Grade:** [LETTER] — "[Narrative]"

---

## Executive Summary

[2-3 sentences: What did we find? What's the overall posture? What's the most
urgent action?]

---

## Security Scorecard

| Domain                          | Grade     | Critical | High    | Medium  | Low     |
| ------------------------------- | --------- | -------- | ------- | ------- | ------- |
| Secrets & Credentials           | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Dependencies & Supply Chain     | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Authentication & Access Control | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Input Validation & Injection    | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| HTTP Security & Error Handling  | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| Development Hygiene & CI/CD     | [A-F]     | [n]      | [n]     | [n]     | [n]     |
| **Overall**                     | **[A-F]** | **[n]**  | **[n]** | **[n]** | **[n]** |

---

## Critical & High Findings

### [CRITICAL-001] [Title]

- **Domain:** [which beat]
- **Location:** `file:line`
- **Description:** [what's wrong]
- **Evidence:** [code snippet or proof]
- **Impact:** [what could happen]
- **Remediation:** [how to fix]
- **OWASP:** [relevant OWASP Top 10 category]

[Repeat for each CRITICAL and HIGH finding]

---

## Medium & Low Findings

### [MEDIUM-001] [Title]

- **Domain:** [which beat]
- **Location:** `file:line`
- **Remediation:** [how to fix]

[Repeat, keeping these shorter than critical/high]

---

## What's Working Well

[List the good security practices already in place. This matters —
it shows the client what to keep doing and builds trust.]

---

## Recommended Remediation Priority

### Immediate (This Week)

1. [Most urgent fix]
2. [Second most urgent]

### Short-Term (This Month)

1. [Important improvements]
2. [...]

### Medium-Term (This Quarter)

1. [Structural improvements]
2. [...]

### Ongoing

1. [Practices to adopt permanently]
2. [...]

---

## Methodology

This assessment was performed by scanning the codebase across 6 security
domains using parallel investigation agents. Each domain was graded
independently, then weighted to produce an overall posture grade.

Domains assessed:

1. Secrets & Credentials (weight: 1.5x)
2. Dependencies & Supply Chain (weight: 1.0x)
3. Authentication & Access Control (weight: 1.5x)
4. Input Validation & Injection (weight: 1.25x)
5. HTTP Security & Error Handling (weight: 1.0x)
6. Development Hygiene & CI/CD (weight: 0.75x)

Severity ratings follow OWASP risk rating methodology.

---

_Case closed. — The Raven 🐦‍⬛_
```

**5B. Provide Remediation Handoffs**

Based on findings, recommend the appropriate next steps:

| Finding Type           | Recommended Action                                   |
| ---------------------- | ---------------------------------------------------- |
| Exposed secrets        | `raccoon-audit` to clean and rotate                  |
| Auth vulnerabilities   | `spider-weave` to rebuild auth                       |
| Missing hardening      | `turtle-harden` for defense-in-depth                 |
| Deep assessment needed | `hawk-survey` for formal 14-domain audit             |
| Input validation gaps  | `turtle-harden` Phase 2 (LAYER) specifically         |
| Missing tests          | `beaver-build` for security regression tests         |
| Missing CI/CD security | `cicd-automation` skill or manual setup              |
| Dependency issues      | Update and pin dependencies, add Dependabot/Renovate |

**5C. Close the Case**

Summarize for the user:

```
🐦‍⬛ CASE CLOSED

Project: [name]
Overall Grade: [LETTER] — "[Narrative]"
Critical Findings: [n]
High Findings: [n]
Total Findings: [n]
Report: [file path]

[One-sentence recommendation for most impactful next action]
```

**Output:** Complete case file written, findings summarized, handoffs recommended.

---

## Raven Rules

### The Scene Comes First

Never start investigating without understanding what you're looking at. Phase 1 (ARRIVE) determines how Phase 2 (CANVAS) is configured. A Python Django app needs different searches than a Go microservice.

### Always Fan Out

Phase 2 MUST use parallel sub-agents. This is not a suggestion — it's the Raven's core architecture. Sequential investigation defeats the purpose. Launch all 6 beats simultaneously.

### Validate Before Reporting

Never report a finding without reading the actual code. False positives destroy credibility. Phase 3 (INTERROGATE) exists specifically to separate signal from noise.

### Grade Honestly

The grades must reflect reality. An "A" means genuine excellence, not just "nothing caught fire." An "F" means real danger, not just "could be better." Clients need truth, not comfort.

### Stack-Adaptive

Every search pattern in Phase 2 must adapt to the detected tech stack. Don't search for `innerHTML` in a Go CLI. Don't look for `go.sum` in a Python project. The Raven knows its territory.

### Communication

Use noir detective metaphors:

- "The evidence suggests..." (presenting findings)
- "The case file is clean on this beat." (domain passed)
- "Something doesn't add up here." (suspicious but unconfirmed)
- "This one's a smoking gun." (confirmed critical finding)
- "The trail goes cold." (insufficient evidence to confirm)
- "Case closed." (investigation complete)

---

## Anti-Patterns

**The Raven does NOT:**

- Investigate sequentially when parallel is possible — speed IS the value
- Report findings without reading the actual code — credibility is everything
- Apply Grove-specific checks to non-Grove codebases — the Raven is portable
- Fix vulnerabilities during investigation — assessment and remediation are separate
- Inflate severity to seem thorough — honest grading builds trust
- Skip any beat because "it's probably fine" — every domain gets investigated
- Assume a framework handles security automatically — verify, don't assume
- Include the codebase's actual secrets in the report — describe, don't expose

---

## Example Investigation

**User:** "Audit this Django REST API for security"

**Raven flow:**

1. 🐦‍⬛ **ARRIVE** — "The Raven lands. Python 3.11, Django 4.2, DRF 3.14. PostgreSQL. Docker Compose. Monolith, 47 endpoints. No SECURITY.md. Has a .pre-commit-config.yaml — interesting. Let's see what story this code tells."

2. 🐦‍⬛ **CANVAS** — "Wings spread. Six investigators dispatched simultaneously."
   - Beat 1 (Secrets): "Found a `.env` committed to git history. AWS keys in settings.py comments. Grade: D"
   - Beat 2 (Dependencies): "Lock file present, 3 high-severity CVEs in deps. Dependabot configured. Grade: C+"
   - Beat 3 (Auth): "DRF token auth, no refresh rotation, session timeout 30 days. No MFA. Grade: C"
   - Beat 4 (Injection): "ORM used consistently, one raw SQL query in reporting endpoint with string formatting. Sanitizer on uploads. Grade: B-"
   - Beat 5 (Headers): "SecurityMiddleware enabled, CSP missing, CORS allows wildcard with credentials. Error handler exposes stack in DEBUG. Grade: C-"
   - Beat 6 (Hygiene): "Pre-commit has black and isort, no secrets scanning. CI runs tests but no SAST. Grade: C"

3. 🐦‍⬛ **INTERROGATE** — "The AWS keys in comments — are they real? Checking... Yes, AKIA pattern, 20 chars, likely active. Escalating to CRITICAL. The raw SQL — can it be reached without auth? Checking... Yes, it's a public reporting endpoint. Confirmed HIGH. The CORS wildcard — credentials: true? Checking... Yes. Confirmed HIGH."

4. 🐦‍⬛ **DEDUCE** — "Overall Grade: C- — 'Bolted On'. This team tried but there are real gaps. 1 CRITICAL (AWS keys in history), 2 HIGH (SQL injection, CORS misconfiguration), 5 MEDIUM, 3 LOW."

5. 🐦‍⬛ **CLOSE** — "Case file written to `security-assessment-2026-02-16.md`. Recommendation: Rotate those AWS keys immediately, then bring in `raccoon-audit` for history cleanup and `turtle-harden` for the CORS and injection fixes. Case closed."

---

## Quick Decision Guide

| Situation                                            | Approach                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Unknown codebase, need full picture                  | Run all 5 phases, all 6 beats                                                       |
| Known codebase, periodic check                       | Skip detailed Phase 1, run all beats                                                |
| Specific concern (e.g., "are there leaked secrets?") | Run Phase 1 + Beat 1 only, then Phase 3-5                                           |
| Pre-deployment check                                 | Focus Beats 1, 4, 5 (secrets, injection, headers)                                   |
| Post-incident investigation                          | Focus Beats 1, 3 (secrets, auth) first                                              |
| Evaluating a new dependency/library                  | Focus Beats 2, 4 (deps, injection)                                                  |
| LLM/agent-maintained codebase                        | All beats, pay extra attention to Beat 6 (hygiene) and Beat 1 (secrets — LLMs leak) |

---

## Integration with Other Skills

**Before Investigation:**

- `bloodhound-scout` — If the codebase is massive and you need structural understanding before the Raven arrives

**After Investigation (Remediation):**

- `raccoon-audit` — Secret cleanup and rotation
- `turtle-harden` — Defense-in-depth hardening for findings
- `spider-weave` — Auth system rebuild if auth is graded D/F
- `hawk-survey` — Deep formal assessment if the Raven found concerning patterns that need 14-domain depth
- `beaver-build` — Security regression tests for fixed vulnerabilities
- `bee-collect` — Create GitHub issues from remediation items

**The Raven dispatches, it does not remediate.** Investigation and fixing are separate. Always.

---

## Adapting Beat Prompts by Tech Stack

The Raven adapts its investigation prompts based on what Phase 1 discovers. Here are stack-specific additions to include in beat prompts:

### Node.js / TypeScript

- Prototype pollution: `__proto__`, `constructor.prototype`
- `eval()`, `Function()`, `vm.runInContext`
- `child_process` usage
- Express/Koa middleware chain review

### Python

- Pickle deserialization: `pickle.loads`, `yaml.load` (without SafeLoader)
- `eval()`, `exec()`, `os.system()`, `subprocess` with `shell=True`
- Django `|safe` template filter, `mark_safe()`
- Flask `render_template_string()` (SSTI risk)

### Go

- `unsafe` package usage
- `fmt.Sprintf` in SQL context
- Race conditions: `-race` flag in tests?
- `net/http` without timeouts

### Ruby

- Mass assignment: `params.permit` vs `params.require`
- `send()` and `public_send()` with user input
- ERB `raw()` and `html_safe`
- Deserialization: `Marshal.load`, `YAML.load`

### PHP

- `eval()`, `system()`, `exec()`, `passthru()`, `shell_exec()`
- `include`/`require` with user input (LFI/RFI)
- `unserialize()` with user input
- `extract()` on user input
- `mysqli_query` with string concatenation

### Rust

- `unsafe` blocks — necessary or avoidable?
- `unwrap()` in production code (panic risk)
- External FFI calls
- `std::process::Command` with user input

---

_Every codebase has a story. The Raven reads it in the dark._ 🐦‍⬛
