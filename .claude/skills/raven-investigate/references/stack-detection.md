# Raven Investigate: Stack Detection (Phase 1 — ARRIVE)

> Loaded by raven-investigate during Phase 1. See SKILL.md for the full workflow.
>
> This file contains the complete stack detection marker table and stack-specific beat prompt additions. Use the marker table to identify all applicable stacks, then append the relevant additions to the sub-agent prompts in Phase 2.

---

## Stack Detection Marker Table

Look for these files to identify the tech stack. Check ALL that apply — many codebases are polyglot:

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

---

## Stack-Specific Beat Prompt Additions

After identifying the stack in Phase 1, append these additions to the relevant beat prompts when launching sub-agents in Phase 2. Include the relevant section(s) based on what was detected.

### Node.js / TypeScript

Add to Beat 4 (Input Validation & Injection) and Beat 3 (Auth):

- **Prototype pollution:** Search for `__proto__`, `constructor.prototype`, `Object.assign` with user input
- **Dangerous evaluation:** `eval()`, `Function()`, `vm.runInContext`, `vm.runInNewContext`
- **Child process:** `child_process.exec` / `spawn` / `execSync` with user-controlled input
- **Express/Koa middleware chain:** Are security middlewares (helmet, cors, csurf) applied before route handlers?
- **TypeScript strictness:** Is `strict: true` in tsconfig? Are there `any` casts on user-controlled data?

### Python

Add to Beat 4 (Input Validation & Injection) and Beat 5 (HTTP Security):

- **Pickle deserialization:** `pickle.loads`, `yaml.load` (without SafeLoader), `marshal.loads`
- **Dangerous execution:** `eval()`, `exec()`, `os.system()`, `subprocess` with `shell=True`
- **Django templates:** `|safe` filter, `mark_safe()`, `format_html()` usage — is user input ever passed through?
- **Flask SSTI risk:** `render_template_string()` with user content
- **SQLAlchemy raw:** `text()` with string formatting, `.execute()` with concatenated SQL
- **Django ORM:** `extra()`, `RawSQL()`, `raw()` — parameterized?

### Go

Add to Beat 4 (Input Validation & Injection) and Beat 3 (Auth):

- **Unsafe package:** Any `unsafe` package imports — are they necessary or avoidable?
- **SQL in fmt:** `fmt.Sprintf` or string formatting in any SQL context
- **Race conditions:** Is `-race` flag used in tests? Any shared mutable state without sync?
- **HTTP timeouts:** `net/http` client/server without explicit timeout configuration
- **Error handling:** Are errors silently discarded (e.g., `_ = err`)? Can this hide security failures?

### Ruby

Add to Beat 4 (Input Validation & Injection) and Beat 3 (Auth):

- **Mass assignment:** `params.permit` vs `params.require` — are attributes allowlisted?
- **Dynamic dispatch:** `send()` and `public_send()` with user-controlled method names
- **ERB output:** `raw()`, `html_safe`, `<%== %>` — is user input marked safe?
- **Deserialization:** `Marshal.load`, `YAML.load` (without safe_load) with user input
- **Rails-specific:** `protect_from_forgery` enabled? Strong parameters configured?

### PHP

Add to Beat 4 (Input Validation & Injection):

- **Code execution:** `eval()`, `system()`, `exec()`, `passthru()`, `shell_exec()`, `proc_open()` with user input
- **File inclusion:** `include`/`require` with user-controlled paths (LFI/RFI vulnerabilities)
- **Deserialization:** `unserialize()` with user input (PHP object injection)
- **Variable extraction:** `extract()` on `$_GET`/`$_POST`/`$_REQUEST` (variable overwrite)
- **SQL:** `mysqli_query`/`mysql_query` with string concatenation vs prepared statements

### Rust

Add to Beat 4 (Input Validation & Injection):

- **Unsafe blocks:** Any `unsafe {}` blocks — are they necessary? Documented?
- **Panic in production:** `unwrap()` / `expect()` in production code paths — could user input trigger a panic?
- **FFI calls:** External C function calls via FFI — are inputs validated before crossing the FFI boundary?
- **Process execution:** `std::process::Command` with user-controlled arguments — are args validated?
- **Integer overflow:** Arithmetic on user-provided values without checked/saturating operations?

### Containerized (Docker)

Add to Beat 6 (Development Hygiene & CI/CD):

- **Running as root:** Does the Dockerfile set a non-root USER before CMD/ENTRYPOINT?
- **Secrets in layers:** Are secrets ever `COPY`ed or `ENV`'d into the image?
- **Multi-stage builds:** Are build dependencies excluded from the final image?
- **.dockerignore:** Does it exclude `.env`, credentials, `.git`, and development files?
- **Base image pinning:** Is the base image pinned by digest or just a mutable tag like `latest`?
- **Image scanning:** Is there a Trivy, Snyk, or similar scan in CI?

### Cloudflare Workers

Add to Beat 3 (Auth) and Beat 5 (HTTP Security):

- **Binding exposure:** Are D1, KV, R2, DO bindings validated before use? Can user input influence which binding is accessed?
- **Environment variable secrets:** Are secrets in `wrangler.toml` (committed) vs Cloudflare Secrets (safe)?
- **Edge auth:** Is auth validated at the edge before forwarding to origin, or only at origin?
- **CORS at edge:** Is CORS configured correctly for the edge worker, not just the origin?
- **Worker size limits:** Are there bundle size optimizations that might remove security code?

### Frontend Frameworks (Svelte/Next.js/Nuxt)

Add to Beat 4 (Input Validation & Injection) and Beat 5 (HTTP Security):

- **SSR data exposure:** Is server-side data (including secrets) accidentally exposed to the client bundle?
- **Hydration attacks:** User-controlled content rendered during SSR without sanitization?
- **API routes security:** Are Next.js/SvelteKit server routes protected the same as dedicated API servers?
- **CSP in framework config:** Is CSP configured at the framework level, or only in headers?
- **Client-side auth:** Any auth checks that exist only in client-side code (bypassable)?
