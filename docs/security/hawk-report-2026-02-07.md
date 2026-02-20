# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** Zephyr Social — Bluesky Cross-Posting Feature
**Scope:** All new and modified files for the social broadcast feature (12 files across Worker API, Engine client, Arbor admin UI, and gw CLI)
**Date:** 2026-02-07
**Assessor:** Hawk Survey (automated security assessment)
**Overall Risk Rating:** LOW

### Key Findings

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 0     |
| Medium   | 2     |
| Low      | 3     |
| Info     | 4     |

### Top 3 Risks

1. **[MEDIUM] `timingSafeEqual` leaks key length via early return** — Allows attackers to determine the exact length of the valid API key through timing analysis
2. **[MEDIUM] `/templates` endpoint has no auth** — Pre-existing issue (not introduced by this PR) that leaks internal template names to unauthenticated callers
3. **[LOW] Idempotency check fails open** — D1 outage during idempotency check could result in duplicate social media posts

---

## Threat Model

### Scope Definition

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| **Target**       | Zephyr Social Broadcast subsystem                                             |
| **Boundary**     | New broadcast API endpoints, Bluesky provider, Arbor admin UI, gw CLI command |
| **Environment**  | Production (Cloudflare Workers)                                               |
| **Tech Stack**   | Hono (Worker), @atproto/api (Bluesky), SvelteKit (UI), Python/Click (CLI)     |
| **Access Level** | Code review only                                                              |

### STRIDE Analysis

| Component                   | S   | T   | R   | I   | D   | E   | Priority |
| --------------------------- | --- | --- | --- | --- | --- | --- | -------- |
| Auth middleware (X-API-Key) | ?   | .   | .   | ?   | .   | .   | MEDIUM   |
| Broadcast handler           | .   | .   | .   | .   | ?   | .   | LOW      |
| Bluesky provider            | .   | .   | .   | ?   | .   | .   | LOW      |
| Arbor admin UI              | .   | .   | .   | .   | .   | .   | LOW      |
| gw CLI                      | .   | .   | .   | ?   | .   | .   | LOW      |
| Content adapter             | .   | .   | .   | .   | .   | .   | LOW      |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

### Trust Boundaries

```
UNTRUSTED                    TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser (Arbor admin page)       │  SvelteKit Server (+page.server.ts)
                                 │  → Wayfinder gate (email allowlist)
                                 │
gw CLI (local machine)           │  Zephyr Worker (auth middleware)
                                 │  → X-API-Key validation
                                 │
Zephyr Worker (our code)         │  Bluesky API (external)
                                 │  → App password authentication
                                 │
SvelteKit Server                 │  Zephyr Worker (service binding)
                                 │  → X-API-Key validation
```

### Data Classification

| Data Type             | Classification | Storage                       | Notes                             |
| --------------------- | -------------- | ----------------------------- | --------------------------------- |
| Bluesky app password  | CRITICAL       | Cloudflare Secret             | Never in code, never logged       |
| Zephyr API key        | CRITICAL       | Cloudflare Secret             | Validated via timing-safe compare |
| Bluesky session token | HIGH           | Worker memory (cached)        | Cleared on auth failure           |
| Broadcast content     | MEDIUM         | D1 (zephyr_broadcasts)        | User-authored social content      |
| Post URLs             | LOW            | D1 (zephyr_social_deliveries) | Public Bluesky post links         |
| Wayfinder emails      | LOW            | Hardcoded in source           | Admin email allowlist             |

---

## Findings

### MEDIUM

#### [HAWK-001] `timingSafeEqual` Leaks API Key Length via Early Return

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| **Severity**   | MEDIUM                                              |
| **Domain**     | Authentication (D1)                                 |
| **Location**   | `workers/zephyr/src/middleware/auth.ts:23-26`       |
| **Confidence** | HIGH                                                |
| **OWASP**      | A07:2021 Identification and Authentication Failures |

**Description:**
The `timingSafeEqual` function returns `false` immediately when string lengths differ, before performing the constant-time comparison. This leaks the length of the valid API key through timing differences — an attacker can determine the exact key length by measuring response times with keys of varying lengths.

**Evidence:**

```typescript
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false; // ← Immediate return leaks length
	}
	// ... constant-time comparison follows
}
```

**Impact:**
An attacker who can make many requests to the API could determine the exact length of the API key. This reduces the key's entropy for brute-force attacks. However, the practical risk is low because: (1) Cloudflare Workers add variable network latency that masks timing differences, (2) the key is validated to be at least 16 chars, and (3) brute-forcing even a known-length key of 32+ chars is computationally infeasible.

**Remediation:**
Hash both inputs with SHA-256 before comparing (guarantees equal-length inputs):

```typescript
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const [hashA, hashB] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(a)),
		crypto.subtle.digest("SHA-256", encoder.encode(b)),
	]);
	const viewA = new Uint8Array(hashA);
	const viewB = new Uint8Array(hashB);
	let result = 0;
	for (let i = 0; i < viewA.length; i++) {
		result |= viewA[i] ^ viewB[i];
	}
	return result === 0;
}
```

**Needs Manual Verification:** No — fully assessable from code.

