---
title: Porch — Front Porch Conversations
description: 'Warm, accessible support where you chat with the grove keeper'
category: specs
specCategory: platform-services
icon: rocking-chair
lastUpdated: '2026-01-06'
aliases: []
tags:
  - support
  - user-communication
  - cloudflare-workers
---

# Porch — Support System

> *Have a seat on the porch. We'll figure it out together.*

---

## Overview

**Porch** is Grove's front porch—a warm, accessible space where users can sit down and have a conversation. Not a corporate help desk with ticket numbers and SLAs, but a porch where you chat with the grove keeper about what's going on.

**Domain:** `porch.grove.place`
**Internal Name:** GrovePorch
**Status:** Planned (Launch Priority)

---

## Philosophy

A porch is where you sit and talk. You come up the steps, have a seat, and the grove keeper comes out to chat. It's not a ticket counter. It's not a help desk queue. It's two people on a porch, figuring things out together.

Porch is built on a simple principle: **meet users where they are**. Some users will have Ivy email addresses and prefer everything in their inbox. Others won't use Ivy at all. Porch accommodates both without forcing anyone into a workflow they didn't choose.

More than just support, Porch is where you reach out when you need help—or when you just want to say hi. Start a conversation, ask a question, or drop by to see what Autumn's up to.

---

## Implementation Phases

### ⚠️ IMPORTANT: Phased Rollout

Porch is built in two distinct phases. **Phase 1 is the launch requirement.** Phase 2 comes later when Ivy is production-ready.

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
│   ┌─────────────────┐                                           │
│   │porch.grove.place│  Web interface for starting visits        │
│   │   (SvelteKit)   │                                           │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌──────────────────┐                  │
│   │  Porch Worker   │────▶│   D1 Database    │                  │
│   │                 │     │  (visits, msgs)  │                  │
│   └────────┬────────┘     └──────────────────┘                  │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │     Resend      │  Email notifications to user & support    │
│   │   (via Worker)  │                                           │
│   └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Flow (Phase 1)

1. **User visits** `porch.grove.place`
2. **If authenticated** (via Heartwood): Pre-filled email, username, tier info
3. **If guest**: Enter email address manually
4. **Start a visit**: Category, subject, what's on your mind, optional attachments
5. **Confirmation**: Visit number displayed, confirmation email sent
6. **Updates**: All replies delivered via email
7. **View history**: Authenticated users can see their visit history on the web

### Components

#### 1. Web Interface (`porch.grove.place`)

SvelteKit Pages application providing:

- **Start a Visit Form**
  - Category selection (billing, technical, account, just saying hi, other)
  - Subject line
  - What's on your mind (markdown supported)
  - File attachments (up to 10MB total, stored in R2)
  - Priority indicator (normal/urgent)

- **Your Visits** (authenticated users only)
  - List of past visits with status
  - Click to view full conversation
  - Filter by status (open, pending, resolved)

- **Visit Detail View**
  - Full conversation thread
  - Add reply
  - Mark as resolved
  - Reopen visit

#### 2. Porch Worker

Cloudflare Worker handling:

- Visit creation and updates
- Email dispatch via Resend
- Inbound email processing (via Resend webhook)
- Authentication via Heartwood
- File upload to R2

#### 3. Email Integration (Resend)

- **Outbound**: Visit confirmations, reply notifications
- **Inbound**: Users can reply directly to emails
- **From address**: `porch@grove.place`
- **Reply-to**: Unique per-visit address for threading

### Database Schema (D1)

