---
title: "Chirp: 1:1 Direct Messaging"
description: "Real-time direct messaging between mutual followers using Durable Objects"
category: specs
specCategory: content-community
aliases: []
date created: Tuesday, March 11th 2026
date modified: Tuesday, March 11th 2026
tags:
  - chat
  - direct-messaging
  - durable-objects
  - websocket
  - lattice
type: tech-spec
---

```
     ╭────────────╮         ╭────────────╮
     │  Wanderer  │         │  Wanderer  │
     │     A      │         │     B      │
     ╰─────┬──────╯         ╰──────┬─────╯
           │    GlassChat UI       │
           │    (Svelte 5)         │
     ╭─────┴───────────────────────┴─────╮
     │        SvelteKit API Routes       │
     │   auth + rate limits + D1 write   │
     ╰──────────────┬────────────────────╯
                    │
          ╭─────────┴──────────╮
          │                    │
    ╭─────┴──────╮     ╭──────┴──────╮
    │   ChatDO   │     │     D1      │
    │  WebSocket │     │  grove-db   │
    │   relay    │     │  3 tables   │
    ╰────────────╯     ╰─────────────╯
```

> *Some conversations happen in public. The ones that matter most happen between two people.*

# Chirp: 1:1 Direct Messaging

Friends who follow each other can send text messages in real time. The system pairs a REST API for persistence with a Durable Object for WebSocket relay, keeping the architecture simple and the data durable.

