---
title: "Ivy Email Triage & Digest System"
status: planned
category: features
---

# Ivy Email Triage & Digest System

## Context

Multiple email inboxes across accounts/apps create an overwhelming, stress-inducing mess. Important emails get buried under junk that's impossible to unsubscribe from. The solution: aggregate all inboxes into one place, use AI to classify and filter, and send clean digest briefings on a schedule — turning email chaos into a calm 10-minute morning review.

**Build on Ivy** (`Projects/Ivy`), which is ~70% complete with full inbox UI, webhook handling, D1/R2 storage, and auth stubs. Wire it up with existing Grove infra — **Lumen** for AI classification, **Zephyr** for digest delivery, **Loom** for DO-coordinated processing — using the real engine package, not local reimplementations.

**Forward-thinking principle:** Use what already exists. The engine exports `@autumnsgrove/lattice/lumen` and `@autumnsgrove/lattice/zephyr` — import them directly. Use the Loom DO pattern for email processing so it scales from 5 emails to 200+ without hitting Worker CPU limits. Build it right for one user (MVP), but structure it so others can use it later.

## Architecture Overview

```
Gmail/ProtonMail/etc → Forward to triage@grove.place
                              ↓
                    Forward Email webhook
                              ↓
              Ivy Worker (/api/webhook/incoming)
                   [existing rate limit + HMAC verify]
                              ↓
                    Buffer to ivy_webhook_buffer
                              ↓
              Cron (every min) finds pending entries
                              ↓
                    TriageDO (Loom pattern)
                 ┌──────────────────────────┐
                 │ 1. Parse headers/body    │
                 │ 2. Blocklist → auto-junk │
                 │ 3. Lumen classify        │
                 │ 4. Store to D1 + R2      │
                 │ 5. Alarm: next digest?   │
                 └──────────────────────────┘
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         Ivy Inbox UI    Digest Alarm     Filter Settings
         (browse/triage) (8am/1pm/6pm)   (block/allow)
                              ↓
                    Lumen summary → HTML
                              ↓
                    Zephyr → chosen inbox
```

## Decisions Made

- **AI on ingest** — classify each email immediately via TriageDO
- **No encryption** — personal tool, cleartext in D1/R2 (add encryption later if multi-tenant)
- **Digest at 8am / 1pm / 6pm** — configurable times, stored in settings
- **Auth: just me** — Heartwood check, if my email → real inbox, else → demo
- **Loom DO for processing** — scales to 100+ emails without Worker CPU limits, alarm-based digest scheduling
- **Engine dependency** — use real `@autumnsgrove/lattice/lumen` and `/zephyr`, not local clients

---

## Phase 0: Clean Up Ivy & Add Engine Dependency

**This must happen FIRST.** Ivy is standalone with no engine dependency. A lot has changed in the engine since Ivy was built. We need to bring Ivy up to speed before any integration work.

### 0a. Add `@autumnsgrove/lattice` to Ivy's `package.json`

- Add `"@autumnsgrove/lattice": "^0.9.99"` to dependencies
- This gives Ivy access to Lumen, Zephyr, shared types, UI components, chrome — everything
- **File:** `Ivy/package.json`

### 0b. Add `@jsquash/jxl` Vite exclusion

- Engine requires this in all consumer packages
- Add to `Ivy/vite.config.ts`:
  ```ts
  optimizeDeps: { exclude: ["@jsquash/jxl"] },
  build: { rollupOptions: { external: ["@jsquash/jxl"] } }
  ```

### 0c. Audit Ivy's existing code for conflicts

- Check for duplicate dependencies that engine now provides (e.g., Svelte 5 version alignment)
- Verify `adapter-cloudflare` version compatibility
- Run `pnpm install` + `svelte-check` to surface any issues

### 0d. Verify Lumen and Zephyr imports work

- Test: `import { createLumenClient } from '@autumnsgrove/lattice/lumen'`
- Test: `import { ZephyrClient } from '@autumnsgrove/lattice/zephyr'`
- Fix any import resolution issues

### 0e. Migrate Ivy UI to use engine components where possible

- Replace custom Icons.svelte with engine icon system
- Consider using engine GlassCard, chrome components (Header/Footer)
- Adopt engine color system / tokens.css

