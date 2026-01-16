# Wildcard Pages Consolidation Guide

## Overview

Migrate from multiple separate Pages deployments to a single deployment handling `*.grove.place`.

**Current State:**
```
example.grove.place  →  example-site Pages project
another.grove.place  →  another-site Pages project
domains.grove.place  →  domains Pages project
...
```

**Target State:**
```
*.grove.place  →  groveengine Pages project (single deployment)
                  ↓
              SvelteKit hook parses subdomain
                  ↓
              Routes to correct tenant/app
```

---

## 🎯 Benefits

1. **One deployment** instead of dozens
2. **Shared code** - UI components, auth, etc.
3. **Unified builds** - one CI/CD pipeline
4. **Simpler DNS** - one wildcard CNAME
5. **Easier updates** - deploy once, update everywhere

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    *.grove.place (Wildcard DNS)                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   groveengine Pages Project                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   hooks.server.ts                       │    │
│  │                                                         │    │
│  │  1. Parse hostname → extract subdomain                  │    │
│  │  2. Check reserved subdomains (auth, admin, api, etc.)  │    │
│  │  3. Look up tenant in D1 OR route to internal app       │    │
│  │  4. Set locals.tenant / locals.app context              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                │
│         ┌──────────────────────┼──────────────────────┐         │
│         │                      │                      │         │
│         ▼                      ▼                      ▼         │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐    │
│  │   Tenant    │       │  Reserved   │       │   Landing   │    │
│  │   Blogs     │       │    Apps     │       │    Page     │    │
│  │             │       │             │       │             │    │
│  │ /[tenant]/  │       │ /apps/      │       │ /           │    │
│  │  routes     │       │  domains/   │       │ (grove.     │    │
│  │             │       │  monitor/   │       │  place)     │    │
│  └─────────────┘       └─────────────┘       └─────────────┘    │ 
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Recommended Route Structure

```
packages/engine/src/routes/
├── +layout.svelte              # Root layout
├── +layout.server.ts           # Load tenant context
├── +page.svelte                # Landing page (grove.place only)
├── +error.svelte               # Error page
│
├── (tenant)/                   # Tenant blog routes (grouped)
│   ├── +layout.svelte          # Tenant-specific layout
│   ├── +page.svelte            # Blog home
│   ├── posts/
│   │   ├── +page.svelte        # Post list
│   │   └── [slug]/+page.svelte # Single post
│   ├── about/+page.svelte
│   └── admin/                  # Tenant admin
│       └── ...
│
├── (apps)/                     # Internal apps (grouped)
│   ├── domains/                # domains.grove.place
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   ├── monitor/                # monitor.grove.place
│   │   └── ...
│   └── scout/                  # scout.grove.place (if integrated)
│       └── ...
│
├── auth/                       # Auth routes (auth.grove.place)
│   ├── login/+page.svelte
│   ├── callback/+page.svelte
│   └── logout/+page.svelte
│
├── admin/                      # Platform admin (admin.grove.place)
│   └── ...
│
└── api/                        # API routes
    └── ...
```

---

## 🔀 Routing Logic (hooks.server.ts)

```typescript
// src/hooks.server.ts

import type { Handle } from '@sveltejs/kit';

// Reserved subdomains that route to internal apps
const RESERVED_SUBDOMAINS: Record<string, string> = {
  'www': '/',                    // Redirect to root
  'auth': '/auth',               // Auth app
  'admin': '/admin',             // Platform admin
  'api': '/api',                 // API routes
  'domains': '/(apps)/domains',  // Domain search tool
  'monitor': '/(apps)/monitor',  // GroveMonitor
  'cdn': null,                   // Handled by R2 directly
  'staging': null,               // Staging environment flag
};

// Subdomains that are separate Workers (not consolidated)
const EXTERNAL_WORKERS = ['scout', 'music', 'search'];

export const handle: Handle = async ({ event, resolve }) => {
  const host = event.request.headers.get('host') || '';
  const parts = host.split('.');
  
  // Extract subdomain (handle both grove.place and localhost)
  let subdomain: string | null = null;
  
  if (host.includes('grove.place')) {
    // Production: *.grove.place
    subdomain = parts.length > 2 ? parts[0] : null;
  } else if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // Local dev: Check for subdomain simulation via header or query
    subdomain = event.request.headers.get('x-subdomain') || 
                event.url.searchParams.get('subdomain') ||
                null;
  }
  
  // No subdomain = landing page (grove.place)
  if (!subdomain || subdomain === 'grove') {
    event.locals.context = { type: 'landing' };
    return resolve(event);
  }
  
  // Check if it's a reserved subdomain
  if (subdomain in RESERVED_SUBDOMAINS) {
    const routePrefix = RESERVED_SUBDOMAINS[subdomain];
    
    if (routePrefix === null) {
      // External handling (CDN, etc.)
      return new Response('Not handled by this worker', { status: 404 });
    }
    
    if (subdomain === 'www') {
      // Redirect www to root
      return new Response(null, {
        status: 301,
        headers: { Location: `https://grove.place${event.url.pathname}` }
      });
    }
    
    event.locals.context = { 
      type: 'app', 
      app: subdomain,
      routePrefix 
    };
    return resolve(event);
  }
  
  // Check if it's an external worker (not consolidated yet)
  if (EXTERNAL_WORKERS.includes(subdomain)) {
    // These are handled by separate Workers, shouldn't hit this
    return new Response('Service not found', { status: 404 });
  }
  
  // Must be a tenant subdomain - look up in D1
  const db = event.platform?.env?.DB;
  if (!db) {
    console.error('D1 not available');
    return new Response('Database unavailable', { status: 503 });
  }
  
  const tenant = await db.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND active = 1'
  ).bind(subdomain).first();
  
  if (!tenant) {
    // Subdomain not registered
    event.locals.context = { type: 'not_found', subdomain };
    // Could redirect to signup or show 404
    return new Response('Blog not found', { status: 404 });
  }
  
  // Valid tenant - set context
  event.locals.context = {
    type: 'tenant',
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      theme: tenant.theme_config ? JSON.parse(tenant.theme_config) : null,
      ownerId: tenant.owner_id,
    }
  };
  event.locals.tenantId = tenant.id;
  
  return resolve(event);
};
```

---

## 📝 Type Definitions

```typescript
// src/app.d.ts

