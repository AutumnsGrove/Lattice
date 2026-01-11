# Grove Security Model

## Overview

Grove implements defense-in-depth security with multiple layers of protection. Every layer is designed to independently prevent unauthorized access, so that no single failure compromises the entire system.

---

## Authentication & Session Management

### Primary Authentication: Heartwood SessionDO
- **Method**: Cookie-based sessions backed by Heartwood Durable Object
- **Provider**: Google OAuth 2.0 with PKCE flow
- **Session Storage**: SessionDO maintains encrypted session state at the edge
- **Cookie Security**: HttpOnly, Secure, SameSite=Strict

### Legacy Support: JWT Access Tokens
- **Status**: Deprecated but supported for backward compatibility
- **Usage**: Only for API integrations with explicit token handling
- **Validation**: Signature verification with issuer and audience claims

### Multi-Factor Authentication
- **WebAuthn Passkeys**: Optional FIDO2 passkey support
- **Status**: Supported for accounts opting into higher security

---

## Multi-Tenant Isolation

Grove is a multi-tenant platform where each user's blog runs as a separate subdomain (e.g., `alice.grove.place`). Tenant isolation is enforced at three layers to prevent cross-tenant attacks.

### Layer 1: Database Layer

All database operations are scoped to a tenant using the `getTenantDb()` wrapper function.

**Protection Mechanism:**
- Automatic tenant_id injection on all queries
- WHERE clause enforcement for tenant_id
- No raw SQL that bypasses tenant scoping
- Column whitelisting for sensitive operations

**Example:**
```typescript
// Always use getTenantDb() - never raw queries
const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

// This query is automatically scoped to the tenant
const posts = await tenantDb.prepare(
  "SELECT * FROM posts WHERE slug = ?"
).bind(slug).all();
```

### Layer 2: API Layer

Request handlers validate that the authenticated user owns the requested tenant using `getVerifiedTenantId()`.

**Protection Mechanism:**
- User email matched against tenant owner email (case-insensitive)
- Applied to all mutation endpoints (POST, PUT, DELETE)
- Applied to sensitive GET endpoints (admin queries)
- Returns 403 Forbidden for unauthorized access
- Blocks access even if tenant_id is correctly specified in subdomain

**Example:**
```typescript
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Verify user owns this tenant before proceeding
  const tenantId = await getVerifiedTenantId(
    platform.env.DB,
    locals.tenantId,
    locals.user
  );

  // If verification fails, 403 is thrown automatically
  const tenantDb = getTenantDb(platform.env.DB, { tenantId });
  // ... proceed with request
};
```

### Layer 3: Storage Layer (R2)

All files in R2 are prefixed with the tenant_id, creating a per-tenant namespace.

**Protection Mechanism:**
- All keys prefixed: `{tenantId}/path/to/file`
- Ownership verification before any access (GET, DELETE, LIST)
- Path traversal protection via filename sanitization
- Content-Disposition headers prevent browser script execution
- Direct access checks prevent enumeration attacks

**Example:**
```typescript
// Generate key with tenant prefix
const key = `${tenantId}/photos/2026/01/08/image.jpg`;

// Verify access before any operation
const expectedPrefix = `${tenantId}/`;
if (!requestedKey.startsWith(expectedPrefix)) {
  throw error(403, 'Access denied');
}
```

---

## Rate Limiting

Grove uses threshold-based rate limiting with three tiers: subscription tier limits, endpoint-specific limits, and abuse detection.

### Subscription Tier Limits

Rate limits scale with user plan:

| Tier | Requests/min | Writes/hour | Uploads/day | AI/day |
|------|--------------|-------------|------------|--------|
| Seedling | 100 | 50 | 10 | 25 |
| Sapling | 500 | 200 | 50 | 100 |
| Oak | 1,000 | 500 | 200 | 500 |
| Evergreen | 5,000 | 2,000 | 1,000 | 2,500 |

### Endpoint-Specific Limits

Sensitive endpoints have additional stricter limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login attempts | 5 | 5 minutes |
| Password reset | 3 | 1 hour |
| Post creation | 10 | 1 hour |
| Image upload | 20 | 1 hour |
| AI analysis | 50 | 24 hours |

