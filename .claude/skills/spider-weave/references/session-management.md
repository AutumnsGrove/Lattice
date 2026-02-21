# Session Management — Spider Weave Reference

Session store, cookie handling, middleware patterns, and client-side auth state.

---

## Session Functions

```typescript
// src/lib/auth/session.ts
export async function createSession(userId: number): Promise<Session> {
  const sessionId = generateSecureId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return { id: sessionId, userId, expiresAt };
}

export async function validateSession(sessionId: string): Promise<User | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
```

---

## Secure Cookie Settings

Always use these attributes on all auth cookies:

```typescript
{
  httpOnly: true,    // Not accessible via JavaScript
  secure: true,      // HTTPS only in production
  sameSite: 'lax',   // CSRF protection
  maxAge: 604800,    // 7 days (in seconds)
  path: '/',         // Available site-wide
}
```

- `httpOnly` prevents XSS from stealing the session cookie
- `secure` prevents transmission over plain HTTP
- `sameSite: 'lax'` blocks cross-site POST requests while allowing top-level navigations

---

## Client-Side Auth Store

```typescript
// src/lib/stores/auth.ts
import { writable } from 'svelte/store';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export const auth = writable<AuthState>({
  user: null,
  loading: true,
});

export async function loadUser() {
  const response = await fetch('/api/auth/me');
  if (response.ok) {
    const user = await response.json();
    auth.set({ user, loading: false });
  } else {
    auth.set({ user: null, loading: false });
  }
}
```

---

## Session Security Testing

```typescript
// Test session fixation prevention
test('session ID changes after login', async () => {
  const oldSession = cookies.get('session');
  await completeLoginFlow();
  const newSession = cookies.get('session');
  expect(newSession).not.toBe(oldSession);
});

// Test cookie security attributes
test('auth cookies have secure attributes', async () => {
  const response = await completeLoginFlow();
  const cookies = response.headers['set-cookie'];

  expect(cookies).toMatch(/HttpOnly/);
  expect(cookies).toMatch(/SameSite=/);
});
```

---

## Monitoring & Logging

```typescript
// Log auth events (without sensitive data)
logger.info('User authenticated', {
  userId: user.id,
  provider: 'heartwood',
  ip: event.getClientAddress(),
});

// Alert on suspicious activity
if (failedAttempts > 10) {
  logger.warn('Potential brute force attack', {
    identifier,
    attempts: failedAttempts,
  });
}
```

---

## Login UI with Loading States

```svelte
<script>
  let loading = $state(false);
  let error = $state('');
</script>

{#if error}
  <div role="alert" class="error">
    {error}
  </div>
{/if}

<button
  on:click={handleLogin}
  disabled={loading}
  aria-busy={loading}
>
  {#if loading}
    <span class="spinner" aria-hidden="true" />
    Connecting...
  {:else}
    Sign in with Heartwood
  {/if}
</button>
```

---

## BIND Phase Integration Checklist

- [ ] Login flow works end-to-end
- [ ] Logout clears session
- [ ] Protected routes redirect unauthenticated users
- [ ] Session expires correctly
- [ ] Token refresh works (if applicable)
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting prevents brute force
- [ ] CSRF protection active
- [ ] Security headers set
- [ ] Cookies configured securely

---

## Completion Report Template

```markdown
## SPIDER WEAVE COMPLETE

### Auth System Integrated
- Provider: Heartwood (GroveAuth)
- Flow: OAuth 2.0 + PKCE
- Session: Cookie-based, 7-day expiry

### Files Created
- `src/lib/auth/` (6 files)
- `src/routes/auth/login/+server.ts`
- `src/routes/auth/callback/+server.ts`
- `src/routes/auth/logout/+server.ts`
- `src/lib/stores/auth.ts`

### Security Features
- PKCE for OAuth
- CSRF protection
- Rate limiting (5 attempts / 15 min)
- Secure cookie attributes
- Security headers
- Role-based access control

### Tests
- 15 unit tests
- 8 integration tests
- 100% pass rate

*The web is woven. The system is secure.*
```