declare global {
  namespace App {
    interface Locals {
      context: AppContext;
      tenantId?: string;
    }
    
    interface Platform {
      env?: {
        DB: D1Database;
        MEDIA: R2Bucket;
        CACHE: KVNamespace;
      };
    }
  }
}

type AppContext = 
  | { type: 'landing' }
  | { type: 'app'; app: string; routePrefix: string }
  | { type: 'tenant'; tenant: TenantInfo }
  | { type: 'not_found'; subdomain: string };

interface TenantInfo {
  id: string;
  subdomain: string;
  name: string;
  theme: ThemeConfig | null;
  ownerId: string;
}

interface ThemeConfig {
  primary: string;
  secondary?: string;
  font?: string;
}

export {};
```

---

## 🔧 Migration Steps

### Step 1: Update DNS

```
# In Cloudflare DNS for grove.place

# Remove individual records:
# - example.grove.place  CNAME  example-site.pages.dev  ❌ DELETE
# - another.grove.place  CNAME  another-site.pages.dev  ❌ DELETE

# Add wildcard:
*.grove.place  CNAME  groveengine.pages.dev  ✅ ADD
grove.place    CNAME  groveengine.pages.dev  ✅ KEEP/ADD
```

### Step 2: Add Custom Domain to Pages

1. Go to Cloudflare Dashboard → Pages → groveengine
2. Custom domains → Add custom domain
3. Add `*.grove.place`
4. Add `grove.place` (if not already)

### Step 3: Update hooks.server.ts

Copy the routing logic above into your existing hooks file, merging with any existing handle function.

### Step 4: Reorganize Routes

Move app-specific routes into the grouped folders:

```bash
# Example migration
mv src/routes/domains/* src/routes/(apps)/domains/
```

### Step 5: Update Layout to Use Context

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  
  $: context = $page.data.context;
</script>

{#if context?.type === 'landing'}
  <LandingLayout>
    <slot />
  </LandingLayout>
{:else if context?.type === 'tenant'}
  <TenantLayout tenant={context.tenant}>
    <slot />
  </TenantLayout>
{:else if context?.type === 'app'}
  <AppLayout app={context.app}>
    <slot />
  </AppLayout>
{:else}
  <slot />
{/if}
```

### Step 6: Deprecate Old Pages Projects

After confirming everything works:

1. Keep old projects for 1-2 weeks (fallback)
2. Remove custom domains from old projects
3. Delete old Pages projects

---

## 🧪 Testing Locally

### Option 1: Subdomain Query Param

```
http://localhost:5173?subdomain=example
http://localhost:5173?subdomain=domains
```

### Option 2: Custom Header

```bash
curl -H "x-subdomain: example" http://localhost:5173
```

### Option 3: /etc/hosts (Advanced)

```
# /etc/hosts
127.0.0.1  example.grove.local
127.0.0.1  domains.grove.local
```

Then configure vite to handle `*.grove.local`.

---

## ⚠️ Things to Watch

1. **Separate Workers**: Scout, Music, Search are separate repos/workers. Keep them separate for now, or consider full integration later.

2. **Auth Cookies**: Ensure cookies are set for `.grove.place` (with leading dot) so they work across subdomains.

3. **CORS**: If APIs are on different subdomains, configure CORS appropriately.

4. **SSL**: Cloudflare handles wildcard SSL automatically with Pages.

5. **Caching**: Be careful with caching - tenant-specific content shouldn't be cached across tenants.

---

## 📊 Before/After Comparison

| Aspect | Before (Multiple Pages) | After (Wildcard) |
|--------|------------------------|------------------|
| Deployments | 5+ Pages projects | 1 Pages project |
| Build time | 5+ separate builds | 1 build |
| Code sharing | Manual copy/paste | Shared components |
| Updates | Deploy to each | Deploy once |
| DNS records | 5+ CNAME records | 1 wildcard CNAME |
| Consistency | Can drift | Always in sync |

---

## 🚀 Quick Start for Claude Code

```markdown
## Task: Consolidate Pages to Wildcard

1. Update `src/hooks.server.ts` with the subdomain routing logic from this guide
2. Create `src/app.d.ts` with the type definitions
3. Reorganize routes into grouped folders: `(tenant)`, `(apps)`
4. Update root layout to switch based on context type
5. Test with `?subdomain=example` query param locally
6. Deploy and add `*.grove.place` custom domain in Pages dashboard
```
