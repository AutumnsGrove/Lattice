# Email Broadcast & Automation Implementation

*Created: December 26, 2025*

---

## Overview

Grove needs two email capabilities:
1. **Broadcasts**: Mass emails to all subscribers (announcements, roadmap updates)
2. **Automated Onboarding**: Triggered emails for new signups (welcome, day 1/3/7/30)

Both use Resend. No new services needed.

---

## Part 1: Mass Broadcasts (Announcements)

### Current State
- 59+ subscribers in D1 `email_signups` table
- Admin dashboard at `/admin/subscribers`
- Resend account exists, sending from `hello@grove.place`

### Implementation

#### Step 1: Create Resend Audience (One-Time, Dashboard)

1. Go to [Resend Dashboard](https://resend.com/audiences)
2. Create audience: **"Grove Waitlist"**
3. Note the audience ID for API calls

#### Step 2: Add Sync Endpoint

Create `/admin/api/sync-audience` to push D1 subscribers to Resend:

```typescript
// landing/src/routes/admin/api/sync-audience/+server.ts
import { Resend } from 'resend';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const AUDIENCE_ID = 'your-audience-id-here';

export const POST: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user?.is_admin) {
    throw error(403, 'Admin required');
  }

  const resend = new Resend(platform.env.RESEND_API_KEY);
  const { DB } = platform.env;

  // Get all active subscribers
  const { results } = await DB.prepare(
    'SELECT email FROM email_signups WHERE unsubscribed_at IS NULL'
  ).all<{ email: string }>();

  // Sync to Resend (Resend handles duplicates)
  let synced = 0;
  for (const { email } of results) {
    try {
      await resend.contacts.create({
        email,
        audienceId: AUDIENCE_ID,
      });
      synced++;
    } catch (e) {
      // Already exists, that's fine
    }
  }

  return json({ synced, total: results.length });
};
```

#### Step 3: Add Sync Button to Admin

Add to `/admin/subscribers` page:

```svelte
<button onclick={syncToResend}>
  Sync to Resend ({data.totalActive} subscribers)
</button>
```

#### Step 4: Sending Broadcasts

**Option A: Use Resend Dashboard (Recommended for now)**
- Go to Resend → Broadcasts → Create
- Select "Grove Waitlist" audience
- Compose email, preview, send
- Resend handles unsubscribes automatically

**Option B: API Endpoint (Future)**
```typescript
// POST /admin/api/broadcast
await resend.broadcasts.send({
  audienceId: AUDIENCE_ID,
  from: 'Autumn <autumn@grove.place>',
  subject: 'Come see where we're going',
  html: emailHtml,
});
```

#### Step 5: Keep Audiences in Sync

Two approaches:

**A. Manual Sync** (Simple)
- Click "Sync to Resend" before sending broadcasts
- Good enough for now

**B. Auto-Sync on Signup** (Better)
```typescript
// In /api/signup/+server.ts, after D1 insert:
await resend.contacts.create({
  email: newEmail,
  audienceId: AUDIENCE_ID,
});
```

---

## Part 2: Automated Onboarding Emails

### Current State
- Templates exist in `plant/src/lib/server/email-templates.ts`:
  - Welcome (immediate)
  - Day 1 (if checklist incomplete)
  - Day 3 (check-in)
  - Day 7 (tips)
  - Day 30 (milestone)

### Implementation

#### Step 1: Track Onboarding State

Add to user/subscription table:
```sql
ALTER TABLE users ADD COLUMN onboarding_email_sent TEXT DEFAULT '[]';
-- JSON array: ["welcome", "day1", "day3", "day7", "day30"]
```

#### Step 2: Send Welcome Email on Signup

Already partially wired in `landing/src/lib/email/send.ts`. Ensure it fires on:
- New paid subscription (Stripe webhook)
- Or signup completion

#### Step 3: Scheduled Worker for Follow-ups

Create a Cloudflare Worker cron trigger:

```typescript
// plant/src/scheduled.ts (or similar)
export default {
  async scheduled(event, env, ctx) {
    const now = new Date();

    // Find users who need day 1 email
    const day1Users = await env.DB.prepare(`
      SELECT * FROM users
      WHERE created_at < datetime('now', '-1 day')
      AND onboarding_email_sent NOT LIKE '%day1%'
      AND checklist_complete = 0
    `).all();

    for (const user of day1Users.results) {
      await sendDay1Email(user, env.RESEND_API_KEY);
      // Mark as sent
      await env.DB.prepare(
        `UPDATE users SET onboarding_email_sent = json_insert(onboarding_email_sent, '$[#]', 'day1') WHERE id = ?`
      ).bind(user.id).run();
    }

    // Similar for day3, day7, day30...
  }
};
```

Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 14 * * *"]  # Run daily at 2pm UTC
```

---

## Sender Addresses

| Email Type | From Address |
|------------|--------------|
| Transactional (welcome, etc) | `autumn@grove.place` |
| Broadcasts (announcements) | `autumn@grove.place` |
| System notifications | `hello@grove.place` |

All replies go to Autumn. That's the point.

---

## Unsubscribe Handling

### For Broadcasts (Resend Audiences)
- Resend handles automatically via `{{{RESEND_UNSUBSCRIBE_URL}}}`
- Unsubscribed contacts are skipped in future broadcasts
- Syncs back to your audience

### For Transactional (Onboarding)
- Add unsubscribe link to each email
- Create `/unsubscribe?token=xxx` endpoint
- Set `unsubscribed_at` in D1, stop sending

---

## Implementation Order

### Phase 1: Broadcasts (This Week)
- [ ] Create "Grove Waitlist" audience in Resend
- [ ] Add sync endpoint `/admin/api/sync-audience`
- [ ] Add sync button to admin dashboard
- [ ] Test: sync subscribers, send test broadcast

### Phase 2: Auto-Sync (Next)
- [ ] Add Resend contact creation to signup flow
- [ ] Handle unsubscribe webhook from Resend → D1

### Phase 3: Onboarding Automation (When Ready)
- [ ] Add onboarding_email_sent tracking
- [ ] Create scheduled worker
- [ ] Wire up templates from plant/
- [ ] Test full drip sequence

---

## Cost

| Item | Cost |
|------|------|
| Resend Free Tier | 3,000 emails/month, 1,000 contacts |
| Current usage | ~60 subscribers |
| When to upgrade | 1,000+ contacts or 3,000+ emails/month |
| Paid tier | $40/month for 5,000 contacts |

You're covered for a while.

---

*This keeps the human in the loop for announcements while automating the helpful onboarding nudges.*
