# Raven Investigate: Sub-Agent Definitions (Phase 2 — CANVAS)

> Loaded by raven-investigate during Phase 2. See SKILL.md for the full workflow.
>
> This file contains all 6 parallel investigation beat prompts. Launch ALL beats simultaneously using the `Task` tool with `subagent_type: "general-purpose"`. Each agent is self-contained — copy the prompt template verbatim and add any stack-specific additions identified in Phase 1.

---

## Beat 1: Secrets & Credentials

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

## Beat 2: Dependencies & Supply Chain

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

## Beat 3: Authentication & Access Control

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

## Beat 4: Input Validation & Injection

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

## Beat 5: HTTP Security & Error Handling

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

## Beat 6: Development Hygiene & CI/CD

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
