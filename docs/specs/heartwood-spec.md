---
aliases: []
date created: Monday, December 15th 2025
date modified: Saturday, January 4th 2026
source: https://github.com/AutumnsGrove/GroveAuth/blob/main/GROVEAUTH_SPEC.md
tags:
  - authentication
  - security
  - cloudflare-workers
  - oauth
type: tech-spec
---

# Heartwood (GroveAuth) - Centralized Authentication Service

```
                          ╭──────────╮
                       ╭──│ ╭──────╮ │──╮
                     ╭─│  │ │ ╭──╮ │ │  │─╮
                    │  │  │ │ │♥ │ │ │  │  │
                     ╰─│  │ │ ╰──╯ │ │  │─╯
                       ╰──│ ╰──────╯ │──╯
                          ╰──────────╯

       every ring: a year, a story, a layer of growth

               The center that holds it all.
```

> A Cloudflare Worker-based authentication service for all AutumnsGrove properties

**Public Name**: Heartwood
**Internal Codename**: GroveAuth
**Public Domain**: `heartwood.grove.place`
**API Domain**: `auth-api.grove.place` (internal backend)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Authentication Methods](#authentication-methods)
5. [Database Schema](#database-schema)
6. [API Specification](#api-specification)
7. [OAuth Flows](#oauth-flows)
8. [Client Integration](#client-integration)
9. [Security Requirements](#security-requirements)
10. [Environment Configuration](#environment-configuration)
11. [Development Guidelines](#development-guidelines)

---

## Overview

### Purpose

GroveAuth is a centralized authentication service that handles all authentication for AutumnsGrove properties. Instead of each site implementing its own auth logic, all sites redirect to GroveAuth for login and receive verified session tokens back.

### Goals

- **Single source of truth** for user authentication
- **Multiple auth providers** (Google, Magic Code)
- **Secure token-based sessions** that client sites can verify
- **Simple integration** for any site in the AutumnsGrove ecosystem
- **Admin-only access** (no public registration - allowlist based)

### Non-Goals

- Public user registration (this is admin auth only)
- Social features or user profiles
- Password-based authentication

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Sites                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │AutumnsGrove  │  │ Other Site   │  │ Future Site  │               │
│  │autumnsgrove. │  │ example.     │  │ another.     │               │
│  │   place      │  │ grove.place  │  │ grove.place  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │    1. Redirect to auth.grove.place/login?
          │       client_id=xxx&redirect_uri=xxx
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GroveAuth Service                            │
│                       auth.grove.place                              │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │      Google OAuth      │  │   Magic Code (Email)    │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐            │
│  │              Session & Token Management             │            │
│  │                                                     │            │
│  │  - JWT creation & signing                           │            │
│  │  - Token verification endpoint                      │            │
│  │  - Session storage (D1)                             │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                     │
│  2. User authenticates via chosen method                            │
│  3. GroveAuth redirects back with auth code                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          │    4. Site exchanges code for token
          │    5. Site verifies token with GroveAuth
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Sites receive verified user info and create their own sessions     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **GroveAuth** | OAuth flows, magic code, token generation, user verification |
| **Client Sites** | Redirect to GroveAuth, exchange codes, validate tokens, manage local sessions |
| **groveengine** | Helper functions for client sites to integrate with GroveAuth |

---

## Tech Stack

### Core

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Framework**: Hono.js (lightweight, fast, Workers-native)
- **Language**: TypeScript

### Dependencies

```json
{
  "dependencies": {
    "hono": "^4.x",
    "jose": "^5.x"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.x",
    "typescript": "^5.x",
    "wrangler": "^3.x"
  }
}
```

### Why Hono?

- Built for Cloudflare Workers
- Minimal overhead
- TypeScript-first
- Middleware support for auth checks
- Simple routing

---

## Authentication Methods

### 1. Google OAuth 2.0

**Purpose**: Primary sign-in method for admins with Google accounts

**Flow**: Authorization Code Grant with PKCE

**Scopes Required**:
- `openid`
- `email`
- `profile`

**Data Retrieved**:
- Email address (primary identifier)
- Name (display purposes)
- Profile picture URL (optional)

### 2. Magic Code (Email)

**Purpose**: Fallback for users who prefer email-based auth

**Flow**:
1. User enters email
2. 6-digit code sent via Resend API
3. User enters code to verify
4. Session created on successful verification

**Constraints**:
- Code expires in 10 minutes
- Rate limit: 3 codes per email per minute
- Lockout: 5 failed attempts = 15-minute lockout

---

## Database Schema

### Tables

```sql
-- Registered client applications (sites that can use GroveAuth)
CREATE TABLE clients (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- "AutumnsGrove", "Other Site"
    client_id TEXT UNIQUE NOT NULL,         -- Public identifier
    client_secret_hash TEXT NOT NULL,       -- Hashed secret for token exchange
    redirect_uris TEXT NOT NULL,            -- JSON array of allowed redirect URIs
    allowed_origins TEXT NOT NULL,          -- JSON array of allowed CORS origins
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Authorized admin users
CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- UUID
    email TEXT UNIQUE NOT NULL,             -- Primary identifier
    name TEXT,                              -- Display name
    avatar_url TEXT,                        -- Profile picture
    provider TEXT NOT NULL,                 -- 'google', 'magic_code'
    provider_id TEXT,                       -- ID from OAuth provider
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
);

-- Admin email allowlist
CREATE TABLE allowed_emails (
    email TEXT PRIMARY KEY,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT                           -- Who added this email
);

-- Authorization codes (short-lived, exchanged for tokens)
CREATE TABLE auth_codes (
    code TEXT PRIMARY KEY,                  -- Random code
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT,                    -- For PKCE
    code_challenge_method TEXT,             -- 'S256'
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Refresh tokens (long-lived)
CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,        -- Hashed token
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Magic codes for email auth
CREATE TABLE magic_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,                     -- 6-digit code
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting and failed attempts
CREATE TABLE rate_limits (
    key TEXT PRIMARY KEY,                   -- 'email:xxx' or 'ip:xxx'
    count INTEGER DEFAULT 1,
    window_start TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE failed_attempts (
    email TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    last_attempt TEXT,
    locked_until TEXT
);

-- Audit log
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,               -- 'login', 'logout', 'failed_login', etc.
    user_id TEXT,
    client_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,                           -- JSON additional details
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_auth_codes_expires ON auth_codes(expires_at);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_magic_codes_email ON magic_codes(email);
CREATE INDEX idx_magic_codes_expires ON magic_codes(expires_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

---

## API Specification

### Base URL

```
https://auth.grove.place
```

### Endpoints Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/login` | Login page with provider selection |
| GET | `/oauth/google` | Initiate Google OAuth |
| GET | `/oauth/google/callback` | Google OAuth callback |
| POST | `/magic/send` | Send magic code email |
| POST | `/magic/verify` | Verify magic code |
| POST | `/token` | Exchange auth code for tokens |
| POST | `/token/refresh` | Refresh access token |
| POST | `/token/revoke` | Revoke refresh token |
| GET | `/verify` | Verify access token |
| GET | `/userinfo` | Get current user info |
| POST | `/logout` | Logout and revoke tokens |
| GET | `/health` | Health check |

---

### Endpoint Details

#### `GET /login`

**Purpose**: Display login page with authentication options

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Registered client identifier |
| `redirect_uri` | Yes | Where to redirect after auth |
| `state` | Yes | CSRF protection (client-generated) |
| `code_challenge` | No | PKCE challenge (recommended) |
| `code_challenge_method` | No | Must be `S256` if challenge provided |

**Response**: HTML login page with Google and Magic Code options

**Error Responses**:
- `400` - Missing required parameters
- `400` - Invalid client_id
- `400` - redirect_uri not registered for client

---

#### `GET /oauth/google`

**Purpose**: Initiate Google OAuth flow

**Query Parameters**: Same as `/login`

**Response**: `302` Redirect to Google OAuth consent screen

---

#### `GET /oauth/google/callback`

**Purpose**: Handle Google OAuth callback

**Query Parameters**:
| Parameter | Description |
|-----------|-------------|
| `code` | Authorization code from Google |
| `state` | State parameter for CSRF verification |

**Success Response**: `302` Redirect to client's `redirect_uri` with:
```
{redirect_uri}?code={auth_code}&state={state}
```

**Error Response**: `302` Redirect with error:
```
{redirect_uri}?error=access_denied&error_description=...&state={state}
```

---

#### `POST /magic/send`

**Purpose**: Send magic code to email

**Request Body**:
```json
{
  "email": "admin@example.com",
  "client_id": "autumnsgrove",
  "redirect_uri": "https://autumnsgrove.place/auth/callback"
}
```

**Success Response** (`200`):
```json
{
  "success": true,
  "message": "If this email is registered, a code has been sent."
}
```

**Note**: Always returns success to prevent email enumeration

**Rate Limit Response** (`429`):
```json
{
  "error": "rate_limit",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

---

#### `POST /magic/verify`

**Purpose**: Verify magic code and get auth code

**Request Body**:
```json
{
  "email": "admin@example.com",
  "code": "123456",
  "client_id": "autumnsgrove",
  "redirect_uri": "https://autumnsgrove.place/auth/callback",
  "state": "random-state-string"
}
```

**Success Response** (`200`):
```json
{
  "success": true,
  "redirect_uri": "https://autumnsgrove.place/auth/callback?code=xxx&state=xxx"
}
```

**Error Response** (`401`):
```json
{
  "error": "invalid_code",
  "message": "Invalid or expired code"
}
```

**Lockout Response** (`423`):
```json
{
  "error": "account_locked",
  "message": "Too many failed attempts. Try again in 15 minutes.",
  "locked_until": "2025-01-15T12:00:00Z"
}
```

---

#### `POST /token`

**Purpose**: Exchange authorization code for tokens

**Request Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Yes | Must be `authorization_code` |
| `code` | Yes | Authorization code from callback |
| `redirect_uri` | Yes | Must match original request |
| `client_id` | Yes | Client identifier |
| `client_secret` | Yes | Client secret |
| `code_verifier` | No | PKCE verifier (if challenge was used) |

**Success Response** (`200`):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "scope": "openid email profile"
}
```

**Error Response** (`400`):
```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

---

#### `POST /token/refresh`

**Purpose**: Get new access token using refresh token

**Request Body**:
```
grant_type=refresh_token
refresh_token=dGhpcyBpcyBhIHJlZnJlc2g...
client_id=autumnsgrove
client_secret=xxx
```

**Success Response** (`200`):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4..."
}
```

**Note**: Refresh token rotation - new refresh token issued each time

---

#### `POST /token/revoke`

**Purpose**: Revoke a refresh token

**Request Body**:
```
token=dGhpcyBpcyBhIHJlZnJlc2g...
token_type_hint=refresh_token
client_id=autumnsgrove
client_secret=xxx
```

**Response** (`200`):
```json
{
  "success": true
}
```

---

#### `GET /verify`

**Purpose**: Verify an access token (for client sites to validate)

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Success Response** (`200`):
```json
{
  "active": true,
  "sub": "user-uuid",
  "email": "admin@example.com",
  "name": "Admin User",
  "exp": 1705312800,
  "iat": 1705309200,
  "client_id": "autumnsgrove"
}
```

**Invalid Token Response** (`200`):
```json
{
  "active": false
}
```

**Note**: Returns 200 even for invalid tokens (OAuth 2.0 introspection spec)

---

#### `GET /userinfo`

**Purpose**: Get current user information

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Success Response** (`200`):
```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "name": "Admin User",
  "picture": "https://...",
  "provider": "google"
}
```

**Error Response** (`401`):
```json
{
  "error": "invalid_token",
  "error_description": "Token is invalid or expired"
}
```

---

#### `POST /logout`

**Purpose**: Logout user and revoke all tokens

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body** (optional):
```json
{
  "redirect_uri": "https://autumnsgrove.place"
}
```

**Response** (`200`):
```json
{
  "success": true,
  "redirect_uri": "https://autumnsgrove.place"
}
```

---

#### `GET /health`

**Purpose**: Health check endpoint

**Response** (`200`):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## OAuth Flows

### Google OAuth Flow (with PKCE)

```
┌──────────┐                              ┌───────────┐                              ┌──────────┐
│  Client  │                              │ GroveAuth │                              │  Google  │
│  Site    │                              │           │                              │          │
└────┬─────┘                              └─────┬─────┘                              └────┬─────┘
     │                                          │                                         │
     │ 1. Generate state + code_verifier        │                                         │
     │    code_challenge = SHA256(verifier)     │                                         │
     │                                          │                                         │
     │ 2. Redirect to /login?                   │                                         │
     │    client_id=xxx&                        │                                         │
     │    redirect_uri=xxx&                     │                                         │
     │    state=xxx&                            │                                         │
     │    code_challenge=xxx                    │                                         │
     │─────────────────────────────────────────▶│                                         │
     │                                          │                                         │
     │                                          │ 3. Redirect to Google OAuth             │
     │                                          │────────────────────────────────────────▶│
     │                                          │                                         │
     │                                          │                    4. User logs in      │
     │                                          │                       consents          │
     │                                          │                                         │
     │                                          │ 5. Callback with code                   │
     │                                          │◀────────────────────────────────────────│
     │                                          │                                         │
     │                                          │ 6. Exchange code for Google tokens      │
     │                                          │────────────────────────────────────────▶│
     │                                          │                                         │
     │                                          │ 7. Return tokens + user info            │
     │                                          │◀────────────────────────────────────────│
     │                                          │                                         │
     │                                          │ 8. Verify email is in allowlist         │
     │                                          │    Create/update user                   │
     │                                          │    Generate auth code                   │
     │                                          │                                         │
     │ 9. Redirect to client redirect_uri       │                                         │
     │    with code + state                     │                                         │
     │◀─────────────────────────────────────────│                                         │
     │                                          │                                         │
     │ 10. POST /token                          │                                         │
     │     code + client_secret + verifier      │                                         │
     │─────────────────────────────────────────▶│                                         │
     │                                          │                                         │
     │ 11. Return access_token + refresh_token  │                                         │
     │◀─────────────────────────────────────────│                                         │
     │                                          │                                         │
     │ 12. Create local session                 │                                         │
     │     Store tokens securely                │                                         │
     │                                          │                                         │
```

### Magic Code Flow

```
┌──────────┐                              ┌───────────┐                              ┌──────────┐
│  Client  │                              │ GroveAuth │                              │  Resend  │
│  Site    │                              │           │                              │  (Email) │
└────┬─────┘                              └─────┬─────┘                              └────┬─────┘
     │                                          │                                         │
     │ 1. Redirect to /login                    │                                         │
     │─────────────────────────────────────────▶│                                         │
     │                                          │                                         │
     │                    2. User selects       │                                         │
     │                       "Sign in with      │                                         │
     │                        Email"            │                                         │
     │                       Enters email       │                                         │
     │                                          │                                         │
     │                                          │ 3. POST /magic/send                     │
     │                                          │    Check allowlist                      │
     │                                          │    Generate 6-digit code                │
     │                                          │    Store in DB                          │
     │                                          │                                         │
     │                                          │ 4. Send email with code                 │
     │                                          │────────────────────────────────────────▶│
     │                                          │                                         │
     │                    5. User receives      │                                         │
     │                       email, enters      │                                         │
     │                       code               │                                         │
     │                                          │                                         │
     │                                          │ 6. POST /magic/verify                   │
     │                                          │    Validate code                        │
     │                                          │    Check not expired                    │
     │                                          │    Check not used                       │
     │                                          │    Mark as used                         │
     │                                          │    Create auth code                     │
     │                                          │                                         │
     │ 7. Redirect with auth code               │                                         │
     │◀─────────────────────────────────────────│                                         │
     │                                          │                                         │
     │ 8. Exchange code for tokens              │                                         │
     │   (same as OAuth flow step 10-12)        │                                         │
     │                                          │                                         │
```

---

## Client Integration

### How Sites Authenticate with GroveAuth

#### Step 1: Register Your Site

Before a site can use GroveAuth, it must be registered in the `clients` table:

```sql
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'uuid-here',
  'AutumnsGrove',
  'autumnsgrove',
  'hashed-secret-here',
  '["https://autumnsgrove.place/auth/callback"]',
  '["https://autumnsgrove.place"]'
);
```

#### Step 2: Implement Login Redirect

```typescript
// In your site's login handler
function redirectToLogin() {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier(); // 43-128 chars
  const codeChallenge = await sha256(codeVerifier);

  // Store state and verifier in session/cookie
  setCookie('auth_state', state);
  setCookie('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: 'autumnsgrove',
    redirect_uri: 'https://autumnsgrove.place/auth/callback',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  redirect(`https://auth.grove.place/login?${params}`);
}
```

#### Step 3: Handle Callback

```typescript
// In your site's /auth/callback handler
async function handleCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Check for errors
  if (error) {
    return redirect('/login?error=' + error);
  }

  // Verify state matches
  const savedState = getCookie('auth_state');
  if (state !== savedState) {
    return redirect('/login?error=invalid_state');
  }

  // Get code verifier
  const codeVerifier = getCookie('code_verifier');

  // Exchange code for tokens
  const tokenResponse = await fetch('https://auth.grove.place/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://autumnsgrove.place/auth/callback',
      client_id: 'autumnsgrove',
      client_secret: env.GROVEAUTH_CLIENT_SECRET,
      code_verifier: codeVerifier
    })
  });

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return redirect('/login?error=' + tokens.error);
  }

  // Verify token and get user info
  const userResponse = await fetch('https://auth.grove.place/userinfo', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });

  const user = await userResponse.json();

  // Create local session
  const sessionToken = await createLocalSession(user, tokens);

  // Set session cookie and redirect to admin
  return redirect('/admin', {
    headers: {
      'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/`
    }
  });
}
```

#### Step 4: Verify Tokens on Protected Routes

```typescript
// In your site's hooks or middleware
async function verifyAuth(request) {
  const sessionToken = getCookie('session');

  if (!sessionToken) {
    return null;
  }

  // Verify with GroveAuth
  const response = await fetch('https://auth.grove.place/verify', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });

  const result = await response.json();

  if (!result.active) {
    return null;
  }

  return result; // { sub, email, name, ... }
}
```

### groveengine Integration Helpers

The following helpers should be added to `@autumnsgrove/groveengine` for easy integration:

```typescript
// @autumnsgrove/groveengine/auth

