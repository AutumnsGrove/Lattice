# Broadcast Guide

Send email broadcasts to Grove subscribers. One command to sync, one to send.

**For:** Autumn (manual) or AI agents (assisted)
**Location:** `scripts/email/`
**Last Updated:** January 2026

---

## Quick Start

```bash
# Load secrets and run any broadcast command
export RESEND_API_KEY=$(cat secrets.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('RESEND_API_KEY',''))") && \
export RESEND_AUDIENCE_ID=$(cat secrets.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('RESEND_AUDIENCE_ID',''))") && \
bun run scripts/email/broadcast.ts <command>
```

Or add this alias to your shell profile:

```bash
alias broadcast='export RESEND_API_KEY=$(cat secrets.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('\''RESEND_API_KEY'\'','\'''\''))")  && export RESEND_AUDIENCE_ID=$(cat secrets.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('\''RESEND_AUDIENCE_ID'\'','\'''\''))")  && bun run scripts/email/broadcast.ts'
```

Then just: `broadcast status`

---

## Commands

| Command | What it does |
|---------|--------------|
| `status` | Shows subscriber counts in D1 vs Resend, recommends actions |
| `sync` | Pushes D1 subscribers to Resend Audience (one-way) |
| `sync-unsubs` | Deletes unsubscribed users from D1 entirely |
| `list` | Shows recent broadcasts |
| `create` | Creates a draft broadcast (does NOT send) |
| `preview <id>` | Shows full broadcast details |
| `send <id>` | Sends the broadcast (requires confirmation) |

---

## The Workflow

### Before Every Broadcast

```bash
# 1. Check what needs syncing
broadcast status

# 2. Push any new subscribers to Resend
broadcast sync

# 3. Remove anyone who unsubscribed (deletes from D1)
broadcast sync-unsubs
```

### Creating and Sending

```bash
# 1. Write your email body (just the content, not full HTML)
cat > /tmp/my-email.html << 'EOF'
<p>Hey there!</p>
<p>Quick update from Grove...</p>
<p>We've been working on something new.</p>
EOF

# 2. Create a draft
broadcast create --subject "Update from Grove" --body /tmp/my-email.html --name "jan-2026-update"

# 3. Preview it
broadcast preview <id-from-step-2>

# 4. When ready, send it (requires typing SEND to confirm)
broadcast send <id>
```

---

## How It Works

### D1 is the Source of Truth

Subscribers sign up via grove.place and land in D1's `email_signups` table. Resend is just a delivery mechanism.

```
D1 (source)          Resend Audience         Resend Broadcasts
┌─────────────┐      ┌─────────────┐         ┌─────────────┐
│ email_signups│─sync─│ Grove       │─────────│ Send emails │
└─────────────┘      └─────────────┘         └─────────────┘
       ▲                    │
       │                    │
       └───sync-unsubs──────┘
          (DELETE from D1)
```

### When Someone Unsubscribes

1. They click the unsubscribe link in the email
2. Resend marks them as unsubscribed in the Audience
3. Running `sync-unsubs` finds them and **deletes** them from D1

This is a full deletion, not a soft delete. When someone unsubscribes, they're gone.

### Email Templates

Your body content gets wrapped automatically with:
- Grove logo
- Light green card styling
- "— Autumn" signature
- Footer: "A place to be." + "grove.place · step away (unsubscribe)"

The unsubscribe link uses Resend's `{{{RESEND_UNSUBSCRIBE_URL}}}` variable.

---

## Environment Setup

Add these to `secrets.json`:

```json
{
  "RESEND_API_KEY": "re_your_api_key_here",
  "RESEND_AUDIENCE_ID": "feccbcc5-20a3-4d4c-a9c5-84ef5adf88fe"
}
```

The audience ID is already set up as "Grove" in Resend.

---

## For AI Agents

When helping with broadcasts:

1. **Always run `status` first** to understand the current state
2. **Always run `sync` before creating a broadcast** so new subscribers are included
3. **Always run `sync-unsubs`** to respect unsubscribe requests
4. **Never run `send` without explicit user confirmation**
5. Draft emails follow Grove voice: warm, direct, no AI patterns

### Example Agent Session

```
User: "Send a broadcast about the new feature"

Agent:
1. Run `broadcast status` to check sync state
2. Run `broadcast sync` if needed
3. Run `broadcast sync-unsubs` to clear unsubscribes
4. Help user write email body (Grove voice)
5. Run `broadcast create --subject "..." --body ...`
6. Run `broadcast preview <id>` and show user
7. Wait for explicit "send it" confirmation
8. Run `broadcast send <id>`
```

---

## Rate Limits

Resend allows 2 requests per second. The sync command waits 550ms between contacts. Syncing 67 subscribers takes about 40 seconds.

---

## Files

```
scripts/email/
├── broadcast.ts          # Main CLI
├── README.md             # Technical reference
└── lib/
    ├── d1.ts             # D1 queries via wrangler
    ├── resend.ts         # Resend API wrapper
    ├── templates.ts      # Grove email template
    └── types.ts          # TypeScript interfaces
```

---

*The message finds its way to those who want to hear it.*
