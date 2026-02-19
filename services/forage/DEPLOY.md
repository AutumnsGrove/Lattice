# Cloudflare Worker Deployment Guide

## Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed and authenticated (`wrangler login`)
3. API keys ready:
   - `ANTHROPIC_API_KEY` - For Claude AI
   - `RESEND_API_KEY` - For email sending (optional)
   - `KIMI_API_KEY` - For Kimi K2 (optional)

## Quick Start

Run all commands from the `worker/` directory.

```bash
cd worker
```

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Generate Types (Optional)

```bash
npx wrangler types
```

## Step 3: Set Secrets

These commands will prompt for the secret values:

```bash
# Required: Anthropic API key for Claude
npx wrangler secret put ANTHROPIC_API_KEY

# Optional: Resend API key for emails
npx wrangler secret put RESEND_API_KEY

# Optional: Kimi API key for parallel providers
npx wrangler secret put KIMI_API_KEY
```

## Step 4: Deploy to Development

```bash
npx wrangler deploy --env dev
```

## Step 5: Test the Deployment

```bash
# Health check
curl https://grove-domain-tool-dev.<your-subdomain>.workers.dev/health

# Start a search (example)
curl -X POST https://grove-domain-tool-dev.<your-subdomain>.workers.dev/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client",
    "quiz_responses": {
      "business_name": "Test Business",
      "tld_preferences": ["com", "io"],
      "vibe": "professional"
    }
  }'
```

## Step 6: Deploy to Production

```bash
npx wrangler deploy
```

## Local Development

Run the worker locally with:

```bash
npx wrangler dev
```

This starts a local server at `http://localhost:8787`.

## Monitoring

```bash
# View live logs
npx wrangler tail

# View logs for dev environment
npx wrangler tail --env dev
```

## Rollback

If something goes wrong:

```bash
# List deployments
npx wrangler deployments list

# Rollback to previous deployment
npx wrangler rollback
```

---

## All Commands in One Script

Save this as `deploy.sh` and run it:

```bash
#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Setting secrets (will prompt for values)..."
echo "Enter ANTHROPIC_API_KEY:"
npx wrangler secret put ANTHROPIC_API_KEY

echo "Enter RESEND_API_KEY (optional, press Enter to skip):"
read -s RESEND_KEY
if [ -n "$RESEND_KEY" ]; then
  echo "$RESEND_KEY" | npx wrangler secret put RESEND_API_KEY
fi

echo "Deploying to development..."
npx wrangler deploy --env dev

echo ""
echo "Development deployment complete!"
echo "Test with: curl https://grove-domain-tool-dev.<subdomain>.workers.dev/health"
echo ""
echo "When ready for production, run: npx wrangler deploy"
```

Make executable and run:

```bash
chmod +x deploy.sh
./deploy.sh
```
