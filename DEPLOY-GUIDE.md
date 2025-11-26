# Grove Landing Page - Deployment Guide

Everything is built. Follow these steps to go live.

---

## Step 1: Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) and create account
2. **Add Domain**: Settings → Domains → Add `grove.place`
3. **Add DNS Records**: Resend will show you 3 DNS records to add in Cloudflare:
   - Go to Cloudflare Dashboard → grove.place → DNS
   - Add the MX, TXT (SPF), and CNAME (DKIM) records Resend provides
4. Wait for verification (usually 5-15 min)
5. **Create API Key**: Settings → API Keys → Create
6. Save the key (starts with `re_`)

---

## Step 2: Create Database Table

Run this command from the `landing/` directory:

```bash
cd landing
wrangler d1 execute grove-engine-db --remote --file=src/lib/db/schema.sql
```

---

## Step 3: Create Cloudflare Pages Project

```bash
cd landing
pnpm install
pnpm run build
wrangler pages project create grove-landing
```

When prompted:
- Production branch: `main`

---

## Step 4: Bind D1 Database to Pages

In Cloudflare Dashboard:
1. Go to **Workers & Pages** → **grove-landing**
2. **Settings** → **Bindings** → **Add**
3. Select **D1 Database**
   - Variable name: `DB`
   - Database: `grove-engine-db`
4. Click **Save**

---

## Step 5: Add Resend API Key

```bash
cd landing
wrangler pages secret put RESEND_API_KEY
```

Paste your Resend API key when prompted.

---

## Step 6: Add Custom Domain

In Cloudflare Dashboard:
1. Go to **Workers & Pages** → **grove-landing**
2. **Custom domains** → **Set up a custom domain**
3. Enter: `grove.place`
4. Click **Activate domain**

---

## Step 7: Set Up GitHub Auto-Deploy

### Add GitHub Secrets

In your GitHub repo → Settings → Secrets → Actions:

| Secret Name | Value |
|------------|-------|
| `CLOUDFLARE_API_TOKEN` | Create at: CF Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | `04e847fa7655624e84414a8280b3a4d0` |

### Deploy Workflow

The workflow at `.github/workflows/deploy-landing.yml` will auto-deploy on push to `main` when files in `landing/` change.

---

## Step 8: First Deploy

```bash
cd landing
pnpm run deploy
```

Or just push to `main` and GitHub Actions will deploy.

---

## Verify

1. Visit [grove.place](https://grove.place)
2. Enter an email and submit
3. Check your inbox for the welcome email

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Landing code | `landing/` |
| Database schema | `landing/src/lib/db/schema.sql` |
| Email templates | `landing/src/lib/email/templates.ts` |
| Deploy workflow | `.github/workflows/deploy-landing.yml` |

---

## Troubleshooting

**"D1 database not available"**: D1 binding not configured. Check Step 4.

**Emails not sending**: Check Resend dashboard for errors. Verify domain is verified.

**404 on grove.place**: Custom domain not activated or DNS not propagated. Wait 5 min.
