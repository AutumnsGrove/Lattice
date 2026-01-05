---
aliases: []
date created: Wednesday, January 1st 2026
date modified: Saturday, January 4th 2026
tags:
  - email
  - mail-client
  - privacy
type: tech-spec
---

# Ivy — Grove Mail Client

```
                                               🌿
                                             ╱
                              ✉️           🌿
                            ╱   ╲        ╱
                          ╱       ╲    🌿
                        🌿         ╲  ╱
                      ╱             ╲╱
                    🌿               │
                  ╱                  │
                🌿───────────────────┘

               Messages climbing the lattice.
```

> *The vine that connects people through Grove's infrastructure.*

Grove's first-party mail client for @grove.place email addresses. A focused, privacy-first web interface integrated into the Grove ecosystem for professional blog contact, subscriber communication, and admin messaging.

---

## Overview

**Ivy** is Grove's first-party mail client for `@grove.place` email addresses. Rather than forcing users to configure IMAP in third-party clients, Ivy provides a focused, privacy-first web interface integrated directly into the Grove ecosystem.

### Why "Ivy"?

Ivy grows on lattices: it's the living connection that climbs the framework. Email is the vine that connects people through Grove's infrastructure. The name ties directly to Lattice (the core platform) while evoking organic growth and interconnection.

| | |
|---|---|
| **Public name** | Ivy |
| **Internal codename** | GroveMail |
| **Domain** | ivy.grove.place |

### Philosophy

Ivy is **not** trying to replace Gmail or Outlook. It's a focused tool for Grove-related correspondence:

- Professional blog contact
- Subscriber communication
- Admin-to-user messaging
- Privacy-first by design

The goal is a mail client that feels like Grove—warm, personal, and respectful of your attention.

---

## Configuration Constants

All magic numbers are centralized for easy tuning and consistency:

```typescript
// Ivy configuration constants
const IVY_CONFIG = {
  // Email limits
  limits: {
    maxAttachmentBytes: 25 * 1024 * 1024,    // 25 MB per attachment
    maxEmailSizeBytes: 50 * 1024 * 1024,     // 50 MB total per email
    maxRecipientsPerEmail: 50,                // BCC limit
    maxAttachmentsPerEmail: 20,
  },

  // Rate limits
  rateLimits: {
    outgoingPerHour: 100,                     // Oak+ sending limit
    attachmentUploadMbPerHour: 50,
    apiRequestsPerHour: 1000,
    contactFormPerIpPerDay: 5,
  },

  // Newsletter limits by tier
  newsletterLimitsPerWeek: {
    oak: 2,
    evergreen: 5,
  },

  // Unsend/delayed send
  unsend: {
    defaultDelayMinutes: 2,
    minDelayMinutes: 1,
    maxDelayMinutes: 60,
  },

  // Webhook processing
  webhook: {
    maxPayloadBytes: 10 * 1024 * 1024,        // 10 MB
    perIpPerMinute: 60,
    perIpPerHour: 500,
    globalPerMinute: 10000,
  },

  // Retry policy
  retry: {
    maxRetries: 5,
    backoffMs: [60000, 120000, 240000, 480000, 960000], // 1m, 2m, 4m, 8m, 16m
    alertAfterFailures: 3,
  },

  // Contact form spam prevention
  contactForm: {
    turnstileSiteKey: 'cf-turnstile-key',     // Cloudflare Turnstile
    ipRateLimitPerDay: 5,
    cooldownBetweenFormsMs: 60000,            // 1 minute
  },

  // Encryption
  encryption: {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'Argon2id',
    recoveryPhraseWords: 24,                  // BIP39
  },

  // Trash/cleanup
  retention: {
    trashDays: 30,
    deadLetterDays: 90,
  },
};
```

---

## Tier Access

| Feature | Free | Seedling ($8) | Sapling ($12) | Oak ($25) | Evergreen ($35) |
|---------|:----:|:-------------:|:-------------:|:---------:|:---------------:|
| Ivy Access | — | — | Read-only | Full | Full |
| Send Email | — | — | — | ✓ | ✓ |
| Receive Email | — | — | View forwarded | ✓ | ✓ |
| Newsletter Send | — | — | — | 2x/week | 5x/week |
| Storage Pool | — | 1 GB | 5 GB | 20 GB | 100 GB |

### Sapling (Read-Only)

Sapling users have email forwarding. Mail to `username@grove.place` forwards to their personal inbox. In Ivy, they can:

- View forwarded emails (read-only archive)
- See what's been sent to their Grove address
- Cannot reply or compose from Ivy

This creates a natural upgrade incentive: "Want to reply from your Grove address? Upgrade to Oak."

### Oak & Evergreen (Full Access)

Full send/receive capabilities:

- Compose and send emails
- Reply to threads
- Full inbox management
- Newsletter/subscriber features

---

## Email Address Rules

**Critical constraints:**

1. **One email per user**: Your email matches your username (`username@grove.place`)
2. **One-time selection**: Once chosen, your email address cannot be changed
3. **No aliases**: Users cannot create additional addresses (contact@, hello@, etc.)
4. **One account per user**: No multi-account support; one Grove account = one email

These constraints must be clearly communicated during onboarding. The email selection is permanent.

---

## Features

### Day One (MVP)

#### Core Email Functions
- **Inbox view**: List of received emails with sender, subject, preview, timestamp
- **Compose**: Rich text editor with formatting, recipient fields (To, CC, BCC)
- **Send/receive**: Full SMTP/IMAP functionality via Forward Email backend
- **Multiple recipients**: Send to multiple addresses in one email
- **Reply/Reply All/Forward**: Standard email actions
- **Attachments**: Upload and attach files (25MB max per file, 50MB max total per email; counts toward storage quota)

#### Organization
- **Threaded conversations**: Gmail-style grouping of related messages
- **Labels**: User-created tags for organizing mail (not folders)
- **Archive**: Remove from inbox without deleting
- **Delete**: Move to trash, permanent delete after 30 days
- **Search**: Full-text search across all mail (subject, body, sender, recipient)

#### Unsend (Delayed Sending)
- Emails are queued, not sent immediately
- Configurable delay: **1, 2, 5, 15, 30, or 60 minutes**
- Default: **2 minutes**
- During delay window, user can cancel ("unsend")
- After delay expires, email sends normally
- Visual indicator showing time remaining to unsend