export interface GroveAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authBaseUrl?: string; // defaults to 'https://auth.grove.place'
}

export function createAuthClient(config: GroveAuthConfig): GroveAuthClient;

export interface GroveAuthClient {
  // Generate login URL with state and PKCE
  getLoginUrl(): { url: string; state: string; codeVerifier: string };

  // Exchange auth code for tokens
  exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse>;

  // Verify access token
  verifyToken(accessToken: string): Promise<TokenInfo | null>;

  // Refresh access token
  refreshToken(refreshToken: string): Promise<TokenResponse>;

  // Revoke refresh token
  revokeToken(refreshToken: string): Promise<void>;

  // Get user info
  getUserInfo(accessToken: string): Promise<UserInfo>;
}
```

---

## Security Requirements

### Token Security

1. **Access Tokens**
   - JWT format, signed with RS256
   - Short-lived: 1 hour expiration
   - Contains: sub, email, name, client_id, exp, iat, iss
   - Issuer: `https://auth.grove.place`

2. **Refresh Tokens**
   - Opaque tokens (random bytes, base64url encoded)
   - Long-lived: 30 days expiration
   - Stored hashed in database
   - Rotation on use (new token issued, old revoked)

3. **Authorization Codes**
   - Short-lived: 5 minutes
   - Single use (marked as used immediately)
   - Bound to client_id, redirect_uri, and code_challenge

