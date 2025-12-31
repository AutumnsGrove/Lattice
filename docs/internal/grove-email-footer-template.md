# Grove Email Footer Template

*Created: December 31, 2025*

---

## Overview

This footer goes at the bottom of all Grove-related emails. It's the quiet signature — consistent, warm, and honest.

---

## Footer Layout

```
[Grove logo - summer, 16px]

A place to be.

grove.place · step away (unsubscribe)
```

---

## Specifications

| Element | Details |
|---------|---------|
| **Logo** | Grove summer logo, 16px height |
| **Tagline** | "A place to be." (matches landing page) |
| **Site link** | grove.place → https://grove.place |
| **Unsubscribe** | "step away (unsubscribe)" — one link, whole phrase |
| **Separator** | · (middle dot) between links |

---

## Styling Notes

- Keep it minimal and centered
- Muted text color (not bold, not attention-grabbing)
- The footer should feel like a quiet closing, not a call to action
- Logo should be crisp at 16px — use the simplified version if needed

---

## Example (Markdown for email)

```markdown
---

![Grove](https://grove.place/logo-summer-16.png)

*A place to be.*

[grove.place](https://grove.place) · [step away (unsubscribe)]({{unsubscribe_url}})
```

---

## Assets

Logo files are in `docs/internal/email-assets/`:
- `logo-summer.svg` (source)
- `logo-summer-16.png`
- `logo-summer-24.png`
- `logo-summer-32.png`

---

## Voice Notes

- "A place to be." — calm, inviting, already established on the landing page
- "step away (unsubscribe)" — soft but clear, no manipulation, respects the reader's choice
- The footer shouldn't try to sell anything — it just says "this is Grove, here's the door if you need it"

---

*This footer is the last thing they read. Make it feel like home.*