#### Integrations
- **Heartwood auth**: Single sign-on with Grove account
- **Contact forms → Inbox**: Blog contact form submissions arrive as email threads
- **Meadow notifications**: Grove platform notifications delivered to Ivy

### Later Features

#### Organization (Phase 2)
- **Folders**: Hierarchical organization in addition to labels
- **Filters/Rules**: Auto-apply labels, archive, or delete based on criteria
- **Starred/Flagged**: Quick-mark important messages

#### Calendar (Phase 2-3)
- **Google Calendar integration**: Detect ICS attachments, add to calendar
- **GroveCalendar**: First-party calendar (future Grove product)

#### Advanced (Phase 3+)
- **Import from other providers**: Migrate from Gmail, Outlook, etc.
- **Keyboard shortcuts**: Power user navigation
- **Offline support**: PWA with local caching
- **Templates**: Saved email templates for common responses

---

## Newsletter / Subscriber Features (Oak+)

Oak and Evergreen users can send to their blog subscribers:

### Capabilities
- **Subscriber list access**: Send to people who subscribed to your blog
- **Bulk send**: Compose once, send to list
- **Unsubscribe handling**: Automatic unsubscribe links, honor requests

### Limits
- **Oak:** 2 sends per week
- **Evergreen:** 5 sends per week
- **No tracking** — No open tracking, no click tracking (privacy-first)

### What This Is NOT
This is not a full email marketing platform. No:
- A/B testing
- Detailed analytics
- Automation sequences
- Segment building

It's simple: write an update, send it to your subscribers, respect their inbox.

---

## Admin Tools (Internal)

For Grove administrators (Autumn):

### Current Scope
- **Send to all users**: Platform announcements
- **Send by tier**: Target specific subscription levels
- **Send by criteria**: Filter by signup date, last active, etc.
- **No rate limits**: Admin sends bypass weekly limits
- **Template system**: Saved templates for common admin communications

### Security Requirements
- **2FA required**: Admin actions require two-factor authentication
- **Audit log**: All admin sends logged with timestamp, author, recipient criteria
- **Preview + confirmation**: Must preview before sending, explicit confirmation
- **Separate auth level**: Admin mail requires elevated permissions beyond normal admin

### Architecture Note
Admin tools should be **extensible**. Build with plugin/module architecture so new admin features can be added without restructuring:

```
/admin/mail/
  ├── compose/        # Compose interface
  ├── templates/      # Manage saved templates
  ├── audience/       # User filtering/selection
  └── history/        # Sent admin mail log
```

---

## Technical Architecture

### Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | SvelteKit | UI, matches Grove stack |
| Backend | Cloudflare Workers | API endpoints |
| Mail Server | Forward Email | SMTP/IMAP handling |
| Metadata DB | Cloudflare D1 | Threads, labels, settings |
| Content Storage | Cloudflare R2 | Email bodies, attachments |
| Auth | Heartwood | SSO with Grove account |
| Encryption | User-derived keys | Zero-knowledge at rest |

### Forward Email Integration

Forward Email handles the actual mail server infrastructure. **Research completed December 2025.**

#### Why Forward Email?

| Advantage | Details |
|-----------|---------|
| **Zero-knowledge** | Encrypted with user's IMAP password; they can't read emails |
| **REST API** | 20 endpoints for messages, folders, contacts, calendars (no IMAP complexity) |
| **Unlimited domains/aliases** | Flat rate pricing regardless of user count |
| **Open source** | Fully self-hostable if needed as escape hatch |
| **Privacy-focused** | No SMTP logs, no metadata retention |

#### Pricing (Critical for Multi-Tenant)

| Plan | Price | Domains | Aliases | Storage | Outbound |
|------|-------|---------|---------|---------|----------|
| Free | $0 | Unlimited | Unlimited | — | Forwarding only |
| **Enhanced** | **$3/mo** | Unlimited | Unlimited | 10 GB | ~9,000/mo |
| Team | $9/mo | Unlimited | Unlimited | 10 GB | Higher + priority support |

**Key insight:** "Unlimited domains and aliases" means we pay ONE flat fee ($3-9/mo total) regardless of how many Grove users we have. This is extremely cost-effective.

#### Storage Strategy: Use R2, Not Forward Email Storage

**We bypass Forward Email's storage entirely** by using webhooks + R2:

| Provider | 1TB Storage Cost |
|----------|-----------------|
| Forward Email | ~$300/mo |
| Cloudflare R2 | ~$15/mo |

**How it works:**
1. Disable IMAP Storage on each alias (uncheck in Forward Email dashboard)
2. Set webhook URL as the recipient instead of forwarding address
3. Forward Email POSTs full email (raw, headers, attachments) to our Worker
4. We encrypt and store in R2
5. Forward Email never stores the email

**Webhook payload includes everything we need:**
- `raw` — Complete raw email as string
- `headers` — Parsed headers (from, to, subject, etc.)
- `attachments` — Array with Buffer values (full attachment data)
- `recipients` — Who it was sent to
- `dkim`, `spf`, `dmarc` — Authentication results

**Webhook verification:** Forward Email provides signature verification via `X-Webhook-Signature` header (HMAC-SHA256).

#### Webhook Rate Limiting

**IMPORTANT:** Rate limiting happens BEFORE signature verification to prevent DoS attacks from consuming CPU cycles on signature computation.

```typescript
// Webhook rate limiting configuration
const WEBHOOK_RATE_LIMITS = {
  perIpPerMinute: 60,        // Max 60 webhook requests per IP per minute
  perIpPerHour: 500,         // Max 500 per IP per hour
  globalPerMinute: 10000,    // System-wide safety limit
};

// Rate limit check (runs BEFORE signature verification)
async function checkWebhookRateLimit(
  env: Env,
  ip: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const ipHash = await hashIp(ip);  // Hash for privacy
  const now = Date.now();
  const minuteKey = `webhook:${ipHash}:${Math.floor(now / 60000)}`;
  const hourKey = `webhook:${ipHash}:${Math.floor(now / 3600000)}`;

  // Use KV for rate limit counters (fast, distributed)
  const [minuteCount, hourCount] = await Promise.all([
    env.KV.get(minuteKey, 'text').then(v => parseInt(v || '0')),
    env.KV.get(hourKey, 'text').then(v => parseInt(v || '0')),
  ]);

  if (minuteCount >= WEBHOOK_RATE_LIMITS.perIpPerMinute) {
    return { allowed: false, retryAfter: 60 };
  }
  if (hourCount >= WEBHOOK_RATE_LIMITS.perIpPerHour) {
    return { allowed: false, retryAfter: 3600 };
  }

  // Increment counters atomically
  await Promise.all([
    env.KV.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
    env.KV.put(hourKey, String(hourCount + 1), { expirationTtl: 7200 }),
  ]);

  return { allowed: true };
}

// IP hashing for privacy (don't store raw IPs)
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(ip + 'webhook-salt'));
  return Array.from(new Uint8Array(hash)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### Webhook Signature Verification

```typescript
// Constant-time comparison for Workers (no Node.js crypto module)
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison (Workers-compatible)
  if (signature.length !== expectedHex.length) return false;
  const sigBytes = encoder.encode(signature);
  const expectedBytes = encoder.encode(expectedHex);
  return timingSafeEqual(sigBytes, expectedBytes);
}
```

#### Webhook Payload Validation

Before processing any webhook, validate:

```typescript
const WEBHOOK_LIMITS = {
  maxPayloadBytes: 10 * 1024 * 1024, // 10MB max (emails with large attachments)
  maxAttachmentBytes: 25 * 1024 * 1024, // 25MB per attachment
  requiredFields: ['raw', 'headers', 'recipients'],
};