---

## Phase 1: Schema & Types

### 1a. New migration: `Ivy/src/migrations/0003_triage_system.sql`

```sql
-- Classification columns on existing table
ALTER TABLE ivy_emails ADD COLUMN category TEXT DEFAULT 'uncategorized';
ALTER TABLE ivy_emails ADD COLUMN confidence REAL DEFAULT 0;
ALTER TABLE ivy_emails ADD COLUMN suggested_action TEXT DEFAULT 'read';
ALTER TABLE ivy_emails ADD COLUMN topics TEXT DEFAULT '[]';
ALTER TABLE ivy_emails ADD COLUMN classification_model TEXT;
ALTER TABLE ivy_emails ADD COLUMN classified_at TEXT;
ALTER TABLE ivy_emails ADD COLUMN is_read INTEGER DEFAULT 0;
ALTER TABLE ivy_emails ADD COLUMN original_sender TEXT;

-- Triage filter rules (blocklist/allowlist)
CREATE TABLE ivy_triage_filters (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,          -- 'blocklist' | 'allowlist'
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL,    -- 'exact' | 'domain' | 'contains'
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digest tracking
CREATE TABLE ivy_digest_log (
  id TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL,
  recipient TEXT NOT NULL,
  email_count INTEGER NOT NULL,
  categories TEXT NOT NULL,    -- JSON: {"important": 3, ...}
  zephyr_message_id TEXT,
  digest_type TEXT DEFAULT 'scheduled',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digest settings on existing settings table
ALTER TABLE ivy_settings ADD COLUMN digest_times TEXT DEFAULT '["08:00","13:00","18:00"]';
ALTER TABLE ivy_settings ADD COLUMN digest_timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE ivy_settings ADD COLUMN digest_recipient TEXT;
ALTER TABLE ivy_settings ADD COLUMN digest_enabled INTEGER DEFAULT 0;
ALTER TABLE ivy_settings ADD COLUMN last_digest_at TEXT;

-- Indexes
CREATE INDEX idx_emails_category ON ivy_emails(category, created_at DESC);
CREATE INDEX idx_emails_sender ON ivy_emails(original_sender);
CREATE INDEX idx_digest_sent ON ivy_digest_log(sent_at DESC);
```

### 1b. Update types: `Ivy/src/lib/types/index.ts`

- Add `EmailCategory`, `SuggestedAction`, `ClassificationResult`, `FilterRule`, `DigestSchedule`
- Update `IvyEmail` and `IvySettings` interfaces for new columns

### 1c. Update bindings: `Ivy/src/app.d.ts`

- Add `ZEPHYR` (service binding), `AI` (Workers AI), `OPENROUTER_API_KEY` (secret)
- Add `TRIAGE` (Durable Object namespace binding)
- Add `isOwner: boolean` to `App.Locals`

---

## Phase 2: TriageDO (Loom Pattern)

**Why a DO instead of inline cron processing:**

- Worker CPU limit is 30s (paid) or 10ms (free). Processing 100+ emails with AI classification can exceed this.
- DOs have 30s per alarm invocation but can chain alarms — process 10 emails per alarm, schedule next alarm.
- Alarm-based digest scheduling is more precise than cron polling.
- Already wired pattern via Loom — deterministic IDs, SQLite storage, alarm chains.
- Multi-tenant ready: `triage:{userId}` means each user gets their own DO when Ivy goes public.

### 2a. New DO: `TriageDO` in `services/durable-objects/`

- **ID pattern:** `triage:{userId}` (single user for now, multi-tenant ready)
- **SQLite tables (DO-local):**
  - `processing_queue` — emails pending classification
  - `digest_schedule` — next alarm times
- **Key methods:**
  - `processEmail(payload)` — parse, filter, classify via Lumen, store to D1
  - `scheduleDigest(times, timezone)` — set alarm for next digest time
  - `alarm()` — either process queued emails OR generate/send digest, depending on state
- **Lumen integration:** `createLumenClient({ openrouterApiKey: this.env.OPENROUTER_API_KEY, ai: this.env.AI, db: this.env.DB })`
- **Zephyr integration:** Service binding `this.env.ZEPHYR`

