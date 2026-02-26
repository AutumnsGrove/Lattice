#!/bin/bash
set -euo pipefail

# ─── SSH Key Injection ───────────────────────────────────────
if [ -n "${SSH_AUTHORIZED_KEY:-}" ]; then
    mkdir -p /home/grove/.ssh
    echo "$SSH_AUTHORIZED_KEY" > /home/grove/.ssh/authorized_keys
    chmod 700 /home/grove/.ssh
    chmod 600 /home/grove/.ssh/authorized_keys
    chown -R grove:grove /home/grove/.ssh
    echo "[loft] SSH key injected"
else
    echo "[loft] No SSH key provided — SSH auth disabled"
fi

# ─── Workspace Hydration ────────────────────────────────────
# If workspace state was hydrated by Firefly, restore it here
if [ -f /tmp/workspace-state.tar.gz ]; then
    echo "[loft] Hydrating workspace from state..."
    tar -xzf /tmp/workspace-state.tar.gz -C /workspace 2>/dev/null || true
    rm -f /tmp/workspace-state.tar.gz
    chown -R grove:grove /workspace
    echo "[loft] Workspace hydrated"
fi

# ─── Git Config ─────────────────────────────────────────────
su - grove -c 'git config --global init.defaultBranch main'
su - grove -c 'git config --global user.name "${GIT_USER_NAME:-Grove Dev}"'
su - grove -c 'git config --global user.email "${GIT_USER_EMAIL:-dev@grove.place}"'

# ─── Start Services ─────────────────────────────────────────
echo "[loft] Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/loft.conf
