# Ivy — Grove Mail Client Specification

*Internal planning document*

*Created: December 2025*

---

## Overview

**Ivy** is Grove's first-party mail client for `@grove.place` email addresses. Rather than forcing users to configure IMAP in third-party clients, Ivy provides a focused, privacy-first web interface integrated directly into the Grove ecosystem.

### Why "Ivy"?

Ivy grows on lattices—it's the living connection that climbs the framework. Email is the vine that connects people through Grove's infrastructure. The name ties directly to Lattice (the core platform) while evoking organic growth and interconnection.

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

## Tier Access

| Feature | Free | Sapling ($12) | Oak ($25) | Evergreen ($35) |
|---------|:----:|:-------------:|:---------:|:---------------:|
| Ivy Access | — | Read-only | Full | Full |
| Send Email | — | — | ✓ | ✓ |
| Receive Email | — | View forwarded | ✓ | ✓ |
| Newsletter Send | — | — | 2x/week | 2x/week |
| Storage Pool | — | 5 GB | 20 GB | 100 GB |

### Sapling (Read-Only)

Sapling users have email forwarding—mail to `username@grove.place` forwards to their personal inbox. In Ivy, they can:

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

1. **One email per user** — Your email matches your username (`username@grove.place`)
2. **One-time selection** — Once chosen, your email address cannot be changed
3. **No aliases** — Users cannot create additional addresses (contact@, hello@, etc.)
4. **One account per user** — No multi-account support; one Grove account = one email

These constraints must be clearly communicated during onboarding. The email selection is permanent.

---

## Features

### Day One (MVP)

#### Core Email Functions
- **Inbox view** — List of received emails with sender, subject, preview, timestamp
- **Compose** — Rich text editor with formatting, recipient fields (To, CC, BCC)
- **Send/receive** — Full SMTP/IMAP functionality via Forward Email backend
- **Multiple recipients** — Send to multiple addresses in one email
- **Reply/Reply All/Forward** — Standard email actions
- **Attachments** — Upload and attach files (25MB max per attachment)

#### Organization
- **Threaded conversations** — Gmail-style grouping of related messages
- **Labels** — User-created tags for organizing mail (not folders)
- **Archive** — Remove from inbox without deleting
- **Delete** — Move to trash, permanent delete after 30 days
- **Search** — Full-text search across all mail (subject, body, sender, recipient)

#### Unsend (Delayed Sending)
- Emails are queued, not sent immediately
- Configurable delay: **1, 2, 5, 15, 30, or 60 minutes**
- Default: **2 minutes**
- During delay window, user can cancel ("unsend")
- After delay expires, email sends normally
- Visual indicator showing time remaining to unsend

#### Integrations
- **Heartwood auth** — Single sign-on with Grove account
- **Contact forms → Inbox** — Blog contact form submissions arrive as email threads
- **Meadow notifications** — Grove platform notifications delivered to Ivy

### Later Features

#### Organization (Phase 2)
- **Folders** — Hierarchical organization in addition to labels
- **Filters/Rules** — Auto-apply labels, archive, or delete based on criteria
- **Starred/Flagged** — Quick-mark important messages

#### Calendar (Phase 2-3)
- **Google Calendar integration** — Detect ICS attachments, add to calendar
- **GroveCalendar** — First-party calendar (future Grove product)

#### Advanced (Phase 3+)
- **Import from other providers** — Migrate from Gmail, Outlook, etc.
- **Keyboard shortcuts** — Power user navigation
- **Offline support** — PWA with local caching
- **Templates** — Saved email templates for common responses

---

## Newsletter / Subscriber Features (Oak+)

Oak and Evergreen users can send to their blog subscribers:

### Capabilities
- **Subscriber list access** — Send to people who subscribed to your blog
- **Bulk send** — Compose once, send to list
- **Unsubscribe handling** — Automatic unsubscribe links, honor requests

### Limits
- **Maximum 2 sends per week** — Prevents spam, encourages thoughtful communication
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
- **Send to all users** — Platform announcements
- **Send by tier** — Target specific subscription levels
- **Send by criteria** — Filter by signup date, last active, etc.
- **No rate limits** — Admin sends bypass weekly limits
- **Template system** — Saved templates for common admin communications

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
| **Zero-knowledge** | Encrypted with user's IMAP password—they can't read emails |
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

**Webhook verification:** Forward Email provides signature verification via `X-Webhook-Signature` header.

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

### Resend Integration (Newsletters)

**Hybrid architecture:** Forward Email for mailbox, Resend for broadcasts.

#### Why Two Providers?