```sql
-- Porch visits (conversations)
CREATE TABLE porch_visits (
  id TEXT PRIMARY KEY,                    -- ULID
  visit_number TEXT UNIQUE NOT NULL,      -- PORCH-2026-00001
  user_id TEXT,                           -- Heartwood user ID (NULL for guests)
  guest_email TEXT,                       -- Email for non-authenticated users
  guest_name TEXT,                        -- Optional name for guests
  category TEXT NOT NULL DEFAULT 'other', -- billing, technical, account, hello, other
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

CREATE INDEX idx_porch_visits_user ON porch_visits(user_id);
CREATE INDEX idx_porch_visits_status ON porch_visits(status);
CREATE INDEX idx_porch_visits_created ON porch_visits(created_at DESC);

-- Messages within visits
CREATE TABLE porch_messages (
  id TEXT PRIMARY KEY,                    -- ULID
  visit_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,              -- 'user' or 'autumn'
  sender_id TEXT,                         -- User ID or support staff ID
  sender_name TEXT,                       -- Display name
  content TEXT NOT NULL,                  -- Markdown content
  attachments TEXT,                       -- JSON array of R2 keys
  is_internal BOOLEAN DEFAULT FALSE,      -- Internal notes (not visible to user)
  created_at INTEGER NOT NULL,

  FOREIGN KEY (visit_id) REFERENCES porch_visits(id)
);

CREATE INDEX idx_porch_messages_visit ON porch_messages(visit_id);

-- Email threading for inbound replies
CREATE TABLE porch_email_threads (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL,
  email_thread_id TEXT UNIQUE,            -- Resend thread identifier
  reply_to_address TEXT UNIQUE,           -- Unique reply address per visit

  FOREIGN KEY (visit_id) REFERENCES porch_visits(id)
);
```

### Email Templates

#### Visit Confirmation

```
Subject: [PORCH-2026-00001] Thanks for stopping by

Hi {name},

Thanks for coming to the porch. I got your message about:

"{subject}"

I'll get back to you as soon as I can. You can reply directly to this
email to add more details, or visit your conversation at:

https://porch.grove.place/visits/{id}

—
Autumn
```

#### Reply from Autumn

```
Subject: Re: [PORCH-2026-00001] {subject}

Hi {name},

{reply_content}

—
Reply to this email or visit: https://porch.grove.place/visits/{id}

Autumn
```

### API Endpoints

```typescript
// Start a new visit
POST /api/visits
Body: {
  category: string;
  subject: string;
  content: string;
  priority?: 'normal' | 'urgent';
  attachments?: string[];  // R2 keys
}
Response: {
  id: string;
  visit_number: string;
}

// List user's visits
GET /api/visits
Query: ?status=open|pending|resolved|all
Response: {
  visits: Visit[];
}

// Get visit details
GET /api/visits/:id
Response: {
  visit: Visit;
  messages: Message[];
}

// Add reply to visit
POST /api/visits/:id/reply
Body: {
  content: string;
  attachments?: string[];
}

// Update visit status (user can resolve their own)
PATCH /api/visits/:id
Body: {
  status: 'resolved';
}

// Reopen visit
POST /api/visits/:id/reopen

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

### Admin Interface (Autumn's View)

A separate admin interface at `porch.grove.place/admin` (protected by Heartwood admin role):

- **The Porch**: All open visits, sorted by priority then age
- **Claim a visit**: Pick up a conversation to respond to
- **Saved responses**: Pre-written responses for common questions
- **Internal notes**: Add notes visible only to Autumn
- **Metrics**: Response times, resolution rates, volume trends

---

## Phase 2: Ivy Integration (Future)

> **Note:** Phase 2 is planned for after Ivy reaches production. Do not implement Phase 2 until Ivy is stable and widely adopted.

### Overview

Phase 2 adds an alternative communication channel for users who have Ivy enabled. Instead of receiving porch updates at their external email, they can receive visits directly in their `@grove.place` Ivy inbox.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: IVY INTEGRATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐                                           │
│   │porch.grove.place│                                           │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌──────────────────┐                  │
│   │  Porch Worker   │────▶│   D1 Database    │                  │
│   │                 │     │                  │                  │
│   └────────┬────────┘     └──────────────────┘                  │
│            │                                                    │
│      ┌─────┴─────┐                                              │
│      │           │                                              │
│      ▼           ▼                                              │
│   ┌──────┐   ┌──────┐                                           │
│   │Resend│   │ Ivy  │  Choose based on user preference          │
│   │      │   │ API  │                                           │
│   └──────┘   └──────┘                                           │
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

When a user with Ivy preference starts a visit:

1. Create visit in D1 (same as Phase 1)
2. Create a new thread in user's Ivy inbox
3. Messages sync bidirectionally:
   - Autumn's replies → New message in Ivy thread
   - User Ivy replies → New message in Porch visit

### Database Additions (Phase 2)

```sql
-- Add Ivy thread tracking
ALTER TABLE porch_visits ADD COLUMN ivy_thread_id TEXT;
ALTER TABLE porch_visits ADD COLUMN notification_channel TEXT DEFAULT 'email';