**Pre-existing:** Yes — this code predates the social broadcast feature.

---

#### [HAWK-002] `/templates` Endpoint Has No Authentication

| Field          | Value                               |
| -------------- | ----------------------------------- |
| **Severity**   | MEDIUM                              |
| **Domain**     | Authorization (D2)                  |
| **Location**   | `workers/zephyr/src/index.ts:42-48` |
| **Confidence** | HIGH                                |
| **OWASP**      | A01:2021 Broken Access Control      |

**Description:**
The `GET /templates` endpoint lists all available email template names without requiring `authMiddleware`. While this only returns template names (not template content or data), it reveals internal system information to unauthenticated callers.

**Evidence:**

```typescript
// All other state-changing or data endpoints use authMiddleware:
app.post("/send", authMiddleware, sendHandler);
app.post("/broadcast", authMiddleware, broadcastHandler);
app.get("/broadcast/platforms", authMiddleware, platformsHandler);

// But /templates is wide open:
app.get("/templates", async (c) => {
	const { TEMPLATES } = await import("./templates");
	return c.json({ templates: Object.keys(TEMPLATES), version: "1.0.0" });
});
```

**Impact:**
Low — template names are not sensitive. But information disclosure helps attackers map the system's capabilities (e.g., knowing a "PasswordReset" template exists tells them there's a password reset flow to probe).

**Remediation:**
Add `authMiddleware` to the endpoint:

```typescript
app.get("/templates", authMiddleware, async (c) => { ... });
```

**Needs Manual Verification:** No — fully assessable from code.

**Pre-existing:** Yes — this code predates the social broadcast feature.

---

### LOW

#### [HAWK-003] Idempotency Check Fails Open

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| **Severity**   | LOW                                                |
| **Domain**     | Data Protection (D4)                               |
| **Location**   | `workers/zephyr/src/handlers/broadcast.ts:251-254` |
| **Confidence** | HIGH                                               |
| **OWASP**      | A04:2021 Insecure Design                           |

**Description:**
If the D1 idempotency query throws an error (e.g., D1 outage), the handler logs the error and proceeds to create a new broadcast anyway. This means a D1 outage could result in duplicate social media posts.

**Evidence:**

```typescript
} catch (err) {
  // Idempotency check failed — proceed anyway (fail-open)
  console.error("[Zephyr] Idempotency check failed:", err);
}
```

**Impact:**
During a D1 outage, retried requests or double-clicks could result in duplicate Bluesky posts. The impact is limited because: (1) D1 outages are rare, (2) social posts are not financial transactions, and (3) duplicate posts can be manually deleted.

**Remediation:**
This is a deliberate design choice (fail-open) and is acceptable for social posting. If stricter behavior is desired in the future, return a 503 when the idempotency check fails. No change recommended for now.

**Needs Manual Verification:** No — design decision is documented in code.

---

#### [HAWK-004] Hardcoded Zephyr Worker URL in Three Locations

| Field          | Value                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | LOW                                                                                                                                           |
| **Domain**     | Data Protection (D4)                                                                                                                          |
| **Location**   | `libs/engine/src/lib/zephyr/client.ts:265`, `libs/landing/src/routes/arbor/zephyr/+page.server.ts:6`, `tools/gw/src/gw/commands/social.py:15` |
| **Confidence** | HIGH                                                                                                                                          |
| **OWASP**      | A05:2021 Security Misconfiguration                                                                                                            |

**Description:**
The Zephyr Worker URL (`https://grove-zephyr.m7jv4v7npb.workers.dev`) is hardcoded in three separate files. This is a Cloudflare Workers subdomain, not a credential, but it means the URL is discoverable and changes require updating multiple files.

