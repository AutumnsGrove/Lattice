# Grove Product Standards

> *How we build things in the Grove.*

---

## Repository Architecture

Grove follows a **monorepo-per-product** architecture. Each product with a public-facing domain gets its own repository that imports `groveengine` as the shared foundation.

> **Note:** The npm package is currently published as `groveengine`. It will be renamed to `@autumnsgrove/lattice` in a future release.

### The Pattern

```
GroveEngine/              ← Lattice: shared npm package
├── src/                  ← UI components, utilities, patterns
├── docs/specs/           ← Planning docs for all products (pre-implementation)
└── package.json          ← groveengine (future: @autumnsgrove/lattice)

grove-ivy/                ← Ivy: standalone product
├── src/                  ← SvelteKit app
├── package.json          ← depends on groveengine
└── wrangler.toml         ← Cloudflare Workers config

grove-amber/             ← Amber: standalone product
├── ...
└── package.json          ← depends on groveengine
```

### What Goes Where

| Content | Location |
|---------|----------|
| **Specs & Planning** | `GroveEngine/docs/specs/` (until implementation) |
| **Shared UI Components** | `GroveEngine/src/` (Lattice) |
| **Shared Utilities** | `GroveEngine/src/` (Lattice) |
| **Product Frontend** | Product's own repo |
| **Product Backend/Workers** | Product's own repo |
| **Product-Specific Assets** | Product's own repo |

---

## Product Categories

### External Products (Own Repo Required)

Products with public domains that users interact with directly:

| Product | Public Name | Domain | Repo |
|---------|-------------|--------|------|
| GroveMail | **Ivy** | ivy.grove.place | `grove-ivy` |
| GroveStorage | **Amber** | amber.grove.place | `grove-amber` |
| GroveSocial | **Meadow** | meadow.grove.place | `grove-meadow` |
| GroveDomainTool | **Forage** | forage.grove.place | `grove-forage` |
| TreasureTrove | **Trove** | trove.grove.place | `grove-trove` |
| GroveMusic | **Aria** | aria.grove.place | `grove-aria` |
| GroveMC | **Outpost** | mc.grove.place | `grove-outpost` |

### External Services (Own Repo, No User-Facing Frontend)

Backend services that need isolation for security or operational reasons:

| Product | Public Name | Repo | Reason |
|---------|-------------|------|--------|
| GroveAuth | **Heartwood** | `GroveAuth` | Security isolation |
| GrovePatina | **Patina** | `Patina` | Operational isolation |

### Internal/Integrated (Stay in Lattice)

Features that are deeply embedded in other products:

| Product | Public Name | Location | Reason |
|---------|-------------|----------|--------|
| GroveAnalytics | **Rings** | Integrated into admin | Not standalone |
| GroveEngine | **Lattice** | This repo | Is the foundation |

---

## Standard Repository Structure

Every Grove product repo should follow this structure:

```
grove-{product}/
├── .github/
│   └── workflows/          # CI/CD (deploy to Cloudflare)
├── src/
│   ├── routes/             # SvelteKit routes
│   ├── lib/
│   │   ├── components/     # Product-specific components
│   │   ├── server/         # Server-only code (Workers)
│   │   └── stores/         # Svelte stores
│   └── app.html
├── static/                 # Static assets
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/                   # Product-specific docs (if needed)
├── package.json
├── svelte.config.js
├── wrangler.toml           # Cloudflare Workers config
├── AGENT.md                # AI agent instructions
├── CLAUDE.md               # Points to AGENT.md
└── README.md
```

### Package.json Requirements

```json
{
  "name": "grove-{product}",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "wrangler pages dev",
    "deploy": "wrangler pages deploy",
    "test": "vitest",
    "lint": "eslint .",
    "check": "svelte-check"
  },
  "dependencies": {
    "groveengine": "^latest"
  }
}
```

### Wrangler.toml Template

```toml
name = "grove-{product}"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "grove-{product}"
database_id = "..."

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "grove-storage"

[[kv_namespaces]]
binding = "KV"
id = "..."
```

---

## Lattice Integration

Every Grove product imports Lattice (currently `groveengine`) for shared functionality:

### What Lattice Provides

