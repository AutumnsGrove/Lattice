# Grove Email Infrastructure v2 - Implementation Plan

Issue: #453

## Overview

Complete overhaul of Grove's automated email infrastructure. Replaces the outdated landing page email system with a unified, modern approach using React Email for beautiful templates, Resend for delivery with native scheduling, and D1 as the source of truth for audience segmentation.

### What's Changing

| Component | Old | New |
|-----------|-----|-----|
| Templates | Plain HTML tables, "grandma 2002" style | React Email component system |
| Scheduling | Cloudflare cron worker querying D1 daily | Resend native `scheduled_at` + weekly catch-up cron |
| Segmentation | Single `email_signups` table, no categories | D1 audience types: `waitlist`, `trial`, `rooted` |
| Email creation | Manual HTML files | New `/hummingbird-compose` skill |
| Design system | None | Grove Email Components (warm, colorful, Grove-branded) |

### Why This Matters

1. **Current emails are outdated** - Reference Stripe (we use LemonSqueezy now)
2. **No audience segmentation** - Everyone gets the same emails
3. **Plain text aesthetics** - Doesn't reflect Grove's warm, nature-themed brand
4. **Manual process** - No workflow for creating beautiful emails quickly
5. **Solo developer reality** - Need maximum automation with minimum maintenance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GROVE EMAIL SYSTEM v2                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │   Landing    │     │    Plant     │     │  Subscribed  │           │
│   │   Waitlist   │     │   Signups    │     │    Users     │           │
│   │  (Curious)   │     │   (Trial)    │     │   (Rooted)   │           │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘           │
│          │                    │                    │                    │
│          ▼                    ▼                    ▼                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    D1 (Source of Truth)                         │  │
│   │   email_signups (unified table)                                 │  │
│   │   + audience_type: 'waitlist' | 'trial' | 'rooted'              │  │
│   │   + sequence_stage: 0 | 1 | 7 | 14 | 30 | -1 (complete)         │  │
│   │   + last_email_at: ISO timestamp                                │  │
│   └──────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                      │
│          ┌───────────────────────┼───────────────────────┐             │
│          ▼                       ▼                       ▼             │
│   ┌────────────┐          ┌────────────┐          ┌────────────┐       │
│   │  Signup    │          │   Weekly   │          │  Broadcast │       │
│   │  Trigger   │          │   Cron     │          │    CLI     │       │
│   │(schedules) │          │ (catch-up) │          │ (manual)   │       │
│   └─────┬──────┘          └─────┬──────┘          └─────┬──────┘       │
│         │                       │                       │              │
│         └───────────────────────┼───────────────────────┘              │
│                                 ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     React Email Templates                        │  │
│   │   packages/engine/src/lib/email/                                │  │
│   │   ├── components/     Grove design system                       │  │
│   │   ├── sequences/      Day 0, 1, 7, 14, 30 emails               │  │
│   │   ├── promotional/    Trial nudges                              │  │
│   │   └── updates/        Patch notes for Rooted users              │  │
│   └──────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                         Resend API                               │  │
│   │   • scheduled_at for sequences (native scheduling)              │  │
│   │   • {{{RESEND_UNSUBSCRIBE_URL}}} magic link                     │  │
│   │   • Audience sync for broadcasts                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Email Sequences by Audience

| Day | Waitlist (Curious) | Trial (Plant Signup) | Rooted (Subscribed) |
|-----|-------------------|---------------------|---------------------|
| 0 | "Welcome to Grove" | "You planted something" | "Welcome home" |
| 1 | — | "Quick tip: your first..." | "Getting started guide" |
| 7 | "What we're building" | "Have you tried...?" | "Feature spotlight" |
| 14 | "Why Grove exists" | "Special offer" | — |
| 30 | "Check-in" | "Last chance" | — |
| Ongoing | — | — | Patch notes, updates |

### Audience Definitions

- **Waitlist**: Signed up on landing page, just curious
- **Trial**: Signed up via Plant but hasn't subscribed yet
- **Rooted**: Active subscriber (Seedling, Sapling, Oak, or Evergreen tier)

---

## Database Schema Updates

### Migration: Update `email_signups` table

```sql
-- Add audience segmentation
ALTER TABLE email_signups ADD COLUMN audience_type TEXT DEFAULT 'waitlist';
-- Values: 'waitlist' | 'trial' | 'rooted'

-- Add sequence tracking (replaces individual day flags)
ALTER TABLE email_signups ADD COLUMN sequence_stage INTEGER DEFAULT 0;
-- Values: 0 = welcome, 1, 7, 14, 30, -1 = complete

-- Add last email timestamp
ALTER TABLE email_signups ADD COLUMN last_email_at TEXT;
-- ISO timestamp of last email sent

-- Index for catch-up cron queries
CREATE INDEX idx_email_signups_sequence ON email_signups(audience_type, sequence_stage, last_email_at);
```

