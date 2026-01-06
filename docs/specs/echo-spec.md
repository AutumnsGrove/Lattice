# Echo Specification

> *Voices carry across the grove. Questions asked, answers returned.*

---

## Overview

**Echo** is Grove's support ticket system—a warm, accessible interface where users can ask questions and receive help. Not a corporate help desk with ticket numbers and SLAs, but a conversation that happens to be tracked.

**Domain:** `echo.grove.place`
**Internal Name:** GroveSupport
**Status:** Planned (Launch Priority)

---

## Philosophy

An echo returns what you send out. You call into the forest, and your voice comes back—transformed, but recognizable. That's what good support feels like: you ask a question, and you get a response that shows someone actually listened.

Echo is built on a simple principle: **meet users where they are**. Some users will have Ivy email addresses and prefer everything in their inbox. Others won't use Ivy at all. Echo accommodates both without forcing anyone into a workflow they didn't choose.

---

## Implementation Phases

### ⚠️ IMPORTANT: Phased Rollout

Echo is built in two distinct phases. **Phase 1 is the launch requirement.** Phase 2 comes later when Ivy is production-ready.

---

## Phase 1: Email-First Support (Launch)

Phase 1 provides a complete, functional support system using email as the communication channel. This is what ships at launch.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHASE 1: EMAIL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User                                                          │
│     │                                                           │
│     ▼                                                           │
│   ┌─────────────────┐                                          │
│   │ echo.grove.place│  Web interface for submitting tickets    │
│   │   (SvelteKit)   │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌──────────────────┐                │
│   │  Echo Worker    │────▶│   D1 Database    │                │
│   │                 │     │  (tickets, msgs) │                │
│   └────────┬────────┘     └──────────────────┘                │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │     Resend      │  Email notifications to user & support  │
│   │   (via Worker)  │                                          │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Flow (Phase 1)

1. **User visits** `echo.grove.place`
2. **If authenticated** (via Heartwood): Pre-filled email, username, tier info
3. **If guest**: Enter email address manually
4. **Submit ticket**: Category, subject, description, optional attachments
5. **Confirmation**: Ticket number displayed, confirmation email sent
6. **Updates**: All replies delivered via email
7. **View history**: Authenticated users can see their ticket history on the web

### Components

#### 1. Web Interface (`echo.grove.place`)

SvelteKit Pages application providing:

- **New Ticket Form**
  - Category selection (billing, technical, account, feedback, other)
  - Subject line
  - Description (markdown supported)
  - File attachments (up to 10MB total, stored in R2)
  - Priority indicator (normal/urgent)

- **Ticket History** (authenticated users only)
  - List of past tickets with status
  - Click to view full conversation
  - Filter by status (open, pending, resolved)

- **Ticket Detail View**
  - Full conversation thread
  - Add reply
  - Mark as resolved
  - Reopen ticket

#### 2. Echo Worker

Cloudflare Worker handling:

- Ticket creation and updates
- Email dispatch via Resend
- Inbound email processing (via Resend webhook)
- Authentication via Heartwood
- File upload to R2

#### 3. Email Integration (Resend)

- **Outbound**: Ticket confirmations, reply notifications
- **Inbound**: Users can reply directly to emails
- **From address**: `support@grove.place`
- **Reply-to**: Unique per-ticket address for threading

### Database Schema (D1)

```sql
-- Support tickets
CREATE TABLE echo_threads (
  id TEXT PRIMARY KEY,                    -- ULID
  thread_number TEXT UNIQUE NOT NULL,     -- ECHO-2026-00001
  user_id TEXT,                           -- Heartwood user ID (NULL for guests)
  guest_email TEXT,                       -- Email for non-authenticated users
  guest_name TEXT,                        -- Optional name for guests
  category TEXT NOT NULL DEFAULT 'other', -- billing, technical, account, feedback, other
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',    -- open, pending, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal',-- normal, urgent
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT,                       -- Support staff ID

  -- Indexes
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_echo_threads_user ON echo_threads(user_id);
CREATE INDEX idx_echo_threads_status ON echo_threads(status);
CREATE INDEX idx_echo_threads_created ON echo_threads(created_at DESC);

-- Messages within threads
CREATE TABLE echo_messages (
  id TEXT PRIMARY KEY,                    -- ULID
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,              -- 'user' or 'support'
  sender_id TEXT,                         -- User ID or support staff ID
  sender_name TEXT,                       -- Display name
  content TEXT NOT NULL,                  -- Markdown content
  attachments TEXT,                       -- JSON array of R2 keys
  is_internal BOOLEAN DEFAULT FALSE,      -- Internal notes (not visible to user)
  created_at INTEGER NOT NULL,

  FOREIGN KEY (thread_id) REFERENCES echo_threads(id)
);

CREATE INDEX idx_echo_messages_thread ON echo_messages(thread_id);

-- Email threading for inbound replies
CREATE TABLE echo_email_threads (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  email_thread_id TEXT UNIQUE,            -- Resend thread identifier
  reply_to_address TEXT UNIQUE,           -- Unique reply address per ticket

  FOREIGN KEY (thread_id) REFERENCES echo_threads(id)
);
```

