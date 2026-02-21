# OAuth 2.0 + PKCE Flow — Spider Weave Reference

Complete implementation details for OAuth 2.0 with PKCE (Proof Key for Code Exchange).

---

## Auth Pattern Selection

| Pattern | Best For | Complexity |
|---------|----------|------------|
| **Session-based** | Traditional web apps | Medium |
| **JWT** | Stateless APIs, SPAs | Medium |
| **OAuth 2.0** | Third-party login | High |
| **PKCE** | Mobile/SPA OAuth | High |
| **API Keys** | Service-to-service | Low |

Use PKCE whenever performing OAuth from a public client (browser, mobile). It prevents authorization code interception attacks.

---

## PKCE Setup (Phase 1: SPIN)

```typescript
// PKCE flow setup
import { generatePKCE } from '$lib/auth/pkce';

const { codeVerifier, codeChallenge } = await generatePKCE();

// Store verifier (cookie or session)
cookies.set('pkce_verifier', codeVerifier, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 600 // 10 minutes
});

// Redirect to Heartwood
const authUrl = new URL('https://heartwood.grove.place/oauth/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('state', generateState());
```

---

## Core Auth File Structure

```
src/lib/auth/
├── index.ts           # Main exports
├── types.ts           # Auth-related types
├── session.ts         # Session management
├── middleware.ts      # Route protection
├── pkce.ts            # PKCE utilities
└── client.ts          # Heartwood/OAuth client
```

---

## Database Schema

```typescript
// Users table (linked to Heartwood)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  heartwoodId: text('heartwood_id').unique(),
  email: text('email').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user'), // admin, user, guest
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Sessions (if using session-based auth)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Environment Variables

```bash
# OAuth/Heartwood
HEARTWOOD_CLIENT_ID=
HEARTWOOD_CLIENT_SECRET=
HEARTWOOD_AUTHORIZE_URL=https://heartwood.grove.place/oauth/authorize
HEARTWOOD_TOKEN_URL=https://heartwood.grove.place/oauth/token
HEARTWOOD_USERINFO_URL=https://heartwood.grove.place/oauth/userinfo

# App
AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
SESSION_SECRET=generate_with_openssl_rand_hex_32
```

---

## Login Route — Redirect to Provider

```typescript
// src/routes/auth/login/+server.ts
export const GET: RequestHandler = async () => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  // Store PKCE verifier
  cookies.set('pkce_verifier', codeVerifier, { httpOnly: true, secure: true });
  cookies.set('oauth_state', state, { httpOnly: true, secure: true });

  const url = new URL(HEARTWOOD_AUTHORIZE_URL);
  url.searchParams.set('client_id', HEARTWOOD_CLIENT_ID);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('redirect_uri', AUTH_REDIRECT_URI);
  url.searchParams.set('state', state);

  throw redirect(302, url.toString());
};
```

---

## Callback Route — Handle OAuth Response

```typescript
// src/routes/auth/callback/+server.ts
export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');

  // Verify state (CSRF protection)
  if (state !== storedState) {
    throw error(400, 'Invalid state parameter');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(HEARTWOOD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HEARTWOOD_CLIENT_ID,
      client_secret: HEARTWOOD_CLIENT_SECRET,
      code: code!,
      code_verifier: cookies.get('pkce_verifier')!,
      redirect_uri: AUTH_REDIRECT_URI,
    }),
  });

  const tokens = await tokenResponse.json();

  // Get user info
  const userResponse = await fetch(HEARTWOOD_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userInfo = await userResponse.json();

  // Create/update user in database
  const user = await upsertUser({
    heartwoodId: userInfo.sub,
    email: userInfo.email,
    displayName: userInfo.name,
    avatarUrl: userInfo.picture,
  });

  // Create session
  const session = await createSession(user.id);

  // Set session cookie
  cookies.set('session', session.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Clean up PKCE cookies
  cookies.delete('pkce_verifier');
  cookies.delete('oauth_state');

  throw redirect(302, '/dashboard');
};
```

---

## OAuth Flow Testing

```typescript
// tests/auth/oauth.test.ts
describe('OAuth Flow', () => {
  test('redirects to Heartwood with PKCE', async () => {
    const response = await request(app).get('/auth/login');

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/heartwood\.grove\.place/);
    expect(response.headers.location).toMatch(/code_challenge=/);
  });

  test('handles callback and creates session', async () => {
    // Mock Heartwood responses
    mockHeartwoodTokenEndpoint({ access_token: 'test-token' });
    mockHeartwoodUserInfo({ sub: '123', email: 'test@example.com' });

    const response = await request(app)
      .get('/auth/callback?code=valid-code&state=valid-state')
      .set('Cookie', ['oauth_state=valid-state; pkce_verifier=test-verifier']);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/dashboard');

    // Verify session created
    const cookies = response.headers['set-cookie'];
    expect(cookies).toMatch(/session=/);
  });

  test('rejects invalid state (CSRF protection)', async () => {
    const response = await request(app)
      .get('/auth/callback?code=valid-code&state=wrong-state')
      .set('Cookie', ['oauth_state=correct-state']);

    expect(response.status).toBe(400);
  });
});
```

---

## Auth Flow Documentation

```markdown
### Architecture
- OAuth 2.0 with PKCE for secure token exchange
- Session-based auth for web app
- Heartwood (GroveAuth) as identity provider

### Flow
1. User clicks "Sign in" → Redirect to Heartwood
2. User authenticates with Heartwood
3. Heartwood redirects back with auth code
4. App exchanges code for tokens (with PKCE verifier)
5. App creates session, sets cookie
6. User is authenticated
```
