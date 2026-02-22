---
title: "Curio: Webring"
status: planned
category: features
---

# Curio: Webring

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 7

---

**Character**: Retro web solidarity. The original social network — linking to your neighbors. Circular navigation between a group of sites that chose each other.

### Public component issues

- [ ] **Only renders "classic" style**: Data model has 4 styles (classic bar, 88x31 badge, compact, floating) — public ignores `badgeStyle`, always renders classic bar
- [ ] **Hardcoded `#4ade80` everywhere**: Nav buttons, borders, hover states — all raw green hex
- [ ] **No ring identity**: Just text. No ring icon, no member count, no "you are site 7 of 42"
- [ ] **Position field ignored**: Model has footer/header/sidebar/floating positions — component doesn't use them

---

### Webring Design Spec

#### Render all 4 display styles

| Style           | Look                            | Feel                                                                   |
| --------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Classic bar** | `← Prev \| Ring Name \| Next →` | The standard. Warm it up with grove colors, subtle glass backing.      |
| **88x31 badge** | Tiny rectangular button         | THE indie web format. Already in the data model! Just needs rendering. |
| **Compact**     | Text-only inline links          | Minimal footprint. For footers or sidebars where space is tight.       |
| **Floating**    | Fixed-position corner widget    | Always visible. A gentle "this site is part of something."             |

#### Ring identity

- Show ring icon/avatar if available
- Member count: "1 of 42 sites"
- Ring description on hover/expand
- Color theming per ring (owner can pick accent color per ring membership)

#### Grove palette

Replace all `#4ade80` with `rgb(var(--grove-500))`. Borders, hover states, text — everything through theme vars.

#### Position support

Actually USE the position field: footer (default), header, right-vine sidebar, floating corner. The component already has the data — just needs to render differently based on it.

### Admin

- [ ] (Good foundation — create/join rings, manage membership, ring settings)
- [ ] Add ring accent color picker
- [ ] Show position preview in admin
- [ ] Display style preview for all 4 options

---

### SAFARI DISCOVERY: Address Book & @Mentions

> **Not a webring feature — a NEW system.** Emerged from exploring webrings. Webrings = circular ring navigation. @mentions = direct person-to-person links. Separate but related.

#### The Address Book

A personal directory of your people. Not a social graph — an address book. Like the one by the phone, names written in pen.

**Data model:**

```
AddressBookEntry:
  handle: "autumn"              — what you type after @
  name: "Autumn"                — display name
  url: "https://autumn.grove.place"  — where it links
  groveUser: true/false         — auto-resolved or manually added
  avatar: url | null            — from Grove profile or manual
  publicBlurb: "my partner in crime"  — visible to visitors (optional)
  privateNote: "met in Portland, loves matcha"  — only owner sees
  tags: ["friend", "creator"]   — for filtering/display
```

**Key decisions:**

- **Visibility**: Optional — owner chooses to show address book as a curio ("My People") or keep it private (just powers @mentions)
- **Separate from blogroll**: Address book = people you KNOW. Blogroll = sites you RECOMMEND. Different relationships, different intent.
- **Dual resolution**: Grove usernames auto-resolve. Non-Grove friends added manually with name + URL.
- **Per-entry notes**: Public blurb (how you introduce someone to visitors) + private note (just for you). Owner chooses per entry.

#### @Mentions in Markdown

New markdown directive: `@autumn` → parsed by markdown-it → looks up handle in address book → renders warm link.

- Works in blog posts, pages, anywhere markdown is rendered
- If handle not in address book, renders as plain text (no broken links)
- Warm link styling — not a cold hyperlink, a MENTION. Maybe grove-green underline, subtle glow on hover.

#### Notifications

When a Grove user is @mentioned by another Grove user:

- Quiet internal notification: "Someone mentioned you warmly"
- Not pushy, not anxiety-inducing — a gentle tap on the shoulder
- No notification for non-Grove manual entries (they're external links)

#### Relationship to other curios

- **Blogroll**: Separate. Blogroll = recommendations. Address book = relationships. They can coexist.
- **Webring**: Separate. Webring = ring membership. Address book = personal connections. Different structures.
- **Badges**: Could earn "Connected" badge for having 10+ address book entries. Social butterfly of the grove.

---
