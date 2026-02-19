# Ivy

**Grove's zero-knowledge mail client for `@grove.place` addresses.**

Ivy is a privacy-first email interface that integrates directly with the Grove ecosystem. Unlike traditional email clients, Ivy encrypts all data client-side—Grove literally cannot read your emails.

## Features

### Day One (MVP)

- **Inbox/Sent/Drafts/Archive/Trash** — Standard mail organization
- **Compose** — Rich text editor with attachments (25MB per file, 50MB total)
- **Threaded conversations** — Gmail-style message grouping
- **Labels** — User-created tags for organizing mail
- **Search** — Full-text search (client-side, zero-knowledge)
- **Unsend** — Configurable delay (1-60 min) with cancel window
- **Contact form integration** — Blog contact submissions arrive as threads

### Tier Access

| Feature              | Sapling ($12) | Oak ($25) | Evergreen ($35) |
| -------------------- | :-----------: | :-------: | :-------------: |
| View forwarded email |   Read-only   |   Full    |      Full       |
| Send/Receive         |       —       |   Full    |      Full       |
| Newsletter sends     |       —       |  2/week   |     5/week      |

## Tech Stack

| Component   | Technology            |
| ----------- | --------------------- |
| Frontend    | SvelteKit             |
| Backend     | Cloudflare Workers    |
| Database    | Cloudflare D1         |
| Storage     | Cloudflare R2         |
| Auth        | Heartwood (Grove SSO) |
| Mail Server | Forward Email         |
| Newsletters | Postmark              |

## Project Structure

```
ivy/
├── src/
│   ├── lib/
│   │   ├── crypto/         # Encryption utilities
│   │   ├── api/            # API clients (Forward Email, Postmark)
│   │   ├── stores/         # Svelte stores
│   │   └── utils/          # Shared utilities
│   ├── routes/
│   │   ├── (app)/          # Authenticated app routes
│   │   ├── api/            # API endpoints
│   │   └── auth/           # Auth routes
│   ├── components/
│   │   ├── mail/           # Email-specific components
│   │   ├── compose/        # Compose modal components
│   │   └── ui/             # Generic UI components
│   └── workers/
│       ├── webhook/        # Incoming email webhook handler
│       └── queue/          # Delayed send queue processor
├── static/                 # Static assets
├── tests/                  # Test files
└── docs/                   # Additional documentation
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

## Configuration

Environment variables (see `wrangler.toml` for Cloudflare bindings):

| Variable                | Description                                 |
| ----------------------- | ------------------------------------------- |
| `FORWARD_EMAIL_API_KEY` | Forward Email API token                     |
| `POSTMARK_SERVER_TOKEN` | Postmark server API token                   |
| `WEBHOOK_SECRET`        | Shared secret for webhook verification      |
| `TURNSTILE_SECRET_KEY`  | Cloudflare Turnstile (contact form CAPTCHA) |

## Security Model

### Zero-Knowledge Architecture

- All email content encrypted with user-derived AES-256-GCM key
- Keys derived from Heartwood credentials via Argon2id
- Server stores only encrypted blobs and minimal routing metadata
- Search index built client-side in IndexedDB

### What's Encrypted

- Email bodies and attachments (R2)
- Subject lines, recipients, timestamps (D1 envelope blob)
- Labels and thread IDs (D1 envelope blob)

### What's NOT Encrypted

- `user_id` (routing)
- `created_at` (pagination)
- `r2_key` (storage reference)

## Documentation

- **[AGENT.md](AGENT.md)** — Project instructions for AI agents
- **[ivy-mail-spec.md](ivy-mail-spec.md)** — Full product specification
- **[AgentUsage/](AgentUsage/)** — Development workflow guides

## License

Internal Grove project. All rights reserved.

---

_Part of the Grove ecosystem: Lattice · Ivy · Meadow · Heartwood_