```typescript
// UI Components
import { Button, Card, Modal, Toast } from 'groveengine';
import { GroveLayout, Sidebar, Header } from 'groveengine/layout';

// Authentication
import { requireAuth, getUser, withHeartwood } from 'groveengine/auth';

// Database Patterns
import { createD1Client, withTransaction } from 'groveengine/db';

// Utilities
import { formatDate, slugify, debounce } from 'groveengine/utils';

// Markdown
import { renderMarkdown, parseMarkdown } from 'groveengine/markdown';

// Theming
import { theme, applyTheme } from 'groveengine/theme';
```

### What Products Own

Products should NOT put these in Lattice:
- Product-specific business logic
- Product-specific API routes
- Product-specific database schemas
- Product-specific UI that won't be reused

---

## Naming Conventions

### Public Names (User-Facing)

Single evocative words from nature/shelter themes:
- Ivy, Amber, Meadow, Acorn, Trove, Aria, Outpost
- Used in marketing, UI, documentation
- Domain: `{name}.grove.place`

### Internal Names (Developer-Facing)

`Grove{Thing}` pattern for clarity:
- GroveMail, GroveStorage, GroveSocial, etc.
- Used in code, logs, debugging
- Repo: `grove-{lowercase}` or `Grove{Thing}`

### Code Style

```typescript
// Constants: SCREAMING_SNAKE_CASE
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// Config objects: PRODUCT_CONFIG
const IVY_CONFIG = { ... };
const AMBER_CONFIG = { ... };

// Functions: camelCase
async function sendNewsletter() { ... }

// Types/Interfaces: PascalCase
interface EmailThread { ... }
type StorageFile = { ... };
```

---

## Development Workflow

### Starting a New Product

1. **Spec first**: Create spec in `GroveEngine/docs/specs/{product}-spec.md`
2. **Get approval**: Review spec, iterate on design
3. **Create repo**: `grove-{product}` following standard structure
4. **Set up CI**: GitHub Actions for Cloudflare deployment
5. **Import Lattice**: Add `@autumnsgrove/lattice` dependency
6. **Build**: Implement against the spec
7. **Move spec**: Optionally move spec to product repo's `/docs`

### Making Changes to Lattice

If a product needs new shared functionality:

1. Check if it's truly reusable across products
2. If yes → PR to GroveEngine, add to Lattice
3. If no → Keep it in the product repo

### Environment Setup

All Grove products use:
- **Runtime:** Cloudflare Workers
- **Framework:** SvelteKit
- **Database:** Cloudflare D1
- **Storage:** Cloudflare R2
- **Auth:** Heartwood (via Lattice)
- **DNS:** Cloudflare

---

## Security Standards

### Authentication

All authenticated routes use Heartwood:

```typescript
// In +page.server.ts or +server.ts
import { requireAuth } from 'groveengine/auth';

export const load = async ({ cookies }) => {
  const user = await requireAuth(cookies);
  // user is guaranteed to exist here
};
```

### Secrets Management

- Never commit secrets
- Use Cloudflare Workers secrets: `wrangler secret put SECRET_NAME`
- Access via `env.SECRET_NAME` in Workers

### Rate Limiting

All public endpoints must have rate limiting:

```typescript
import { rateLimit } from 'groveengine/security';

// In API route
const allowed = await rateLimit(env.KV, request, {
  limit: 100,
  window: '1h',
});
```

---

## Migration Checklist

When migrating a product out of GroveEngine:

- [ ] Create new repo with standard structure
- [ ] Copy product-specific code (routes, components, logic)
- [ ] Update imports to use `@autumnsgrove/lattice`
- [ ] Set up wrangler.toml with correct bindings
- [ ] Configure GitHub Actions for deployment
- [ ] Update DNS to point to new deployment
- [ ] Remove old code from GroveEngine
- [ ] Update any cross-references in other products

---

## Current Status

| Product | Spec | Repo | Frontend | Backend | Status |
|---------|:----:|:----:|:--------:|:-------:|--------|
| Ivy | ✓ | — | — | — | Spec complete |
| Amber | ✓ | — | — | — | Spec complete |
| Acorn | — | ✓ | ⚠️ In GroveEngine | ✓ | Needs frontend migration |
| Heartwood | — | ✓ | ✓ | ✓ | Complete |
| Patina | ✓ | ✓ | — | — | Spec updated, repo exists |
| Meadow | — | — | — | — | Not started |
| Trove | — | — | — | — | Not started |
| Aria | — | — | — | — | Not started |
| Outpost | — | — | — | — | Not started |
| Rings | — | — | — | — | Will be integrated |

---

*Last updated: December 2025*
*Maintainer: Grove Engineering*