**Impact:**
The URL itself is not sensitive — all endpoints behind it require API key authentication. However, hardcoding creates a maintenance burden and the URL could be targeted for DoS (mitigated by Cloudflare's built-in DDoS protection).

**Remediation:**
Consider centralizing this URL as an environment variable or engine config constant. Low priority — not a security vulnerability.

**Needs Manual Verification:** No.

---

#### [HAWK-005] Module-Level Mutable State in Bluesky Provider

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| **Severity**   | LOW                                                   |
| **Domain**     | Infrastructure (D11)                                  |
| **Location**   | `workers/zephyr/src/providers/bluesky.ts:22-26,64-65` |
| **Confidence** | MEDIUM                                                |
| **OWASP**      | N/A                                                   |

**Description:**
`circuitState`, `cachedAgent`, and `sessionExpiresAt` are module-level globals. In Cloudflare Workers, isolate lifetimes are unpredictable — these work correctly within a single isolate but reset across cold starts. The session cache could theoretically become stale if an isolate lives longer than the AT Protocol session.

**Impact:**
Minimal — the 90-minute session cache with 5-minute buffer is well within AT Protocol's ~2-hour session lifetime. Cold starts simply trigger a fresh login. The circuit breaker resets on cold start, which is actually desirable behavior.

**Remediation:**
No change needed. This is the standard pattern for Workers and works correctly. The session refresh buffer provides adequate safety margin.

**Needs Manual Verification:** No.

---

### INFORMATIONAL

#### [HAWK-006] Positive: Consistent Parameterized SQL Queries

All D1 queries across the entire feature use parameterized `.bind()` — zero string concatenation in SQL. This is exemplary protection against SQL injection.

**Locations:**

- `workers/zephyr/src/handlers/broadcast.ts:197-200,398-416,420-441`
- `libs/landing/src/routes/arbor/zephyr/+page.server.ts:34-45`

---

#### [HAWK-007] Positive: Error Sanitization in Bluesky Provider

The `sanitizeError()` function strips password, token, and Bearer patterns from error messages before they reach callers. Error messages are also capped at 500 characters. The broadcast handler returns generic error messages to external callers while logging details server-side.

**Location:** `workers/zephyr/src/providers/bluesky.ts:115-125`

---

#### [HAWK-008] Positive: Double Authorization Gate on Admin UI

The Arbor Zephyr page uses two-layer authorization:

1. **Load function:** `parent().isWayfinder` check (redirects non-admins)
2. **Form action:** `locals.user` existence + `WAYFINDER_EMAILS` email check

This prevents both unauthorized page access and action execution.

**Location:** `libs/landing/src/routes/arbor/zephyr/+page.server.ts:9-11,78-82`

---

#### [HAWK-009] Positive: `secrets.json` in `.gitignore`

The CLI's `secrets.json` file (used for API key storage) is properly gitignored, preventing accidental credential commits.

**Location:** `.gitignore:1`

---

## Domain Scorecard

| Domain           | Rating  | Findings   | Notes                                                   |
| ---------------- | ------- | ---------- | ------------------------------------------------------- |
| Authentication   | PARTIAL | 1 finding  | timingSafeEqual length leak (pre-existing)              |
| Authorization    | PARTIAL | 1 finding  | /templates endpoint unauthenticated (pre-existing)      |
| Input Validation | PASS    | 0 findings | Content length, metadata truncation, platform allowlist |
| Data Protection  | PASS    | 1 finding  | Fail-open idempotency (deliberate design)               |
| HTTP Security    | PASS    | 0 findings | Server-to-server only, no CORS needed                   |
| CSRF Protection  | PASS    | 0 findings | SvelteKit form actions use progressive enhancement      |
| Session Security | PASS    | 0 findings | N/A for API key auth pattern                            |
| File Uploads     | N/A     | 0 findings | No file uploads in this feature                         |
| Rate Limiting    | PASS    | 0 findings | Circuit breaker on provider, Cloudflare built-in        |
| Multi-Tenant     | PASS    | 0 findings | Single-tenant design (Wayfinder-only)                   |
| Infrastructure   | PASS    | 1 finding  | Module-level state (standard Workers pattern)           |
| Exotic Vectors   | PASS    | 0 findings | No prototype pollution, SSRF, or injection vectors      |
| Supply Chain     | PASS    | 0 findings | @atproto/api is the official Bluesky SDK                |

---

## Items Requiring Manual Verification

| ID  | Finding                     | What to Test                                                                              | Confidence in Code Analysis |
| --- | --------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| —   | Rate limiting effectiveness | Send many rapid requests to `/broadcast` and measure if Cloudflare rate limiting kicks in | MEDIUM                      |
| —   | Bluesky session refresh     | Let a cached session age past 90 minutes and verify re-authentication works               | MEDIUM                      |

---

## Remediation Priority

### Immediate (fix before next deploy)

_None — no critical or high findings._

### Short-term (fix within 1 week)

- HAWK-001: Fix `timingSafeEqual` length leak (pre-existing, low practical risk)
- HAWK-002: Add auth to `/templates` endpoint (pre-existing, low impact)

### Medium-term (track and plan)

- HAWK-004: Centralize Zephyr Worker URL into config

### Accepted Risk

- HAWK-003: Fail-open idempotency (deliberate design choice, acceptable for social posting)
- HAWK-005: Module-level state (standard Workers pattern, works correctly)

---

## Positive Observations

The Zephyr Social broadcast feature demonstrates strong security practices:

1. **Zero SQL injection surface** — Every D1 query uses parameterized bindings, no exceptions
2. **Defense-in-depth on admin access** — Wayfinder gate in both load function AND form actions
3. **Error sanitization** — Bluesky provider strips credentials from error messages before returning
4. **Generic error messages** — Broadcast handler returns "An internal error occurred" to callers, logs details server-side
5. **Content validation** — Input validated at multiple layers: length limits, allowlist filtering, empty checks
6. **Circuit breaker pattern** — Prevents cascading failures to Bluesky API
7. **Idempotency by default** — Auto-generated fallback keys prevent duplicate posts from retries
8. **Secrets in proper storage** — Bluesky credentials in Cloudflare Secrets, API key in secrets.json (gitignored)
9. **Service binding preferred** — Worker-to-Worker calls use service binding with bare fetch as fallback only

The two MEDIUM findings (HAWK-001, HAWK-002) are both **pre-existing issues** in the Zephyr worker that were not introduced by this feature. The new code itself introduces no new security vulnerabilities.

---

_The hawk has spoken. Every path surveyed, every shadow examined._ 🦅
