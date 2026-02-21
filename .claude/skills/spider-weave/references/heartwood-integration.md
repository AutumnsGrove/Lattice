# Heartwood Integration — Spider Weave Reference

GroveAuth-specific integration patterns for connecting Grove applications to the Heartwood identity provider.

---

## What Is Heartwood?

Heartwood (GroveAuth) is the central identity provider for the Grove ecosystem. Rather than each Grove property managing its own user accounts, Heartwood handles authentication and provides user identity via OAuth 2.0 + PKCE.

---

## Environment Setup

```bash
# .env (local development)
HEARTWOOD_CLIENT_ID=your_client_id_here
HEARTWOOD_CLIENT_SECRET=your_client_secret_here
HEARTWOOD_AUTHORIZE_URL=https://heartwood.grove.place/oauth/authorize
HEARTWOOD_TOKEN_URL=https://heartwood.grove.place/oauth/token
HEARTWOOD_USERINFO_URL=https://heartwood.grove.place/oauth/userinfo

AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
SESSION_SECRET=generate_with_openssl_rand_hex_32
```

For Cloudflare Workers, store secrets via `wrangler secret put`:

```bash
wrangler secret put HEARTWOOD_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

---

## User Upsert Pattern

When Heartwood returns user info, upsert into your local database. Never store tokens long-term; store only the derived user record.

```typescript
// src/lib/auth/user.ts
export async function upsertUser(heartwoodUser: {
  heartwoodId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}): Promise<User> {
  // Try to find existing user by Heartwood ID
  const existing = await db.query.users.findFirst({
    where: eq(users.heartwoodId, heartwoodUser.heartwoodId),
  });

  if (existing) {
    // Update mutable fields (display name, avatar may change)
    await db.update(users)
      .set({
        displayName: heartwoodUser.displayName,
        avatarUrl: heartwoodUser.avatarUrl,
      })
      .where(eq(users.id, existing.id));

    return { ...existing, ...heartwoodUser };
  }

  // Create new user
  const result = await db.insert(users).values({
    heartwoodId: heartwoodUser.heartwoodId,
    email: heartwoodUser.email,
    displayName: heartwoodUser.displayName,
    avatarUrl: heartwoodUser.avatarUrl,
    role: 'user',
    createdAt: new Date(),
  }).returning();

  return result[0];
}
```

---

## Heartwood User Info Response

The `/oauth/userinfo` endpoint returns:

```json
{
  "sub": "heartwood_user_id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "Display Name",
  "picture": "https://heartwood.grove.place/avatars/xxx.jpg",
  "locale": "en"
}
```

Map `sub` to `heartwoodId` in your local schema. Do not use `email` as a primary identifier — it can change.

---

## Session Validation in hooks.server.ts

```typescript
// src/hooks.server.ts
import { validateSession } from '$lib/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
  // Validate session on every request
  const sessionId = event.cookies.get('session');

  if (sessionId) {
    const user = await validateSession(sessionId);
    event.locals.user = user;
  }

  const response = await resolve(event);

  // Apply security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};
```

---

## Grove-Specific User Roles

```typescript
// Standard Grove roles
type GroveRole = 'admin' | 'user' | 'guest';

// Role assignment on first login
const defaultRole: GroveRole = 'user';

// Admin assignment: manual DB update only
// Never auto-assign admin via OAuth claims
```

---

## Logout Flow

```typescript
// src/routes/auth/logout/+server.ts
export const POST: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get('session');

  if (sessionId) {
    // Invalidate server-side session
    await invalidateSession(sessionId);
  }

  // Clear all auth cookies
  cookies.delete('session', { path: '/' });
  cookies.delete('pkce_verifier', { path: '/' });
  cookies.delete('oauth_state', { path: '/' });

  throw redirect(302, '/');
};
```

---

## Testing with Heartwood Mock

For tests, mock Heartwood endpoints rather than hitting the live service:

```typescript
// tests/helpers/heartwood-mock.ts
export function mockHeartwoodTokenEndpoint(response: object) {
  vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
    if (url.toString().includes('/oauth/token')) {
      return new Response(JSON.stringify(response), { status: 200 });
    }
    return fetch(url); // pass through other calls
  });
}

export function mockHeartwoodUserInfo(user: object) {
  vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
    if (url.toString().includes('/oauth/userinfo')) {
      return new Response(JSON.stringify(user), { status: 200 });
    }
    return fetch(url);
  });
}
```

---

## grove-auth-integration Skill

For a complete Heartwood integration walkthrough including client registration, wrangler config, and full route setup, invoke the `grove-auth-integration` skill. Spider Weave covers the auth architecture; that skill handles the Grove-specific plumbing.