| Use Case | Provider | Why |
|----------|----------|-----|
| 1:1 correspondence | Forward Email | Mailbox infrastructure (MX, webhooks, SMTP) |
| Newsletters/broadcasts | Resend | Purpose-built for bulk, dedicated IPs, deliverability |

Different tools for different jobs. No approval needed from Forward Email for newsletters.

#### Resend Pricing

**Transactional Email (API sends):**

| Plan | Price | Emails/Month | Daily Limit |
|------|-------|--------------|-------------|
| Free | $0 | 3,000 | 100/day |
| Pro | $20/mo | 50,000 | — |
| Scale | $90/mo | 100,000 | — |

**Marketing Email (Broadcasts):**

| Plan | Price | Contacts | Sends |
|------|-------|----------|-------|
| Free | $0 | 1,000 | Unlimited |
| Starter | $40/mo | 5,000 | Unlimited |
| Growth | Custom | 10,000+ | Unlimited |

**For Grove:**
- Start with Free tier (1,000 contacts, unlimited sends)
- Move to Starter ($40/mo) when subscriber base grows
- Marketing pricing is per-contact, not per-send (good for 2x/week newsletters)

#### Newsletter Feature (Oak+)

```
USER FLOW:
1. User composes newsletter in Ivy
2. Selects "Send to Subscribers"
3. Preview shows recipient count
4. User confirms send
5. Resend Broadcasts API sends to all subscribers
6. Copy stored in user's Ivy (encrypted)

LIMITS:
- Oak/Evergreen only
- Maximum 2 sends per week (enforced by Grove, not Resend)
- No tracking pixels, no open tracking (privacy-first)
- Automatic unsubscribe link in footer
```

#### Resend Configuration

```
API: api.resend.com
Auth: API key (stored securely, not in user space)
From: username@grove.place (verified domain)
```

#### Cost Projection

| Users with Oak+ | Avg Subscribers | Monthly Cost |
|-----------------|-----------------|--------------|
| 10 | 500 | $0 (free tier) |
| 50 | 2,500 | $40/mo |
| 200 | 10,000 | ~$80/mo |

Resend's per-contact pricing scales reasonably for Grove's use case.

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


NEWSLETTER/BROADCAST (Oak+ via Resend):

[Ivy "Send to Subscribers"]
        ↓
[Fetch subscriber list]
        ↓
[Resend Broadcasts API]  ←  Dedicated infrastructure for bulk
        ↓
[Store copy in user's Ivy (encrypted)]
```

**Key points:**
- Forward Email never stores our users' emails—they only relay
- D1 buffer ensures no email loss if R2 is temporarily unavailable
- Resend handles newsletters (separate from 1:1 correspondence)

### Zero-Knowledge Storage

**TRUE zero-knowledge**: Grove cannot read ANY of your email data—not bodies, not subjects, not who you're talking to.

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

**User-facing warnings:**
```
⚠️ IMPORTANT: Your recovery phrase is the ONLY way to recover your
emails if you forget your password. Grove cannot help you—we literally
cannot read your data. Download and store this safely.
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

### Core Tables (Zero-Knowledge)

```sql
-- User email settings
CREATE TABLE ivy_settings (
  user_id TEXT PRIMARY KEY,
  email_address TEXT UNIQUE NOT NULL,
  email_selected_at TIMESTAMP NOT NULL,
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
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);
```

### Indexes

```sql
CREATE INDEX idx_emails_user_created ON ivy_emails(user_id, created_at DESC);
CREATE INDEX idx_queue_pending ON ivy_email_queue(status, scheduled_send_at);
CREATE INDEX idx_queue_user ON ivy_email_queue(user_id, status);
CREATE INDEX idx_buffer_pending ON ivy_webhook_buffer(status, received_at);
CREATE INDEX idx_contact_pending ON ivy_contact_form_buffer(status, created_at);
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

1. **Inbox** — Default view, unarchived threads
2. **Sent** — Emails user has sent
3. **Drafts** — Unsent compositions
4. **Archive** — Archived threads
5. **Trash** — Deleted items (30-day retention)
6. **Labels** — Filter by user-created labels
7. **Search** — Full-text search results

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

### Resend (Newsletters)
- [Resend](https://resend.com) — Email for developers
- [Resend Pricing](https://resend.com/pricing) — Transactional and marketing plans
- [Resend Broadcasts](https://resend.com/blog/send-marketing-emails-with-resend-broadcasts) — Newsletter feature

### Cloudflare
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)

### Grove Internal
- Grove Pricing: `/docs/grove-pricing.md`
- Grove Naming: `/docs/grove-naming.md`
- Pricing Discussions: `/docs/internal/pricing-discussions.md`

---

*This is a living document. Update as decisions are made and implementation progresses.*