async function validateWebhookPayload(payload: unknown): Promise<{ valid: boolean; error?: string }> {
  // Size check
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > WEBHOOK_LIMITS.maxPayloadBytes) {
    await alertOversizedEmail(payload); // Log for debugging, don't store
    return { valid: false, error: `Payload exceeds ${WEBHOOK_LIMITS.maxPayloadBytes} bytes` };
  }

  // Required fields
  const p = payload as Record<string, unknown>;
  for (const field of WEBHOOK_LIMITS.requiredFields) {
    if (!(field in p)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Recipients must include a @grove.place address
  const recipients = p.recipients as string[];
  if (!recipients.some(r => r.endsWith('@grove.place'))) {
    return { valid: false, error: 'No @grove.place recipient' };
  }

  return { valid: true };
}
```

**Result:** We only pay Forward Email for SMTP sending ($3/mo), all storage lives in R2 at a fraction of the cost.

#### API Capabilities (Confirmed)

Forward Email offers a complete REST API:

```
Messages:
- GET /v1/messages — List/search messages (15+ filter params)
- GET /v1/messages/:id — Get single message
- POST /v1/messages — Send message
- PUT /v1/messages/:id — Update (flags, move)
- DELETE /v1/messages/:id — Delete message

Folders:
- Full CRUD for IMAP folders via REST

Contacts (CardDAV):
- Full contact management via REST

Search Parameters:
- subject, from, to, body, since, before
- has_attachments, min_size, max_size
- is_flagged, is_read, folder
```

#### Webhooks

Forward Email supports webhooks for incoming mail events:
- HTTP POST to configured endpoint
- Triggers on new mail arrival
- Enables real-time inbox updates without polling

**Note:** Exact webhook payload structure needs hands-on testing.

#### Sending Limits & Newsletter Approval

- **Enhanced plan:** ~9,000 outbound emails/month
- **Newsletter/bulk sending:** Requires manual approval per-domain
- **Approval process:** Email support@forwardemail.net, typically <24 hours

**Action needed:** Contact Forward Email about Grove's use case for subscriber newsletters.

#### SMTP Configuration

```
Server: smtp.forwardemail.net
Port: 465 (SSL/TLS)
Auth: API token from account dashboard
```

#### What Forward Email Handles

- MX records & mail routing
- SMTP for sending
- IMAP for receiving (also exposed via REST)
- Spam filtering
- SPF/DKIM/DMARC configuration
- Zero-knowledge encryption at rest

#### What Grove/Ivy Handles

- REST API calls to Forward Email
- User interface
- Thread organization & display
- Labels (our D1, not Forward Email's)
- Delayed send queue (our D1)
- Additional encryption layer (our R2)
- Contact form integration
- Search indexing (client-side, IndexedDB)

### Postmark Integration (Newsletters)

**Hybrid architecture:** Forward Email for mailbox, Postmark for broadcasts.

#### Why Two Providers?

| Use Case | Provider | Why |
|----------|----------|-----|
| 1:1 correspondence | Forward Email | Mailbox infrastructure (MX, webhooks, SMTP) |
| Newsletters/broadcasts | Postmark | Dedicated Broadcast Stream, excellent deliverability |

Different tools for different jobs. Postmark's separate "Broadcast Message Stream" keeps newsletters isolated from transactional mail.

#### Postmark Pricing

| Plan | Price | Emails/Month |
|------|-------|--------------|
| Free | $0 | 100 |
| Starter | $15/mo | 10,000 |
| Growth | $35/mo | 50,000 |
| Scale | $85/mo | 125,000 |

**For Grove:**
- Start with Starter ($15/mo for 10k emails)
- Per-email pricing (not per-contact like Resend)
- 45 days of message history included

#### Newsletter Feature (Oak+)

```
USER FLOW:
1. User composes newsletter in Ivy
2. Selects "Send to Subscribers"
3. Preview shows recipient count
4. User confirms send
5. Postmark Broadcast Stream sends to all subscribers
6. Copy stored in user's Ivy (encrypted)

LIMITS:
- Oak: 2 sends per week
- Evergreen: 5 sends per week
- No tracking pixels, no open tracking (privacy-first)
- Automatic unsubscribe link in footer
```

#### Postmark Configuration

```
API: api.postmarkapp.com
Auth: Server API token (stored securely, not in user space)
From: username@grove.place (verified domain)
Stream: broadcast (separate from transactional)
```

#### Domain Verification Strategy

Postmark requires domain verification before sending. For Grove:

1. **One-time setup:** Verify `grove.place` domain in Postmark dashboard
2. **DNS records:** Add DKIM and Return-Path records to grove.place DNS
3. **Sender signatures:** Grove signs all outbound mail (not individual users)
4. **From address:** Any `username@grove.place` can send once domain is verified

```
DNS Records (one-time):
- DKIM: selector._domainkey.grove.place → Postmark public key
- Return-Path: pm-bounces.grove.place → Postmark tracking subdomain
- SPF: Already includes Forward Email; add Postmark's include
```

**Key point:** Users don't need individual verification—Grove owns the domain and handles all newsletter sends on their behalf via the API.

#### Cost Projection

| Users with Oak+ | Avg Subscribers | Sends/Month | Monthly Cost |
|-----------------|-----------------|-------------|--------------|
| 10 | 500 | ~4,000 | $15/mo |
| 50 | 2,500 | ~20,000 | $35/mo |
| 200 | 10,000 | ~80,000 | $85/mo |

Postmark's per-email pricing scales well and is ~60% cheaper than Resend at scale.

### Data Flow

```
INCOMING EMAIL (Webhook → Buffer → Process):

[External Sender]
        ↓
[Forward Email MX receives]
        ↓
[Webhook POST to Grove Worker]
        ↓
[Verify X-Webhook-Signature]
        ↓
[IMMEDIATELY write to D1 buffer]  ← Fast, durable, prevents data loss
        ↓
[Return 200 OK to Forward Email]
        ↓
[Async: Process buffer entry]
        ↓
[Fetch user's encrypted email key]
        ↓
[Encrypt envelope + body with user key]
        ↓
[Store body in R2]  ←  Encrypted email body + attachments
        ↓
[Store envelope in D1]  ←  Encrypted metadata blob
        ↓
[Delete from buffer]
        ↓
[Push notification to client]


OUTGOING EMAIL (Delayed queue):

[Ivy Compose]
        ↓
[Encrypt with user key]
        ↓
[Save to D1 Queue]  ←  Status: "pending", scheduled_send_at: now + delay
        ↓
[User can cancel here]  ←  Within delay window (1-60 min)
        ↓
[Cron/Worker triggers at scheduled time]
        ↓
[Decrypt email content]
        ↓
[Send via Forward Email SMTP]
        ↓
[Re-encrypt and store sent copy in R2]
        ↓
[Update D1: status = "sent"]


NEWSLETTER/BROADCAST (Oak+ via Postmark):

[Ivy "Send to Subscribers"]
        ↓
[Fetch subscriber list]
        ↓
[Postmark Broadcast Stream]  ←  Dedicated infrastructure for bulk
        ↓
[Store copy in user's Ivy (encrypted)]
```

**Key points:**
- Forward Email never stores our users' emails—they only relay
- D1 buffer ensures no email loss if R2 is temporarily unavailable
- Postmark handles newsletters (separate from 1:1 correspondence)

### Webhook Retry Policy

When processing webhook buffer entries fails:

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  backoffMs: [60000, 120000, 240000, 480000, 960000], // 1m, 2m, 4m, 8m, 16m
  alertAfterFailures: 3,
};

async function processWebhookWithRetry(bufferId: string) {
  const entry = await db.get('SELECT * FROM ivy_webhook_buffer WHERE id = ?', bufferId);

  if (entry.retry_count >= RETRY_CONFIG.maxRetries) {
    // Move to dead letter, alert user
    await alertUserOfFailedEmail(entry.user_id, entry.id);
    await db.run('UPDATE ivy_webhook_buffer SET status = ? WHERE id = ?', ['dead_letter', bufferId]);
    return;
  }

  try {
    await processWebhookEntry(entry);
    await db.run('DELETE FROM ivy_webhook_buffer WHERE id = ?', bufferId);
  } catch (error) {
    const nextRetry = RETRY_CONFIG.backoffMs[entry.retry_count];
    await db.run(`
      UPDATE ivy_webhook_buffer
      SET retry_count = retry_count + 1,
          error_message = ?,
          status = 'pending'
      WHERE id = ?
    `, [error.message, bufferId]);

    // Schedule retry
    await scheduleRetry(bufferId, nextRetry);

    // Alert after 3 failures
    if (entry.retry_count + 1 >= RETRY_CONFIG.alertAfterFailures) {
      await alertUserOfDeliveryIssue(entry.user_id);
    }
  }
}
```

### Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Outgoing email (Oak+) | 100 emails | per hour |
| Attachment upload | 50 MB | per hour |
| Newsletter send | 2-5/week | per tier |
| API requests | 1000 | per hour |

```typescript
// Rate limit check (using D1 for durability)
async function checkRateLimit(userId: string, action: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = Date.now() - windowMs;
  const count = await db.get(`
    SELECT COUNT(*) as count FROM rate_limits
    WHERE user_id = ? AND action = ? AND timestamp > ?
  `, [userId, action, windowStart]);

  return count.count < limit;
}
```

### Race Condition Protection

#### Unsend Queue (Optimistic Locking)

```typescript
// Cancel unsend - uses optimistic locking to prevent race with send worker
async function cancelUnsend(emailId: string, userId: string): Promise<{ success: boolean }> {
  const result = await db.run(`
    UPDATE ivy_email_queue
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `, [emailId, userId]);

  return { success: result.changes > 0 };
}

// Send worker - only processes if still pending
async function processSendQueue() {
  const pending = await db.all(`
    SELECT * FROM ivy_email_queue
    WHERE status = 'pending' AND scheduled_send_at <= CURRENT_TIMESTAMP
    FOR UPDATE SKIP LOCKED
  `);

  for (const email of pending) {
    // Double-check status before sending
    const current = await db.get('SELECT status FROM ivy_email_queue WHERE id = ?', email.id);
    if (current.status !== 'pending') continue;

    await sendEmail(email);
    await db.run('UPDATE ivy_email_queue SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['sent', email.id]);
  }
}
```

#### Storage Quota (Atomic Check)

```typescript
// Atomic quota check and update
async function checkAndReserveQuota(userId: string, sizeBytes: number): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const storage = await tx.get(`
      SELECT tier_gb, additional_gb, used_bytes
      FROM user_storage WHERE user_id = ? FOR UPDATE
    `, [userId]);

    const totalQuota = (storage.tier_gb + storage.additional_gb) * 1024 * 1024 * 1024;
    if (storage.used_bytes + sizeBytes > totalQuota) {
      return false;
    }

    await tx.run(`
      UPDATE user_storage SET used_bytes = used_bytes + ? WHERE user_id = ?
    `, [sizeBytes, userId]);
    return true;
  });
}
```

### Zero-Knowledge Storage

**TRUE zero-knowledge**: Grove cannot read ANY of your email data. Not bodies, not subjects, not who you're talking to.

#### Architecture: Client-Side Everything

```
SERVER STORES (all encrypted):
├── D1: encrypted_envelope blobs, email IDs, r2 references
├── R2: encrypted email bodies + attachments
└── Nothing in plaintext except: user_id, created_at (for pagination)

CLIENT HANDLES:
├── Decryption of all data
├── Search indexing (IndexedDB)
├── Full-text search
└── Offline caching
```

#### Why This Works for Ivy

Ivy is focused correspondence, not Gmail. Client-side search is viable:

| Mailbox Size | Encrypted Index | Download Time | Search Speed |
|--------------|-----------------|---------------|--------------|
| 100 emails | ~50 KB | <1 sec | Instant |
| 1,000 emails | ~500 KB | ~2 sec | Instant |
| 10,000 emails | ~5 MB | ~15 sec | <1 sec |

#### The Flow

```
LOGIN:
1. Fetch encrypted email index from D1
2. Decrypt with user's key (client-side)
3. Build local search index (IndexedDB)
4. Cache for offline use

SEARCH:
1. Query local IndexedDB (instant, private)
2. Body search: fetch + decrypt individual emails on demand

NEW EMAIL ARRIVES:
1. Webhook → D1 buffer → encrypt → R2
2. Push notification to client
3. Client fetches + decrypts + adds to local index
```

#### Thread Grouping (Client-Side)

**Challenge:** Thread IDs are encrypted, so the server can't group emails into conversations.

**Solution:** Client-side thread computation using standard email headers:

```typescript
// Thread ID generation (client-side, after decryption)
function computeThreadId(email: DecryptedEmail): string {
  // Standard email threading: In-Reply-To and References headers
  const inReplyTo = email.headers['in-reply-to'];
  const references = email.headers['references'];
  const messageId = email.headers['message-id'];

  // If replying to something, use the original message's ID as thread root
  if (inReplyTo) {
    return hashThreadId(inReplyTo);
  }

  // Check references chain for thread root
  if (references) {
    const refs = references.split(/\s+/);
    if (refs.length > 0) {
      return hashThreadId(refs[0]); // First reference is thread root
    }
  }

  // New conversation - use this message's ID as thread root
  return hashThreadId(messageId);
}

function hashThreadId(messageId: string): string {
  // Consistent hash for grouping
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(messageId))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16));
}
```

**How it works:**
1. Server stores `thread_id` inside `encrypted_envelope` (computed at encryption time)
2. Client decrypts envelope, extracts thread_id
3. IndexedDB groups emails by thread_id for conversation view
4. Server never sees thread relationships (zero-knowledge preserved)

**Note:** Thread ID in encrypted_envelope is pre-computed for efficiency—client doesn't need to re-parse headers every time.

#### Key Derivation & Management

**Separation of concerns:** Email encryption key is separate from auth credentials.

```
ACTIVATION (first time):
1. Generate random 256-bit email encryption key
2. Derive wrapper key from Heartwood credentials (Argon2id)
3. Encrypt email key with wrapper key
4. Store encrypted email key in D1
5. Offer recovery phrase download (BIP39 mnemonic)

LOGIN:
1. Authenticate via Heartwood
2. Derive wrapper key from credentials
3. Decrypt email key
4. Use email key for all email encryption/decryption

PASSWORD CHANGE:
1. Derive new wrapper key from new credentials
2. Re-encrypt email key with new wrapper key
3. All emails remain accessible (email key unchanged)
```

**Recovery options:**
- **Recovery phrase**: 24-word BIP39 mnemonic, download at activation
- **Key regeneration**: Available in settings, CLEARLY warns this deletes all existing email
- **Export before reset**: Option to download all decrypted emails before key regeneration
- **"I lost my phrase" flow**: One-time re-key from active session (see below)

#### "I Lost My Recovery Phrase" Flow

If a user is currently logged in but has lost their recovery phrase:

```
WHILE LOGGED IN (has valid session with decrypted email key):

1. User goes to Settings → Security → "I lost my recovery phrase"
2. Warning: "This will generate a new recovery phrase. Your old phrase
   will no longer work. Make sure to save the new one!"
3. User confirms with password
4. System generates NEW recovery phrase
5. Re-encrypts email key with new wrapper key
6. User MUST download new phrase before continuing
7. Old phrase is invalidated

KEY POINT: This only works while logged in. The decrypted email key
exists in the session, so we can re-wrap it without data loss.
```

**What happens if user loses BOTH password AND recovery phrase:**
This results in **permanent, irrecoverable data loss**. Grove cannot help—this is intentional and fundamental to zero-knowledge architecture. The encrypted data still exists but is computationally impossible to decrypt without the key.

This is the trade-off for true privacy: no backdoors, no "forgot password" recovery by support, no government subpoena access. Users must understand this before activating Ivy.

**User-facing warnings:**
```
⚠️ IMPORTANT: Your recovery phrase is the ONLY way to recover your
emails if you forget your password. Grove cannot help you—we literally
cannot read your data. Download and store this safely.

If you lose both your password AND recovery phrase, your emails are
permanently lost. This is by design—it's why we can promise that
no one (including us) can ever read your mail.
```

#### What's Encrypted vs. Not

| Data | Encrypted | Stored Where |
|------|-----------|--------------|
| Email body | ✅ AES-256-GCM | R2 |
| Attachments | ✅ AES-256-GCM | R2 |
| Subject line | ✅ AES-256-GCM | D1 (envelope blob) |
| From/To/CC | ✅ AES-256-GCM | D1 (envelope blob) |
| Timestamps | ✅ AES-256-GCM | D1 (envelope blob) |
| Labels | ✅ AES-256-GCM | D1 (envelope blob) |
| `user_id` | ❌ | D1 |
| `created_at` | ❌ | D1 (for pagination only) |
| `r2_key` | ❌ | D1 (reference to R2 object) |

**Marketing claim (honest):**
> "We literally cannot read your emails. Not the body. Not the subject. Not who you're talking to. Your key, your data."

---

## Database Schema (D1)

**Timezone Convention:** All TIMESTAMP fields are stored and queried in **UTC**. Client applications convert to user's local timezone for display. This prevents timezone-related bugs in cron jobs, queries, and cross-timezone collaboration.

### Core Tables (Zero-Knowledge)

```sql
-- User email settings
-- All TIMESTAMP fields are UTC
CREATE TABLE ivy_settings (
  user_id TEXT PRIMARY KEY,
  email_address TEXT UNIQUE NOT NULL,
  email_selected_at TIMESTAMP NOT NULL,
  email_locked_at TIMESTAMP NOT NULL,     -- Set when address chosen; immutable after
  encrypted_email_key TEXT NOT NULL,      -- Email key encrypted with user's wrapper key
  unsend_delay_minutes INTEGER DEFAULT 2,
  encrypted_signature TEXT,               -- Encrypted with email key
  recovery_phrase_downloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook buffer (for reliability)
CREATE TABLE ivy_webhook_buffer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_payload TEXT NOT NULL,              -- Raw webhook payload, temporarily stored
  webhook_signature TEXT NOT NULL,        -- For verification
  status TEXT DEFAULT 'pending',          -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Encrypted email envelopes
CREATE TABLE ivy_emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_envelope TEXT NOT NULL,       -- Contains: from, to, subject, snippet, timestamps, labels, thread_id
  r2_content_key TEXT NOT NULL,           -- Reference to encrypted body in R2
  is_draft BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Only unencrypted field (for pagination)
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Outgoing email queue (for delayed sending)
CREATE TABLE ivy_email_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_email_data TEXT NOT NULL,     -- Full email content, encrypted
  scheduled_send_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',          -- pending, cancelled, sent, failed
  cancelled_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Contact form submissions buffer
CREATE TABLE ivy_contact_form_buffer (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL,
  encrypted_submission TEXT NOT NULL,     -- Encrypted with recipient's public key
  source_blog TEXT,
  source_ip_hash TEXT,                    -- Hashed IP for rate limiting (not stored raw)
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);

-- Newsletter send tracking (for rate limit enforcement)
CREATE TABLE ivy_newsletter_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  postmark_message_id TEXT,               -- For tracking/debugging
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit log for admin overrides and sensitive operations
-- Required for email address changes, account recovery, etc.
CREATE TABLE ivy_admin_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                  -- Affected user
  admin_id TEXT NOT NULL,                 -- Admin who performed action
  action_type TEXT NOT NULL,              -- email_address_change, key_recovery, account_unlock, etc.
  old_value TEXT,                         -- Previous value (encrypted if sensitive)
  new_value TEXT,                         -- New value (encrypted if sensitive)
  reason TEXT NOT NULL,                   -- Required justification for change
  ticket_id TEXT,                         -- Support ticket reference (if applicable)
  ip_address_hash TEXT,                   -- Admin's IP (hashed for privacy)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Email address immutability enforcement
-- Note: email_locked_at is set when user first selects address; cannot be changed after
-- Support override requires admin action + audit log entry (see ivy_admin_audit_log)
```

### Indexes

```sql
CREATE INDEX idx_emails_user_created ON ivy_emails(user_id, created_at DESC);
CREATE INDEX idx_queue_pending ON ivy_email_queue(status, scheduled_send_at);
CREATE INDEX idx_queue_user ON ivy_email_queue(user_id, status);
CREATE INDEX idx_buffer_pending ON ivy_webhook_buffer(status, received_at);
CREATE INDEX idx_contact_pending ON ivy_contact_form_buffer(status, created_at);
CREATE INDEX idx_contact_ip ON ivy_contact_form_buffer(source_ip_hash, created_at);
CREATE INDEX idx_newsletter_user ON ivy_newsletter_sends(user_id, sent_at DESC);
CREATE INDEX idx_audit_user ON ivy_admin_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_admin ON ivy_admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_audit_action ON ivy_admin_audit_log(action_type, created_at DESC);
```

### Client-Side Schema (IndexedDB)

```javascript
// Decrypted and indexed locally for search
const clientSchema = {
  emails: {
    keyPath: 'id',
    indexes: [
      { name: 'threadId', keyPath: 'threadId' },
      { name: 'from', keyPath: 'from' },
      { name: 'to', keyPath: 'to' },
      { name: 'subject', keyPath: 'subject' },
      { name: 'date', keyPath: 'date' },
      { name: 'isRead', keyPath: 'isRead' },
      { name: 'isStarred', keyPath: 'isStarred' },
      { name: 'labels', keyPath: 'labels', multiEntry: true },
    ]
  },
  searchIndex: {
    // Full-text search index built from decrypted content
    keyPath: 'emailId',
    indexes: [
      { name: 'terms', keyPath: 'terms', multiEntry: true }
    ]
  }
};
```

---

## R2 Storage Structure

```
ivy/
├── {user_id}/
│   ├── emails/
│   │   └── {email_id}.enc     # Encrypted email body (HTML + plain text)
│   └── attachments/
│       └── {attachment_id}/
│           └── {filename}      # Encrypted attachment
```

All content encrypted with user-derived key before storage.

---

## Storage Quotas

Email storage counts against the user's total Grove storage quota:

| Tier | Total Storage | Shared With |
|------|---------------|-------------|
| Sapling | 5 GB | Blog images, markdown, email |
| Oak | 20 GB | Blog images, markdown, email |
| Evergreen | 100 GB | Blog images, markdown, email |

### Additional Storage Purchase

Users who need more space can purchase additional storage:

| Add-on | Price | Storage |
|--------|-------|---------|
| +10 GB | $1/mo | 10 GB |
| +50 GB | $4/mo | 50 GB |
| +100 GB | $7/mo | 100 GB |

**Cost basis:** R2 costs ~$0.015/GB/month. These prices provide healthy margin while being affordable.

### Storage Calculation

- Email bodies: Typically 10-100 KB each
- Attachments: Up to 25 MB each
- Most users will use minimal email storage
- Heavy attachment users will notice quota impact

### Quota Enforcement

**Never block incoming mail.** Users expect email to work like postal mail.

When approaching quota:
- **80%**: Warning notification, suggestion to clean up or upgrade
- **95%**: Warning, cannot send attachments >1MB
- **100%**: **Cannot send new emails, but CAN still receive**

At 100% quota:
- Block outgoing only
- Notify user with options:
  - Download/export data
  - Compress attachments (zip)
  - Delete old emails
  - Purchase additional storage
  - Upgrade tier

**Storage Management UI (planned):**
- Visual breakdown of storage by category (blog, email, attachments)
- One-click export/download
- Bulk delete old items
- Compress large attachments

---

## Security Model

### Encryption (True Zero-Knowledge)

| Data | Encryption | Where | Searchable |
|------|------------|-------|------------|
| Email body | AES-256-GCM | R2 | Client-side only |
| Attachments | AES-256-GCM | R2 | No |
| Subject line | AES-256-GCM | D1 (envelope blob) | Client-side only |
| From/To/CC | AES-256-GCM | D1 (envelope blob) | Client-side only |
| Timestamps | AES-256-GCM | D1 (envelope blob) | Client-side only |
| Labels | AES-256-GCM | D1 (envelope blob) | Client-side only |
| `user_id` | None | D1 | Yes (for routing) |
| `created_at` | None | D1 | Yes (for pagination) |

**No trade-offs:** All email content and metadata is encrypted. Grove cannot read any of it.

### Key Management

- **Email key**: Random 256-bit key generated at Ivy activation
- **Wrapper key**: Derived from Heartwood credentials via Argon2id
- **Storage**: Email key encrypted with wrapper key, stored in D1
- **Recovery**: BIP39 mnemonic phrase, downloadable at activation
- **Rotation**: Users can regenerate key (requires exporting/deleting all existing email)

### Authentication

- All Ivy access requires Heartwood authentication
- Session tokens with reasonable expiry
- Re-authentication required for sensitive actions (changing settings, key regeneration)
- Constant-time comparison for webhook signature verification (prevent timing attacks)

### Transport

- All connections over HTTPS/TLS
- Forward Email handles STARTTLS for SMTP
- Resend handles TLS for newsletter delivery

### Privacy Commitments

- **No tracking pixels** — We don't add tracking to outgoing mail
- **No read receipts** — We don't report when emails are opened
- **No metadata surveillance** — We can't see who you're emailing or about what
- **True zero-knowledge** — We literally cannot read your emails
- **No third-party analytics** — No Google Analytics, no Mixpanel
- **Data portability** — Users can export all their email data

### HTML Email Rendering (XSS Prevention)

Emails can contain HTML, which creates XSS risk. Defense in depth:

**1. Client-Side Sanitization (DOMPurify)**

```typescript
// IMPORTANT: DOMPurify runs CLIENT-SIDE only
// Server-side sanitization has known issues; do it in the browser
import DOMPurify from 'dompurify';

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}
```

**2. Sandboxed Iframe**

Email bodies render in a sandboxed iframe:

```html
<iframe
  sandbox="allow-same-origin"
  srcdoc="<!-- sanitized email HTML -->"
  csp="default-src 'none'; img-src https: data:; style-src 'unsafe-inline';"
></iframe>
```

**3. Content Security Policy**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data:;
  frame-src 'self';
  frame-ancestors 'self';
```

**Why client-side only:** Server-side DOMPurify has compatibility issues with Cloudflare Workers and can behave differently than browser DOM. Running sanitization in the browser ensures consistent behavior with actual rendering.

---

## Integrations

### 1. Heartwood (Auth)

Single sign-on with Grove account. No separate Ivy login.

```
User visits ivy.grove.place
  → Redirected to heartwood.grove.place/auth
  → Authenticated
  → Redirected back with session
  → Ivy loads with user context
```

### 2. Contact Forms → Ivy

When someone submits a contact form on a Grove blog:

1. Form submission hits Grove API
2. API creates email-like record in Ivy
3. Appears in recipient's Ivy inbox as a thread
4. User can reply directly (reply goes to submitter's email)

**Benefits:**
- No email configuration for blog owners
- Contact submissions in same place as other mail
- Reply threading works naturally

#### Contact Form Spam Prevention

Public contact forms create an abuse vector. Mitigation:

**1. Cloudflare Turnstile (Zero-Friction CAPTCHA)**

```typescript
// Server-side verification
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });
  const result = await response.json();
  return result.success === true;
}
```

**2. IP-Based Rate Limiting**

```typescript
const CONTACT_FORM_LIMITS = {
  perIpPerHour: 5,        // Max 5 submissions per IP per hour
  perRecipientPerDay: 20, // Max 20 submissions to any user per day
};

