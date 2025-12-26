#!/bin/bash
# Wisp - Grove Writing Assistant Setup Script
# Run this with wrangler logged in to set up Wisp for production

set -e

echo "=================================="
echo "  Wisp Setup - Grove Writing Assistant"
echo "=================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler is not installed"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "Error: Not logged in to Cloudflare"
    echo "Run: wrangler login"
    exit 1
fi

echo "Logged in to Cloudflare:"
wrangler whoami
echo ""

# Get database name from user or use default
read -p "Enter D1 database name (default: grove-db): " DB_NAME
DB_NAME=${DB_NAME:-grove-db}

echo ""
echo "Step 1: Running database migration..."
echo "--------------------------------------"
wrangler d1 execute "$DB_NAME" --file=packages/engine/migrations/014_wisp.sql
echo "Migration complete!"

echo ""
echo "Step 2: Setting up secrets..."
echo "--------------------------------------"
echo "You'll be prompted to enter API keys securely."
echo ""

read -p "Set up Fireworks AI API key? (y/n): " SETUP_FIREWORKS
if [ "$SETUP_FIREWORKS" = "y" ] || [ "$SETUP_FIREWORKS" = "Y" ]; then
    echo "Enter your Fireworks AI API key:"
    wrangler secret put FIREWORKS_API_KEY
fi

read -p "Set up Cerebras API key (backup provider)? (y/n): " SETUP_CEREBRAS
if [ "$SETUP_CEREBRAS" = "y" ] || [ "$SETUP_CEREBRAS" = "Y" ]; then
    echo "Enter your Cerebras API key:"
    wrangler secret put CEREBRAS_API_KEY
fi

read -p "Set up Groq API key (tertiary provider)? (y/n): " SETUP_GROQ
if [ "$SETUP_GROQ" = "y" ] || [ "$SETUP_GROQ" = "Y" ]; then
    echo "Enter your Groq API key:"
    wrangler secret put GROQ_API_KEY
fi

echo ""
echo "Step 3: Adding default settings..."
echo "--------------------------------------"
wrangler d1 execute "$DB_NAME" --file=packages/engine/migrations/014_wisp_settings.sql
echo "Settings added!"

echo ""
echo "=================================="
echo "  Wisp Setup Complete!"
echo "=================================="
echo ""
echo "Wisp is now ready. To enable it:"
echo "1. Go to your admin settings page"
echo "2. Enable Wisp in the Writing Assistant section"
echo "3. Choose your preferred analysis mode (quick/thorough)"
echo ""
echo "Remember: Wisp is off by default - a helper, not a writer."
echo ""
