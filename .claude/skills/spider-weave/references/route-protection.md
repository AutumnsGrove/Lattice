# Route Protection — Spider Weave Reference

Route guards, RBAC middleware, and SvelteKit protection patterns.

---

## requireAuth Middleware

```typescript
// src/lib/auth/middleware.ts
export function requireAuth(): Handle {
  return async ({ event, resolve }) => {
    const sessionId = event.cookies.get('session');

    if (!sessionId) {
      throw redirect(302, '/auth/login');
    }

    const user = await validateSession(sessionId);

    if (!user) {
      event.cookies.delete('session');
      throw redirect(302, '/auth/login');
    }

    event.locals.user = user;
    return resolve(event);
  };
}
```

---

## Role-Based Access Control (RBAC)

```typescript
// Role-based protection
export function requireRole(allowedRoles: string[]): Handle {
  return async ({ event, resolve }) => {
    const user = event.locals.user;

    if (!user || !allowedRoles.includes(user.role)) {
      throw error(403, 'Forbidden');
    }

    return resolve(event);
  };
}
```

Usage:

```typescript
// In hooks.server.ts — sequence middleware
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(
  requireAuth(),
  requireRole(['admin'])
);
```

---

## Protecting Pages via +page.server.ts

```typescript
// src/routes/protected/+page.server.ts
export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/auth/login');
  }
  return { user: locals.user };
};
```

---

## Route-Level Protection Tests

```typescript
describe('Route Protection', () => {
  test('redirects unauthenticated users', async () => {
    const response = await request(app).get('/dashboard');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
  });

  test('allows authenticated users', async () => {
    const session = await createTestUserAndSession();

    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', [`session=${session.id}`]);

    expect(response.status).toBe(200);
  });

  test('enforces role restrictions', async () => {
    const user = await createTestUser({ role: 'user' });
    const session = await createSession(user.id);

    const response = await request(app)
      .get('/admin')
      .set('Cookie', [`session=${session.id}`]);

    expect(response.status).toBe(403);
  });
});
```

---

## SvelteKit Layout Guard Pattern

For routes that share a layout, protect at the layout level:

```typescript
// src/routes/(protected)/+layout.server.ts
export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/auth/login');
  }
  return { user: locals.user };
};
```

All child routes inherit the auth check. This is simpler than repeating the check in every `+page.server.ts`.

**Important:** Do not rely on layout guards alone. Enforce authz in `hooks.server.ts` as well — SvelteKit layout bypass is a known attack surface (see turtle-harden SIEGE phase).

---

## Environment Variables for Auth Redirect

```typescript
// Always redirect to an absolute URL you control
const ALLOWED_REDIRECT_PATHS = ['/dashboard', '/settings', '/profile'];

function safeRedirect(target: string): string {
  if (ALLOWED_REDIRECT_PATHS.includes(target)) {
    return target;
  }
  return '/dashboard'; // default fallback
}
```

Never reflect the `redirect_uri` or `next` parameter without validation — open redirect vulnerabilities.

---

## Protected Route Documentation Template

```typescript
// Add this comment block to any protected route
/**
 * Protected route — requires authentication.
 * Role: admin | user (specify which)
 * Auth: Validated via hooks.server.ts → validateSession()
 * Redirect: /auth/login if no valid session
 */
```
