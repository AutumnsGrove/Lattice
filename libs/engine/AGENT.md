# Agent Instructions for @grove/engine

## What is This?

This is the **Lattice blog engine package** - the core that powers all Grove Platform blogs. Each Grove site (username.grove.place) runs as its own Cloudflare Worker deployment using this engine.

## Project Context

- **Platform**: Grove Platform (grove.place)
- **Purpose**: Multi-tenant blog engine
- **Tech Stack**: SvelteKit 5, Cloudflare Workers, D1, R2, KV
- **Origin**: Extracted from AutumnsGrove personal site

## Architecture: One Worker Per Site

```
grove.place/              # Marketing site (separate repo)
├── Signup, billing, dashboard

username.grove.place/     # Individual blog (THIS ENGINE)
├── Own Cloudflare Worker deployment
├── Own D1 database (tenant-scoped)
├── Own R2 bucket (namespaced)
└── Powered by this package
```

## Key Directories

```
libs/engine/
├── src/
│   ├── routes/           # SvelteKit routes
│   │   ├── admin/        # CMS admin panel
│   │   ├── api/          # REST API
│   │   ├── auth/         # Magic code auth
│   │   └── blog/         # Blog display
│   ├── lib/
│   │   ├── auth/         # JWT, session management
│   │   ├── components/
│   │   │   ├── admin/    # MarkdownEditor, GutterManager
│   │   │   ├── custom/   # Gutter system, TOC
│   │   │   ├── gallery/  # Image components
│   │   │   └── ui/       # shadcn components
│   │   ├── utils/        # Core utilities
│   │   └── styles/       # CSS
│   └── hooks.server.js   # Auth, CSRF, security headers
├── migrations/           # D1 SQL migrations
├── UserContent/          # Content templates
└── static/fonts/         # Self-hosted fonts
```

## Critical Files

| File                        | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `src/hooks.server.js`       | Auth middleware, CSRF, security headers |
| `src/lib/auth/session.js`   | Session creation and verification       |
| `src/lib/auth/jwt.js`       | JWT signing/verification                |
| `src/lib/utils/markdown.js` | Markdown parser with gutter support     |
| `src/lib/utils/csrf.js`     | CSRF token generation/validation        |
| `src/lib/utils/sanitize.js` | XSS prevention (DOMPurify)              |
| `wrangler.toml`             | Cloudflare bindings configuration       |

## Unique Features

### Gutter Annotations

The signature feature - sidebar annotations for blog posts:

- Comments, photos, galleries alongside content
- Positioned by paragraph anchors
- Components: `ContentWithGutter.svelte`, `GutterItem.svelte`, `LeftGutter.svelte`

### Magic Code Auth

Passwordless authentication:

- User enters email → receives 6-digit code → enters code → logged in
- Rate limited, timing-attack resistant
- Routes: `/auth/login`, `/auth/send-code`, `/auth/verify-code`

### Markdown Editor

Advanced editor in admin panel:

- Live preview, multiple themes
- Mermaid diagrams, slash commands
- Drag-drop image upload to R2
- Component: `MarkdownEditor.svelte`

## Cloudflare Bindings

```toml
# Required in wrangler.toml
[[d1_databases]]
binding = "DB"

[[r2_buckets]]
binding = "IMAGES"

[[kv_namespaces]]
binding = "CACHE"
```

## Environment Variables

```bash
JWT_SECRET=           # For signing JWTs
ALLOWED_ADMIN_EMAILS= # Comma-separated admin emails
RESEND_API_KEY=       # For sending magic codes
```

## Common Tasks

### Adding a New API Route

1. Create `src/routes/api/yourroute/+server.js`
2. Add CSRF protection for mutations
3. Add tenant_id filtering for multi-tenant

### Modifying the Markdown Parser

- Edit `src/lib/utils/markdown.js`
- Uses `marked` library with custom renderers
- Gutter content loaded from `gutter_content` field

### Adding a New Component

1. Create in `src/lib/components/`
2. Export from appropriate index file
3. Use shadcn patterns for UI components

### Updating Auth Flow

- Session logic: `src/lib/auth/session.js`
- Login UI: `src/routes/auth/login/+page.svelte`
- Verification: `src/routes/auth/verify-code/+server.js`

## Security Considerations

- All mutations require CSRF token
- User input sanitized with DOMPurify
- JWT uses Web Crypto API (Cloudflare-compatible)
- Rate limiting on auth endpoints
- Security headers set in hooks.server.js

## Testing

```bash
npm run test          # Run all tests
npm run test:security # Security-focused tests
npm run test:ui       # With UI
```

## Deployment

Each site deploys as a Cloudflare Pages project:

```bash
npx wrangler pages deploy
```

## What NOT to Do

1. **Don't hardcode tenant-specific values** - Use database/config
2. **Don't bypass CSRF protection** - All POST/PUT/DELETE need tokens
3. **Don't modify UI components in place** - Use shadcn patterns
4. **Don't add personal features here** - This is the shared engine

## Related Docs

- [Full Agent Guide](../../docs/guides/AGENT-GUIDE-NEW-GROVE-SITES.md)
- [Migration Strategy](../../docs/MIGRATION-STRATEGY.md)
- [AutumnsGrove Post-Migration](../../docs/AUTUMNSGROVE-POST-MIGRATION.md)

## Quick Reference

| Action         | Command                                                |
| -------------- | ------------------------------------------------------ |
| Dev server     | `npm run dev`                                          |
| Build          | `npm run build`                                        |
| Deploy         | `npx wrangler pages deploy`                            |
| Run migrations | `npx wrangler d1 execute DB --file=migrations/XXX.sql` |
| Test           | `npm run test`                                         |
