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

Forward Email handles the actual mail server infrastructure:

- SMTP for sending
- IMAP for receiving
- MX record management
- SPF/DKIM/DMARC configuration

Grove's role:
- Fetch mail via IMAP API
- Store encrypted copies in R2
- Index metadata in D1
- Provide the user interface

### Data Flow

```
Incoming Email:
[External Sender] → [Forward Email MX] → [Grove Worker] → [Encrypt] → [R2 Storage]
                                              ↓
                                        [Index in D1]
                                              ↓
                                        [Ivy UI displays]

Outgoing Email:
[Ivy Compose] → [Email Queue (D1)] → [Wait for delay] → [Forward Email SMTP] → [Recipient]
                       ↓
              [User can cancel here]
```

### Zero-Knowledge Storage

Emails are encrypted at rest using a key derived from the user's credentials:

1. User authenticates via Heartwood
2. Key derivation function generates encryption key from auth token + user secret
3. All email content encrypted before writing to R2
4. Metadata (sender, subject line, timestamps) stored in D1 for search/indexing
5. Grove cannot read email bodies without user's derived key

**Trade-off:** Subject lines and metadata are searchable but not encrypted. Full body content is encrypted. This balances privacy with usability (search functionality).

---

## Database Schema (D1)

### Core Tables

```sql
-- User email settings
CREATE TABLE ivy_settings (
  user_id TEXT PRIMARY KEY,
  email_address TEXT UNIQUE NOT NULL,
  email_selected_at TIMESTAMP NOT NULL,
  unsend_delay_minutes INTEGER DEFAULT 2,
  signature TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email threads (conversations)
CREATE TABLE ivy_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  snippet TEXT, -- Preview text
  participant_emails TEXT, -- JSON array
  message_count INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_trashed BOOLEAN DEFAULT FALSE,
  trashed_at TIMESTAMP,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Individual emails within threads
CREATE TABLE ivy_emails (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT UNIQUE, -- Email Message-ID header
  from_address TEXT NOT NULL,
  to_addresses TEXT NOT NULL, -- JSON array
  cc_addresses TEXT, -- JSON array
  bcc_addresses TEXT, -- JSON array
  subject TEXT NOT NULL,
  snippet TEXT,
  r2_content_key TEXT NOT NULL, -- Reference to encrypted content in R2
  has_attachments BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES ivy_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Labels (user-created tags)
CREATE TABLE ivy_labels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT, -- Hex color for UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, name)
);

-- Thread-label associations
CREATE TABLE ivy_thread_labels (
  thread_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, label_id),
  FOREIGN KEY (thread_id) REFERENCES ivy_threads(id),
  FOREIGN KEY (label_id) REFERENCES ivy_labels(id)
);

-- Outgoing email queue (for delayed sending)
CREATE TABLE ivy_email_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email_data TEXT NOT NULL, -- Encrypted JSON with full email content
  scheduled_send_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, cancelled, sent, failed
  cancelled_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Attachments metadata
CREATE TABLE ivy_attachments (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL, -- Reference to file in R2
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES ivy_emails(id)
);

-- Contact form submissions (integration)
CREATE TABLE ivy_contact_form_submissions (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  source_blog TEXT, -- Which blog the form was on
  thread_id TEXT, -- Created thread in Ivy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id),
  FOREIGN KEY (thread_id) REFERENCES ivy_threads(id)
);
```

### Indexes

```sql
CREATE INDEX idx_threads_user_id ON ivy_threads(user_id);
CREATE INDEX idx_threads_last_message ON ivy_threads(user_id, last_message_at DESC);
CREATE INDEX idx_threads_archived ON ivy_threads(user_id, is_archived);
CREATE INDEX idx_threads_trashed ON ivy_threads(user_id, is_trashed);
CREATE INDEX idx_emails_thread ON ivy_emails(thread_id);
CREATE INDEX idx_emails_user ON ivy_emails(user_id);
CREATE INDEX idx_queue_pending ON ivy_email_queue(status, scheduled_send_at);
CREATE INDEX idx_queue_user ON ivy_email_queue(user_id, status);
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

### Storage Calculation

- Email bodies: Typically 10-100 KB each
- Attachments: Up to 25 MB each
- Most users will use minimal email storage
- Heavy attachment users will notice quota impact

### Quota Enforcement

When approaching quota:
- 80%: Warning notification
- 95%: Warning, cannot send attachments >1MB
- 100%: Cannot send new emails, can still receive (briefly), then hard block

---

## Security Model

### Encryption

| Data | Encryption | Searchable |
|------|------------|------------|
| Email body | AES-256 (user key) | No (client-side only) |
| Attachments | AES-256 (user key) | No |
| Subject line | Plaintext | Yes |
| Sender/recipient | Plaintext | Yes |
| Timestamps | Plaintext | Yes |
| Labels | Plaintext | Yes |

**Trade-off acknowledged:** Metadata is not encrypted to enable server-side search and indexing. Body content has zero-knowledge protection.

### Authentication

- All Ivy access requires Heartwood authentication
- Session tokens with reasonable expiry
- Re-authentication required for sensitive actions (changing settings)

### Transport

- All connections over HTTPS/TLS
- Forward Email handles STARTTLS for SMTP

### Privacy Commitments

- **No tracking pixels** — We don't add tracking to outgoing mail
- **No read receipts** — We don't report when emails are opened
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

1. **Forward Email API limits** — What are the rate limits? Do we need to cache aggressively?
2. **Search implementation** — D1 full-text search vs. external search service?
3. **Real-time updates** — Polling vs. WebSockets vs. Server-Sent Events?
4. **Offline sync** — How much data to cache locally for PWA?

### Product

1. **Signature editor** — Simple text or rich HTML signatures?
2. **Vacation responder** — Auto-reply when away? (Later feature?)
3. **Blocked senders** — Allow users to block specific addresses?
4. **Spam handling** — Rely on Forward Email's spam filter, or build our own UI?

### Business

1. **Forward Email costs** — Current plan is $3/month total. Will this scale?
2. **Storage costs** — R2 pricing at scale for email+attachments?
3. **Support burden** — Email is complex. What's the support strategy?

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
| Forward Email goes down | Users can't send/receive | Monitor closely, have backup provider researched |
| Zero-knowledge key loss | User loses all email | Clear warnings, recovery phrase option? |
| Spam complaints | IP reputation damage | Strict rate limits, abuse monitoring |
| Feature creep | Never ships | Strict MVP scope, defer aggressively |
| Complexity | Support burden | Excellent help docs, simple UI |

---

## References

- [Forward Email Documentation](https://forwardemail.net/en/faq)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- Grove Pricing: `/docs/grove-pricing.md`
- Grove Naming: `/docs/grove-naming.md`

---

*This is a living document. Update as decisions are made and implementation progresses.*