### PKCE (Proof Key for Code Exchange)

- **Required** for all OAuth flows
- Method: S256 (SHA-256)
- Prevents authorization code interception attacks

### CSRF Protection

- **State parameter** required on all auth initiations
- Client generates random state, stores in cookie
- GroveAuth returns state unchanged
- Client verifies state matches before exchanging code

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/magic/send` | 3 per email per minute, 10 per IP per minute |
| `/magic/verify` | 5 attempts before 15-min lockout |
| `/token` | 20 per client per minute |
| `/verify` | 100 per client per minute |

### Security Headers

All responses must include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
```

### Audit Logging

Log all authentication events:
- Successful logins (provider, user, client, IP)
- Failed login attempts (email, IP, reason)
- Token exchanges
- Token revocations
- Logouts

---

## Environment Configuration

### Required Secrets

```toml
# wrangler.toml
[vars]
AUTH_BASE_URL = "https://auth.grove.place"

# Set via wrangler secret put
# JWT_PRIVATE_KEY - RSA private key for signing JWTs (PEM format)
# JWT_PUBLIC_KEY - RSA public key for verifying JWTs (PEM format)
# GOOGLE_CLIENT_ID - Google OAuth client ID
# GOOGLE_CLIENT_SECRET - Google OAuth client secret
# RESEND_API_KEY - Resend API key for sending emails
```

