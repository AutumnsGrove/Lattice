# Verification Code Email

**Trigger:** Login attempt (magic link authentication)
**Purpose:** Deliver 6-digit verification code
**Timing:** Immediate

---

## Subject Line

```
Your Grove login code
```

## Preview Text

```
Your code: {{code}} — expires in 5 minutes.
```

## Body

```markdown
# {{code}}

Enter this code to sign in to Grove.

This code expires in 5 minutes. If you didn't request this, you can safely ignore this email—no one can access your account without this code.

**Having trouble?** If the code isn't working (especially on mobile), try clicking this link instead:
{{magic_link}}

---

Signing in to: **{{blog_name}}**
{{blog_url}}/admin

—Grove
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{code}}` | 6-digit verification code | `847293` |
| `{{magic_link}}` | One-click sign-in link | `https://grove.place/auth/verify?token=abc123` |
| `{{blog_name}}` | Name of the blog | `Autumn's Grove` |
| `{{blog_url}}` | Full blog URL | `https://autumnsgrove.com` |

## Design Notes

- The code should be the largest, most prominent element
- Keep the email extremely short—this is a utility email
- No marketing, no fluff, just the code
- Include the blog URL so users know which account they're signing into (helpful for people with multiple blogs)
- **Security note:** Code removed from subject line to prevent exposure in notification previews. Shorter 5-minute expiration mitigates interception risk.
- Magic link fallback addresses mobile copy-paste issues common with 6-digit codes