### Data Migration

```sql
-- Migrate existing tracking flags to new schema
UPDATE email_signups SET sequence_stage =
  CASE
    WHEN day30_email_sent = 1 THEN -1  -- complete
    WHEN day14_email_sent = 1 THEN 30
    WHEN day7_email_sent = 1 THEN 14
    WHEN day3_email_sent = 1 THEN 7
    WHEN day1_email_sent = 1 THEN 1
    WHEN welcome_email_sent = 1 THEN 0
    ELSE 0
  END;

-- After migration verified, drop old columns
-- ALTER TABLE email_signups DROP COLUMN welcome_email_sent;
-- ALTER TABLE email_signups DROP COLUMN day1_email_sent;
-- etc.
```

---

## React Email Setup

### Directory Structure

```
packages/engine/src/lib/email/
├── components/                    # Grove design system
│   ├── GroveEmail.tsx            # Base wrapper with header/footer
│   ├── GroveHeader.tsx           # Logo + optional hero
│   ├── GroveFooter.tsx           # Signature + {{{RESEND_UNSUBSCRIBE_URL}}}
│   ├── GroveButton.tsx           # CTA button (grove-green)
│   ├── GroveDivider.tsx          # Decorative leaf/vine divider
│   ├── GroveHighlight.tsx        # Callout box for important info
│   ├── GrovePatchNote.tsx        # Feature update block
│   └── index.ts                  # Exports
├── sequences/                     # Automated sequence emails
│   ├── WelcomeEmail.tsx          # Day 0 (all audiences)
│   ├── Day1Email.tsx             # Day 1 (trial + rooted)
│   ├── Day7Email.tsx             # Day 7 (all audiences)
│   ├── Day14Email.tsx            # Day 14 (waitlist + trial)
│   ├── Day30Email.tsx            # Day 30 (waitlist + trial)
│   └── index.ts
├── promotional/                   # Trial user nudges
│   └── TrialNudgeEmail.tsx
├── updates/                       # Rooted user updates
│   └── PatchNotesEmail.tsx
├── render.ts                      # Wrapper for @react-email/render
└── schedule.ts                    # Sequence scheduling logic
```

### Dependencies

```bash
pnpm add @react-email/components @react-email/render
pnpm add -D react-email  # Dev server for previewing
```

### Package.json Scripts

```json
{
  "scripts": {
    "email:dev": "email dev -p 3001",
    "email:build": "email export"
  }
}
```

### Example Component: GroveEmail.tsx

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
} from '@react-email/components';

interface GroveEmailProps {
  children: React.ReactNode;
  previewText?: string;
}

export function GroveEmail({ children, previewText }: GroveEmailProps) {
  return (
    <Html lang="en">
      <Head />
      {previewText && (
        <span style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          {previewText}
        </span>
      )}
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header with logo */}
          <Section style={styles.header}>
            <Img
              src="https://grove.place/logo.svg"
              width={48}
              height={48}
              alt="Grove"
            />
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.signature}>— Autumn</Text>
            <Text style={styles.tagline}>
              <em>A place to be.</em>
            </Text>
            <Text style={styles.links}>
              <Link href="https://grove.place" style={styles.link}>grove.place</Link>
              {' · '}
              <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={styles.link}>
                step away (unsubscribe)
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: '#fefdfb',  // Warm cream
    fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center' as const,
    paddingBottom: '30px',
  },
  content: {
    padding: '30px',
    backgroundColor: '#f0fdf4',  // Soft green tint
    borderRadius: '12px',
  },
  footer: {
    textAlign: 'center' as const,
    paddingTop: '40px',
  },
  signature: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#3d2914',  // Bark brown
    opacity: 0.5,
  },
  tagline: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#3d2914',
    opacity: 0.5,
  },
  links: {
    margin: 0,
    fontSize: '11px',
    color: '#3d2914',
    opacity: 0.3,
  },
  link: {
    color: 'inherit',
    textDecoration: 'none',
  },
};
```

### Example Sequence Email: WelcomeEmail.tsx

```tsx
import { Text, Button } from '@react-email/components';
import { GroveEmail } from '../components/GroveEmail';

interface WelcomeEmailProps {
  name?: string;
  audienceType: 'waitlist' | 'trial' | 'rooted';
}