### Email Templates

#### Ticket Confirmation

```
Subject: [ECHO-2026-00001] We received your message

Hi {name},

Thanks for reaching out. We've received your message about:

"{subject}"

We'll get back to you as soon as we can. You can reply directly to this
email to add more details, or visit your ticket at:

https://echo.grove.place/tickets/{id}

---
Grove Support
```

#### Support Reply

```
Subject: Re: [ECHO-2026-00001] {subject}

Hi {name},

{support_reply_content}

---
Reply to this email or visit: https://echo.grove.place/tickets/{id}

Grove Support
```

### API Endpoints

```typescript
// Create new ticket
POST /api/tickets
Body: {
  category: string;
  subject: string;
  content: string;
  priority?: 'normal' | 'urgent';
  attachments?: string[];  // R2 keys
}
Response: {
  id: string;
  thread_number: string;
}

// List user's tickets
GET /api/tickets
Query: ?status=open|pending|resolved|all
Response: {
  tickets: Ticket[];
}

// Get ticket details
GET /api/tickets/:id
Response: {
  ticket: Ticket;
  messages: Message[];
}

// Add reply to ticket
POST /api/tickets/:id/reply
Body: {
  content: string;
  attachments?: string[];
}

// Update ticket status (user can resolve their own)
PATCH /api/tickets/:id
Body: {
  status: 'resolved';
}

// Reopen ticket
POST /api/tickets/:id/reopen

// Upload attachment
POST /api/attachments
Body: FormData with file
Response: {
  key: string;  // R2 key
  url: string;  // Temporary signed URL
}

// Resend inbound webhook
POST /api/webhooks/resend
```

### Support Admin Interface

A separate admin interface at `echo.grove.place/admin` (protected by Heartwood admin role):

- **Queue view**: All open tickets, sorted by priority then age
- **Ticket assignment**: Claim tickets to work on
- **Canned responses**: Pre-written responses for common issues
- **Internal notes**: Add notes visible only to support staff
- **Ticket transfer**: Reassign to another support person
- **Metrics dashboard**: Response times, resolution rates, volume trends

---

## Phase 2: Ivy Integration (Future)

> **Note:** Phase 2 is planned for after Ivy reaches production. Do not implement Phase 2 until Ivy is stable and widely adopted.

### Overview

Phase 2 adds an alternative communication channel for users who have Ivy enabled. Instead of receiving support emails at their external address, they can receive tickets directly in their `@grove.place` Ivy inbox.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: IVY INTEGRATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐                                          │
│   │ echo.grove.place│                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌──────────────────┐                │
│   │  Echo Worker    │────▶│   D1 Database    │                │
│   │                 │     │                  │                │
│   └────────┬────────┘     └──────────────────┘                │
│            │                                                    │
│      ┌─────┴─────┐                                             │
│      │           │                                              │
│      ▼           ▼                                              │
│   ┌──────┐   ┌──────┐                                          │
│   │Resend│   │ Ivy  │  Choose based on user preference        │
│   │      │   │ API  │                                          │
│   └──────┘   └──────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Preference

Users can choose their preferred support channel in account settings:

```typescript
interface SupportPreferences {
  channel: 'email' | 'ivy';  // Default: 'email'
  ivy_enabled: boolean;      // Read from user's Ivy status
}
```

### Ivy Thread Model

When a user with Ivy preference submits a ticket:

1. Create ticket in D1 (same as Phase 1)
2. Create a new thread in user's Ivy inbox
3. Messages sync bidirectionally:
   - Support replies → New message in Ivy thread
   - User Ivy replies → New message in Echo ticket

### Database Additions (Phase 2)

```sql
-- Add Ivy thread tracking
ALTER TABLE echo_threads ADD COLUMN ivy_thread_id TEXT;
ALTER TABLE echo_threads ADD COLUMN notification_channel TEXT DEFAULT 'email';

-- Track Ivy message mapping
CREATE TABLE echo_ivy_messages (
  id TEXT PRIMARY KEY,
  echo_message_id TEXT NOT NULL,
  ivy_message_id TEXT NOT NULL,
  synced_at INTEGER NOT NULL,

  FOREIGN KEY (echo_message_id) REFERENCES echo_messages(id)
);
```

