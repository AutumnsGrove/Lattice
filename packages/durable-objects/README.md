# Grove Durable Objects Worker

This worker hosts all Durable Objects for the Grove Platform. Other services reference these DOs via service bindings.

## Architecture

Cloudflare Pages doesn't support self-hosted Durable Objects, so we deploy them in a separate Worker:

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   Lattice (Pages)   │────▶│  grove-durable-objects   │
│   blog.grove.place      │     │  (this worker)           │
└─────────────────────────┘     │                          │
                                │  ┌─────────────────────┐ │
┌─────────────────────────┐     │  │ TenantDO            │ │
│   post-migrator         │────▶│  │ PostMetaDO          │ │
│   (cron worker)         │     │  │ PostContentDO       │ │
└─────────────────────────┘     │  └─────────────────────┘ │
                                └──────────────────────────┘
```

## Durable Object Classes

| Class             | Purpose                                         | ID Pattern                  |
| ----------------- | ----------------------------------------------- | --------------------------- |
| **TenantDO**      | Config caching, draft sync, analytics buffering | `tenant:{subdomain}`        |
| **PostMetaDO**    | Views, reactions, real-time presence (hot data) | `post:{tenantId}:{slug}`    |
| **PostContentDO** | Content cache, hot/warm/cold storage            | `content:{tenantId}:{slug}` |

## Deployment

```bash
# From this directory
pnpm install
pnpm deploy
```

The worker will be deployed to: `https://grove-durable-objects.<account>.workers.dev`

## Migrations

DO migrations are defined in `wrangler.toml`:

- **v1**: Creates `TenantDO` with SQLite storage
- **v2**: Creates `PostMetaDO` and `PostContentDO` with SQLite storage

Migrations run automatically when the worker is deployed.

## Usage from Other Workers

Reference DOs from Pages or other Workers by adding to their `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "TENANTS"
class_name = "TenantDO"
script_name = "grove-durable-objects"
```

## Development

```bash
# Run locally (requires D1 and R2 configured)
pnpm dev

# Type check
pnpm check
```

## Health Check

```bash
curl https://grove-durable-objects.<account>.workers.dev/health
```

Returns:

```json
{
  "status": "ok",
  "service": "grove-durable-objects",
  "classes": ["TenantDO", "PostMetaDO", "PostContentDO"]
}
```