export function WelcomeEmail({ name, audienceType }: WelcomeEmailProps) {
  const greeting = name ? `Welcome, ${name}` : 'Welcome to the Grove';

  const content = {
    waitlist: {
      heading: `${greeting} 🌿`,
      body: `You've just planted something special. I'm Autumn, and I'm building Grove—a cozy corner of the internet where your words have a home.`,
      cta: 'Learn more about Grove',
      ctaUrl: 'https://grove.place/about',
    },
    trial: {
      heading: `You planted something 🌱`,
      body: `Welcome to Grove! You've taken your first step toward having your own space online. Over the next few days, I'll share some tips to help you get the most out of your new home.`,
      cta: 'Explore your grove',
      ctaUrl: 'https://grove.place/dashboard',
    },
    rooted: {
      heading: `Welcome home 🏡`,
      body: `You're officially rooted! Thank you for believing in what we're building. Your support means everything. Let me show you around your new space.`,
      cta: 'Get started',
      ctaUrl: 'https://grove.place/dashboard',
    },
  };

  const c = content[audienceType];

  return (
    <GroveEmail previewText={c.body.slice(0, 100)}>
      <Text style={styles.heading}>{c.heading}</Text>
      <Text style={styles.body}>{c.body}</Text>
      <Button href={c.ctaUrl} style={styles.button}>
        {c.cta}
      </Button>
    </GroveEmail>
  );
}

const styles = {
  heading: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    color: '#3d2914',
    fontWeight: 'normal' as const,
  },
  body: {
    margin: '0 0 24px 0',
    fontSize: '16px',
    lineHeight: 1.6,
    color: '#3d2914',
  },
  button: {
    backgroundColor: '#16a34a',  // Grove green
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 'bold' as const,
  },
};
```

---

## Scheduling Logic

### Signup Trigger (Hybrid Approach)

When a user signs up, schedule their entire email sequence via Resend's native `scheduled_at`:

```typescript
// packages/engine/src/lib/email/schedule.ts

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail, Day1Email, Day7Email, Day14Email, Day30Email } from './sequences';

const resend = new Resend(process.env.RESEND_API_KEY);

type AudienceType = 'waitlist' | 'trial' | 'rooted';

interface SequenceEmail {
  dayOffset: number;
  Template: React.ComponentType<{ name?: string; audienceType: AudienceType }>;
  subject: string;
}

const SEQUENCES: Record<AudienceType, SequenceEmail[]> = {
  waitlist: [
    { dayOffset: 0, Template: WelcomeEmail, subject: 'Welcome to Grove 🌿' },
    { dayOffset: 7, Template: Day7Email, subject: 'What we\'re building' },
    { dayOffset: 14, Template: Day14Email, subject: 'Why Grove exists' },
    { dayOffset: 30, Template: Day30Email, subject: 'A quick check-in' },
  ],
  trial: [
    { dayOffset: 0, Template: WelcomeEmail, subject: 'You planted something 🌱' },
    { dayOffset: 1, Template: Day1Email, subject: 'Quick tip: your first post' },
    { dayOffset: 7, Template: Day7Email, subject: 'Have you tried...?' },
    { dayOffset: 14, Template: Day14Email, subject: 'Something special for you' },
    { dayOffset: 30, Template: Day30Email, subject: 'Last chance to take root' },
  ],
  rooted: [
    { dayOffset: 0, Template: WelcomeEmail, subject: 'Welcome home 🏡' },
    { dayOffset: 1, Template: Day1Email, subject: 'Getting started guide' },
    { dayOffset: 7, Template: Day7Email, subject: 'Feature spotlight' },
    // No day 14/30 for rooted - they get ongoing updates instead
  ],
};

