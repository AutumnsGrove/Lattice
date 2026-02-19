#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Grove Dev Tunnel — Local Auth Testing via Cloudflare Tunnel
#
# Routes https://dev.grove.place → localhost:5173 so Google OAuth
# callbacks work during local development.
#
# Usage:
#   ./scripts/dev-tunnel.sh          Start the tunnel
#   ./scripts/dev-tunnel.sh setup    First-time setup (create tunnel + DNS)
#   ./scripts/dev-tunnel.sh status   Check tunnel status
#
# Prerequisites:
#   brew install cloudflared
#   cloudflared login                (one-time, authenticates with Cloudflare)
#
# See: docs/plans/local-auth-testing-tunnel.md
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

TUNNEL_NAME="grove-dev"
HOSTNAME="dev.grove.place"
LOCAL_PORT="${DEV_PORT:-5173}"
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config-grove-dev.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[tunnel]${NC} $1"; }
ok()    { echo -e "${GREEN}[tunnel]${NC} $1"; }
warn()  { echo -e "${YELLOW}[tunnel]${NC} $1"; }
err()   { echo -e "${RED}[tunnel]${NC} $1" >&2; }

check_deps() {
    if ! command -v cloudflared &> /dev/null; then
        err "cloudflared not found. Install with: brew install cloudflared"
        exit 1
    fi
}

get_tunnel_id() {
    cloudflared tunnel list --output json 2>/dev/null \
        | python3 -c "
import json, sys
tunnels = json.load(sys.stdin)
for t in tunnels:
    if t['name'] == '$TUNNEL_NAME':
        print(t['id'])
        sys.exit(0)
sys.exit(1)
" 2>/dev/null || echo ""
}

cmd_setup() {
    info "Setting up Grove dev tunnel..."

    # Check if tunnel already exists
    TUNNEL_ID=$(get_tunnel_id)
    if [ -n "$TUNNEL_ID" ]; then
        ok "Tunnel '$TUNNEL_NAME' already exists (ID: $TUNNEL_ID)"
    else
        info "Creating tunnel '$TUNNEL_NAME'..."
        cloudflared tunnel create "$TUNNEL_NAME"
        TUNNEL_ID=$(get_tunnel_id)
        if [ -z "$TUNNEL_ID" ]; then
            err "Failed to create tunnel"
            exit 1
        fi
        ok "Tunnel created (ID: $TUNNEL_ID)"
    fi

    # Write config file
    info "Writing config to $CONFIG_FILE..."
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$LOCAL_PORT
  - service: http_status:404
EOF
    ok "Config written"

    # Set up DNS
    info "Setting up DNS for $HOSTNAME..."
    cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME" 2>/dev/null \
        && ok "DNS route created: $HOSTNAME -> tunnel" \
        || warn "DNS route may already exist (this is fine)"

    echo ""
    ok "Setup complete! Next steps:"
    echo "  1. Copy .env.local.example to .env.local in apps/landing/"
    echo "     cp apps/landing/.env.local.example apps/landing/.env.local"
    echo "  2. Uncomment VITE_AUTH_API_URL in .env.local"
    echo "  3. Add https://dev.grove.place/api/auth/callback/google to Google Console"
    echo "  4. Run: ./scripts/dev-tunnel.sh"
}

cmd_status() {
    check_deps
    TUNNEL_ID=$(get_tunnel_id)
    if [ -n "$TUNNEL_ID" ]; then
        ok "Tunnel '$TUNNEL_NAME' exists (ID: $TUNNEL_ID)"
        info "Config: $CONFIG_FILE"
        info "Hostname: https://$HOSTNAME"
        info "Target: http://localhost:$LOCAL_PORT"
        if [ -f "$CONFIG_FILE" ]; then
            ok "Config file exists"
        else
            warn "Config file missing — run: ./scripts/dev-tunnel.sh setup"
        fi
    else
        warn "Tunnel '$TUNNEL_NAME' not found. Run: ./scripts/dev-tunnel.sh setup"
    fi
}

cmd_run() {
    check_deps

    TUNNEL_ID=$(get_tunnel_id)
    if [ -z "$TUNNEL_ID" ]; then
        err "Tunnel not found. Run setup first: ./scripts/dev-tunnel.sh setup"
        exit 1
    fi

    if [ ! -f "$CONFIG_FILE" ]; then
        err "Config not found at $CONFIG_FILE. Run setup first."
        exit 1
    fi

    echo ""
    info "Starting Grove dev tunnel..."
    info "  $HOSTNAME -> localhost:$LOCAL_PORT"
    echo ""
    warn "Make sure 'bun run dev' is running in apps/landing/"
    warn "Then visit https://$HOSTNAME in your browser"
    echo ""

    cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
}

# ── Main ──────────────────────────────────────────────────────────────

check_deps

case "${1:-run}" in
    setup)  cmd_setup ;;
    status) cmd_status ;;
    run)    cmd_run ;;
    *)
        echo "Usage: $0 [setup|status|run]"
        echo ""
        echo "  setup   First-time setup (create tunnel + DNS)"
        echo "  status  Check tunnel status"
        echo "  run     Start the tunnel (default)"
        exit 1
        ;;
esac
