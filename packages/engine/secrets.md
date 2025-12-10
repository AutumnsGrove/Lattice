# Required Secrets for GroveEngine

This document lists all secrets that need to be configured via Cloudflare Wrangler.

## Setting Secrets

Use the following command to set each secret:

```bash
npx wrangler secret put SECRET_NAME
```

You'll be prompted to enter the value securely.

---

## Required Secrets

### SESSION_SECRET
**Purpose:** Signs JWT tokens for authentication sessions
**Generate:** `openssl rand -hex 32`
```bash
npx wrangler secret put SESSION_SECRET
```

### ALLOWED_ADMIN_EMAILS
**Purpose:** Comma-separated list of emails allowed to access admin panel
**Example:** `admin@example.com,owner@example.com`
```bash
npx wrangler secret put ALLOWED_ADMIN_EMAILS
```

### RESEND_API_KEY
**Purpose:** API key for Resend email service (magic code authentication)
**Get from:** https://resend.com
```bash
npx wrangler secret put RESEND_API_KEY
```

### ANTHROPIC_API_KEY
**Purpose:** API key for Claude AI vision analysis (smart image naming, descriptions, alt text)
**Get from:** https://console.anthropic.com/
**Required for:** CDN image AI analysis feature
```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

---

## Verification

After setting secrets, verify they're configured:

```bash
npx wrangler secret list
```

You should see all secrets listed (values are hidden).