async function checkContactFormRateLimit(ipHash: string, recipientId: string): Promise<boolean> {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // Check IP rate
  const ipCount = await db.get(`
    SELECT COUNT(*) as count FROM ivy_contact_form_buffer
    WHERE source_ip_hash = ? AND created_at > ?
  `, [ipHash, new Date(hourAgo).toISOString()]);

  if (ipCount.count >= CONTACT_FORM_LIMITS.perIpPerHour) return false;

  // Check recipient rate
  const recipientCount = await db.get(`
    SELECT COUNT(*) as count FROM ivy_contact_form_buffer
    WHERE recipient_user_id = ? AND created_at > ?
  `, [recipientId, new Date(dayAgo).toISOString()]);

  if (recipientCount.count >= CONTACT_FORM_LIMITS.perRecipientPerDay) return false;

  return true;
}
```

**3. User Toggle**

Blog owners can disable contact forms entirely in settings if being targeted.

### 3. Meadow Notifications

Platform notifications (new followers, reactions, comments) can optionally route to Ivy:

- User setting: "Send Meadow notifications to Ivy"
- Notifications appear as system messages
- Keeps everything in one place

---

## UI/UX Considerations

### Web-First, PWA-Ready

- Responsive design for mobile browsers
- PWA manifest for "Add to Home Screen"
- Service worker for offline viewing of cached mail
- No native apps planned for Day 1

### Core Views

1. **Inbox**: Default view, unarchived threads
2. **Sent**: Emails user has sent
3. **Drafts**: Unsent compositions
4. **Archive**: Archived threads
5. **Trash**: Deleted items (30-day retention)
6. **Labels**: Filter by user-created labels
7. **Search**: Full-text search results

### Compose Modal

- Overlay modal (Gmail-style)
- Rich text editor (bold, italic, links, lists)
- Recipient autocomplete from contacts
- Attachment upload with drag-and-drop
- Unsend timer visible after sending

### Thread View

- Conversation displayed chronologically
- Collapsed messages with expand
- Reply box at bottom
- Label management
- Archive/Delete actions

### Mobile Considerations

- Touch-friendly targets
- Swipe actions (archive, delete)
- Pull-to-refresh
- Simplified compose on small screens

---

## Account Deletion

Following Google Takeout model for data export and deletion.

### Export Before Deletion

When a user requests account deletion:

1. **30-day grace period** begins
2. User receives email to external address (if provided) confirming request
3. **Full export generated automatically** — Google Takeout style:
   - Emails chunked into 1GB zip files (or 5GB/7z if user selects)
   - Download links sent via email (valid 7 days)
   - Includes: emails, attachments, contacts, settings
4. User can cancel deletion during grace period
5. After 30 days: permanent deletion

### Permanent Deletion Process

```
Day 0:  User requests deletion
        → Grace period starts
        → Export job queued
        → Confirmation email sent

