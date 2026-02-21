# Hawk Survey: Attack Surface Mapping

> Loaded by hawk-survey during Phase 2 (DESCEND). See SKILL.md for the full workflow.

---

## Phase 2A: Route & Endpoint Inventory

Catalog every route and endpoint in scope:

```bash
# Find all SvelteKit routes
find src/routes -name "+page.svelte" -o -name "+page.server.ts" -o -name "+server.ts" -o -name "+layout.server.ts" | sort

# Find all API endpoints
find src/routes/api -name "+server.ts" | sort

# Find all form actions
grep -r "export const actions" --include="*.ts" -l
```

For each route, document:

| Route | Methods | Auth Required | Tenant Scoped | Accepts Input | Risk |
|-------|---------|--------------|---------------|---------------|------|
| `/api/posts` | GET, POST | Yes | Yes | POST body | Medium |
| `/api/account/delete` | POST | Yes | Yes | Confirmation | High |
| `/auth/callback` | GET | No | No | Query params | Critical |
| `/api/upload` | POST | Yes | Yes | File + metadata | High |

Risk factors that elevate a route's rating:
- Accepts file uploads
- No authentication required
- Modifies or deletes data
- Handles payment information
- Creates new tenants or users
- Proxies to external services (SSRF surface)
- Returns data from multiple tenants

---

## Phase 2B: Authentication & Session Architecture

Map the complete auth flow:

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ 1. Login request
                    ┌──────▼──────┐
                    │  SvelteKit  │
                    │  Server     │──── 2. PKCE OAuth ────▶ Heartwood
                    └──────┬──────┘                          │
                           │ 4. Set session cookie     3. Validate
                    ┌──────▼──────┐                     & return token
                    │   Browser   │
                    │ (with cookie)│
                    └──────┬──────┘
                           │ 5. Subsequent requests
                    ┌──────▼──────┐
                    │hooks.server │──── 6. Validate session
                    │    .ts      │     (service binding)
                    └─────────────┘
```

Document for every session mechanism:
- How sessions are created, validated, and destroyed
- Cookie attributes (HttpOnly, Secure, SameSite, Domain, Path, Expiry)
- Token lifecycle (access token, refresh token, session token)
- What happens on session expiry — does the UI reflect this?
- Logout completeness: all cookies cleared? Server-side invalidation?

**Auth flow entry points to examine:**
- `/auth/login` or equivalent
- `/auth/callback` (OAuth return)
- `/auth/logout`
- `/auth/refresh` or session renewal
- Password reset flow (if applicable)
- "Remember me" implementation (if applicable)

---

## Phase 2C: Authorization Model

For each protected resource, document the authorization check:

| Resource | Check Location | Check Type | Verified |
|----------|---------------|------------|----------|
| Admin pages | `arbor/+layout.server.ts` | Role check | ? |
| User's posts | `+page.server.ts` | Tenant + ownership | ? |
| File uploads | `+server.ts` | Auth + tenant + quota | ? |
| Account deletion | `+server.ts` | Auth + confirmation | ? |

Flag any resource where:
- Authorization is checked in layout only (bypassable via direct API call)
- Authorization relies on client-side checks
- No authorization check exists at all
- The check uses role names from user-controlled input
- Ownership is inferred from context rather than explicitly verified

**Authorization check patterns to search for:**

```bash
# Find layout-only auth guards (potentially bypassable)
grep -r "locals.user" src/routes --include="*.ts" -l

# Find server-side auth checks
grep -r "requireAuth\|checkRole\|ensureAuth" src --include="*.ts" -l

# Find places where tenant_id comes from user input (risk: IDOR)
grep -r "params.tenantId\|url.searchParams.get.*tenant" src --include="*.ts"
```

---

## Phase 2D: Data Flow Mapping

For each sensitive data type from Phase 1D, trace its complete lifecycle:

```
User Input ──▶ Validation ──▶ Processing ──▶ Storage ──▶ Retrieval ──▶ Output
     │              │              │             │            │            │
  Sanitized?    Schema?      Escaped?      Encrypted?   Scoped?    Encoded?
```

Document where each data type:
- **Enters** the system — what validation exists at the boundary?
- **Is processed** — what transformations occur? Are intermediate states safe?
- **Is stored** — how is it protected at rest? Hashed? Encrypted? Externalized?
- **Is retrieved** — what access controls apply to the query?
- **Is output** — how is it encoded for the output context (HTML, JSON, URL)?

**Data flow search commands:**

```bash
# Find places where user data goes to the DB
grep -r "db.prepare\|db.run\|db.get\|db.all" src --include="*.ts" -l

# Find template literal SQL (injection risk)
grep -r "db.prepare\`\|sql\`" src --include="*.ts"

# Find HTML output from user content
grep -r "{@html" src --include="*.svelte"

# Find redirect calls (open redirect surface)
grep -r "redirect(" src --include="*.ts"
```

---

## Phase 2E: Infrastructure Inventory

For Cloudflare/Grove deployments, catalog all bindings and services:

```markdown
## Infrastructure Components

### Workers
| Worker | Purpose | Bindings | Public | Auth |
|--------|---------|----------|--------|------|
| grove-router | Routing | KV, DO | Yes | No |
| grove-auth | Auth | D1, KV | Yes | Partial |
| grove-blog | Blog | D1, R2, KV | Yes | Yes |

### D1 Databases
| Database | Tables | Tenant Column | RLS |
|----------|--------|--------------|-----|
| grove-main | posts, users, ... | tenant_id | ? |

### R2 Buckets
| Bucket | Purpose | Public | Path Isolation |
|--------|---------|--------|---------------|
| grove-media | User uploads | Via Worker | /tenant_id/... |

### KV Namespaces
| Namespace | Purpose | Sensitive Data |
|-----------|---------|---------------|
| sessions | Session store | Yes |
| cache | Content cache | No |

### Service Bindings
| From | To | Purpose | Auth Verified |
|------|-----|---------|--------------|
| blog | auth | Session validation | ? |

### Secrets
| Secret | Worker | Rotation Policy |
|--------|--------|----------------|
| JWT_SECRET | auth | ? |
| STRIPE_KEY | shop | ? |
```

**Infrastructure discovery commands:**

```bash
# Find all wrangler.toml files
find . -name "wrangler.toml" | sort

# List all bindings declared
grep -r "kv_namespaces\|d1_databases\|r2_buckets\|services\|\[\[durable_objects" . --include="wrangler.toml"

# Find secrets usage in code
grep -r "env\." src --include="*.ts" | grep -v "node_env\|PUBLIC_" | sort -u
```

---

## Phase 2F: Dependency Surface

```bash
# Audit for known vulnerabilities
pnpm audit

# Count total dependencies (surface area indicator)
ls node_modules | wc -l

# Find dependencies with install scripts (supply chain risk)
grep -r '"postinstall"' node_modules/*/package.json | head -20

# Find packages with broad filesystem or network access
grep -r '"dependencies"' package.json | head -5
```

Review findings and flag:
- Any critical or high vulnerabilities from `pnpm audit`
- Packages with postinstall scripts (potential supply chain vector)
- Packages with unusual filesystem or network permissions
- Packages that appear suspicious or are very new with high download counts

---

**Phase 2 Output:** Complete attack surface map with routes, auth flows, authorization model, data flows, infrastructure inventory, and dependency surface ready for systematic audit in Phase 3.