### Abuse Detection

The abuse detection system monitors for suspicious patterns:
- Rapid failed auth attempts (IP-based)
- Excessive error rates (user/tenant-based)
- Burst patterns suggesting automation
- Triggers automatic temporary rate limit escalation

---

## Security Headers

All applications include comprehensive security headers on every response.

### HSTS (HTTP Strict Transport Security)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- Forces HTTPS on all connections
- Registered in HSTS preload list for all Grove domains
- One-year expiration, renewal at each request

### Clickjacking Protection
```
X-Frame-Options: DENY
```
- Prevents embedding Grove in iframes on external sites
- No exceptions for trusted sites (we don't trust any)

### MIME Type Sniffing Prevention
```
X-Content-Type-Options: nosniff
```
- Prevents browsers from interpreting files as different MIME types
- Critical for preventing JavaScript injection via polyglot files

### Content Security Policy (CSP)
- **Landing Site**: Strict CSP with no script-src externals
- **Engine**: Per-route CSP to allow necessary external scripts
- **User Blogs**: Restricted CSP to prevent XSS in user-created content
  ```
  script-src: 'self' 'unsafe-inline'
  style-src: 'self' 'unsafe-inline'
  ```

### Referrer Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
- Prevents leaking private information through Referer headers
- Only sends origin, not full paths, to external sites

### CORS Configuration
- **Allowed Origins**: grove.place domain only
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization
- **Credentials**: Enabled (for session cookies)

---

## Input Validation & Sanitization

Grove validates and sanitizes all user input to prevent injection attacks.

### CSRF Protection
- CSRF tokens required on all state-changing operations (POST, PUT, DELETE)
- Tokens are form-based or header-based, not cookie-only
- Double-submit cookie pattern for SPAs

### File Type Validation
- **Allowlist-based**: Only specific MIME types permitted
- **Blocked Extensions**: SVG, SVGZ (can contain scripts)
- **Validation Layers**:
  1. Extension check (client-side, for UX)
  2. MIME type check (server-side, authoritative)
  3. Magic number verification (server-side, deepest check)

### SQL Injection Prevention
- All queries use parameterized statements (? placeholders)
- No string concatenation in SQL
- Column names validated against whitelist
- Statement preparation prevents injection

### Open Redirect Prevention
- **Allowlist-based**: Only internal URLs permitted
- **Parsing**: URLs parsed against base domain
- **Check**: Hostname must be grove.place or subdomain
  ```typescript
  const parsed = new URL(url, 'https://grove.place');
  if (!parsed.hostname.endsWith('grove.place')) {
    throw error(400, 'Invalid redirect target');
  }
  ```

### Data Sanitization
- **HTML Input**: Sanitized with DOMPurify to prevent XSS
- **Markdown**: Processed through sanitizing parser
- **Slugs**: Validated against alphanumeric + dash pattern
- **PII Scrubbing**: Logs remove email addresses and IP addresses

---

## Secrets Management

### Environment Variables
- API keys stored in Cloudflare environment variables only
- Never committed to git
- Rotated regularly per security policy
- Access logs maintained by Cloudflare

### Secret Handling
- Database connection strings in `wrangler.toml` as secrets
- API keys (Stripe, Resend, etc.) as environment variables
- No secrets in error messages or logs
- Webhook signatures verified before processing

### Key Rotation
- Stripe API keys: Rotate quarterly
- JWT signing keys: Rotate annually or on compromise
- Database credentials: Rotate on employee offboarding
- Emergency rotation available via Cloudflare dashboard

---

## Webhook Security

Webhooks from external services (Stripe, etc.) are verified before processing.

### Verification Process
1. **Signature Validation**: HMAC-SHA256 signature verified against shared secret
2. **Timestamp Validation**: Webhook timestamp must be recent (within 5 minutes)
3. **Idempotency**: Webhook ID stored to prevent reprocessing
4. **Content Type**: Only application/json accepted

### Example Implementation
```typescript
// Webhook signature verification
const signature = request.headers.get('stripe-signature');
const body = await request.text();
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Idempotency check
const processed = await db.prepare(
  "SELECT id FROM webhook_events WHERE stripe_id = ?"
).bind(event.id).first();
if (processed) return { status: 200 };

// Process webhook
// ...
```

---

## Logging & Monitoring

### What Gets Logged
- Failed authentication attempts (with IP)
- Rate limit violations
- Tenant ownership verification failures
- Database errors (without sensitive data)
- Webhook processing errors

### What Does NOT Get Logged
- User email addresses
- IP addresses (except for security events)
- Session tokens or JWTs
- API keys or secrets
- User content (posts, comments, etc.)

### Log Retention
- Security events: 90 days
- Access logs: 30 days
- Error logs: 15 days
- Audit logs: 1 year (for compliance)

---

## API Security

### Authentication
- **Bearer Token**: Optional JWT for programmatic access
- **Session Cookies**: Primary mechanism for web clients
- **API Keys**: Not supported for public APIs

### Request Validation
- Content-Type header checked
- JSON payload structure validated
- Request size limited (1MB default)
- Timeout: 30 seconds per request

### Response Security
- No stack traces in error messages
- No debug information in production
- Consistent error codes prevent information leakage
  ```
  401: Invalid credentials (never "email not found")
  403: Access denied (never "user doesn't own tenant")
  ```

### Rate Limiting by Endpoint
- Auth: 5 attempts / 5 minutes
- API: Tier-based (see above)
- Public endpoints: Strict (prevent enumeration)

---

## Cloudflare Edge Security

### DDoS Protection
- Automatically enabled on all Grove domains
- Cloudflare's built-in DDoS mitigation
- Rate limiting at edge (not application layer)

### Bot Management
- Turnstile CAPTCHA on high-risk operations
- Auto-triggered on repeated failures
- Configurable per endpoint

### WAF (Web Application Firewall)
- OWASP Core Rule Set enabled
- SQL injection detection
- XSS payload filtering
- File upload restrictions

---

## Compliance & Privacy

### GDPR Compliance
- User data exported on request
- Right to be forgotten implemented (soft delete)
- Data deletion on account closure
- Privacy policy and terms of service

### Data Retention
- User data: Indefinite (until deletion)
- Logs: Per retention policy above
- Backups: 30-day retention
- Deleted data: Purged from backups after 30 days

### Encryption
- **In Transit**: TLS 1.3+ required
- **At Rest**: D1 database encryption (Cloudflare managed)
- **R2 Storage**: Encryption at rest (Cloudflare managed)

---

## Incident Response

### Reporting Security Issues
- Email: security@grove.place
- GPG key: Available on website
- Response time: 24 hours for critical issues
- Disclosure policy: 90 days responsible disclosure

### Incident Timeline
1. **Detection**: Automated alerts and monitoring
2. **Triage**: Assess severity and scope
3. **Response**: Mitigate immediate risk
4. **Recovery**: Fix root cause
5. **Communication**: Notify affected users
6. **Post-Mortem**: Document lessons learned

---

## Security Testing

### Automated Testing
- Unit tests for isolation boundaries
- Integration tests for endpoint authorization
- Fuzzing for input validation
- Dependency scanning for vulnerabilities

### Manual Testing
- Quarterly penetration testing
- Code review of security-critical paths
- Threat modeling for new features
- User testing for accidental security misconfigurations

### Continuous Monitoring
- Dependency updates with security advisory scanning
- Log monitoring for suspicious patterns
- Rate limit monitoring for abuse
- Database query analysis for N+1 and injection patterns

---

## Security Roadmap

### Completed (v1.0)
- Multi-tenant database isolation
- Tenant ownership verification
- CSRF protection
- Rate limiting
- Security headers
- Input validation

### In Progress
- WebAuthn passkey support
- Advanced threat detection
- Security audit logging

### Planned (Future)
- IP whitelisting for enterprise
- Advanced analytics and reporting
- API key management
- Granular role-based access control

---

*Last Updated: 2026-01-11*
*Next Review: 2026-04-11 (quarterly)*