### D1 Database Binding

```toml
[[d1_databases]]
binding = "DB"
database_name = "groveauth"
database_id = "your-database-id"
```

### Environment Variables by Environment

| Variable | Development | Production |
|----------|-------------|------------|
| `AUTH_BASE_URL` | `http://localhost:8787` | `https://auth.grove.place` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | `https://autumnsgrove.place,...` |

---

## Development Guidelines

### Project Structure

```
groveauth/
├── src/
│   ├── index.ts              # Main entry, Hono app setup
│   ├── routes/
│   │   ├── login.ts          # Login page handler
│   │   ├── oauth/
│   │   │   └── google.ts     # Google OAuth handlers
│   │   ├── magic.ts          # Magic code handlers
│   │   ├── token.ts          # Token exchange handlers
│   │   └── verify.ts         # Token verification
│   ├── middleware/
│   │   ├── cors.ts           # CORS handling
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── security.ts       # Security headers
│   ├── services/
│   │   ├── jwt.ts            # JWT creation/verification
│   │   ├── oauth.ts          # OAuth provider helpers
│   │   ├── email.ts          # Email sending (Resend)
│   │   └── user.ts           # User management
│   ├── db/
│   │   ├── schema.sql        # Database schema
│   │   ├── queries.ts        # Database queries
│   │   └── migrations/       # Schema migrations
│   ├── utils/
│   │   ├── crypto.ts         # Hashing, random generation
│   │   ├── validation.ts     # Input validation
│   │   └── constants.ts      # Magic numbers, config
│   └── types.ts              # TypeScript types
├── templates/
│   ├── login.html            # Login page template
│   └── email-code.html       # Magic code email template
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```

