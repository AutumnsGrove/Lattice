#!/bin/bash
# Grove Domain Tool - Cloudflare Worker Deployment Commands
#
# Run these commands from the worker/ directory after logging in with `wrangler login`
#
# Prerequisites:
#   - Node.js installed
#   - Wrangler CLI: npm install -g wrangler
#   - Logged in: wrangler login
#   - API keys ready: ANTHROPIC_API_KEY, RESEND_API_KEY (optional), KIMI_API_KEY (optional)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "Grove Domain Tool - Worker Deployment"
echo "========================================"
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install

# Step 2: Generate TypeScript types (optional but recommended)
echo ""
echo "Step 2: Generating types..."
npx wrangler types || echo "Types generation skipped (non-critical)"

# Step 3: Set secrets
echo ""
echo "Step 3: Setting secrets..."
echo ""
echo "Enter your ANTHROPIC_API_KEY (required for Claude AI):"
npx wrangler secret put ANTHROPIC_API_KEY

echo ""
echo "Enter your RESEND_API_KEY (optional, for email sending):"
echo "(Press Ctrl+C to skip, or enter the key)"
npx wrangler secret put RESEND_API_KEY || echo "Skipped RESEND_API_KEY"

echo ""
echo "Enter your KIMI_API_KEY (optional, for Kimi K2 parallel provider):"
echo "(Press Ctrl+C to skip, or enter the key)"
npx wrangler secret put KIMI_API_KEY || echo "Skipped KIMI_API_KEY"

# Step 4: Deploy to development environment
echo ""
echo "Step 4: Deploying to development..."
npx wrangler deploy --env dev

# Step 5: Test the deployment
echo ""
echo "Step 5: Testing deployment..."
WORKER_URL=$(npx wrangler whoami 2>/dev/null | grep -oP 'subdomain: \K[^)]+' || echo "YOUR_SUBDOMAIN")
echo ""
echo "Health check URL: https://grove-domain-tool-dev.${WORKER_URL}.workers.dev/health"
echo ""
echo "Run this to test:"
echo "  curl https://grove-domain-tool-dev.${WORKER_URL}.workers.dev/health"

echo ""
echo "========================================"
echo "Development deployment complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Test the health endpoint"
echo "  2. When ready, deploy to production: npx wrangler deploy"
echo "  3. Monitor logs: npx wrangler tail"
echo ""