**Public Name:** Chirp
**Package:** `@autumnsgrove/lattice` (engine routes + service)
**Durable Object:** `ChatDO` in `services/durable-objects/`
**Introduced:** March 2026 (#1441)
**Tests:** 96 (45 service + 51 API)

---

## Architecture

Chirp has three layers: a SvelteKit API layer, a D1 persistence layer, and a Durable Object coordination layer.

**The API layer** handles authentication, authorization, rate limiting, and writes. Every message is persisted to D1 through the service layer before any WebSocket broadcast happens. This guarantees that if a message is acknowledged, it's durable.

**The persistence layer** is three D1 tables (covered below). The chat service at `libs/engine/src/lib/server/services/chat.ts` provides eight functions for all CRUD operations. No ORM, just prepared statements with parameterized bindings.

**The coordination layer** is a single Durable Object class (`ChatDO`) that manages WebSocket connections between conversation participants. It uses Cloudflare's hibernation API so idle conversations don't burn resources. The DO broadcasts messages and typing indicators to connected clients but delegates persistence to D1.

### Message Send Flow

When a wanderer sends a message through the REST API:

1. SvelteKit route authenticates the request and verifies participant membership
2. Threshold rate limiter checks the send rate (60 messages/minute per conversation)
3. The chat service writes the message to D1 and updates the conversation preview
4. The route fires a `waitUntil` call to the ChatDO's `/send` endpoint with `alreadyPersisted: true`
5. ChatDO broadcasts the message to any connected WebSocket clients without writing to D1 again

When a wanderer sends through the WebSocket path:

1. ChatDO receives the message via `onWebSocketMessage`
2. It validates content, persists to D1 via `persistMessage()`
3. It sends a `message:ack` to the sender and broadcasts `message` to other participants

The REST path is the primary send path because it runs through SvelteKit's middleware stack where Thorn moderation will eventually run (#1457). The WebSocket path exists for latency-sensitive typing indicators and read receipts.

---

## Database Schema

Three tables in `grove-engine-db` (D1), created by migrations 098 and 099.

### chat_conversations

One row per unique pair of participants.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Random hex blob |
| `participant_a` | TEXT | min(tenantId1, tenantId2) |
| `participant_b` | TEXT | max(tenantId1, tenantId2) |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601, updated on each message |
| `last_message_preview` | TEXT | Truncated to 200 chars, "[image]" for images |
| `last_message_at` | TEXT | Timestamp of most recent message |

The `UNIQUE(participant_a, participant_b)` constraint enforces one conversation per pair. The sorted-pair scheme (participant_a is always the lexicographically smaller ID) means both `getOrCreateConversation(A, B)` and `getOrCreateConversation(B, A)` resolve to the same row.

### chat_messages

Append-only log within a conversation.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Random hex blob (not sequential) |
| `conversation_id` | TEXT FK | References chat_conversations |
| `sender_id` | TEXT | Tenant ID of the sender |
| `content` | TEXT | Message text (max 4000 chars) |
| `content_type` | TEXT | `'text'` or `'image'`, DB CHECK constraint |
| `metadata` | TEXT | JSON-encoded `ChatImageMetadata` for images |
| `created_at` | TEXT | ISO 8601 |
| `retracted_at` | TEXT | Soft-delete timestamp; content cleared at app layer |

Message IDs are random hex blobs, not sequential. Cursor-based pagination uses `created_at` as the sort key, not `id`.

### chat_read_cursors

Per-participant read position for unread counts.

| Column | Type | Purpose |
|--------|------|---------|
| `conversation_id` | TEXT FK | References chat_conversations |
| `tenant_id` | TEXT | The reader's tenant ID |
| `last_read_message_id` | TEXT | ID of the last message they've seen |
| `last_read_at` | TEXT | Timestamp of the cursor update |

Primary key is `(conversation_id, tenant_id)`.

Unread counts are computed by counting messages where `created_at > last_read_at` and `sender_id != viewer`. The `last_read_at` timestamp is a proxy for the message's own timestamp. It's updated atomically with `last_read_message_id`, so it's a reliable boundary for the unread subquery. This avoids a nested correlated lookup to resolve the cursor message's `created_at`.

### Indexes (Migration 099)

- `idx_chat_messages_unread` on `(conversation_id, retracted_at, sender_id, created_at)` covers the unread count subquery
- `idx_chat_conv_last_activity` on `(last_message_at DESC, created_at DESC)` covers the conversation list sort

---

## WebSocket Protocol

The WebSocket endpoint is at `/api/chat/conversations/{id}/ws`. SvelteKit authenticates the request, looks up the conversation participants, and forwards the upgrade to the ChatDO identified by `chat:{min}:{max}` (the sorted tenant pair).

### Client to Server

**`message`** -- Send a chat message.

```json
{
  "type": "message",
  "conversation_id": "abc-123",
  "content": "hello",
  "content_type": "text"
}
```

For image messages, include `metadata`:

```json
{
  "type": "message",
  "conversation_id": "abc-123",
  "content": "",
  "content_type": "image",
  "metadata": {
    "url": "https://cdn.grove.place/tenant/chat/img.webp",
    "width": 800,
    "height": 600,
    "alt": "A drawing of an aspen grove"
  }
}
```

**`typing`** -- Broadcast a typing indicator.

```json
{
  "type": "typing",
  "conversation_id": "abc-123"
}
```

**`read`** -- Mark messages as read up to a specific message.

```json
{
  "type": "read",
  "conversation_id": "abc-123",
  "last_read_message_id": "msg-456"
}
```

### Server to Client

**`message`** -- A new message arrived (broadcast to all participants).

```json
{
  "type": "message",
  "message": {
    "id": "msg-789",
    "conversation_id": "abc-123",
    "sender_id": "tenant-A",
    "content": "hello",
    "content_type": "text",
    "metadata": null,
    "created_at": "2026-03-11T04:30:00.000Z",
    "retracted_at": null
  }
}
```

**`message:ack`** -- Confirms the sender's message was persisted.

```json
{
  "type": "message:ack",
  "message_id": "msg-789",
  "created_at": "2026-03-11T04:30:00.000Z"
}
```

**`typing`** -- Relayed typing indicator (other participant only).

```json
{
  "type": "typing",
  "conversation_id": "abc-123",
  "sender_id": "tenant-B"
}
```

**`read`** -- Read cursor update (broadcast to all participants).

```json
{
  "type": "read",
  "conversation_id": "abc-123",
  "tenant_id": "tenant-B",
  "last_read_message_id": "msg-456"
}
```

**`error`** -- Something went wrong.

```json
{
  "type": "error",
  "code": "CHAT-004",
  "message": "Message content required"
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| CHAT-001 | Connection not authenticated (missing tenant tag) |
| CHAT-002 | Invalid message format (unparseable JSON) |
| CHAT-003 | Unknown message type |
| CHAT-004 | Message content required (empty text message) |
| CHAT-005 | Message too long (over 4000 chars) |
| CHAT-006 | Missing conversation_id |
| CHAT-007 | Invalid content type (not text/image) |
| CHAT-010 | DB unavailable |
| CHAT-011 | Failed to persist message |

### Connection Lifecycle

The client-side connection manager (`connection.svelte.ts`) handles reconnection with exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s. The DO uses Cloudflare's hibernation API, so WebSocket connections survive DO hibernation without the client needing to reconnect.

---

## API Endpoints

All endpoints require authentication. Tenant identity is resolved from the session, not from request parameters.

### GET /api/chat/conversations

List the authenticated wanderer's conversations with unread counts and peer info.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | query int | 50 | 1-100 |
| `offset` | query int | 0 | Pagination offset |

Returns `{ conversations: ChatConversationWithMeta[] }`.

### POST /api/chat/conversations

Start a conversation with a mutual friend.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `friendTenantId` | body string | Yes | The other participant's tenant ID |

Returns `{ success: true, conversation, created }` with status 201 if new, 200 if existing.

Rate limited: 20 conversations per hour per user.

Mutual friendship is verified via `areMutualFriends()`. Conversations with non-friends are rejected with 403.

### GET /api/chat/conversations/{id}/messages

Paginated message history, newest first internally but returned in chronological order.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `before` | query string | - | ISO 8601 cursor (fetch messages older than this) |
| `limit` | query int | 50 | 1-100 |

Returns `{ messages: ChatMessageData[] }`.

### POST /api/chat/conversations/{id}/messages

Send a message. Persists to D1, then fires a broadcast to the ChatDO.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | body string | Yes | Message text (max 4000 chars) |
| `contentType` | body string | No | `"text"` (default) or `"image"` |
| `metadata` | body object | No | Required for image messages |

Returns `{ success: true, message: ChatMessageData }` with status 201.

Rate limited: 60 messages per minute per user per conversation.

### POST /api/chat/conversations/{id}/read

Update read cursor. Accepts a message ID or the special value `"latest"`, which the server resolves to the most recent message ID. This server-side resolution prevents storing a literal `"latest"` string as a cursor, which would break the unread count query.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | body string | Yes | Message ID or `"latest"` |

### POST /api/chat/conversations/{id}/messages/{messageId}/retract

Soft-delete a message. Only the original sender can retract. The message row stays in D1 with `retracted_at` set and `content` cleared. The row is preserved so conversation threading and cursor arithmetic stay consistent.

### GET /api/chat/unread

Total unread message count across all conversations. Used for the inbox badge in the navigation.

Returns `{ unread: number }`.

### POST /api/chat/images/upload

Upload an image to R2 for use in image messages.

Accepts `multipart/form-data` with a `file` field. Validates file type (JPEG, PNG, GIF, WebP, AVIF, JXL) via both MIME type and magic byte signature. Maximum 5MB.

Returns `{ success: true, url, key, width: null, height: null }`. Width and height are null because dimensions come from the client.

R2 key format: `{tenantId}/chat/chat-{base36timestamp}.{ext}`

Rate limited: 20 uploads per hour per user.

---

## Security Model

### Mutual Friendship Gate

Conversations can only be created between mutual friends. The `areMutualFriends()` check in `friends.ts` verifies that both A follows B and B follows A before allowing conversation creation. This is the primary access control boundary.

### Participant Authorization

Every endpoint that touches a conversation verifies the authenticated user is one of its two participants. This check happens at the API route layer via `isParticipant()`, and again inside the ChatDO's REST handlers via a direct DB query.

### Sender-Only Retraction

The `retractMessage()` query includes `AND sender_id = ?` in its WHERE clause, making it impossible for participant A to retract participant B's messages.

### Rate Limiting

Three Threshold rate limits protect against abuse:

- Conversation creation: 20 per hour per user
- Message sending: 60 per minute per user per conversation
- Image uploads: 20 per hour per user

### Input Validation

- Content type enum checked at three layers: API route, ChatDO, and DB CHECK constraint
- Message length capped at 4000 characters at both API and DO layers
- Tenant ID and message ID length-limited to 64 characters to prevent abuse
- Image upload validates MIME type and file signature (magic bytes)
- File extensions allowlisted (not derived from untrusted input)
- R2 keys use server-generated filenames to prevent path traversal

---

## Client Architecture

### Chat Store (`chat.svelte.ts`)

A Svelte 5 reactive store that manages the conversation list and unread counts. Module-level `$state` variables with exported getters and methods.

The store uses direct mutation (`conversations[idx].lastMessage = ...`) rather than array copies, since Svelte 5's `$state` tracks deep mutations.

### Connection Manager (`connection.svelte.ts`)

Creates a WebSocket connection per active conversation. Reconnects with exponential backoff on disconnect. Cleans up cleanly on intentional close (sets `intentionallyClosed` flag to prevent reconnect attempts).

### Chat UI (`/arbor/chat/+page.svelte`)

Two-panel layout: conversation list on the left, message thread on the right. WCAG AA accessible with aria-labels on conversation buttons, a live region for incoming messages, and reduced motion support.

---

## File Map

```
libs/engine/
  migrations/
    098_grove_chat.sql              -- Schema: 3 tables
    099_chat_perf_indexes.sql       -- Composite indexes for unread queries
  src/lib/
    server/services/
      chat.ts                       -- Service layer (8 functions)
      chat.types.ts                 -- Types + WS protocol (source of truth)
      chat.test.ts                  -- 45 service tests
    ui/
      chat/
        connection.svelte.ts        -- WebSocket manager with reconnect
        types.ts                    -- Client-side types (re-exports + view types)
        index.ts                    -- Barrel exports
      stores/
        chat.svelte.ts              -- Conversation list + unread state
  src/routes/
    api/chat/
      conversations/+server.ts            -- GET/POST conversations
      conversations/[id]/
        messages/+server.ts               -- GET/POST messages
        messages/[messageId]/retract/+server.ts  -- Unsend
        ws/+server.ts                     -- WebSocket upgrade
        read/+server.ts                   -- Read cursor
      unread/+server.ts                   -- Unread count
      images/upload/+server.ts            -- Image upload (R2)
      chat.test.ts                        -- 51 API route tests
    arbor/chat/
      +page.server.ts                     -- Page data loader
      +page.svelte                        -- Two-panel chat UI

services/durable-objects/
  src/
    ChatDO.ts                       -- Durable Object (WebSocket + hibernation)
    index.ts                        -- DO exports (modified)
  wrangler.toml                     -- CHAT binding + v7 migration
```

---

## Known Limitations

**Thorn moderation is not wired for the WebSocket path.** The ChatDO can't import `moderatePublishedContent()` because `@autumnsgrove/lattice/thorn` isn't exported as a DO-safe subpath. Messages sent via the REST API route will get moderation once #1457 lands. Two paths forward: emit to a MODERATION_QUEUE, or add a thorn subpath export and wire the AI binding to the DO.

**ChatDO /history route is registered but unused.** Message history is served through the REST API. The DO exposes the route as a fallback for future use.

**No /api/chat/friends endpoint.** Friend data for the chat UI comes from the conversation list's peer info (joined from the tenants table), not a separate friends endpoint.

**Image dimensions are client-provided.** The upload endpoint returns `width: null, height: null` and relies on the client to supply dimensions in the message metadata. Server-side image dimension extraction is a future enhancement.

---

## Future Work

- Wire Thorn content moderation for DM messages (#1457)
- Server-side image dimension extraction
- Message search
- Conversation muting/archiving
- Typing indicator debounce (currently fires on every keystroke)
- Read receipt UI indicators

_Two people, one conversation. That's all this needs to be._
