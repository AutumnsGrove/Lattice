# Better Auth Migration - Forage Worker

## Overview

The Forage Worker API has been migrated to Better Auth session-based authentication. All API endpoints now require valid authentication via session cookies from `auth-api.grove.place`.

## What Changed

### Before (No Authentication)

- All API endpoints were publicly accessible
- CORS allowed wildcard origin (`*`)
- Users provided `client_id` in request body

### After (Better Auth)

- All `/api/*` endpoints require authentication
- CORS configured for credentialed requests
- `client_id` is automatically set to authenticated user's email
- Session validation happens on every API request

## Implementation Details

### New Files

- `worker/src/auth.ts` - Better Auth integration module
  - `validateSession()` - Validates session cookies
  - `unauthorizedResponse()` - Returns 401 for unauthenticated requests
  - `getClientId()` - Extracts client_id from user

### Modified Files

- `worker/src/index.ts` - Added authentication middleware
- `worker/src/types.ts` - Added `AuthenticatedUser` interface

### Authentication Flow

1. **Client Request** → Worker receives request with cookies
2. **Session Validation** → `validateSession()` calls `auth-api.grove.place/api/auth/session`
3. **Authorization Check** → If session invalid, return 401
4. **User Context** → Extract user info (id, email, name)
5. **Request Processing** → Pass user context to handlers
6. **Client ID Assignment** → Use user email as client_id

### CORS Configuration

```typescript
const corsHeaders = {
	"Access-Control-Allow-Origin": request.headers.get("origin") || "https://forage.grove.place",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Allow-Credentials": "true", // Required for cookies
};
```

## API Changes

### Request Changes

#### /api/search

**Before:**

```json
{
  "client_id": "user@example.com",
  "quiz_responses": { ... }
}
```

**After:**

```json
{
  "quiz_responses": { ... }
}
```

_Note: `client_id` is now derived from authenticated user's email_

#### /api/vibe

**Before:**

```json
{
	"vibe_text": "...",
	"client_id": "user@example.com",
	"client_email": "user@example.com"
}
```

**After:**

```json
{
	"vibe_text": "..."
}
```

_Note: Both `client_id` and `client_email` are now derived from authenticated user_

### All Endpoints Require Auth

Every API endpoint now validates the session:

- `/api/search` - Start new search
- `/api/vibe` - Vibe-based search
- `/api/status` - Get job status
- `/api/results` - Get results
- `/api/followup` - Get follow-up quiz
- `/api/resume` - Resume with follow-up
- `/api/cancel` - Cancel job
- `/api/stream` - SSE stream
- `/api/jobs/*` - Job management endpoints
- `/api/backfill` - Admin endpoint

## Frontend Integration

### Browser Usage (Recommended)

```typescript
// Sign in redirect
function signIn(provider: "google" | "github" = "google") {
	const redirectUrl = encodeURIComponent(window.location.href);
	window.location.href = `https://auth-api.grove.place/api/auth/sign-in/${provider}?callbackURL=${redirectUrl}`;
}

// API request with credentials
async function startSearch(quizResponses) {
	const response = await fetch("https://forage.grove.place/api/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include", // Required!
		body: JSON.stringify({ quiz_responses: quizResponses }),
	});

	if (response.status === 401) {
		signIn(); // Redirect to auth
		return;
	}

	return response.json();
}

// Check current session
async function getSession() {
	const res = await fetch("https://auth-api.grove.place/api/auth/session", {
		credentials: "include",
	});

	if (!res.ok) return null;
	return res.json(); // { user, session }
}
```

### cURL Usage

```bash
# 1. Sign in and save cookies
curl https://auth-api.grove.place/api/auth/sign-in/google \
  --cookie-jar cookies.txt \
  -L

# 2. Use saved cookies for API requests
curl -X POST https://forage.grove.place/api/search \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"quiz_responses": {...}}'
```

## Error Handling

### 401 Unauthorized Response

```json
{
	"error": "Unauthorized",
	"message": "Valid authentication required. Please sign in at https://auth-api.grove.place"
}
```

**Headers:**

- `WWW-Authenticate: Cookie realm="Better Auth"`

## Migration Checklist

- [x] Create `auth.ts` module with session validation
- [x] Update all handler functions to accept `AuthenticatedUser`
- [x] Remove `client_id` from request bodies
- [x] Update CORS to support credentials
- [x] Add authentication check to `handleApiRequest`
- [x] Update README with auth requirements
- [ ] Test authentication flow end-to-end
- [ ] Update frontend to use session-based auth
- [ ] Update TODOS.md to mark GroveAuth integration complete

## Security Considerations

1. **Session Cookie Security**
   - HttpOnly cookie set by auth-api.grove.place
   - Secure flag (HTTPS only)
   - SameSite attribute for CSRF protection
   - Domain: `.grove.place` (enables cross-subdomain SSO)

2. **CORS Configuration**
   - Reflects request origin (no wildcard with credentials)
   - Allows credentials for cookie transmission
   - Restricts methods to GET, POST, OPTIONS

3. **No Token Management**
   - No localStorage/sessionStorage used
   - No client-side token handling
   - Session refresh handled by Better Auth

## Testing

### Manual Testing Steps

1. **Clear existing cookies**

   ```bash
   rm cookies.txt
   ```

2. **Test unauthenticated request (should fail)**

   ```bash
   curl https://forage.grove.place/api/search -X POST \
     -H "Content-Type: application/json" \
     -d '{"quiz_responses": {...}}'
   # Expected: 401 Unauthorized
   ```

3. **Sign in via Better Auth**
   - Visit https://auth-api.grove.place/api/auth/sign-in/google
   - Complete OAuth flow
   - Browser should have session cookie

4. **Test authenticated request**
   ```bash
   # Use browser dev tools to copy cookie value
   curl https://forage.grove.place/api/search -X POST \
     -H "Content-Type: application/json" \
     --cookie "better-auth.session_token=<YOUR_TOKEN>" \
     -d '{"quiz_responses": {...}}'
   # Expected: 200 OK with job_id
   ```

## Troubleshooting

### "401 Unauthorized" on API requests

- Check that cookies are being sent (`credentials: 'include'`)
- Verify session is valid at `/api/auth/session`
- Ensure request origin is allowed in CORS

### "CORS error" in browser

- Verify `credentials: 'include'` is set in fetch
- Check that browser is sending Origin header
- Confirm auth-api.grove.place session cookie exists

### Session not persisting

- Check cookie domain (should be `.grove.place`)
- Verify HTTPS is being used
- Ensure cookies aren't being blocked by browser

## References

- Better Auth Documentation: https://www.better-auth.com/
- Better Auth Session Endpoint: https://auth-api.grove.place/api/auth/session
- Better Auth Sign In: https://auth-api.grove.place/api/auth/sign-in/{provider}
