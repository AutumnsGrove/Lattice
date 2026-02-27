# Burrow Integration Research

*Comprehensive analysis of cross-property access patterns, industry solutions, and implementation complexity assessment for Grove's Burrow system.*

**Date:** February 2026
**Status:** Research & Planning (no implementation)
**Related:** [Burrow Spec](../specs/burrow-spec.md) | [Heartwood Spec](../specs/heartwood-spec.md)

---

## Table of Contents

1. [What Burrow Is](#what-burrow-is)
2. [What Already Exists in the Codebase](#what-already-exists)
3. [Industry Research: How Others Solve This](#industry-research)
4. [Security Analysis: Token Handoff Patterns](#security-analysis)
5. [Complexity Assessment](#complexity-assessment)
6. [Integration Surface with Heartwood](#integration-surface)
7. [Recommended Architecture Refinements](#recommended-refinements)
8. [Implementation Roadmap & Effort Estimate](#implementation-roadmap)
9. [Open Questions](#open-questions)
10. [Sources](#sources)

---

## What Burrow Is

Burrow is Grove's system for **trusted cross-property access**. When two Grove properties are both in greenhouse mode, a Wanderer can move from one to the other with a single click -- no new account, no separate login. The source property creates a short-lived handoff token, the target property validates it and creates a local session with role-constrained permissions.

**The core flow:**
```
User in Arbor → clicks "Enter The Prism" → handoff token generated →
redirect to target → token validated → local session created →
user arrives with appropriate permissions
```

**Key constraints:**
- Both properties must be in greenhouse mode (trust boundary)
- Permissions are `min(user_role, burrow_max_permission)` -- you can never escalate
- Tokens are single-use, 5-minute TTL, stored in KV
- The Wayfinder (Autumn) has universal access via `wayfinder_burrow` graft

---

## What Already Exists

### Complete (Ready to Build On)

| Asset | Status | Notes |
|-------|--------|-------|
| **Burrow specification** | 1,115 lines, comprehensive | Database schema, API surface, UI mockups, security model, 8-phase implementation plan |
| **Terminology** | Finalized | Burrow, Dig, Fill, Receiving, Surface |
| **Greenhouse mode** | Implemented in production | `greenhouse_tenants` table, KV caching, feature flag integration, management API |
| **Heartwood auth** | Implemented in production | Better Auth + SessionDO + OAuth, session validation, user records in D1 |
| **Feature flags (Grafts)** | Implemented in production | `wayfinder_burrow` graft defined in spec, flag evaluation system ready |
| **User database** | Implemented | `users` table with `groveauth_id`, `tenant_id`, `is_active` |
| **Workshop UI** | Listed as "planned" | Burrow appears in workshop tool listing with icon and sub-components |
| **Term manifest** | Added | Burrow entry in `grove-term-manifest.json` |

### Not Yet Implemented

| Component | Complexity | Depends On |
|-----------|-----------|------------|
| `burrow_endpoints` table | Low | D1 migration |
| `burrows` table | Low | D1 migration |
| `burrow_audit_log` table | Low | D1 migration |
| Burrow service functions | Medium | Database tables, KV namespace |
| Handoff token generation/validation | Medium | HMAC utilities, BURROW_KV namespace |
| Arbor UI ("Your Burrows" section) | Medium | Burrow service, existing Arbor UI |
| Wayfinder management UI | Medium | Burrow service, existing Arbor UI |
| Target property middleware | Medium-High | Hooks integration, session creation |
| Permission enforcement | Medium | Role mapping logic |

---

## Industry Research

### The Spectrum of Solutions

After researching dozens of platforms and protocols, cross-property access solutions fall on a spectrum from "trivially simple" to "massively complex":

```
SIMPLE                                                           COMPLEX
  |                                                                 |
  Subdomain     Discourse     Shopify       Cloudflare    ActivityPub
  Cookies       Connect       Multipass     Zero Trust    Federation
  (same domain) (HMAC+nonce)  (AES+HMAC)   (dual JWT)    (HTTP sigs)
                    |
               Burrow sits
               right here
```

### Pattern 1: Discourse Connect (Most Similar to Burrow)

**What it is:** Discourse's proprietary SSO protocol for connecting forums to external auth systems.

**How it works:**
1. Generate a nonce, base64-encode it with a return URL
2. Sign the payload with HMAC-SHA256 using a shared secret
3. Redirect user to the external auth endpoint with `?sso=PAYLOAD&sig=HMAC`
4. External system authenticates user, builds response payload (email, username, groups, admin status)
5. Signs response, redirects back to Discourse
6. Discourse validates HMAC, creates/updates local user, starts session

**Why it matters for Burrow:**
- Almost identical to Burrow's handoff flow
- Uses HMAC-SHA256 (same as Burrow's spec)
- Nonce-based replay protection (Burrow uses single-use KV tokens)
- Can pass role/group information in the payload (Burrow passes permission level)
- Battle-tested in production across thousands of Discourse instances
- No encryption of the payload -- just signing (Burrow's KV-backed approach is actually more secure since the payload never travels in the URL)

**Key difference:** Discourse Connect sends the full payload in the URL (base64-encoded, signed but readable). Burrow's design is better -- only an opaque token travels in the URL, with the actual payload stored server-side in KV.

### Pattern 2: Shopify Multipass (Most Secure Simple Approach)

**What it is:** Shopify's cross-site login for Plus merchants.

**How it works:**
1. Derive encryption key and signing key from a shared secret via SHA-256
2. Build JSON payload with user info
3. Encrypt with AES-128-CBC (random IV)
4. Sign the ciphertext with HMAC-SHA256
5. Redirect to `store.myshopify.com/account/login/multipass/TOKEN`

**Why it matters for Burrow:**
- Token is encrypted AND signed (belt and suspenders)
- 15-minute TTL, single-use
- Self-contained: no server-side state needed for validation
- Shopify creates accounts automatically if they don't exist

**Key difference:** Multipass is self-contained (no server-side lookup). Burrow uses server-side KV, which enables instant revocation and guaranteed single-use via atomic delete. Burrow's approach is architecturally better for its use case.

### Pattern 3: Cloudflare Zero Trust (Most Sophisticated)

**What it is:** Cloudflare's dual-JWT system for multi-application access.

**How it works:**
1. User authenticates once, gets a global `CF_Authorization` JWT
2. When accessing a new application, Cloudflare evaluates the app's specific policy
3. Issues a per-application JWT if policy passes
4. Each app gets its own scoped credential with independent expiration

**Why it matters for Burrow:**
- Demonstrates the "authenticate once, authorize per-resource" pattern
- Per-application tokens with independent policies = per-property burrow permissions
- Session revocation is near-instant (20-30 seconds network-wide)

**Key difference:** Cloudflare sits as a reverse proxy between user and all applications. Burrow doesn't have that luxury -- properties are independent Workers. The handoff must be explicit (redirect-based) rather than transparent (proxy-based).

### Pattern 4: WordPress Multisite (Simplest Database Approach)

**What it is:** Single user table with per-site role prefixes in shared metadata.

**How it works:**
- One `wp_users` table for all sites
- Per-site capabilities stored as `wp_{blog_id}_capabilities` in `wp_usermeta`
- `switch_to_blog()` changes the active database context
- Super Admin bypasses all per-site checks

**Why it matters for Burrow:**
- Shows that cross-property access doesn't require complex protocols when you control the database
- The "permission prefix" pattern maps to Burrow's per-property permission records
- Super Admin = Wayfinder override

**Key difference:** WordPress sites share a database. Grove properties are separate D1 databases on separate Workers. Burrow needs the handoff mechanism that WordPress doesn't need.

### Pattern 5: IndieAuth / Federated Protocols (Overkill for Burrow)

**What they are:** IndieAuth (URL-as-identity + OAuth), ActivityPub (HTTP Signatures + federation), Zot/Hubzilla (nomadic identity + cross-server ACLs), AT Protocol (DIDs + signed repos).

**Why they're informative but not applicable:**
- These solve cross-server trust between **independent operators** who don't trust each other
- Burrow operates within a **trusted greenhouse** where both properties are under the same infrastructure
- The cryptographic complexity of federated protocols (key exchange, HTTP Signatures, DID resolution) is unnecessary when you have shared KV and a shared secret

**The one exception -- Hubzilla/Zot's "Magic Auth":**
- Zot achieves exactly what Burrow wants: seamless one-click access across properties with fine-grained permissions
- But Zot does it across untrusted servers, requiring complex key management
- Burrow can achieve the same UX with a fraction of the protocol complexity because the greenhouse is the trust boundary

### Pattern 6: GitHub Organizations (Best Role Model)

**What it is:** Global user identity + per-org team RBAC + scoped tokens.

**Why it matters for Burrow:**
- A user has one identity but different roles in different organizations
- Fine-grained PATs are scoped to a single org (= burrow tokens scoped to target property)
- GitHub Apps generate per-installation tokens for cross-org access
- The pattern of "authenticate globally, authorize per-boundary" is exactly Burrow's model

---

## Security Analysis

### Burrow's Token Design vs. Industry Best Practices

| Aspect | Burrow's Design | Industry Best Practice | Assessment |
|--------|----------------|----------------------|------------|
| **Token format** | Opaque HMAC token, payload in KV | Opaque token with server-side state | Correct |
| **Single-use** | Atomic KV delete on validation | `GETDEL` or equivalent atomic operation | Correct |
| **TTL** | 5 minutes | 30-60 seconds for redirect handoffs | **Consider shortening to 60 seconds** |
| **Signing** | HMAC-SHA256 | HMAC-SHA256 | Correct |
| **Token transport** | Query parameter in redirect URL | Query parameter with immediate cleanup | Correct |
| **Replay prevention** | Single-use + nonce | Single-use + nonce + IP binding | **Consider adding IP/UA binding** |
| **Referrer leakage** | Not addressed in spec | `Referrer-Policy: no-referrer` header | **Add to spec** |
| **URL cleanup** | Not addressed in spec | Immediate redirect to clean URL after validation | **Add to spec** |

### Recommended Security Enhancements

1. **Shorten handoff TTL to 60 seconds.** The 5-minute window is generous. A browser redirect + KV lookup takes <2 seconds. 60 seconds provides ample buffer for slow connections while reducing the interception window from 5 minutes to 1 minute.

2. **Add IP binding.** Store the user's IP at token creation. Verify it matches at validation. This prevents token theft via URL snooping (attacker would need to be on the same IP).

3. **Set `Referrer-Policy: no-referrer`** on the redirect response and the token-consuming landing page. This prevents the token from leaking to third-party resources via the Referer header.

4. **Immediate URL cleanup.** After validating the token, respond with a 302 redirect to the same page without the `burrow_token` parameter. This removes the token from browser history and the address bar.

5. **Don't load third-party resources** on the token validation page before the redirect. No analytics, no CDN fonts, nothing that could leak the URL.

### Why HMAC + KV Is the Right Choice (Not JWT)

The spec already chose correctly, but here's the full reasoning for the record:

- **JWTs can't be single-use without server-side state.** The whole point of JWT is stateless verification. But single-use requires state (tracking consumed tokens). Adding state defeats the purpose of JWT.
- **JWTs expose claims.** Even signed JWTs carry base64-encoded (not encrypted) payloads. Anyone who intercepts the token can read the permissions, user ID, and target. Burrow's opaque tokens reveal nothing.
- **JWTs invite algorithm confusion attacks.** The `alg` header in JWTs has been the source of multiple CVEs. Opaque tokens have no algorithm to confuse.
- **KV lookup is faster than JWT verification** on Cloudflare Workers. KV reads are ~1-5ms. JWT parsing + signature verification is similar but with more code complexity.

---

## Complexity Assessment

### How Hard Is This to Build?

**Short answer: Medium complexity. The hardest part is the middleware integration, not the token handoff.**

Here's a breakdown by component:

### Easy (You've Done Harder Things Already)

| Component | Why It's Easy | Estimated Effort |
|-----------|--------------|-----------------|
| Database migration (3 tables + indexes) | Straightforward D1 SQL, similar to existing migrations | Small |
| Burrow service CRUD (`digBurrow`, `fillBurrow`, `getBurrows`) | Standard D1 operations with the existing `database.ts` helpers | Small |
| KV caching for burrow data | Same pattern as greenhouse KV caching (`greenhouse.ts`) | Small |
| `wayfinder_burrow` graft creation | One feature flag entry, using existing graft system | Trivial |
| Audit logging | INSERT to `burrow_audit_log`, same as any D1 write | Small |

### Medium (New Patterns but Well-Understood)

| Component | Why It's Medium | Estimated Effort |
|-----------|----------------|-----------------|
| Handoff token generation | HMAC-SHA256 is built into Web Crypto API on Workers. KV write with TTL. Conceptually simple but security-critical, needs careful implementation. | Medium |
| Handoff token validation | KV read + delete (single-use), verify metadata, create session. The atomic delete is the tricky part. | Medium |
| Arbor UI ("Your Burrows" section) | New Svelte component in existing Arbor layout. Data from `getBurrows()`. Standard UI work. | Medium |
| Wayfinder management UI | Form to dig/fill burrows, table of active burrows. Standard admin CRUD UI. | Medium |
| Permission calculation | `min(user_role, burrow_max)` logic. Straightforward but needs good test coverage. | Small-Medium |

### Hard (The Real Challenge)

| Component | Why It's Hard | Estimated Effort |
|-----------|--------------|-----------------|
| **Target property middleware** | This is where the complexity lives. The target property's `hooks.server.ts` needs to detect `?burrow_token`, validate it, create a local session that coexists with or replaces the normal Heartwood session, and enforce burrow-specific permissions throughout the request lifecycle. This touches the most sensitive code in the engine. | Large |
| **Session coexistence** | When a user burrows into a property, they may already have a Heartwood session on that property (as a different user, or as themselves with different permissions). The system needs to handle: burrow session vs. native session priority, "Surface" (exit burrow) restoring the previous session, and session display (showing "Burrowed from autumn.grove.place" in the UI). | Large |
| **Cross-Worker token sharing** | The handoff token is created by the source property's Worker and validated by the target property's Worker. Both need access to the same KV namespace (`BURROW_KV`). This requires the KV namespace to be bound in both Workers' `wrangler.toml` configurations. | Medium |

### The One Thing That Makes This Simpler Than It Seems

**All Grove properties run on the same engine.** This is the key simplifying factor compared to federated protocols. Since every property is a deployment of `libs/engine`, the burrow middleware only needs to be implemented once. Every property automatically gets burrow support when you update the engine. You don't need to convince independent operators to implement a protocol.

### The One Thing That Makes This Harder Than It Seems

**Session management in `hooks.server.ts` is already complex.** The file is 627 lines with a 3-level session fallback chain (SessionDO → Better Auth cookie → Legacy access token). Adding burrow session detection and management to this chain requires careful integration. The risk isn't conceptual -- it's that a bug in the burrow path could break normal authentication for all users.

---

## Integration Surface with Heartwood

### Current Auth Architecture

```
Browser
  ├── grove_session cookie ──→ SessionDO (Durable Object)
  │                              └── POST /session/validate
  │                              └── Returns: { valid, user: { id, email, name, isAdmin } }
  │
  ├── better-auth cookie ────→ Better Auth session
  │                              └── Direct session lookup
  │
  └── access_token cookie ───→ GroveAuth /userinfo (legacy fallback)
                                 └── Returns: { sub, email, name, picture }
```

### Where Burrow Plugs In

```
Browser arrives with ?burrow_token=xyz
  │
  ├── BEFORE normal auth chain ──→ Check for burrow_token param
  │     1. Extract token from URL
  │     2. Validate against BURROW_KV (atomic delete)
  │     3. Verify IP/UA match
  │     4. If valid:
  │         a. Set burrow session cookie
  │         b. Redirect to clean URL (no token param)
  │         c. On next request, burrow cookie takes priority
  │     5. If invalid:
  │         a. Redirect to error page
  │         b. Fall through to normal auth
  │
  ├── Normal auth chain (existing) ──→ SessionDO / Better Auth / Legacy
  │
  └── Burrow session check ──→ New cookie: grove_burrow_session
        1. If burrow cookie exists AND is valid:
           a. Set locals.burrowSession = { source, permissions, userId }
           b. Override locals.user with burrow permissions
           c. Add "burrowed" indicator to response
        2. If not:
           a. Normal auth continues
```

### Key Integration Points

| File | What Changes | Risk |
|------|-------------|------|
| `hooks.server.ts` | Add burrow token detection + burrow session validation to auth chain | High -- most critical file |
| `app.d.ts` | Add `burrowSession` type to `App.Locals` | Low |
| `wrangler.toml` | Add `BURROW_KV` binding + `BURROW_SECRET` secret | Low |
| Arbor layout | Add "Your Burrows" section, "Surface" button | Medium |
| Route guards | Check `locals.burrowSession.permissions` for authorization | Medium |

### What Doesn't Need to Change

- **GroveAuth / Better Auth** -- Burrow doesn't touch the identity provider. It uses the existing user identity.
- **SessionDO** -- Burrow sessions are separate from Heartwood sessions. They coexist.
- **User table** -- Burrowed users don't get new user records on the target. They're identified by their source user ID.
- **Tenant isolation** -- Burrow sessions still respect tenant boundaries. The burrow just determines *which* tenant context is active.

---

## Recommended Architecture Refinements

Based on industry research, here are refinements to the current spec:

### 1. Shorten Handoff TTL

**Current:** 5 minutes
**Recommended:** 60 seconds

The redirect + KV lookup takes <2 seconds. 60 seconds is more than enough buffer. Every second of TTL is a second the token could be intercepted.

### 2. Add Post-Validation URL Cleanup

After validating the burrow token, the target property should:
```
302 Redirect → same URL without ?burrow_token parameter
Set-Cookie: grove_burrow_session=...
Referrer-Policy: no-referrer
```

This removes the token from browser history, the address bar, and prevents referrer leakage.

### 3. Bind Tokens to Client Context

Store the user's IP and user-agent hash at token creation. Verify at validation:
```typescript
interface BurrowHandoffToken {
  // ... existing fields ...
  client_ip: string;        // IP at token creation
  client_ua_hash: string;   // SHA-256 of User-Agent at creation
}
```

This prevents token theft -- an attacker who extracts the token from a URL would need to be on the same IP with the same browser.

### 4. Use Cloudflare's `crypto.subtle` for HMAC

Don't import an HMAC library. Cloudflare Workers have the Web Crypto API built in:
```typescript
const key = await crypto.subtle.importKey(
  'raw',
  encoder.encode(BURROW_SECRET),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
);
const signature = await crypto.subtle.sign('HMAC', key, data);
```

Zero dependencies, native performance, correct implementation.

### 5. Consider a Burrow Session Cookie Strategy

Rather than a completely separate cookie, consider encoding the burrow session as a claim within the existing session mechanism. However, if Heartwood sessions are managed by SessionDO (external service), it may be cleaner to keep burrow sessions separate:

```
grove_burrow_session = HMAC-signed JSON {
  burrow_id: string,
  source_tenant: string,
  target_property: string,
  user_id: string,
  permissions: PermissionLevel,
  created_at: number,
  expires_at: number
}
```

This is validated locally (no SessionDO round-trip) since the engine signs and verifies it using `BURROW_SECRET`.

---

## Implementation Roadmap

### Phase 0: Foundation (Smallest Useful Increment)

**Goal:** Wayfinder can burrow into any greenhouse property.

1. Create D1 migration for `burrow_endpoints`, `burrows`, `burrow_audit_log`
2. Create `wayfinder_burrow` graft
3. Implement `isWayfinder()` check
4. Implement `configureReceiving()` for Wayfinder
5. Add BURROW_KV namespace binding

**Why start here:** This is the simplest useful slice. One user (Wayfinder), one flow (burrow in), one target type (any property). No UI needed yet -- can be tested via API.

### Phase 1: Core Service

**Goal:** The burrow service can create, list, revoke, and validate burrows.

1. Implement `canBurrow()`, `digBurrow()`, `fillBurrow()`, `getBurrows()`
2. Implement handoff token generation (`createHandoff()`)
3. Implement handoff token validation (`validateHandoff()`)
4. Add KV caching for hot paths
5. Write integration tests for the complete handoff flow

### Phase 2: Target Middleware

**Goal:** Properties can receive burrowed users and enforce permissions.

1. Add burrow token detection to `hooks.server.ts`
2. Implement burrow session cookie creation
3. Implement burrow session validation on subsequent requests
4. Implement permission enforcement
5. Implement "Surface" (exit burrow) flow
6. Write security tests (replay, expiration, escalation)

### Phase 3: Arbor UI

**Goal:** Users can see and use their burrows from the Arbor dashboard.

1. Add "Your Burrows" section to Arbor
2. Implement "Enter" button with handoff redirect
3. Add Wayfinder management UI (dig/fill/list)
4. Add "Burrowed" indicator when in a burrow session
5. Add "Surface" button to return to origin

### Phase 4: Polish & Audit

**Goal:** Production-ready with full audit trail and monitoring.

1. Implement comprehensive audit logging
2. Add rate limiting for handoff generation
3. Create audit log viewer in Arbor
4. Write help center articles
5. End-to-end testing across properties

---

## Open Questions

### 1. BURROW_KV Namespace Sharing

**Question:** How do multiple Workers share the same KV namespace?

**Answer:** Bind the same KV namespace ID in each Worker's `wrangler.toml`. Both source and target Workers point to the same underlying KV store. This is a standard Cloudflare pattern.

```toml
# In every property's wrangler.toml
[[kv_namespaces]]
binding = "BURROW_KV"
id = "abc123..."  # Same ID across all properties
```

### 2. Cross-Worker Secret Sharing

**Question:** How do source and target Workers share the BURROW_SECRET for HMAC?

**Answer:** Set the same Wrangler secret on all Workers: `wrangler secret put BURROW_SECRET --name each-worker-name`. All properties that participate in burrows need the same secret. Alternatively, use a KV-stored secret with a well-known key.

### 3. Session Priority

**Question:** If a user has both a native Heartwood session and a burrow session on the target property, which takes priority?

**Recommendation:** Burrow session takes priority when the burrow cookie is present. The native session is preserved but inactive. When the user "Surfaces" (exits the burrow), the native session resumes. This is similar to how `sudo` works -- you temporarily elevate/change context, then return.

### 4. What Happens When a Burrow Expires Mid-Session?

**Question:** If a user is actively using a target property and their burrow expires, what happens?

**Recommendation:** Check expiration on each request. If expired, show a clear message ("Your burrow access has expired. You've been returned to your grove.") and redirect to their source property. Don't silently fail.

### 5. Burrow for Non-Greenhouse Properties?

**Question:** Should the Wayfinder be able to burrow into non-greenhouse properties? The spec says yes (`wayfinder_burrow` bypasses greenhouse check).

**Consideration:** This means every property must have the burrow middleware, even if it's not in greenhouse mode. The middleware just needs to check for the `wayfinder_burrow` graft and allow it. Since all properties share the same engine, this is automatic.

### 6. Rate Limiting Strategy

**Question:** Where do rate limits get enforced for handoff generation?

**Recommendation:** At the source property, before token creation. Use the same KV-based rate limiter pattern as the OAuth callback handler (`callback.ts`). 10 handoffs per minute per user is reasonable.

---

## Sources

### Cross-Site SSO & Token Handoff
- [Shopify Multipass Documentation](https://shopify.dev/docs/api/multipass) -- AES+HMAC encrypted handoff tokens
- [Discourse DiscourseConnect SSO](https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045) -- HMAC-signed base64 payload handoff
- [Auth0 - What Is SSO and How Does It Work](https://auth0.com/blog/what-is-and-how-does-single-sign-on-work/) -- Central auth domain + redirect pattern
- [RFC 8693 - OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) -- Server-side token exchange protocol
- [Google SSO Explained](https://journal.hexmos.com/google-sso-how-single-sign-on-works-secure-login-explained/) -- Cross-domain cookie synchronization

### Federated Protocols
- [IndieAuth Specification](https://indieauth.spec.indieweb.org/) -- URL-as-identity, OAuth 2.0 for the indie web
- [ActivityPub - W3C Recommendation](https://www.w3.org/TR/activitypub/) -- HTTP Signatures for server-to-server auth
- [Hubzilla/Zot Protocol](https://hubzilla.org/help/developer/zot_protocol) -- Nomadic identity, Magic Auth, cross-server ACLs
- [AT Protocol Specification](https://atproto.com/specs/atp) -- DIDs, signed repos, OAuth scopes
- [Matrix Server-Server API](https://spec.matrix.org/unstable/server-server-api/) -- Room join handshake, event verification

### Security Best Practices
- [OWASP OAuth2 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Authgear: HMAC API Security in 2025](https://www.authgear.com/post/hmac-api-security)
- [Curity: JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
- [AWS Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) -- HMAC-signed URL pattern
- [Cloudflare Token Authentication](https://developers.cloudflare.com/waf/custom-rules/use-cases/configure-token-authentication/) -- HMAC token validation at edge

### Platform Case Studies
- [Cloudflare Zero Trust Session Management](https://developers.cloudflare.com/cloudflare-one/identity/users/session-management/) -- Dual-JWT architecture
- [WordPress Multisite Database Architecture](https://rudrastyh.com/wordpress-multisite/database-tutorial.html) -- Shared user store with prefixed capabilities
- [Shopify Organization Permissions](https://help.shopify.com/en/manual/organization-settings) -- Two-tier RBAC model
- [GitHub Organization Roles](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization) -- Global identity + per-org teams
- [Tailscale ACLs and Grants](https://tailscale.com/kb/1018/acls) -- Distributed policy enforcement with app capabilities

---

*The passage is invisible from above. You have to know it's there.*
