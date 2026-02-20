# Grove Wildcard Router Worker - Implementation Plan

## Context

Cloudflare Pages does not support wildcard custom domains (`*.grove.place`). We need a Worker to act as a proxy/router that:

1. Catches all `*.grove.place` requests
2. Routes them to the appropriate Pages project
3. Handles the subdomain routing we built in `hooks.server.ts`

## Current State

### What's Done

- `hooks.server.ts` - Subdomain routing logic (extracts subdomain, looks up tenant in D1)
- `app.d.ts` - AppContext types for routing
- Route groups `(tenant)/` and `(apps)/` created
- Migration `009_create_tenants_only.sql` applied - tenants table exists
- Test tenant "Dave" created (`dave.grove.place`)
- Wildcard DNS record `*` → `grove-lattice.pages.dev` added

### What's Blocking

- Cloudflare Pages won't accept `*.grove.place` as a custom domain
- Need a Worker to proxy wildcard requests to Pages

### Existing Infrastructure

- **grove-lattice** Pages project (the main engine)
- **groveauth** Worker for auth-api.grove.place
- **grove-domains** Pages for domains.grove.place
- **grove-landing** Pages for grove.place (root)
- Multiple other specific subdomain bindings

## Implementation Plan

### Step 1: Create the Worker Project

Create a new Worker called `grove-router` in the project:

```
workers/grove-router/
├── wrangler.toml
├── src/
│   └── index.ts
└── package.json
```

### Step 2: Worker Code

```typescript
// workers/grove-router/src/index.ts

export interface Env {
	// No bindings needed - pure proxy
}

// Subdomains that should NOT be proxied (handled by other services)
const EXCLUDED_SUBDOMAINS = new Set([
	"auth", // groveauth-frontend Pages
	"admin", // groveauth-frontend Pages
	"login", // groveauth-frontend Pages
	"domains", // grove-domains Pages
	"cdn", // grove-landing Pages (R2)
	"music", // grovemusic Pages
	"scout", // scout Worker
	"auth-api", // groveauth Worker
	"www", // Redirect to root (handled in hooks)
]);

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const host = url.hostname;

		// Extract subdomain
		const parts = host.split(".");
		if (parts.length < 3 || !host.endsWith(".grove.place")) {
			// Not a subdomain request, pass through
			return fetch(request);
		}

		const subdomain = parts[0];

		// Skip excluded subdomains (they have their own routes)
		if (EXCLUDED_SUBDOMAINS.has(subdomain)) {
			// This shouldn't happen if routes are configured correctly
			// but just in case, return 404
			return new Response("Service handled elsewhere", { status: 404 });
		}

		// Proxy to lattice Pages
		const targetUrl = new URL(request.url);
		targetUrl.hostname = "grove-lattice.pages.dev";

		// Create new request with modified URL
		const proxyRequest = new Request(targetUrl.toString(), {
			method: request.method,
			headers: request.headers,
			body: request.body,
			redirect: "manual",
		});

		// Add original host header so Pages knows the real domain
		proxyRequest.headers.set("X-Forwarded-Host", host);

		const response = await fetch(proxyRequest);

		// Return response with CORS headers if needed
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	},
};
```

### Step 3: Wrangler Configuration

```toml
# workers/grove-router/wrangler.toml

name = "grove-router"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Route configuration - catch all wildcard subdomains
routes = [
  { pattern = "*.grove.place/*", zone_name = "grove.place" }
]

# Exclude specific subdomains (these go to their own services)
# This is done via zone-level HTTP Routes in Cloudflare Dashboard, not here
```

### Step 4: Zone HTTP Routes Configuration

In Cloudflare Dashboard → grove.place → Rules → HTTP Routes:

| Route Pattern            | Service                           |
| ------------------------ | --------------------------------- |
| `auth.grove.place/*`     | (none - uses Pages custom domain) |
| `admin.grove.place/*`    | (none - uses Pages custom domain) |
| `login.grove.place/*`    | (none - uses Pages custom domain) |
| `domains.grove.place/*`  | (none - uses Pages custom domain) |
| `cdn.grove.place/*`      | (none - uses Pages custom domain) |
| `music.grove.place/*`    | (none - uses Pages custom domain) |
| `scout.grove.place/*`    | scout Worker                      |
| `auth-api.grove.place/*` | groveauth Worker                  |
| `*.grove.place/*`        | grove-router Worker               |

**Important:** More specific routes take precedence over wildcards!

### Step 5: Update hooks.server.ts

The hooks file needs to read the actual hostname, not the proxied one. Update to check `X-Forwarded-Host`:

```typescript
// In extractSubdomain function
const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
```

### Step 6: Deployment Steps

1. Create the Worker directory structure
2. Write the Worker code
3. Deploy with `wrangler deploy`
4. Configure HTTP Routes in Cloudflare Dashboard
5. Test with `dave.grove.place`

## Auth Flow Consideration

**Q: How does auth work for tenant users?**

The auth flow remains the same:

1. User visits `dave.grove.place` → grove-router → lattice Pages
2. User clicks login → redirects to `auth.grove.place` (groveauth-frontend)
3. Auth completes → redirects back to `dave.grove.place`
4. Session cookie is set for `.grove.place` domain (works across subdomains)

The cookie domain in `hooks.server.ts` is already set to `.grove.place`:

```typescript
cookieParts.push("Domain=.grove.place");
```

## Testing Checklist

- [ ] `dave.grove.place` loads and shows "Dave's Digital Garden"
- [ ] `nonexistent.grove.place` shows "Blog Not Found" page
- [ ] `auth.grove.place` still works (not proxied)
- [ ] `domains.grove.place` still works (not proxied)
- [ ] Login flow works across subdomains
- [ ] Local dev still works with `?subdomain=dave`

## Files to Create/Modify

| File                                  | Action                    |
| ------------------------------------- | ------------------------- |
| `services/grove-router/wrangler.toml` | CREATE                    |
| `services/grove-router/src/index.ts`  | CREATE                    |
| `services/grove-router/package.json`  | CREATE                    |
| `libs/engine/src/hooks.server.ts` | MODIFY (X-Forwarded-Host) |

## Commands to Run

```bash
# Create and deploy the worker
cd packages/grove-router
pnpm init
wrangler deploy

# Then configure HTTP Routes in Cloudflare Dashboard
```

---

_Plan created: 2025-12-09_
_Status: Ready for implementation_
