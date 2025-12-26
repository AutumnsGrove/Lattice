# Cloudflare Development Guide

## Overview

This guide covers working with Cloudflare services using both the official Cloudflare MCP (Model Context Protocol) server and traditional wrangler CLI workflows. The MCP server simplifies complex operations through natural language, while wrangler provides direct command-line control.

**Primary Services Covered:** Workers, Pages, KV (Key-Value), R2 (Object Storage), D1 (SQLite Database), Workers AI

**Quick Start:** Use the Cloudflare MCP server for seamless integration with Claude Code, or use wrangler CLI for direct control.

---

## When to Use This Guide

- **Setting up Cloudflare Workers or Pages**
- **Working with KV, R2, or D1 storage**
- **Deploying applications to Cloudflare**
- **Debugging Cloudflare deployments**
- **Managing Cloudflare resources via MCP or CLI**

---

## Cloudflare MCP Server

### Quick Check

Verify the Cloudflare MCP server is configured:

```bash
# Check if MCP server is available
# Look for cloudflare-related servers in your MCP config
cat ~/.config/Claude/claude_desktop_config.json | grep -i cloudflare
```

If not configured, add it to your MCP settings. The official server provides 15+ specialized tools for natural language Cloudflare operations.

### Available MCP Servers

Cloudflare offers these managed remote MCP servers:

| Server | Use Case | Endpoint |
|--------|----------|----------|
| **Workers Bindings** | Build with storage, AI, compute | `bindings.mcp.cloudflare.com/mcp` |
| **Observability** | Debug logs and analytics | `observability.mcp.cloudflare.com/mcp` |
| **Workers Builds** | Manage Workers builds | `builds.mcp.cloudflare.com/mcp` |
| **Documentation** | Reference Cloudflare docs | `docs.mcp.cloudflare.com/mcp` |
| **Radar** | Traffic insights, URL scanning | `radar.mcp.cloudflare.com/mcp` |
| **Browser Rendering** | Screenshots, markdown conversion | `browser.mcp.cloudflare.com/mcp` |

### MCP Configuration

For clients without native remote server support:

```json
{
  "mcpServers": {
    "cloudflare-bindings": {
      "command": "npx",
      "args": ["mcp-remote", "https://bindings.mcp.cloudflare.com/mcp"]
    },
    "cloudflare-observability": {
      "command": "npx",
      "args": ["mcp-remote", "https://observability.mcp.cloudflare.com/mcp"]
    }
  }
}
```

### MCP Usage Examples

With MCP configured, use natural language:

```
"List all my Workers deployments"
"Check KV namespace usage for my-store"
"Deploy my Worker to production"
"Show recent error logs for my-worker"
"Create a new R2 bucket called uploads"
```

The MCP server handles authentication via OAuth and translates requests into appropriate API calls.

---

## Non-MCP Workflows (Wrangler CLI)

### Installation

```bash
# Install wrangler globally
pnpm add -g wrangler

# Or use npx (no install needed)
npx wrangler --version

# Login to Cloudflare
wrangler login
```

### Common Commands

```bash
# Initialize new Worker
wrangler init my-worker

# Local development (simulates resources locally)
wrangler dev

# Deploy to Cloudflare
wrangler deploy

# View logs
wrangler tail my-worker
```

---

## Service-Specific Workflows

### Workers (Serverless Functions)

**Create and Deploy:**

```bash
# Create new Worker
wrangler init my-worker --type javascript
cd my-worker

# Develop locally
wrangler dev

# Deploy to production
wrangler deploy
```

**Monitor:**

```bash
# Stream real-time logs
wrangler tail my-worker

# View deployments
wrangler deployments list
```

### KV (Key-Value Storage)

**Setup:**

```bash
# Create KV namespace
wrangler kv namespace create MY_KV

# Add to wrangler.toml
# kv_namespaces = [
#   { binding = "MY_KV", id = "abc123..." }
# ]
```

**Usage:**

```bash
# Put key-value pair
wrangler kv key put --namespace-id=abc123 "mykey" "myvalue"

# Get value
wrangler kv key get --namespace-id=abc123 "mykey"

# List keys
wrangler kv key list --namespace-id=abc123

# Bulk operations
wrangler kv bulk put --namespace-id=abc123 data.json
```

**In Worker Code:**

```javascript
export default {
  async fetch(request, env) {
    // Write
    await env.MY_KV.put("key", "value");

    // Read
    const value = await env.MY_KV.get("key");

    return new Response(value);
  }
}
```

### R2 (Object Storage)

**Setup:**

```bash
# Create R2 bucket
wrangler r2 bucket create my-bucket

# Add to wrangler.toml
# r2_buckets = [
#   { binding = "MY_BUCKET", bucket_name = "my-bucket" }
# ]
```

**Usage:**

```bash
# Upload object
wrangler r2 object put my-bucket/file.txt --file=./local-file.txt

# Download object
wrangler r2 object get my-bucket/file.txt

# List objects
wrangler r2 object list my-bucket
```

**In Worker Code:**

```javascript
export default {
  async fetch(request, env) {
    // Put object
    await env.MY_BUCKET.put("file.txt", "content");

    // Get object
    const object = await env.MY_BUCKET.get("file.txt");
    const text = await object.text();

    return new Response(text);
  }
}
```

### D1 (SQLite Database)

**Setup:**

```bash
# Create D1 database
wrangler d1 create my-database

# Add to wrangler.toml
# d1_databases = [
#   { binding = "DB", database_name = "my-database", database_id = "abc123..." }
# ]
```

