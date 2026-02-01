# Grove Email Broadcast System

Send email broadcasts to Grove subscribers using Resend.

## Setup

### 1. Environment Variables

Add these to your environment or `secrets.json`:

```bash
RESEND_API_KEY=re_xxxxxxxx          # Your Resend API key
RESEND_AUDIENCE_ID=feccbcc5-20a3-4d4c-a9c5-84ef5adf88fe  # Grove audience
```

### 2. Run with secrets

```bash
# Using with-secrets.js (recommended)
node scripts/repo/with-secrets.js bun run scripts/email/broadcast.ts status
```

Or export them manually:

```bash
export RESEND_API_KEY="re_xxxxxxxx"
export RESEND_AUDIENCE_ID="feccbcc5-20a3-4d4c-a9c5-84ef5adf88fe"
bun run scripts/email/broadcast.ts status
```

## Commands

### `status` — Check sync status

Shows subscriber counts in D1 vs Resend, and recommends actions.

```bash
bun run scripts/email/broadcast.ts status
```

### `sync` — Push D1 subscribers to Resend

One-way sync: D1 is the source of truth, Resend is the mirror.

```bash
bun run scripts/email/broadcast.ts sync
```

### `sync-unsubs` — Delete unsubscribed users

When someone unsubscribes via Resend's link, this deletes them from D1 entirely.
This is a full deletion (not soft delete) so users know they're truly gone.

```bash
bun run scripts/email/broadcast.ts sync-unsubs
```

### `create` — Create a broadcast draft

Creates a draft broadcast in Resend. Does NOT send.

```bash
# From a file
bun run scripts/email/broadcast.ts create \
  --subject "Big news from Grove" \
  --body ./docs/internal/grove-launch-email.html

# With inline HTML
bun run scripts/email/broadcast.ts create \
  --subject "Quick update" \
  --body "<p>Just wanted to say hi!</p>"

# With a name (for internal tracking)
bun run scripts/email/broadcast.ts create \
  --subject "Launch announcement" \
  --body ./email.html \
  --name "2024-01-launch"
```

The body content is automatically wrapped in the Grove email template with:

- Grove logo
- Proper styling
- Footer with unsubscribe link
- Plain text version

### `list` — List broadcasts

```bash
bun run scripts/email/broadcast.ts list
```

### `preview <id>` — Preview a broadcast

```bash
bun run scripts/email/broadcast.ts preview abc-123-def
```

### `send <id>` — Send a broadcast

Requires typing "SEND" to confirm.

```bash
bun run scripts/email/broadcast.ts send abc-123-def
```

## Workflow

1. **Before each broadcast:**

   ```bash
   bun run scripts/email/broadcast.ts status      # Check everything's in sync
   bun run scripts/email/broadcast.ts sync        # Add any new subscribers
   bun run scripts/email/broadcast.ts sync-unsubs # Remove any unsubscribes
   ```

2. **Create your email content:**
   - Write HTML for the body (just the content, not the full email)
   - The Grove template wrapper is applied automatically

3. **Create and send:**
   ```bash
   bun run scripts/email/broadcast.ts create --subject "Hello!" --body ./email.html
   bun run scripts/email/broadcast.ts preview <id>   # Double-check
   bun run scripts/email/broadcast.ts send <id>      # Send it!
   ```

## Email Template

Your body content is automatically wrapped with:

- Grove logo (SVG)
- Light green background card
- "— Autumn" signature
- Footer: "A place to be." + "grove.place · step away (unsubscribe)"

The unsubscribe link uses Resend's `{{{RESEND_UNSUBSCRIBE_URL}}}` variable,
which is replaced with a unique unsubscribe URL for each recipient.

## Architecture

```
D1 (Source of Truth)     Resend Audience         Resend Broadcasts
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐
│ email_signups   │─sync─│ Grove contacts  │─────│ Send to audience│
│ └─ email        │      │ └─ email        │     │ └─ draft        │
│ └─ name         │      │ └─ first_name   │     │ └─ send         │
└─────────────────┘      └─────────────────┘     └─────────────────┘
         ▲                        │
         │                        │
         └────sync-unsubs─────────┘
            (DELETE from D1)
```

- **D1** is where signups are captured (via grove.place landing page)
- **sync** pushes D1 subscribers to Resend Audience
- **sync-unsubs** pulls unsubscribes from Resend and DELETES them from D1
- **Broadcasts** are sent to the Resend Audience

## Files

```
scripts/email/
├── broadcast.ts          # Main CLI
├── README.md             # This file
└── lib/
    ├── d1.ts             # D1 queries via wrangler
    ├── resend.ts         # Resend API wrapper
    ├── templates.ts      # Email template builder
    └── types.ts          # TypeScript interfaces
```