-- Track Ivy message mapping
CREATE TABLE porch_ivy_messages (
  id TEXT PRIMARY KEY,
  porch_message_id TEXT NOT NULL,
  ivy_message_id TEXT NOT NULL,
  synced_at INTEGER NOT NULL,

  FOREIGN KEY (porch_message_id) REFERENCES porch_messages(id)
);
```

### Ivy API Integration

```typescript
// Send porch message to Ivy
async function sendToIvy(userId: string, visit: Visit, message: Message) {
  await ivy.createMessage({
    to: userId,
    from: 'porch@grove.place',
    subject: `[${visit.visit_number}] ${visit.subject}`,
    body: message.content,
    thread_id: visit.ivy_thread_id,
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

1. Existing visits remain email-only
2. New visits from Ivy users can use Ivy channel
3. Users can switch preference at any time
4. Switching mid-visit keeps email for that visit, new visits use new preference

---

## File Storage (R2)

Attachments stored in Grove's R2 bucket under `porch/` prefix:

```
porch/
  attachments/
    {visit_id}/
      {message_id}/
        {filename}
```

### Allowed File Types

- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Documents: `.pdf`, `.txt`, `.md`
- Archives: `.zip`
- Max size: 10MB per file, 25MB per visit

### Access Control

- Signed URLs for upload (10 minute expiry)
- Signed URLs for download (1 hour expiry)
- Only visit participants can access attachments

---

## Visit Numbering

Visit numbers follow the format: `PORCH-{YEAR}-{SEQUENCE}`

- `PORCH-2026-00001` - First visit of 2026
- `PORCH-2026-00042` - 42nd visit of 2026

Sequence resets each year. Stored in KV for atomic increment:

```typescript
// KV key: porch:visit_sequence:{year}
// Value: current sequence number
```

---

## Rate Limiting

- **Visit creation**: 5 per hour per user, 10 per hour per IP
- **Messages**: 20 per hour per visit
- **Attachments**: 10 per hour per user

---

## Notifications

### User Notifications

| Event | Email | Ivy (Phase 2) |
|-------|-------|---------------|
| Visit started | ✅ Confirmation | ✅ Thread created |
| Autumn's reply | ✅ Email with reply | ✅ New message |
| Visit resolved | ✅ Resolution notice | ✅ Resolution message |
| Visit reopened | ✅ Reopen notice | ✅ Reopen message |

### Autumn Notifications

- New visit: Email to porch@grove.place (or Slack webhook)
- Urgent visit: Immediate alert
- Response reminder: Visit approaching 24h without response

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
2. **Authorization**: Users can only view their own visits
3. **Input sanitization**: Markdown content sanitized before rendering
4. **Email validation**: Verify email ownership for guest visits
5. **Attachment scanning**: Basic file type validation

---

## Environment Variables

```env
# Resend
RESEND_API_KEY=re_xxx

# Porch email
PORCH_FROM_EMAIL=porch@grove.place

# D1 Database
DB=porch-db

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
| **D1** | Visit and message persistence |
| **KV** | Visit sequence numbers |
| **Ivy** | Future: Alternative notification channel |

---

## Related Documentation

- [Ivy Mail Spec](ivy-mail-spec.md) - Email client (Phase 2 dependency)
- [Heartwood Spec](heartwood-spec.md) - Authentication
- [Waystone Spec](waystone-spec.md) - Help center (self-service before visits)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-06 | 1.1 | Renamed from Echo to Porch; tickets → visits |
| 2026-01-06 | 1.0 | Initial specification |

---

*Have a seat on the porch. We'll figure it out together.*