export async function scheduleWelcomeSequence(
  email: string,
  name: string | null,
  audienceType: AudienceType
): Promise<void> {
  const sequence = SEQUENCES[audienceType];
  const now = new Date();

  for (const { dayOffset, Template, subject } of sequence) {
    const scheduledAt = dayOffset === 0
      ? undefined  // Send immediately
      : addDays(now, dayOffset).toISOString();

    const html = await render(
      <Template name={name ?? undefined} audienceType={audienceType} />
    );

    await resend.emails.send({
      from: 'Autumn <autumn@grove.place>',
      to: email,
      subject,
      html,
      scheduledAt,
    });
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

### Weekly Catch-up Cron

A lightweight worker that runs weekly to handle edge cases:

```typescript
// workers/email-catchup/worker.ts

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    console.log('Email catch-up cron running...');

    // 1. Find users who should have received emails but didn't
    const overdue = await findOverdueEmails(env.DB);

    for (const user of overdue) {
      try {
        await sendMissedEmail(user, env);
        console.log(`Sent catch-up email to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send catch-up to ${user.email}:`, error);
      }
    }

    // 2. Sync unsubscribes from Resend back to D1
    await syncUnsubscribes(env);

    // 3. Clean up completed sequences
    await markCompletedSequences(env.DB);
  }
};

async function findOverdueEmails(db: D1Database): Promise<User[]> {
  const now = new Date();

  // Find users who:
  // - Have a sequence_stage that should have advanced by now
  // - Haven't received an email in the expected window
  const result = await db.prepare(`
    SELECT * FROM email_signups
    WHERE sequence_stage >= 0
    AND sequence_stage < 30
    AND (
      (sequence_stage = 0 AND last_email_at IS NULL) OR
      (sequence_stage = 0 AND datetime(last_email_at, '+1 day') < datetime('now')) OR
      (sequence_stage = 1 AND datetime(last_email_at, '+6 days') < datetime('now')) OR
      (sequence_stage = 7 AND datetime(last_email_at, '+7 days') < datetime('now')) OR
      (sequence_stage = 14 AND datetime(last_email_at, '+16 days') < datetime('now'))
    )
    LIMIT 100
  `).all();

  return result.results as User[];
}
```

### Wrangler Config for Catch-up Worker

```toml
# workers/email-catchup/wrangler.toml
name = "grove-email-catchup"
main = "worker.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 10 * * 0"]  # Weekly on Sunday at 10:00 AM UTC

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
```

---

## Broadcast CLI Updates

Update the existing `scripts/email/broadcast.ts` to use React Email:

```typescript
// scripts/email/broadcast.ts (additions)

import { render } from '@react-email/render';
import { GroveEmail } from '../packages/engine/src/lib/email/components';

async function cmdCreate(options: {
  subject: string;
  body: string;
  name?: string;
  from?: string;
  template?: 'patch-notes' | 'announcement' | 'custom';
}) {
  let html: string;
  let text: string;

  if (options.template === 'patch-notes') {
    // Use PatchNotesEmail template
    const { PatchNotesEmail } = await import('../packages/engine/src/lib/email/updates');
    html = await render(<PatchNotesEmail content={options.body} />);
  } else {
    // Custom content wrapped in GroveEmail
    html = await render(
      <GroveEmail>
        <div dangerouslySetInnerHTML={{ __html: options.body }} />
      </GroveEmail>
    );
  }

  text = htmlToPlainText(html);

  // ... rest of create logic
}
```

---

## New Animal Skill: Hummingbird

Create `.claude/skills/hummingbird-compose.md`:

```markdown
# Hummingbird Compose 🐦

The hummingbird hovers with precision, darting between flowers to craft the perfect message. Quick, colorful, and always in motion—it transforms ideas into beautiful emails that sing.

## When to Activate

- User asks to create or write an email
- User says "compose a broadcast" or "write an update"
- User calls `/hummingbird-compose`
- Creating newsletters, patch notes, or announcements

## The Flight

```
HOVER → GATHER → ARRANGE → PREVIEW → SEND
  ↓        ↓         ↓          ↓        ↓
Understand  Collect   Build      Show    Schedule
the goal   content   email      draft    or send
```

### Phase 1: HOVER

*The hummingbird hovers, assessing the garden...*

Understand what kind of email we're creating:
- **Sequence email** — Part of automated Day 0/1/7/14/30 series
- **One-time broadcast** — Announcement to all contacts
- **Patch notes** — Feature update for Rooted users
- **Custom** — Something specific

Ask clarifying questions using AskUserQuestion.

### Phase 2: GATHER

*Darting between flowers, collecting nectar...*

Gather the content:
- What's the main message?
- Who's the audience? (waitlist, trial, rooted, all)
- Any specific CTAs or links?
- Tone: excited, informative, casual, urgent?

### Phase 3: ARRANGE

*Wings humming, arranging petals into patterns...*

Draft the email:
- Write subject line (concise, Grove voice)
- Write preview text (first 100 chars)
- Write body content (warm, personal, not corporate)
- Select appropriate template

### Phase 4: PREVIEW

*Hovering back to admire the arrangement...*

Show the user:
- Rendered HTML preview (use `email dev` if available)
- Plain text fallback
- Recipient count (if broadcast)

### Phase 5: SEND

*A final dart, delivering the nectar...*

Options:
- Send immediately
- Schedule for specific time
- Save as draft
- Export HTML for manual sending

## Grove Voice Guidelines

- Warm, not corporate
- Personal, from Autumn
- Queer-friendly, safe
- Never use "Hey there!" or generic greetings
- Never use "I hope this email finds you well"
- Do use "Wanderer" for users, "Rooted" for subscribers
- Sign off with "— Autumn"
```

---

## Files to Delete

After migration is verified working:

```
packages/landing/workers/onboarding-emails/
├── worker.ts          # DELETE
├── wrangler.toml      # DELETE
└── package.json       # DELETE (if exists)

packages/landing/src/lib/email/
├── templates.ts       # DELETE (replaced by React Email)
└── send.ts           # KEEP (or consolidate into engine)

packages/landing/migrations/
├── 0003_onboarding_emails.sql  # KEEP for reference, flag as legacy
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)

1. [ ] Install React Email dependencies in `packages/engine`
2. [ ] Create `packages/engine/src/lib/email/` directory structure
3. [ ] Build Grove design system components
   - [ ] GroveEmail.tsx (base wrapper)
   - [ ] GroveHeader.tsx
   - [ ] GroveFooter.tsx (with unsubscribe link)
   - [ ] GroveButton.tsx
4. [ ] Create one template (WelcomeEmail) as proof of concept
5. [ ] Test with `email dev` preview server
6. [ ] Export from engine package.json

### Phase 2: Database Migration (Day 2-3)

1. [ ] Create migration file for new columns
2. [ ] Run migration on production D1
3. [ ] Migrate existing tracking data
4. [ ] Verify data integrity

### Phase 3: Sequence Templates (Day 3-4)

1. [ ] Build all sequence emails:
   - [ ] WelcomeEmail (3 variants by audience)
   - [ ] Day1Email
   - [ ] Day7Email
   - [ ] Day14Email
   - [ ] Day30Email
2. [ ] Write email copy (Grove voice, warm, personal)
3. [ ] Test all templates render correctly

### Phase 4: Scheduling Integration (Day 4-5)

1. [ ] Implement `scheduleWelcomeSequence()` function
2. [ ] Integrate with landing page signup flow
3. [ ] Integrate with Plant signup flow
4. [ ] Test scheduling works with Resend

### Phase 5: Catch-up Cron (Day 5-6)

1. [ ] Create `workers/email-catchup/` worker
2. [ ] Implement overdue email detection
3. [ ] Implement unsubscribe sync
4. [ ] Deploy and test cron trigger

### Phase 6: CLI & Skill (Day 6-7)

1. [ ] Update `scripts/email/broadcast.ts` for React Email
2. [ ] Create `hummingbird-compose` skill
3. [ ] Test full email creation workflow

### Phase 7: Cleanup (Day 7)

1. [ ] Delete old landing page worker
2. [ ] Delete old template files
3. [ ] Update documentation
4. [ ] Close issue #453

---

## Design System Colors

From existing Grove theme:

```typescript
const GROVE_COLORS = {
  // Backgrounds
  warmCream: '#fefdfb',      // body background
  softGreen: '#f0fdf4',      // content card background

  // Text
  barkBrown: '#3d2914',      // primary text

  // Accent
  groveGreen: '#16a34a',     // buttons, links, highlights

  // Opacity variants
  textMuted: 'rgba(61, 41, 20, 0.5)',   // signature, tagline
  textSubtle: 'rgba(61, 41, 20, 0.3)',  // footer links
};
```

---

## Testing Checklist

- [ ] WelcomeEmail renders correctly for all 3 audience types
- [ ] All sequence emails have mobile-responsive layouts
- [ ] `{{{RESEND_UNSUBSCRIBE_URL}}}` is properly replaced by Resend
- [ ] Scheduled emails arrive at correct times
- [ ] Catch-up cron finds and sends overdue emails
- [ ] Unsubscribe sync deletes users from D1
- [ ] Broadcast CLI works with React Email templates
- [ ] Preview server shows all templates

---

## Success Metrics

After implementation:

1. **Email open rates** — Should improve with better design
2. **Unsubscribe rates** — Should decrease with relevant segmentation
3. **Time to create broadcast** — Should be <5 minutes with hummingbird skill
4. **Sequence completion** — Track how many users complete full sequence
5. **Conversion (trial → rooted)** — Measure impact of trial email sequence

---

## References

- [React Email Documentation](https://react.email/docs)
- [Resend Scheduled Sending](https://resend.com/docs/api-reference/emails/send-email#scheduled-at)
- [Existing broadcast CLI](../../../scripts/email/broadcast.ts)
- [Existing email templates](../../../scripts/email/lib/templates.ts)
- Issue #453: https://github.com/AutumnsGrove/GroveEngine/issues/453

---

*This plan is ready for implementation. Sound the drum for gathering-feature when ready to begin.*
