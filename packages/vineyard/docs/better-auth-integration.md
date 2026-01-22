# Better Auth Integration Guide

This guide explains how to use Vineyard's Better Auth integration in your Grove application.

## Overview

Vineyard provides components and utilities for integrating Better Auth (Grove's session-based authentication system) into your application. This replaces the legacy Heartwood token-based authentication with faster, cookie-based session auth.

## Installation

```bash
pnpm add @autumnsgrove/vineyard
```

## Components

### AuthButton

A simple authentication button that shows "Sign In" when not authenticated and "Sign Out" when authenticated.

**Usage:**

```svelte
<script>
  import { AuthButton } from '@autumnsgrove/vineyard';
</script>

<!-- Sign in with Google (default) -->
<AuthButton />

<!-- Sign in with GitHub -->
<AuthButton provider="github" />

<!-- Custom button text -->
<AuthButton
  provider="google"
  signInText="Login with Google"
  signOutText="Logout"
/>
```

**Props:**
- `provider?: 'google' | 'github'` - OAuth provider (default: 'google')
- `signInText?: string` - Custom sign in button text
- `signOutText?: string` - Custom sign out button text

### UserMenu

Displays user information with a dropdown menu for account actions.

**Usage:**

```svelte
<script>
  import { UserMenu } from '@autumnsgrove/vineyard';
</script>

<!-- Full user menu with avatar and email -->
<UserMenu />

<!-- Hide avatar or email -->
<UserMenu showAvatar={false} />
<UserMenu showEmail={false} />
```

**Props:**
- `showAvatar?: boolean` - Show user's avatar (default: true)
- `showEmail?: boolean` - Show user's email (default: true)

## Auth Utilities

### signIn()

Start OAuth sign-in flow and redirect to Better Auth.

```typescript
import { signIn } from '@autumnsgrove/vineyard';

// Sign in with Google
signIn('google');

// Sign in with GitHub
signIn('github');

// Sign in with custom callback
signIn('google', 'https://myapp.grove.place/dashboard');
```

**Parameters:**
- `provider: 'google' | 'github'` - OAuth provider (default: 'google')
- `callbackURL?: string` - Optional callback URL (default: current page)

### getSession()

Get current session data from Better Auth.

```typescript
import { getSession } from '@autumnsgrove/vineyard';

const sessionData = await getSession();
if (sessionData.user) {
  console.log('Logged in as:', sessionData.user.name);
  console.log('Email:', sessionData.user.email);
} else {
  console.log('Not authenticated');
}
```

**Returns:** `Promise<BetterAuthSessionResponse>`
```typescript
{
  user: BetterAuthUser | null;
  session: BetterAuthSession | null;
}
```

### signOut()

Sign out current user and optionally redirect.

```typescript
import { signOut } from '@autumnsgrove/vineyard';

// Sign out and redirect to home
await signOut();

// Sign out and redirect to login page
await signOut('/login');
```

**Parameters:**
- `redirectTo?: string` - Redirect URL after sign out (default: '/')

### isAuthenticated()

Check if user is currently authenticated.

```typescript
import { isAuthenticated } from '@autumnsgrove/vineyard';

if (await isAuthenticated()) {
  // Show authenticated content
} else {
  // Show login prompt
}
```

**Returns:** `Promise<boolean>`

## SvelteKit Integration

### Client-Side Protection

Protect routes on the client side:

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '@autumnsgrove/vineyard';

  onMount(async () => {
    if (!(await isAuthenticated())) {
      goto('/login');
    }
  });
</script>
```

### Server-Side Protection

Protect routes on the server side using hooks:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Forward cookies to Better Auth
  const sessionRes = await fetch('https://auth-api.grove.place/api/auth/session', {
    headers: {
      cookie: event.request.headers.get('cookie') || ''
    }
  });

  if (sessionRes.ok) {
    const { user, session } = await sessionRes.json();
    event.locals.user = user;
    event.locals.session = session;
  }

  // Protect /dashboard routes
  if (event.url.pathname.startsWith('/dashboard') && !event.locals.user) {
    return new Response('Redirect', {
      status: 303,
      headers: { Location: '/login' }
    });
  }

  return resolve(event);
};
```

### Type Definitions

Add to `src/app.d.ts`:

```typescript
import type { BetterAuthUser, BetterAuthSession } from '@autumnsgrove/vineyard';

declare global {
  namespace App {
    interface Locals {
      user: BetterAuthUser | null;
      session: BetterAuthSession | null;
    }
  }
}

export {};
```

## Complete Example

Here's a complete example of a protected Vineyard page:

```svelte
<!-- src/routes/vineyard/+page.svelte -->
<script lang="ts">
  import {
    VineyardLayout,
    FeatureCard,
    AuthButton,
    UserMenu,
    getSession
  } from '@autumnsgrove/vineyard';
  import { onMount } from 'svelte';

  let user = $state(null);

  onMount(async () => {
    const session = await getSession();
    user = session.user;
  });
</script>

<VineyardLayout tool="amber" tagline="Your files, preserved" status="preview">
  <div class="auth-section">
    {#if user}
      <UserMenu />
    {:else}
      <AuthButton provider="google" />
    {/if}
  </div>

  <FeatureCard
    title="Storage Overview"
    description="See usage across posts and media"
    status="ready"
    icon="HardDrive"
  />

  <!-- More features... -->
</VineyardLayout>
```

## Important Notes

### CORS Configuration

Always use `credentials: 'include'` when making requests to Better Auth:

```typescript
fetch('https://auth-api.grove.place/api/auth/session', {
  credentials: 'include' // Required for cross-origin cookies
});
```

### Session Cookie

The `better-auth.session_token` cookie is httpOnly and cannot be read from JavaScript. Always use the `/session` endpoint to check authentication status.

### Cross-Subdomain SSO

Better Auth sessions work across all `.grove.place` subdomains automatically. Users who sign in on one subdomain will be authenticated on all others.

## Migration from Heartwood

If you're migrating from legacy Heartwood token auth:

1. **Remove token storage code** - Delete localStorage/cookie handling
2. **Remove `/verify` calls** - Replace with `getSession()`
3. **Remove refresh token logic** - Better Auth handles this internally
4. **Replace auth redirects** - Use `signIn()` instead of manual redirects
5. **Update protected routes** - Use `isAuthenticated()` or server-side session checks

### Before (Legacy Heartwood):

```typescript
// ❌ Don't use this anymore
const token = localStorage.getItem('access_token');
const response = await fetch('https://auth-api.grove.place/verify', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### After (Better Auth):

```typescript
// ✅ Use this instead
const session = await getSession();
if (session.user) {
  // User is authenticated
}
```

## Troubleshooting

### "Not authenticated" despite signing in

- Clear all cookies for `.grove.place`
- Ensure `credentials: 'include'` is set on fetch requests
- Check browser console for CORS errors

### Session not persisting across page refreshes

- Verify cookies are enabled in browser
- Check that the session cookie domain is `.grove.place`
- Ensure server-side hooks are forwarding cookies correctly

### Cross-origin cookie errors

- Better Auth is configured for `.grove.place` domain
- Make sure your app is deployed on a `.grove.place` subdomain
- For local development, you may need to test on a staging subdomain

## API Reference

### Better Auth Endpoints

All endpoints are on `https://auth-api.grove.place`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/sign-in/google` | GET | Start Google OAuth |
| `/api/auth/sign-in/github` | GET | Start GitHub OAuth |
| `/api/auth/session` | GET | Get current session + user |
| `/api/auth/sign-out` | POST | End session |

## Learn More

- [Better Auth Documentation](https://better-auth.com)
- [Grove Authentication Guide](https://grove.place/docs/auth)
- [Vineyard Component Library](https://github.com/AutumnsGrove/Vineyard)
