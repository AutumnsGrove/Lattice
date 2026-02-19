## 🦝 RACCOON SECURITY AUDIT - ZEPHYR

**Audit Date:** 2026-02-02
**Auditor:** Raccoon Security Audit
**Scope:** workers/zephyr/src/ and libs/engine/src/lib/zephyr/

---

### Executive Summary

- **Risk Level:** HIGH (prior to fixes)
- **Issues Found:** 1 critical, 3 warnings
- **Status:** NEEDS_FIX → FIXED

The Zephyr email gateway had one **critical security vulnerability**: the `/send` endpoint was completely unauthenticated, allowing anyone to send emails through the service. This has been remediated with API key authentication.

---

### Critical Issues (Fixed Immediately)

#### 1. NO API KEY AUTHENTICATION ON /send ENDPOINT

- **Location:** `workers/zephyr/src/index.ts:33`
- **Risk:** CRITICAL - Anyone could send emails through the gateway without authentication, leading to spam/abuse, email reputation damage, and potential financial costs (Resend charges per email)
- **Fix:**
  - Created new `workers/zephyr/src/middleware/auth.ts` with timing-safe API key validation
  - Added `authMiddleware` to protect the `/send` endpoint
  - Added `ZEPHYR_API_KEY` environment variable requirement
  - Updated `wrangler.toml` with documentation

**Code Changes:**

```typescript
// BEFORE: No authentication
app.post("/send", sendHandler);

// AFTER: Protected with auth
app.post("/send", authMiddleware, sendHandler);
```

#### 2. API KEY LEAK IN CIRCUIT BREAKER LOGS

- **Location:** `workers/zephyr/src/providers/resend.ts:83`
- **Risk:** MEDIUM - Partial API key exposure in logs (`apiKey.slice(0, 8)`)
- **Fix:** Removed partial key logging, now logs generic message

**Code Changes:**

```typescript
// BEFORE: Leaked partial key
console.error(`[Zephyr] Circuit breaker opened for ${apiKey.slice(0, 8)}...`);

// AFTER: Generic message
console.error(`[Zephyr] Circuit breaker opened for provider`);
```

---

### Warnings (Should Monitor)

#### 1. Basic Email Validation Regex

- **Location:** `workers/zephyr/src/middleware/validation.ts:117-119`
- **Concern:** Uses simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` which allows some technically invalid emails
- **Recommendation:** Consider using a library like `validator.js` for RFC-compliant validation, or keep current validation as "good enough" for most use cases

#### 2. In-Memory Circuit Breaker

- **Location:** `workers/zephyr/src/providers/resend.ts:35`
- **Concern:** Circuit breaker state is stored in-memory (`Map<string, CircuitState>`), which won't persist across worker instances or restarts in Cloudflare Workers
- **Recommendation:** For multi-instance deployments, consider using Cloudflare KV or Durable Objects for distributed circuit breaker state

#### 3. No Maximum Payload Size Validation

- **Location:** `workers/zephyr/src/handlers/send.ts`
- **Concern:** No validation of request body size could allow very large payloads
- **Recommendation:** Add body size limit check (e.g., 1MB max for email content)

---

### Security Verification

| Category         | Status | Notes                                                 |
| ---------------- | ------ | ----------------------------------------------------- |
| Secrets scan     | PASS   | No hardcoded secrets found; all keys in env vars      |
| Input validation | PASS   | All user inputs validated; parameterized D1 queries   |
| Authentication   | PASS   | API key auth now implemented on /send endpoint        |
| Authorization    | PASS   | Rate limiting per tenant enforced                     |
| Privacy          | PASS   | Email body/content never logged; only metadata        |
| Rate limiting    | PASS   | D1-backed rate limiting per tenant and email type     |
| Error handling   | PASS   | Generic error messages; stack traces not exposed      |
| Dependencies     | PASS   | Standard packages (hono, resend) from trusted sources |

---

### Recommendations

#### Immediate Actions

1. **Deploy ZEPHYR_API_KEY secret**

   ```bash
   cd workers/zephyr
   wrangler secret put ZEPHYR_API_KEY
   # Generate a strong key: openssl rand -base64 32
   ```

2. **Update all clients with the new API key**
   - Update `libs/engine/src/lib/zephyr/client.ts` default config
   - Update any services using Zephyr with the new key

3. **Enable Cloudflare Access** (optional but recommended)
   - Add Cloudflare Access policies to restrict by IP or service token
   - Defense in depth beyond API keys

#### Short-term Improvements

1. **Add authentication tests**
   - Test 401 response when missing API key
   - Test 401 response with invalid API key
   - Test timing attack resistance

2. **Add request size limits**

   ```typescript
   // In send handler
   const contentLength = c.req.header("Content-Length");
   if (contentLength && parseInt(contentLength) > 1024 * 1024) {
   	return c.json({ error: "Request too large" }, 413);
   }
   ```

3. **Implement API key database**
   - Store keys in D1 with tenant mapping
   - Support key rotation and expiration
   - Audit log of authentication attempts

#### Long-term Security Enhancements

1. **Request signing**
   - Add HMAC request signing for additional security
   - Prevents replay attacks even if API key is intercepted

2. **IP allowlisting**
   - Restrict which IPs can use specific API keys
   - Prevent key usage from unexpected locations

3. **Anomaly detection**
   - Alert on unusual email volume patterns
   - Detect and block potential abuse

4. **Security headers**
   - Add security headers to responses:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Content-Security-Policy` (if serving HTML)

---

### Files Modified

1. `workers/zephyr/src/middleware/auth.ts` - NEW: Authentication middleware
2. `workers/zephyr/src/index.ts` - Added auth middleware to /send endpoint
3. `workers/zephyr/src/providers/resend.ts` - Removed API key leak in logs
4. `workers/zephyr/src/types.ts` - Added ZEPHYR_API_KEY to Env interface
5. `workers/zephyr/wrangler.toml` - Documented new secret

---

### Deployment Checklist

- [ ] Generate strong ZEPHYR_API_KEY (32+ random bytes)
- [ ] Set ZEPHYR_API_KEY via wrangler secret put
- [ ] Update all service clients with new API key
- [ ] Deploy zephyr worker
- [ ] Verify /send endpoint returns 401 without key
- [ ] Verify /send endpoint works with valid key
- [ ] Monitor error logs for auth failures
- [ ] Update documentation with authentication requirements

---

### Post-Deployment Monitoring

Monitor for:

- Authentication failures (potential attacks)
- Unusual email volume patterns
- Circuit breaker triggers
- Rate limit hits

Set up alerts for:

- > 10 auth failures per minute
- > 1000 emails per hour
- Circuit breaker opened

---

_Audit completed by Raccoon. The rocks have been lifted, the stream has been inspected, and the code is now clean._ 🦝