### Ivy API Integration

```typescript
// Send support message to Ivy
async function sendToIvy(userId: string, ticket: Ticket, message: Message) {
  await ivy.createMessage({
    to: userId,
    from: 'support@grove.place',
    subject: `[${ticket.thread_number}] ${ticket.subject}`,
    body: message.content,
    thread_id: ticket.ivy_thread_id,
  });
}

// Webhook for Ivy replies
POST /api/webhooks/ivy
Body: {
  type: 'message.created';
  data: {
    thread_id: string;
    message: IvyMessage;
  };
}
```

### Migration Path

When Phase 2 launches:

1. Existing tickets remain email-only
2. New tickets from Ivy users can use Ivy channel
3. Users can switch preference at any time
4. Switching mid-ticket keeps email for that ticket, new tickets use new preference

---

## File Storage (R2)

Attachments stored in Grove's R2 bucket under `echo/` prefix:

```
echo/
  attachments/
    {thread_id}/
      {message_id}/
        {filename}
```

### Allowed File Types

- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Documents: `.pdf`, `.txt`, `.md`
- Archives: `.zip`
- Max size: 10MB per file, 25MB per ticket

### Access Control

- Signed URLs for upload (10 minute expiry)
- Signed URLs for download (1 hour expiry)
- Only ticket participants can access attachments

---

## Thread Numbering

Thread numbers follow the format: `ECHO-{YEAR}-{SEQUENCE}`

- `ECHO-2026-00001` - First ticket of 2026
- `ECHO-2026-00042` - 42nd ticket of 2026

Sequence resets each year. Stored in KV for atomic increment:

```typescript
// KV key: echo:thread_sequence:{year}
// Value: current sequence number
```

---

## Rate Limiting

- **Ticket creation**: 5 per hour per user, 10 per hour per IP
- **Messages**: 20 per hour per ticket
- **Attachments**: 10 per hour per user

---

## Notifications

### User Notifications

| Event | Email | Ivy (Phase 2) |
|-------|-------|---------------|
| Ticket created | ✅ Confirmation | ✅ Thread created |
| Support reply | ✅ Email with reply | ✅ New message |
| Ticket resolved | ✅ Resolution notice | ✅ Resolution message |
| Ticket reopened | ✅ Reopen notice | ✅ Reopen message |

### Support Notifications

- New ticket: Email to support@grove.place (or Slack webhook)
- Urgent ticket: Immediate alert
- SLA warning: Ticket approaching 24h without response

---

## SLA Guidelines

These are guidelines, not contractual obligations:

| Priority | First Response | Resolution Target |
|----------|----------------|-------------------|
| Urgent | 4 hours | 24 hours |
| Normal | 24 hours | 72 hours |

---

## Security Considerations

1. **Authentication**: Heartwood session validation
2. **Authorization**: Users can only view their own tickets
3. **Input sanitization**: Markdown content sanitized before rendering
4. **Email validation**: Verify email ownership for guest tickets
5. **Attachment scanning**: Basic file type validation

---

## Environment Variables

```env
# Resend
RESEND_API_KEY=re_xxx

# Support email
SUPPORT_FROM_EMAIL=support@grove.place

# D1 Database
DB=echo-db

# R2 Bucket
ATTACHMENTS_BUCKET=grove-cdn

# KV Namespace (for sequences)
KV=grove-kv

# Heartwood API
HEARTWOOD_API_URL=https://auth-api.grove.place
```

---

## Deployment

### Phase 1 Requirements

- [ ] D1 database schema migrated
- [ ] Resend domain verified for grove.place
- [ ] R2 bucket configured
- [ ] Heartwood integration tested
- [ ] Email templates designed
- [ ] Admin interface functional

### Phase 2 Requirements (Future)

- [ ] Ivy production-ready
- [ ] Ivy webhook integration
- [ ] User preference UI in settings
- [ ] Bidirectional sync tested

---

## Integration Points

| System | Integration |
|--------|-------------|
| **Heartwood** | User authentication, admin roles |
| **Resend** | Email delivery and inbound processing |
| **R2** | Attachment storage |
| **D1** | Ticket and message persistence |
| **KV** | Thread sequence numbers |
| **Ivy** | Future: Alternative notification channel |

---

## Related Documentation

- [Ivy Mail Spec](ivy-mail-spec.md) - Email client (Phase 2 dependency)
- [Heartwood Spec](heartwood-spec.md) - Authentication
- [Waystone Spec](waystone-spec.md) - Help center (self-service before tickets)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-06 | 1.0 | Initial specification |

---

*Voices carry across the grove. Questions asked, answers returned.*
