# Hummingbird Compose 🐦

The hummingbird hovers with precision, darting between flowers to craft the perfect message. Quick, colorful, and always in motion—it transforms ideas into beautiful emails that sing.

## When to Activate

- User asks to create or write an email
- User says "compose a broadcast" or "write an update"
- Creating newsletters, patch notes, or announcements
- User explicitly invokes `/hummingbird-compose`

---

## The Flight

```
HOVER → GATHER → ARRANGE → PREVIEW → SEND
  ↓        ↓         ↓          ↓        ↓
Understand  Collect   Build      Show    Schedule
the goal   content   email      draft    or send
```

---

## Phase 1: HOVER

*The hummingbird hovers, assessing the garden...*

Understand what kind of email we're creating:

| Type | Description | Template |
|------|-------------|----------|
| **Sequence** | Part of automated Day 0/1/7/14/30 series | WelcomeEmail, Day*Email |
| **Broadcast** | One-time announcement to all contacts | GroveEmail wrapper |
| **Patch Notes** | Feature update for Rooted users | PatchNotesEmail |
| **Custom** | Something specific | GroveEmail with custom content |

**Ask clarifying questions:**
- What's the main message?
- Who's the audience? (waitlist, trial, rooted, all)
- Any specific CTAs or links?
- Tone: excited, informative, casual, urgent?

---

## Phase 2: GATHER

*Darting between flowers, collecting nectar...*

Gather the content:

1. **Subject line** — Concise, compelling, emoji optional
2. **Preview text** — First 100 chars visible in inbox
3. **Main message** — 2-4 paragraphs, Grove voice
4. **CTA** — Clear call to action with URL
5. **Any highlights** — Tips, offers, special announcements

---

## Phase 3: ARRANGE

*Wings humming, arranging petals into patterns...*

Build the email using Grove components:

```tsx
import {
  GroveEmail,
  GroveHeading,
  GroveParagraph,
  GroveButton,
  GroveHighlight,
  GroveDivider,
} from '@autumnsgrove/groveengine/email/components';

export function MyEmail() {
  return (
    <GroveEmail previewText="Your preview text here">
      <GroveHeading>Your Heading 🌿</GroveHeading>
      <GroveParagraph>Your content...</GroveParagraph>
      <GroveButton href="https://grove.place">CTA Text</GroveButton>
    </GroveEmail>
  );
}
```

**Component Reference:**

| Component | Usage |
|-----------|-------|
| `GroveEmail` | Base wrapper with header/footer |
| `GroveHeading` | h1/h2/h3 headings |
| `GroveParagraph` | Body text (use `muted` for secondary) |
| `GroveButton` | CTA buttons (primary/secondary) |
| `GroveHighlight` | Callout boxes (info/tip/special) |
| `GroveDivider` | Section breaks (optional leaf) |
| `GroveList` | Bullet/check/arrow lists |
| `GrovePatchNote` | Feature update blocks |

---

## Phase 4: PREVIEW

*Hovering back to admire the arrangement...*

Render and show the user:

```typescript
import { render } from '@autumnsgrove/groveengine/email/render';

const { html, text } = await render(<MyEmail />, { plainText: true });
```

Options for preview:
- Show rendered HTML in browser (email:dev server)
- Display key elements: subject, preview, content summary
- Show recipient count (if broadcast)

---

## Phase 5: SEND

*A final dart, delivering the nectar...*

Options:
1. **Send immediately** — Via Resend API
2. **Schedule for later** — Use `scheduledAt` parameter
3. **Save as draft** — Store for later editing
4. **Export HTML** — For manual sending

```typescript
import { sendEmail } from '@autumnsgrove/groveengine/email/schedule';

await sendEmail({
  email: 'recipient@example.com',
  subject: 'Your Subject',
  html,
  text,
  resendApiKey: env.RESEND_API_KEY,
  scheduledAt: '2024-02-01T10:00:00Z', // optional
});
```

---

## Grove Voice Guidelines

### DO:
- Warm, personal, from Autumn
- Use "Wanderer" for users, "Rooted" for subscribers
- Sign off with "— Autumn"
- Keep it conversational and sincere
- Include subtle nature touches (🌿, 🌱, 🏡)

### DON'T:
- "Hey there!" or generic greetings
- "I hope this email finds you well"
- Corporate marketing speak
- Excessive exclamation points
- Pushy sales language

### Example Opening:
```
❌ "Hey there! We have some exciting news!"
✅ "A quiet update from the grove..."

❌ "Don't miss out on this amazing offer!"
✅ "I wanted you to know about something special..."

❌ "Dear valued customer,"
✅ "Hey [name]," or just start the content
```

---

## Quick Templates

### Announcement
```tsx
<GroveEmail previewText="Big news from the grove...">
  <GroveHeading>Something New 🌿</GroveHeading>
  <GroveParagraph>
    I wanted to share some news with you...
  </GroveParagraph>
  <GroveButton href="https://grove.place">Learn more</GroveButton>
</GroveEmail>
```

### Patch Notes
```tsx
import { PatchNotesEmail } from '@autumnsgrove/groveengine/email/updates';

<PatchNotesEmail
  version="v1.2.0"
  date="February 2024"
  notes={[
    { icon: "✨", title: "New Feature", description: "...", tag: "new" },
    { icon: "🔧", title: "Improvement", description: "...", tag: "improved" },
    { icon: "🐛", title: "Bug Fix", description: "...", tag: "fixed" },
  ]}
/>
```

### Special Offer
```tsx
<GroveEmail previewText="A little something for you...">
  <GroveHeading>A little something for you 🎁</GroveHeading>
  <GroveParagraph>
    As a thank you for being here...
  </GroveParagraph>
  <GroveHighlight variant="special" icon="🎁">
    <GroveParagraph>
      Use code WANDERER for 20% off...
    </GroveParagraph>
  </GroveHighlight>
  <GroveButton href="https://grove.place/pricing">See plans</GroveButton>
</GroveEmail>
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `packages/engine/src/lib/email/components/` | Design system |
| `packages/engine/src/lib/email/sequences/` | Automated sequences |
| `packages/engine/src/lib/email/updates/` | Patch notes |
| `packages/engine/src/lib/email/render.ts` | Rendering |
| `packages/engine/src/lib/email/schedule.ts` | Scheduling |
| `scripts/email/broadcast.ts` | CLI for broadcasts |

---

*The hummingbird's work is done. The message takes flight.* 🐦
