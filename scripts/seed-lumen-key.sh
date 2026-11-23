#!/usr/bin/env bash
#
# Fill in workers/lumen/.dev.vars for local development.
#
# The dev stack runs no Warden, and Lumen fails closed without a provider key, so
# a local Lumen cannot answer anything until this file exists. This script writes
# it from the OpenRouter key Pi already holds at ~/.pi/agent/auth.json, and leaves
# the value out of its own output.
#
# It writes to a gitignored file and changes nothing else. Re-running it is safe:
# an existing LUMEN_API_KEY is kept, and only the provider key is refreshed.
#
#   ./scripts/seed-lumen-key.sh            # from ~/.pi/agent/auth.json
#   ./scripts/seed-lumen-key.sh --print    # say where the key would come from

set -euo pipefail

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
log()  { echo "${GREEN}[lumen-key]${RESET} $1"; }
warn() { echo "${YELLOW}[lumen-key]${RESET} $1"; }
err()  { echo "${RED}[lumen-key]${RESET} $1" >&2; }

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEV_VARS="$REPO_ROOT/workers/lumen/.dev.vars"
EXAMPLE="$REPO_ROOT/workers/lumen/.dev.vars.example"
AUTH_JSON="${HOME}/.pi/agent/auth.json"

print_only=0
[ "${1:-}" = "--print" ] && print_only=1

if [ ! -f "$AUTH_JSON" ]; then
    err "No Pi credentials at $AUTH_JSON — set the key by hand in $DEV_VARS"
    exit 1
fi

read_key() {
    python3 - "$AUTH_JSON" <<'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
key = (data.get("openrouter") or {}).get("key")
if not key:
    sys.exit(1)
print(key)
PY
}

if ! provider_key=$(read_key); then
    err "No OpenRouter key under .openrouter.key in $AUTH_JSON"
    exit 1
fi

if [ "$print_only" -eq 1 ]; then
    log "Provider key found in $AUTH_JSON (${#provider_key} characters). Nothing written."
    exit 0
fi

if [ ! -f "$DEV_VARS" ]; then
    cp "$EXAMPLE" "$DEV_VARS"
    chmod 600 "$DEV_VARS"
    log "Created $DEV_VARS from the example."
fi

# LUMEN_API_KEY must exist, and it is what callers present. Generate one on first
# run; keep it afterwards so a restarted caller does not have to be reconfigured.
if ! grep -qE '^LUMEN_API_KEY=.+' "$DEV_VARS"; then
    new_key=$(openssl rand -hex 32)
    if grep -qE '^LUMEN_API_KEY=' "$DEV_VARS"; then
        python3 - "$DEV_VARS" "$new_key" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
lines = open(path).read().splitlines()
lines = [f"LUMEN_API_KEY={key}" if l.startswith("LUMEN_API_KEY=") else l for l in lines]
open(path, "w").write("\n".join(lines) + "\n")
PY
    else
        printf '\nLUMEN_API_KEY=%s\n' "$new_key" >> "$DEV_VARS"
    fi
    log "Generated a LUMEN_API_KEY for local callers."
fi

# Replace the provider key line, or add one if the example's was removed.
python3 - "$DEV_VARS" "$provider_key" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
lines = open(path).read().splitlines()
line = f"DEV_OPENROUTER_API_KEY={key}"
if any(l.startswith("DEV_OPENROUTER_API_KEY=") for l in lines):
    lines = [line if l.startswith("DEV_OPENROUTER_API_KEY=") else l for l in lines]
else:
    lines.append(line)
open(path, "w").write("\n".join(lines) + "\n")
PY
chmod 600 "$DEV_VARS"

warn "Wrote DEV_OPENROUTER_API_KEY to $DEV_VARS (gitignored, mode 600)."
log "Start the stack with ./scripts/dev-stack.sh and Lumen answers on 8788."
