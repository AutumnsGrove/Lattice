---
date created: Tuesday, November 26th 2025
date modified: Tuesday, November 26th 2025
tags:
type: guide
---

# Customer Setup Guide

Step-by-step guide for onboarding a new customer to the Grove platform.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Access to the GroveEngine team's Cloudflare account
- [ ] Access to the customer repo template
- [ ] Customer's desired subdomain or custom domain
- [ ] Customer's email address for admin account
- [ ] Resend API key configured

---

## Step 1: Create Repository from Template

### Using GitHub Template

```bash
# Option 1: GitHub CLI
gh repo create customer-blog --template AutumnsGrove/grove-customer-template --private

# Option 2: GitHub UI
# 1. Go to github.com/AutumnsGrove/grove-customer-template
# 2. Click "Use this template" > "Create a new repository"
# 3. Name: customer-blog (or customer-specific name)
# 4. Visibility: Private
```

### Clone Locally

```bash
git clone git@github.com:AutumnsGrove/customer-blog.git
cd customer-blog
```

---

## Step 2: Configure Cloudflare Resources

### 2.1 Create D1 Database

```bash
# Create the database
wrangler d1 create grove-blog-customer

# Output will include database_id - save this!
# Example: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2.2 Create KV Namespace

```bash
# Create KV namespace for sessions and cache
wrangler kv namespace create "grove-kv-customer"

# Output will include namespace_id - save this!
# Example: id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 2.3 Create R2 Bucket

```bash
# Create R2 bucket for media storage
wrangler r2 bucket create grove-assets-customer
```

### 2.4 Update wrangler.jsonc

Update the configuration file with the resource IDs:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/cloudflare/workers-sdk/main/packages/wrangler/schemas/config/config.schema.json",
  "name": "customer-blog",
  "compatibility_date": "2024-11-26",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".svelte-kit/cloudflare",

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "grove-blog-customer",
      "database_id": "YOUR-D1-DATABASE-ID-HERE"
    }
  ],

  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR-KV-NAMESPACE-ID-HERE"
    }
  ],

  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "grove-assets-customer"
    }
  ],

  "vars": {
    "PUBLIC_SITE_URL": "https://customer.grove.place"
  }
}
```

---

## Step 3: Run Database Migrations

### Copy Migrations from Engine

```bash
# Ensure @groveengine/core is installed
pnpm install