Day 1:  Export complete
        → Download links emailed to external address
        → Reminder: "Your Grove data will be deleted in 29 days"

Day 15: Reminder email: "Your Grove data will be deleted in 15 days"

Day 30: Permanent deletion:
        → D1: All ivy_* tables rows deleted
        → R2: All user/{user_id}/ivy/* objects deleted
        → Backups: Marked for exclusion from future restores
        → Confirmation email: "Your data has been deleted"
```

### Export File Structure

```
grove-export-{username}-{date}/
├── part-1.zip (or .7z)           # Up to 1GB (or 5GB)
│   ├── emails/
│   │   ├── inbox/
│   │   │   └── {thread_id}/
│   │   │       ├── message-001.eml
│   │   │       └── message-002.eml
│   │   ├── sent/
│   │   └── archive/
│   └── attachments/
│       └── {email_id}/
│           └── {filename}
├── part-2.zip                    # If needed
├── contacts.json
├── settings.json
├── labels.json
└── manifest.json                 # Export metadata
```

---

## Testing Strategy

### Unit Tests

**Encryption:**
- Key derivation produces consistent results
- Encryption/decryption round-trip preserves data
- Invalid keys fail gracefully

**Webhooks:**
- Signature verification accepts valid signatures
- Signature verification rejects invalid/tampered
- Constant-time comparison (timing attack resistance)

**Unsend Logic:**
- Cancel within window succeeds
- Cancel after window fails
- Race condition handling (concurrent cancel + send)

**Rate Limiting:**
- Limits enforced correctly
- Window boundaries handled
- Different limits per tier

### Integration Tests

**Webhook → Buffer → R2 Flow:**
- Webhook received → buffer entry created
- Buffer processed → encrypted in R2
- Buffer retry on R2 failure
- Dead letter after max retries

**Send Flow:**
- Compose → queue → send → sent folder
- Unsend cancellation
- Attachment handling

**Quota Enforcement:**
- Upload blocked at 100%
- Warning at 80%, 95%
- Incoming mail not blocked

### End-to-End Tests

- Full send/receive cycle (Forward Email sandbox)
- Newsletter send (Postmark test mode)
- Export generation and download
- Account deletion flow

### Load Tests

- 1000 concurrent webhook deliveries
- Large attachment handling (25MB)
- Search performance with 10k emails
- Export of large mailbox (10GB+)

---

## Open Questions

### Technical

1. ~~**Forward Email API limits**~~ — ✅ ANSWERED: ~9,000 outbound/month on Enhanced, REST API with 15+ search params
2. ~~**Search implementation**~~ — ✅ DECIDED: Client-side search via IndexedDB. True zero-knowledge.
3. **Real-time updates** — Webhooks available; need to test payload structure. Push notifications for new mail.
4. **Offline sync** — IndexedDB caches decrypted index. How much email body content to cache?

### Product

1. **Signature editor** — Simple text or rich HTML signatures? (encrypted with email key)
2. **Vacation responder** — Auto-reply when away? (Later feature?)
3. **Blocked senders** — Allow users to block specific addresses?
4. **Spam handling** — Forward Email handles spam filtering; we just need UI for spam folder
5. **Storage management UI** — Visual breakdown, export tools, compression (planned)

### Business

1. ~~**Forward Email costs**~~ — ✅ ANSWERED: $3/mo for unlimited domains/aliases. Scales perfectly for multi-tenant.
2. ~~**Storage costs**~~ — ✅ ANSWERED: Using R2 instead of Forward Email storage. ~$15/mo per TB vs ~$300/mo.
3. ~~**Newsletter provider**~~ — ✅ DECIDED: Resend for broadcasts. Hybrid architecture (FE for mailbox, Resend for bulk).
4. **Support burden** — Email is complex. What's the support strategy?

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] Forward Email integration (send/receive working)
- [ ] D1 schema and basic CRUD
- [ ] R2 storage with encryption
- [ ] Basic inbox view
- [ ] Compose and send
- [ ] Thread view
- [ ] Unsend queue

### Phase 2: Organization

- [ ] Labels (create, apply, filter)
- [ ] Archive and trash
- [ ] Search (basic)
- [ ] Contact form integration

### Phase 3: Polish

- [ ] Full-text search improvements
- [ ] Keyboard shortcuts
- [ ] Mobile optimization
- [ ] PWA enhancements
- [ ] Meadow notification integration

### Phase 4: Advanced

- [ ] Folders
- [ ] Filters/rules
- [ ] Calendar integration
- [ ] Admin tools expansion

---

## Success Metrics

How do we know Ivy is working?

1. **Adoption** — % of Oak+ users who use Ivy vs. external client
2. **Engagement** — Emails sent/received per active user
3. **Retention** — Do email users churn less?
4. **Support tickets** — Email-related support volume
5. **Storage usage** — Are quotas appropriate?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Forward Email goes down | Can't send/receive temporarily, but **data safe in R2** | Monitor closely, have backup provider researched |
| Zero-knowledge key loss | User loses all email | Clear warnings, recovery phrase option? |
| Spam complaints | IP reputation damage | Strict rate limits, abuse monitoring |
| Feature creep | Never ships | Strict MVP scope, defer aggressively |
| Complexity | Support burden | Excellent help docs, simple UI |
| Webhook delivery failure | Incoming email lost | Forward Email retries; implement dead letter queue |

---

## References

### Forward Email
- [Forward Email API Documentation](https://forwardemail.net/en/email-api) — Main API docs with OpenAPI 3.0 spec
- [Complete REST API Guide](https://forwardemail.net/en/blog/docs/complete-email-api-imap-carddav-caldav-rest-endpoints) — Detailed endpoint documentation
- [Forward Email Pricing](https://forwardemail.net/en/private-business-email) — Plan comparison
- [Forward Email FAQ](https://forwardemail.net/en/faq) — General documentation
- [Forward Email Webhooks](https://forwardemail.net/en/webhook-email-notifications-service) — Webhook setup
- [GitHub Repository](https://github.com/forwardemail/forwardemail.net) — Open source, self-hostable

### Postmark (Newsletters)
- [Postmark](https://postmarkapp.com) — Transactional email with broadcast streams
- [Postmark Pricing](https://postmarkapp.com/pricing) — Per-email pricing
- [Postmark Broadcast Streams](https://postmarkapp.com/message-streams) — Separate streams for newsletters

### Cloudflare
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) — Note: Egress to Workers is FREE
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)

### Grove Internal
- Grove Pricing: `/docs/grove-pricing.md`
- Grove Naming: `/docs/grove-naming.md`
- Pricing Discussions: `/docs/internal/pricing-discussions.md`

---

*This is a living document. Update as decisions are made and implementation progresses.*