**Usage:**

```bash
# Execute SQL
wrangler d1 execute my-database --command="CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"

# Run migration file
wrangler d1 execute my-database --file=./schema.sql

# Query data
wrangler d1 execute my-database --command="SELECT * FROM users"
```

**In Worker Code:**

```javascript
export default {
  async fetch(request, env) {
    // Query
    const { results } = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(1).all();

    return Response.json(results);
  }
}
```

### Pages (Static Sites)

**Deploy:**

```bash
# Deploy from directory
wrangler pages deploy ./build --project-name=my-site

# Deploy with specific branch
wrangler pages deploy ./build --project-name=my-site --branch=production
```

**With SvelteKit:**

```bash
# Install adapter
pnpm add -D @sveltejs/adapter-cloudflare

# Build
pnpm build

# Deploy
wrangler pages deploy .svelte-kit/cloudflare
```

---

## Automatic Resource Provisioning

**New in Wrangler 4.45.0+:** Resources are created automatically during deployment.

```toml
# wrangler.toml - No IDs needed!
kv_namespaces = [
  { binding = "MY_KV" }
]

r2_buckets = [
  { binding = "MY_BUCKET" }
]

d1_databases = [
  { binding = "DB" }
]
```

Run `wrangler dev` to create local resources, then `wrangler deploy` creates them on Cloudflare automatically.

---

## Development Modes

### Local Development

```bash
# All resources simulated locally
wrangler dev
```

**Pros:** Fast iteration, no API calls
**Cons:** May differ from production

### Remote Development

```bash
# Code runs on Cloudflare preview
wrangler dev --remote
```

**Pros:** Exact production environment
**Cons:** Slower, uses real resources

---

## Authentication & Secrets

### API Tokens

Store Cloudflare API tokens in `secrets.json`:

```json
{
  "cloudflare_api_token": "your-token-here",
  "cloudflare_account_id": "your-account-id"
}
```

### Worker Secrets

```bash
# Set secret for Worker
wrangler secret put API_KEY --name my-worker

# Access in code
export default {
  async fetch(request, env) {
    const apiKey = env.API_KEY;
    return new Response(apiKey);
  }
}
```

**See:** [secrets_management.md](secrets_management.md) for complete patterns.

---

## Best Practices

### DO ✅

1. **Use MCP for complex operations** - Natural language is faster than remembering commands
2. **Test locally first** - Use `wrangler dev` before deploying
3. **Use environment-specific configs** - Separate dev/prod bindings
4. **Monitor logs actively** - Use `wrangler tail` or MCP observability server
5. **Leverage automatic provisioning** - Let wrangler create resources (v4.45.0+)
6. **Store secrets properly** - Use `wrangler secret` for Workers, `secrets.json` for local scripts

### DON'T ❌

1. **Don't hardcode account IDs** - Use wrangler.toml and environment variables
2. **Don't skip local testing** - Remote deploys are slower to debug
3. **Don't commit wrangler.toml with production IDs** - Use templates
4. **Don't forget rate limits** - Especially with KV and R2 operations
5. **Don't ignore wrangler version** - Keep updated for latest features

---

## Troubleshooting

### "Error: No account found"

```bash
# Re-authenticate
wrangler logout
wrangler login
```

### "Resource not found"

Check `wrangler.toml` bindings match actual resource IDs:

```bash
# List KV namespaces
wrangler kv namespace list

# List R2 buckets
wrangler r2 bucket list

# List D1 databases
wrangler d1 list
```

### MCP Server Connection Issues

1. Verify OAuth authentication in Claude
2. Check MCP config syntax
3. Ensure `mcp-remote` is installed: `pnpm add -g mcp-remote`
4. Review Cloudflare API token scopes

### Deployment Failures

```bash
# Check build output
wrangler deploy --dry-run

# Verify syntax
wrangler validate

# Review logs
wrangler tail my-worker
```

---

## Common Patterns

### Worker with KV and R2

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Check KV cache
    const cached = await env.MY_KV.get(url.pathname);
    if (cached) return new Response(cached);

    // Fetch from R2
    const object = await env.MY_BUCKET.get(url.pathname.slice(1));
    if (!object) return new Response("Not found", { status: 404 });

    const content = await object.text();

    // Cache in KV
    await env.MY_KV.put(url.pathname, content, { expirationTtl: 3600 });

    return new Response(content);
  }
}
```

### D1 with KV Caching

```javascript
export default {
  async fetch(request, env) {
    const userId = new URL(request.url).searchParams.get("id");
    const cacheKey = `user:${userId}`;

    // Check cache
    const cached = await env.MY_KV.get(cacheKey);
    if (cached) return new Response(cached);

    // Query D1
    const { results } = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).all();

    const userData = JSON.stringify(results[0]);

    // Cache result
    await env.MY_KV.put(cacheKey, userData, { expirationTtl: 300 });

    return new Response(userData);
  }
}
```

---

## Related Guides

- **[secrets_management.md](secrets_management.md)** - API key and token handling
- **[docker_guide.md](docker_guide.md)** - Container-based development
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - Automated deployments
- **[svelte5_guide.md](svelte5_guide.md)** - SvelteKit with Cloudflare Pages
- **[api_usage.md](api_usage.md)** - Working with external APIs

---

## Resources

- [Cloudflare MCP Server GitHub](https://github.com/cloudflare/mcp-server-cloudflare)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare MCP Servers List](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)

---

*Last updated: 2025-11-24*