### Testing Requirements

1. **Unit Tests**
   - JWT creation/verification
   - PKCE challenge verification
   - Rate limiting logic
   - Input validation

2. **Integration Tests**
   - Full OAuth flows (mocked providers)
   - Magic code flow
   - Token exchange
   - Token refresh/revocation

3. **Security Tests**
   - CSRF protection
   - Rate limiting
   - SQL injection prevention
   - Invalid state handling

### Coding Standards

- TypeScript strict mode
- All inputs validated with Zod
- Constant-time comparison for secrets
- No secrets in logs
- Meaningful error messages (but not too revealing)

---

## Deployment Checklist

### Initial Setup

- [ ] Create Cloudflare account/project
- [ ] Create D1 database
- [ ] Run schema migrations
- [ ] Generate RSA keypair for JWT signing
- [ ] Set up Google OAuth credentials (console.cloud.google.com)
- [ ] Set up Resend account and verify domain
- [ ] Configure DNS for auth.grove.place
- [ ] Set all secrets via `wrangler secret put`

### Pre-Launch

- [ ] Add initial allowed admin emails
- [ ] Register client applications (AutumnsGrove, etc.)
- [ ] Test all auth flows end-to-end
- [ ] Verify rate limiting works
- [ ] Check security headers
- [ ] Review audit logging

### Post-Launch

- [ ] Monitor error rates
- [ ] Set up alerting for failed login spikes
- [ ] Regular security audits
- [ ] Rotate secrets periodically

---

## Future Enhancements (Out of Scope for v1)

- WebAuthn/Passkey support
- Session management UI (view/revoke sessions)
- Admin dashboard for user management
- Multi-factor authentication
- IP-based access restrictions
- Webhook notifications for auth events

---

## Glossary

| Term | Definition |
|------|------------|
| **Access Token** | Short-lived JWT used to access protected resources |
| **Refresh Token** | Long-lived opaque token used to get new access tokens |
| **Authorization Code** | Short-lived code exchanged for tokens |
| **PKCE** | Proof Key for Code Exchange - prevents code interception |
| **Client** | A registered application that uses GroveAuth |
| **Provider** | Authentication method (Google, Magic Code) |

---

*Spec Version: 1.0*
*Created: 2025-01-15*
*Author: Claude (with guidance from Autumn)*
