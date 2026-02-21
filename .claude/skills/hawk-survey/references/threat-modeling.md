# Hawk Survey: Threat Modeling

> Loaded by hawk-survey during Phase 1 (CIRCLE). See SKILL.md for the full workflow.

---

## Phase 1A: Scope Definition

Establish what's being audited before examining anything:

```markdown
## Audit Scope

**Target:** [Full application / Subsystem / Service name]
**Boundary:** [What's in scope, what's explicitly out]
**Environment:** [Production / Staging / Local dev]
**Tech Stack:** [SvelteKit, Cloudflare Workers, D1, R2, KV, etc.]
**Access Level:** [Code review only / Code + config / Code + config + live testing]
```

If the scope is a **full application**, identify all major subsystems:
- Authentication & identity
- User-facing routes and pages
- Admin/privileged routes
- API endpoints (internal and external)
- Data storage (databases, KV, R2, file storage)
- Background jobs and scheduled tasks
- Third-party integrations
- Infrastructure configuration (Workers, DNS, CDN)
- Email and notification systems
- Content moderation and safety

If the scope is a **subsystem**, identify its boundaries and trust relationships with adjacent systems.

---

## Phase 1B: Threat Modeling (STRIDE)

For each major component or data flow, evaluate against STRIDE:

```
┌──────────────────────────────────────────────────────────────┐
│                    STRIDE THREAT MODEL                       │
├──────────────┬───────────────────────────────────────────────┤
│ Spoofing     │ Can an attacker pretend to be someone else?   │
│              │ Auth bypass, session hijacking, token forgery │
├──────────────┼───────────────────────────────────────────────┤
│ Tampering    │ Can an attacker modify data in transit/rest?  │
│              │ Parameter manipulation, DB injection, MITM    │
├──────────────┼───────────────────────────────────────────────┤
│ Repudiation  │ Can actions be performed without attribution? │
│              │ Missing audit logs, unsigned transactions     │
├──────────────┼───────────────────────────────────────────────┤
│ Info         │ Can an attacker access unauthorized data?     │
│ Disclosure   │ Error leakage, directory listing, IDOR       │
├──────────────┼───────────────────────────────────────────────┤
│ Denial of    │ Can an attacker disrupt availability?         │
│ Service      │ Resource exhaustion, ReDoS, unbounded queries │
├──────────────┼───────────────────────────────────────────────┤
│ Elevation of │ Can an attacker gain higher privileges?       │
│ Privilege    │ IDOR, missing authz, tenant escape            │
└──────────────┴───────────────────────────────────────────────┘
```

**Document the threat model as a table:**

```markdown
| Component         | S | T | R | I | D | E | Priority |
|-------------------|---|---|---|---|---|---|----------|
| Auth flow         | ! | . | ? | . | . | ! | HIGH     |
| Blog API          | . | ! | . | ? | ! | . | MEDIUM   |
| Admin panel       | ! | ! | ? | ! | . | ! | CRITICAL |
| File uploads      | . | ! | . | ! | ! | . | HIGH     |
| Payment flow      | ! | ! | ! | ! | . | ! | CRITICAL |
```

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

**Threat Actor Profiles** — consider each actor when filling the table:

| Actor | Motivation | Capability | Examples |
|-------|------------|------------|---------|
| Curious user | Discover what they can access | Low — pokes around the UI | Trying URLs, swapping IDs |
| Malicious user | Steal data, damage the app | Medium — reads docs, uses tools | SQLi, IDOR, CSRF |
| Competitor | Business disruption | Medium-High — targeted attack | DDoS, scraping, credential stuffing |
| Nation-state / APT | Espionage, persistent access | Very high — custom tooling | Supply chain, zero-days |
| Insider | Revenge, profit | High — knows the system | Exfiltrating user data, backdoors |
| Automated bot | Spam, credential stuffing | Medium — scripted | Account creation, brute force |

---

## Phase 1C: Trust Boundaries

Map where trust changes in the system:

```
UNTRUSTED                    TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser / Client                 │  SvelteKit Server (hooks.server.ts)
                                 │
External APIs / Webhooks         │  API Route Handlers (+server.ts)
                                 │
User-uploaded content            │  Content processing pipeline
                                 │
Tenant A's data                  │  Tenant B's data (isolation boundary)
                                 │
Worker A (public)                │  Worker B (service binding)
                                 │
Cloudflare edge                  │  Origin / D1 / R2
```

Every trust boundary crossing is a place where validation, authentication, or authorization must happen. Flag any boundary that lacks enforcement.

**Trust boundary checklist:**

- [ ] Browser → Server: All inputs validated server-side; client trust = zero
- [ ] External APIs → Handlers: Webhook signatures verified; responses validated
- [ ] Service Binding → Service: Caller identity established; not just "internal = trusted"
- [ ] Worker → D1/R2/KV: Queries parameterized; paths not user-controlled
- [ ] Tenant A → Tenant B: Hard isolation; no shared state, no cross-tenant queries

---

## Phase 1D: Data Classification

Identify and classify all data the system handles:

| Data Type | Classification | Storage | Examples |
|-----------|---------------|---------|----------|
| Credentials | CRITICAL | Hashed in D1 | Passwords, API keys |
| Session tokens | CRITICAL | Cookies / KV | Session IDs, JWTs |
| PII | HIGH | D1 | Email, name, address |
| Payment data | CRITICAL | External (Stripe) | Card tokens |
| User content | MEDIUM | D1 + R2 | Blog posts, images |
| Public config | LOW | Code / KV | Feature flags, themes |

For each CRITICAL or HIGH classification:
- Where does it enter the system?
- How is it stored (encryption, hashing, externalized)?
- Who can access it (role scoping, query scoping)?
- Is it logged anywhere? (It shouldn't be)
- What's the retention policy?

---

**Phase 1 Output:** Complete threat model with STRIDE analysis, trust boundaries, data classification, and prioritized component list for deep assessment in Phase 2.
