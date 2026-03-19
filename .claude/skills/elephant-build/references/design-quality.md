# Elephant Build — Design Quality Reference

> Loaded during Phase 3 (BUILD) when creating UI components. This prevents "AI-looking" output.
> The Chameleon has a copy of this reference too. Both builders must follow it.

---

## The Core Rule

**If it could be any website, it's not Grove.** Every component, every string, every state should feel like it belongs in a midnight tea shop run by someone who actually cares.

---

## The 8 Component States

When you build ANY interactive component, design ALL of these — not just the happy path:

| State | What To Build | Grove Feel |
|-------|--------------|------------|
| **Default** | The normal resting state | Warm, inviting, clear purpose |
| **Hover** | Mouse enters the element | Gentle lift or glow — like a candle flickering in response |
| **Active/Pressed** | The click moment | Satisfying press — a door opening, not a button clicking |
| **Focus** | Keyboard navigation highlight | Clear, visible, warm ring — accessibility IS the vibe |
| **Disabled** | Can't interact right now | Muted but still warm — dimmed, not dead |
| **Loading** | Waiting for data | Skeleton screens with subtle shimmer, NOT a spinner. Breathing, not spinning. |
| **Error** | Something went wrong | Warm concern, not alarm. Helpful, not blaming. |
| **Empty** | Nothing here yet | Inviting emptiness — "this space is waiting for you" not "no data" |

**Anti-patterns:**
- ❌ Only building default + hover
- ❌ Browser-default focus rings (ugly blue outline)
- ❌ Spinners instead of skeleton screens
- ❌ Generic "An error occurred" messages
- ❌ Blank white space for empty states

---

## Microcopy: Every String Has A Voice

**The single biggest tell that AI built something is generic copy.** Replace EVERY default string.

### Error Messages

```
❌ "Invalid email address"
✅ "That email doesn't look quite right — mind double-checking?"

❌ "Required field"
✅ "We need this one to continue"

❌ "An error occurred. Please try again."
✅ "Something went sideways. Give it another try, or let us know if it keeps happening."

❌ "403 Forbidden"
✅ "This part of the grove is private — you'll need an invite to visit."

❌ "404 Not Found"
✅ "You've wandered off the trail. The path you're looking for isn't here — but the grove has plenty to explore."
```

### Empty States

```
❌ "No items found"
✅ "Nothing here yet — this space is waiting for your first creation."

❌ "No results"
✅ "The search came up empty. Try different words?"

❌ "Your inbox is empty"
✅ "All clear. Enjoy the quiet."

❌ "No posts yet"
✅ "The first page is blank. That's the best kind."
```

### Loading States

```
❌ "Loading..."
✅ "Gathering the leaves..." / "One moment..." / just a skeleton screen with no text

❌ Spinner GIF
✅ Skeleton screen that matches the layout shape, with a gentle shimmer
```

### Success Messages

```
❌ "Saved successfully"
✅ "Saved." (simple is fine — don't over-celebrate)

❌ "Your account has been created!"
✅ "Welcome to the grove."

❌ "Operation completed"
✅ "Done." or something specific: "Your post is live."
```

### Button Labels

```
❌ "Submit"
✅ "Save changes" / "Create post" / "Send message" — say WHAT it does

❌ "Click here"
✅ Never. Just never.

❌ "OK" / "Cancel"
✅ "Keep editing" / "Discard changes" — say what each MEANS
```

---

## Spacing: The 4px Grid

ALL spacing must be on the 4px grid. No arbitrary values.

```
4px   — tight (icon padding)
8px   — compact (between related items)
12px  — cozy (form field gaps)
16px  — standard (section padding)
24px  — comfortable (between groups)
32px  — spacious (between sections)
48px  — roomy (major section breaks)
64px  — grand (page-level spacing)
```

**Use Tailwind classes:** `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px), `p-16` (64px).

**Anti-patterns:**
- ❌ `p-5` (20px — not on the grid)
- ❌ `p-7` (28px — not on the grid)
- ❌ Inconsistent spacing between similar elements
- ❌ No breathing room between sections

---

## Typography: The Scale

Stick to these sizes. No arbitrary values.

```
text-xs   (12px) — fine print, captions
text-sm   (14px) — secondary text, labels
text-base (16px) — body text (the default)
text-lg   (18px) — emphasized body, lead text
text-xl   (20px) — small headings, card titles
text-2xl  (24px) — section headings
text-3xl  (30px) — page headings
text-4xl  (36px) — hero headings
```

**Line heights:** Body text at 1.5-1.75 for readability. Headings at 1.1-1.3 for tightness.

**Anti-patterns:**
- ❌ Skipping heading levels (h1 → h3 with no h2)
- ❌ Using font-size in px instead of the scale
- ❌ Body text smaller than 16px (unreadable on mobile)
- ❌ Headings that look the same size as body text

---

## Color: Use The Tokens

NEVER use raw hex values. Always use Grove's CSS custom properties.

```css
/* ✅ Use tokens */
color: var(--color-text);
background: var(--color-surface);
border-color: var(--color-divider);
background: var(--grove-accent);        /* accent color */
background: var(--grove-accent-20);     /* accent at 20% opacity */

/* ❌ Never hardcode */
color: #333;
background: white;
border-color: #e5e5e5;
background: #22c55e;  /* user's accent might not be green! */
```

**Semantic color usage:**
| Token | Use For |
|-------|---------|
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary/helper text |
| `--color-surface` | Page/card backgrounds |
| `--color-divider` | Borders, separators |
| `--grove-accent` | Accent color (solid) — user-chosen, may not be green |
| `--grove-accent-dark` | Accent hover/pressed states |
| `--grove-accent-light` | Accent lightened variant |
| `--grove-accent-N` | Accent at N% opacity (stops: 5-80) |
| `--color-success` | Confirmations (NOT accent — always green) |
| `--color-error` | Errors (NOT random red) |
| `--color-warning` | Warnings (use sparingly) |

**Accent vs. brand green:** The `--grove-accent-*` scale is the user's chosen accent color. Brand greens (Grove logo, nature SVGs) stay as palette tokens. If a pre-commit hook flags brand green, suppress with `// accent-ok`.

---

## The "Does This Look AI-Generated?" Checklist

Before considering any UI work complete, run through this:

```
[ ] Does every interactive element have all 8 states? (not just default + hover)
[ ] Are ALL text strings written in Grove voice? (no "Submit", no "No items found")
[ ] Is spacing on the 4px grid? (no arbitrary padding/margins)
[ ] Are colors from tokens, not hardcoded hex?
[ ] Do empty states feel inviting, not blank?
[ ] Do error states feel helpful, not robotic?
[ ] Are loading states skeleton screens, not spinners?
[ ] Does the component use Glass/GlassCard where appropriate?
[ ] Is there visual hierarchy? (clear heading > subheading > body)
[ ] Would this feel warm at 2am with a cup of tea? (the Grove test)
```

---

## The Grove Test

When in doubt, ask: **"Would someone feel welcome writing here at midnight?"**

If the answer is "it's fine, I guess" — it's not Grove enough. Grove should feel like a place you WANT to be, not a tool you tolerate.

```
❌ Clean and professional → could be any SaaS
✅ Warm and intentional → this is someone's space

❌ Minimal → stripped bare, feels empty
✅ Spacious → breathing room that invites lingering

❌ Modern → follows trends, looks like everything else
✅ Handcrafted → you can feel a person made this
```
