# Security Headers — Spider Weave Reference

CSRF protection, rate limiting, security headers, and CSP patterns for authentication.

---

## Security Headers in hooks.server.ts

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  return response;
};
```

---

## CSRF Protection

```typescript
// For state-changing operations
export function validateCSRF(event: RequestEvent): void {
  const origin = event.request.headers.get('origin');
  const host = event.url.host;

  if (origin && new URL(origin).host !== host) {
    throw error(403, 'Invalid origin');
  }
}
```

SvelteKit form actions get CSRF protection automatically via the SvelteKit CSRF module when `sameSite: 'lax'` is set on session cookies. For custom endpoints that accept POST, call `validateCSRF()` explicitly.

---

## Rate Limiting

```typescript
// src/lib/auth/rate-limit.ts
const attempts = new Map<string, number[]>();

export function checkRateLimit(identifier: string, maxAttempts: number = 5): boolean {
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000; // 15 minutes

  const userAttempts = attempts.get(identifier) || [];
  const recentAttempts = userAttempts.filter(t => t > windowStart);

  if (recentAttempts.length >= maxAttempts) {
    return false;
  }

  recentAttempts.push(now);
  attempts.set(identifier, recentAttempts);
  return true;
}
```

Usage in auth endpoint:

```typescript
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();

  if (!checkRateLimit(ip)) {
    throw error(429, 'Too many attempts. Try again in 15 minutes.');
  }

  // ... proceed with auth
};
```

For Cloudflare Workers, prefer Cloudflare Rate Limiting rules at the edge rather than in-process Maps (which don't persist across Worker instances).

---

## CSP for Grove Apps

A nonce-based CSP is more secure than `'unsafe-inline'`. For production:

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const nonce = crypto.randomUUID();

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace(/%sveltekit.nonce%/g, nonce)
  });

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
      "img-src 'self' data: https://heartwood.grove.place",
      "connect-src 'self' https://heartwood.grove.place",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return response;
};
```

---

## Required Headers Checklist

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Content-Security-Policy` | (see above) | XSS mitigation |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `Permissions-Policy` | `camera=(), microphone=()` | Restrict browser APIs |

---

## Cloudflare Edge Rate Limiting

For auth endpoints on Cloudflare Workers/Pages, configure rate limiting in `wrangler.toml` or via the Cloudflare dashboard:

```toml
# wrangler.toml
[[rules]]
  type = "http_ratelimit"
  description = "Auth endpoint rate limit"
  expression = "(http.request.uri.path eq \"/auth/login\" or http.request.uri.path eq \"/auth/callback\")"
  action = "block"
  ratelimit_period = 900  # 15 minutes
  ratelimit_requests_per_period = 5
```

Edge rate limiting fires before your Worker runs, protecting against volumetric attacks at zero compute cost.