### 2b. Add TriageDO to `services/durable-objects/wrangler.toml`

```toml
[[durable_objects.bindings]]
name = "TRIAGE"
class_name = "TriageDO"

[[migrations]]
tag = "v5"
new_sqlite_classes = ["TriageDO"]
```

### 2c. Add TRIAGE binding to `Ivy/wrangler.toml`

```toml
[[durable_objects.bindings]]
name = "TRIAGE"
class_name = "TriageDO"
script_name = "grove-durable-objects"

[[services]]
binding = "ZEPHYR"
service = "grove-zephyr"

[ai]
binding = "AI"
```

---

## Phase 3: Core Triage Logic (inside TriageDO)

### 3a. Filters: `services/durable-objects/src/triage/filters.ts`

- `evaluateFilters(sender, db)` → `FilterResult | null`
- Runs BEFORE AI classification (saves Lumen cost on known junk)
- Default blocklist: instagram.com, facebook.com, facebookmail.com, linkedin.com, x.com, tiktok.com, pinterest.com
- CRUD functions for filter management (backed by Ivy's D1 `ivy_triage_filters` table)

### 3b. Classifier: `services/durable-objects/src/triage/classifier.ts`

- `classifyEmail(envelope, lumen)` → `ClassificationResult`
- Sends only metadata to Lumen (from, subject, 300-char snippet) — never full body
- Uses `summary` task type with DeepSeek v3.2 (~$0.0002/email)
- Returns: `{ category, confidence, reason, suggestedAction, topics }`
- Fallback to "uncategorized" on parse failure

### 3c. Digest: `services/durable-objects/src/triage/digest.ts`

- `getDigestEmails(db, since)` — query unread since last digest, grouped by category
- `generateDigest(emails, lumen)` — send to Lumen for natural language briefing
- `sendDigest(html, zephyr, settings)` — deliver via Zephyr service binding
- `calculateNextAlarm(times, timezone, now)` — timezone-aware next-alarm calculation

---

## Phase 4: Webhook → TriageDO Bridge

### 4a. Modify `Ivy/src/routes/api/webhook/incoming/+server.ts`

After buffering to `ivy_webhook_buffer` (existing), hand off to TriageDO:

```ts
const triageDO = platform.env.TRIAGE;
const doId = triageDO.idFromName("triage:owner");
const stub = triageDO.get(doId);
event.waitUntil(
  stub.fetch(
    new Request("http://localhost/process", {
      method: "POST",
      body: JSON.stringify({ bufferId: entry.id }),
    }),
  ),
);
```

### 4b. Modify `Ivy/src/workers/webhook/handler.ts`

- Remove encryption code paths (store cleartext)
- Improve MIME parsing (add `postal-mime` dependency)
- Extract `original_sender` from forwarding headers (`X-Original-From`, etc.)

---

## Phase 5: API Endpoints

| Endpoint                          | Action                                             |
| --------------------------------- | -------------------------------------------------- |
| `GET /api/emails`                 | List with pagination, category filter, read filter |
| `GET /api/emails/[id]`            | Single email (D1 envelope + R2 body)               |
| `POST /api/emails/[id]/classify`  | Manual reclassification (calls TriageDO)           |
| `GET /api/triage/filters`         | List blocklist/allowlist                           |
| `POST /api/triage/filters`        | Add filter rule                                    |
| `DELETE /api/triage/filters/[id]` | Remove filter rule                                 |
| `GET /api/triage/stats`           | Category counts for dashboard                      |
| `GET /api/triage/digest/preview`  | Preview next digest content                        |
| `POST /api/triage/digest/send`    | Manually trigger digest (poke TriageDO)            |
| `PUT /api/settings`               | Update digest schedule/timezone/recipient          |

---

## Phase 6: Auth

### 6a. Update `Ivy/src/hooks.server.ts`

- Update auth URL: `auth-api.grove.place` → `login.grove.place`
- Add owner check: `session?.user?.email === OWNER_EMAIL` (env var or hardcoded)
- Set `event.locals.isOwner`
- Skip auth for webhook endpoint (has HMAC auth)

### 6b. Update `Ivy/src/routes/(app)/+layout.server.ts`

- Pass `isOwner` to children
- Owner: load real data from API
- Others: load demo/mock data (existing sample threads)

---

## Phase 7: UI Updates

### 7a. Inbox: `Ivy/src/routes/(app)/inbox/+page.svelte`

- Add category filter tabs: All / Important / Actionable / FYI
- Category badge on each email row (color-coded)
- Wire to real API (replace mock store)

### 7b. Settings: `Ivy/src/routes/(app)/settings/+page.svelte`

- New "Triage" settings tab:
  - Digest schedule (time pickers, timezone dropdown, recipient email)
  - Filter management (add/remove blocklist & allowlist entries)
  - AI classification toggle

### 7c. Landing: `Ivy/src/routes/+page.svelte`

- Owner → redirect to `/inbox`
- Authenticated non-owner → demo inbox (existing mock data as component)
- Unauthenticated → landing + login buttons

---

## Phase 8: Forward Email Configuration (Operational)

1. Set up Ford Email alias (e.g., `triage@grove.place`)
2. Configure Forward Email webhook URL → deployed Ivy endpoint
3. Set secrets:
   - `wrangler secret put FORWARD_EMAIL_API_KEY`
   - `wrangler secret put WEBHOOK_SECRET` (`openssl rand -base64 32`)
   - `wrangler secret put OPENROUTER_API_KEY`
   - `wrangler secret put ZEPHYR_API_KEY`
4. Set up email forwarding rules in Gmail, ProtonMail, etc.
5. Deploy Ivy + grove-durable-objects, test with forwarded emails

---

## Key Files (Critical Path)

| File                                                | What Changes                                    |
| --------------------------------------------------- | ----------------------------------------------- |
| `Ivy/package.json`                                  | Add engine dependency                           |
| `Ivy/vite.config.ts`                                | Add @jsquash/jxl exclusion                      |
| `Ivy/src/migrations/0003_triage_system.sql`         | New schema                                      |
| `Ivy/src/lib/types/index.ts`                        | New types                                       |
| `services/durable-objects/src/TriageDO.ts`          | **New** — Loom DO for email processing + digest |
| `services/durable-objects/src/triage/filters.ts`    | **New** — blocklist/allowlist                   |
| `services/durable-objects/src/triage/classifier.ts` | **New** — Lumen AI classification               |
| `services/durable-objects/src/triage/digest.ts`     | **New** — digest generation + scheduling        |
| `services/durable-objects/wrangler.toml`            | Add TriageDO migration                          |
| `Ivy/wrangler.toml`                                 | Add TRIAGE DO, ZEPHYR, AI bindings              |
| `Ivy/src/routes/api/webhook/incoming/+server.ts`    | Hand off to TriageDO                            |
| `Ivy/src/hooks.server.ts`                           | Owner auth check                                |
| `Ivy/src/routes/api/emails/+server.ts`              | Implement email listing API                     |
| `Ivy/src/routes/(app)/inbox/+page.svelte`           | Category tabs, real data                        |

## Verification

1. **Unit**: Vitest tests for classifier (mock Lumen response), filters (blocklist matching), digest scheduling (timezone edge cases)
2. **Integration**: Send test email to Forward Email → verify webhook → verify TriageDO processes → verify classified email in Ivy inbox
3. **Digest**: Manually trigger via `POST /api/triage/digest/send` → verify Zephyr delivers formatted email
4. **Auth**: Log in via Heartwood → confirm real inbox. Log out → confirm demo mode.
5. **Scale test**: Queue 50+ emails → verify TriageDO alarm chain processes all without timeout

## Notes

- **MIME parsing**: Add `postal-mime` for proper multipart handling (works in Workers runtime)
- **Forwarding headers**: Gmail/ProtonMail may embed original sender in `X-Original-From` or envelope — handle per-provider
- **DO alarm chaining**: Process ~10 emails per alarm invocation (each takes ~2s with Lumen call), schedule next alarm for remaining. This keeps each alarm well under the 30s limit.
- **Engine rebuild**: After adding TriageDO, run `pnpm run package` in engine AND `cd packages/durable-objects && pnpm deploy`
- **Greenhouse dogfooding**: Once working for personal use, enroll Ivy in Greenhouse. Use graft flags to gate triage features for other users.