# Copy migrations to local directory
mkdir -p migrations
cp node_modules/@groveengine/core/migrations/*.sql migrations/
```

### Apply Migrations

```bash
# Apply to local development database
wrangler d1 migrations apply grove-blog-customer --local

# Apply to production database
wrangler d1 migrations apply grove-blog-customer
```

### Verify Tables

```bash
# Check tables were created
wrangler d1 execute grove-blog-customer --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected output:
```
┌─────────────┐
│ name        │
├─────────────┤
│ users       │
│ posts       │
│ sessions    │
│ site_config │
│ tags        │
│ post_tags   │
│ media       │
└─────────────┘
```

---

## Step 4: Configure Site Settings

### Update config/site.json

```json
{
  "name": "Customer's Blog",
  "description": "A personal blog about...",
  "tagline": "Thoughts and ideas",
  "domain": "customer.grove.place",
  "language": "en",
  "timezone": "America/New_York",

  "theme": {
    "name": "default",
    "colors": {
      "primary": "#4f46e5",
      "secondary": "#10b981"
    }
  },

  "features": {
    "comments": false,
    "newsletter": false,
    "rss": true,
    "search": true,
    "tableOfContents": true
  },

  "posts": {
    "perPage": 10,
    "showExcerpts": true,
    "showReadingTime": true
  },

  "social": {
    "twitter": "",
    "github": "",
    "email": "customer@example.com"
  },

  "owner": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "bio": "Blog owner bio goes here."
  }
}
```

---

## Step 5: Set Up Secrets

### Resend API Key

```bash
# Set the Resend API key for magic code emails
wrangler secret put RESEND_API_KEY
# Enter the API key when prompted
```

---

## Step 6: Configure Custom Domain (Optional)

### For grove.place Subdomain

1. In Cloudflare Dashboard:
   - Go to Pages > customer-blog > Custom domains
   - Add `customer.grove.place`
   - DNS will be configured automatically (same zone)

### For Custom Domain

1. Customer updates their DNS:
   ```
   CNAME www -> customer-blog.pages.dev
   ```
   Or if using Cloudflare DNS, configure there.

2. In Cloudflare Dashboard:
   - Go to Pages > customer-blog > Custom domains
   - Add `www.customerdomain.com`
   - Verify ownership

3. Update `wrangler.jsonc`:
   ```jsonc
   {
     "vars": {
       "PUBLIC_SITE_URL": "https://www.customerdomain.com"
     }
   }
   ```

4. Update `config/site.json`:
   ```json
   {
     "domain": "www.customerdomain.com"
   }
   ```

---

## Step 7: Configure Renovate

### Verify renovate.json

Ensure the file exists with proper configuration:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchPackageNames": ["@groveengine/core"],
      "automerge": true,
      "automergeType": "pr",
      "schedule": ["at any time"],
      "prPriority": 10
    },
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

### Enable Renovate App

1. Go to https://github.com/apps/renovate
2. Install on the customer repository
3. Grant access to the specific repo

---

## Step 8: Set Up GitHub Actions

### Configure Secrets

In GitHub repository settings > Secrets and variables > Actions:

```
CLOUDFLARE_API_TOKEN  = <API token with Pages edit permissions>
CLOUDFLARE_ACCOUNT_ID = <Account ID from Cloudflare dashboard>
```

### Verify Workflow

Check `.github/workflows/deploy.yml` exists and is properly configured.

---

## Step 9: Initial Deployment

### Push Configuration

```bash
git add .
git commit -m "Configure customer site: customer.grove.place"
git push origin main
```

### Verify Deployment

1. Check GitHub Actions for successful build
2. Check Cloudflare Pages for deployment status
3. Visit the site URL to confirm it loads

---

## Step 10: Create Admin User

### Via D1 Console

```bash
# Generate a UUID for the user
USER_ID=$(uuidgen)

# Insert admin user
wrangler d1 execute grove-blog-customer --command "
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES ('$USER_ID', 'customer@example.com', 'Customer Name', 'admin', unixepoch(), unixepoch());
"
```

### Verify User Created

```bash
wrangler d1 execute grove-blog-customer --command "SELECT * FROM users;"
```

---

## Step 11: Customer Handoff

### Send Welcome Email

Include the following information:

1. **Site URL:** https://customer.grove.place
2. **Admin URL:** https://customer.grove.place/admin
3. **Login Instructions:**
   - Go to /login
   - Enter your email address
   - Check email for 6-digit code
   - Enter code to log in

### Documentation Links

- Admin Panel Guide: [link]
- Writing Posts: [link]
- Uploading Images: [link]
- Getting Help: [link]

### Schedule Onboarding Call (Optional)

- Walk through admin panel
- Create first post together
- Answer questions
- Set expectations for support

---

## Checklist Summary

### Pre-Setup
- [ ] Customer info collected (name, email, domain preference)
- [ ] Cloudflare access confirmed

### Infrastructure
- [ ] Repository created from template
- [ ] D1 database created
- [ ] KV namespace created
- [ ] R2 bucket created
- [ ] wrangler.jsonc configured

### Configuration
- [ ] Migrations applied
- [ ] site.json configured
- [ ] Resend API key set
- [ ] Domain configured (subdomain or custom)

### Automation
- [ ] Renovate enabled
- [ ] GitHub secrets configured
- [ ] CI/CD workflow verified

### Launch
- [ ] Initial deployment successful
- [ ] Site loads correctly
- [ ] Admin user created
- [ ] Customer can log in

### Handoff
- [ ] Welcome email sent
- [ ] Documentation shared
- [ ] Onboarding call scheduled (if applicable)

---

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs
2. Verify pnpm-lock.yaml is committed
3. Ensure @groveengine/core version is published

### Can't Log In

1. Verify admin user exists in database
2. Check Resend API key is set correctly
3. Verify email address matches exactly

### Site Returns 500 Error

1. Check Cloudflare Pages logs
2. Verify all bindings are configured
3. Ensure migrations are applied

### Images Not Uploading

1. Verify R2 bucket exists
2. Check STORAGE binding in wrangler.jsonc
3. Verify bucket permissions

---

## Time Estimate

| Task | Time |
|------|------|
| Create repo & Cloudflare resources | 15 min |
| Configure & apply migrations | 10 min |
| Set up domain & secrets | 10 min |
| Configure Renovate & CI/CD | 5 min |
| Initial deployment & verification | 10 min |
| Create admin user | 5 min |
| **Total** | **~55 min** |

---

*Last Updated: November 2025*
