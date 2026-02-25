---
aliases: []
date created: Tuesday, February 25th 2026
date modified: Tuesday, February 25th 2026
tags:
  - infrastructure
  - ephemeral-compute
  - dev-environment
  - firefly-consumer
type: tech-spec
lastUpdated: "2026-02-25"
---

# Loft: Hands-On Dev Sessions

```

                              ☀️
                    ·  ·  ·  ·  ·  ·  ·  ·
               ·                              ·
          ·         ╭───────────────────╮          ·
                    │                   │
     🌿            │       LOFT        │            🌿
                    │                   │
                    │   ttyd    :7681   │  ← terminal
                    │   code   :8080   │  ← editor
                    │                   │
                    │   opencode        │
                    │   claude code     │
                    │   crush           │
                    │                   │
                    ╰─────────┬─────────╯
          ·                   │                   ·
               ·      CF Tunnel (HTTPS)      ·
                    ·    ·    │    ·    ·
                              ▼
                    ┌───────────────────┐
                    │    any browser    │
                    │   iPad · laptop   │
                    └───────────────────┘

          Climb up. Spread out. The loft holds your work.
```

> *Climb up. Spread out. The loft holds your work.*

A loft is the space above. A hay loft in a barn, warm and filled with the smell of work. An artist's loft in the city, spread out with tools and light. Every loft shares something: you climb up to reach it. The space is yours. When you climb back down, your work stays.

Loft is a Firefly consumer that provisions an ephemeral dev server you can reach from any browser. Optimized for iPad, accessible from anywhere. Verge sends your code through and it comes back transformed. Loft keeps you there, hands-on, in the elevated quiet where good work happens.

**Public Name:** Loft
**Internal Name:** GroveLoft
**Firefly Consumer ID:** `loft`
**Domain:** `loft.grove.place` (terminal), `editor.loft.grove.place` (code-server)
**Complements:** Verge (hands-off autonomous agents)

---

## Overview

### What This Is

Loft provisions an ephemeral dev server with a browser-accessible terminal, editor, and AI coding tools. It's the hands-on counterpart to Verge. Where Verge delegates completely, Loft keeps you in the tree.

### Goals

- One command from iPad to live terminal: `gw loft ignite`
- Never auto-fade. You are the idle detector.
- Safe teardown: uncommitted work pushed, workspace synced, server snapshotted
- Choose your provider per-session based on cost, latency, and duration
- Cheaper than any always-on VPS

### Non-Goals

- Not a permanent dev environment (use a local machine for that)
- Not a CI runner (use Queen Firefly for that)
- Not an autonomous agent platform (use Verge for that)
- No multi-user support. One person, one loft.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     LOFT SESSION                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Cloud Server (Fly / DO / Hetzner)                     │
│   ┌─────────────────────────────────────────────────┐   │
│   │  tmux (session: loft)                           │   │
│   │  ┌──────────────────────────────────────────┐   │   │
│   │  │  your shell                              │   │   │
│   │  │  opencode · claude code · crush · git    │   │   │
│   │  └──────────────────────────────────────────┘   │   │
│   │                                                 │   │
│   │  ttyd         → port 7681 (browser terminal)    │   │
│   │  code-server  → port 8080 (browser editor)      │   │
│   └─────────────────────────────────────────────────┘   │
│                            │                            │
│                cloudflared tunnel                       │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │      loft.grove.place           │  ← terminal
            │   editor.loft.grove.place       │  ← code-server
            └─────────────────────────────────┘
                             │
                      Safari / any browser
                      (Add to Home Screen → PWA)
```

**Why tmux is load-bearing:** Connection drops don't kill your session. Close your iPad, fly somewhere, reopen Safari. You reconnect to the exact same shell state mid-agent-run. tmux is the persistence layer for the session itself. R2 is the persistence layer for the workspace.

**Why CF Tunnel:** No firewall config. No TLS cert management. No public IP exposure. `cloudflared` runs on the server, punches out, and you get a stable HTTPS URL on your domain. Free. Works everywhere.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Terminal | ttyd | Browser-accessible terminal, wraps tmux |
| Editor | code-server | VS Code in browser, iPad PWA support |
| Session persistence | tmux | Survives connection drops |
| Tunnel | cloudflared | Free HTTPS, no port exposure |
| Workspace storage | R2 | Cheap, fast, already in the ecosystem |
| Provisioning | Firefly SDK | Shared lifecycle with Verge, Queen |

---

## Provider Strategy

Unlike other Firefly consumers (which pin a provider), Loft lets you choose per-session. Provider selection maps to what you're doing and where you are.

| Provider | Cold Start | Best For | US Regions |
|----------|-----------|----------|------------|
| **Fly.io** | ~5s | Quick sessions, low latency | iad, ord, sjc, sea, dfw, atl + more |
| **DigitalOcean** | 45-90s | Longer sessions, snapshots | nyc1, nyc3, sfo3, atl |
| **Hetzner (ash)** | 30-60s | Cost-sensitive long sessions | ash (Ashburn VA) |

**Default:** Fly.io. Five-second cold start means you go from `gw loft ignite` to a live terminal faster than a webpage loads.

**When to pick DO:** You want persistent snapshots (fast next ignite, pre-warmed with your tools). DO's snapshot API is mature and cheap.

**When to pick Hetzner:** Sessions longer than 2 hours where cost adds up. Hetzner ash is $0.008/hr vs Fly's ~$0.02/hr. Meaningful for a 4-hour deep work session.

```bash
gw loft ignite                              # default: fly, iad
gw loft ignite --provider fly --region atl
gw loft ignite --provider do --region nyc1
gw loft ignite --provider hetzner --region ash
gw loft ignite --from-snapshot snap_abc123  # restore from previous session
```

---

## The Consumer Config

```typescript
// libs/engine/src/lib/firefly/consumers/loft.ts

export const loftConfig: FireflyConfig = {
  // Provider selected at ignite time, not hardcoded
  // Default falls back to Fly if not specified
  provider: new FlyProvider({ token: env.FLY_TOKEN, org: 'autumnsgrove' }),

  sync: {
    synchronizer: new R2StateSynchronizer({ bucket: env.LOFT_WORKSPACES }),
    syncOnActivity: false,       // Manual sync only (gw loft sync)
    syncInterval: 30 * 60_000,   // Auto-sync every 30 min as safety net
  },

  idle: {
    // Loft never auto-fades. You are the idle detector.
    // Very long max lifetime as a safety net for forgotten sessions.
    checkInterval: 60 * 60_000,          // Check hourly
    idleThreshold: 99999 * 60_000,       // Effectively never
    activitySignals: ['ssh_session_active'],
    warningAt: 23 * 60 * 60_000,         // Warning at 23 hours
  },

  maxLifetime: 24 * 60 * 60_000,  // 24h hard cap (cost protection)
  tags: ['loft', 'hands-on', 'dev-session'],

  onIgnite: async (instance) => {
    await runBootstrap(instance);
    await startTunnel(instance);
    await notifyReady(instance);  // print URL to terminal
  },

  onFade: async (instance) => {
    await loftFadeSequence(instance);
  },
};
```

---

## Bootstrap Script

What runs on the server at ignite time. Fast, idempotent, tested.

```bash
#!/bin/bash
# loft-bootstrap.sh
# Runs as root on fresh Ubuntu 24.04

set -euo pipefail

# ── System basics ────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq git curl tmux zsh fish htop unzip jq tree

# ── ttyd (browser terminal) ──────────────────────────────────
snap install ttyd --classic

# ── code-server (browser VS Code) ───────────────────────────
curl -fsSL https://code-server.dev/install.sh | sh

# ── Node (for opencode, claude code) ─────────────────────────
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 24

# ── OpenCode ─────────────────────────────────────────────────
curl -fsSL https://opencode.ai/install | bash

# ── Claude Code ──────────────────────────────────────────────
npm install -g @anthropic-ai/claude-code

# ── Crush (by Charmbracelet) ─────────────────────────────────
# Go successor to OpenCode. TUI, LSP, MCP, OpenRouter native.
npm install -g @charmland/crush

# ── Cloudflare Tunnel ────────────────────────────────────────
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb

# ── Inject secrets from cloud-init userdata ──────────────────
echo "export ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" >> /etc/environment
echo "export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}" >> /etc/environment
echo "export CF_TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}" >> /etc/environment
source /etc/environment

# ── Start services ───────────────────────────────────────────
tmux new-session -d -s loft

ttyd -W -c "autumn:${SESSION_PASSWORD}" -i 127.0.0.1 -p 7681 \
  tmux new -A -s loft &

PASSWORD="${SESSION_PASSWORD}" code-server \
  --bind-addr 127.0.0.1:8080 \
  --auth password \
  --disable-telemetry &

# ── Cloudflare tunnel (wildcard: *.loft.grove.place) ─────────
# Single pre-created tunnel with wildcard routing.
# Terminal on loft.grove.place, editor on editor.loft.grove.place.
cloudflared tunnel run --token "${CF_TUNNEL_TOKEN}" &

# ── Pre-push hooks ──────────────────────────────────────────
if [ -n "${GIT_HOOKS_ARCHIVE_URL:-}" ]; then
  curl -sL "$GIT_HOOKS_ARCHIVE_URL" | tar xz -C /tmp/hooks
fi

# ── Store password for out-of-band retrieval ──────────────
# Do NOT print password to stdout — cloud providers capture
# serial/console logs. gw loft status retrieves it via API.
echo "${SESSION_PASSWORD}" > /run/loft-session-password
chmod 600 /run/loft-session-password

echo "✨ Loft is ready."
echo "   Terminal: https://loft.grove.place"
echo "   Editor:   https://editor.loft.grove.place"
echo "   Password: (use 'gw loft password' to retrieve)"
```

---

## The Fade Sequence

`gw loft kill` triggers this. Strict, loud, safe. Use `--force` to skip everything and terminate immediately.

```
gw loft kill
    │
    ▼
Check git status ──── clean ──→ skip push
    │
    dirty
    │
    ▼
Push to safety branch ──── FAIL ──→ 🚨 STOP. Do not terminate.
    │                                   Fix and retry, or --skip-push.
    OK
    │
    ▼
Sync workspace to R2
    │
    ▼
Snapshot server image (skippable with --skip-snapshot)
    │
    ▼
Shred credentials
    │
    ▼
Terminate server
    │
    ▼
Log session
    │
    ▼
🌿 Loft faded.
```

```typescript
async function loftFadeSequence(instance: ServerInstance, opts: FadeOptions): Promise<void> {

  console.log('🌿 Loft fade sequence starting...');

  // ── Step 1: Push uncommitted work ─────────────────────────
  console.log('📤 Checking for uncommitted work...');
  const gitStatus = await instance.exec('git -C /workspace status --porcelain');

  if (gitStatus.stdout.trim()) {
    console.log('⚠️  Uncommitted changes detected. Pushing to safety branch...');
    const branchName = `loft/session-${instance.id.slice(0, 8)}-${Date.now()}`;

    const pushResult = await instance.exec(`
      git -C /workspace checkout -b ${branchName} &&
      git -C /workspace add -A &&
      git -C /workspace commit -m "loft: session snapshot [auto]" &&
      git -C /workspace push origin ${branchName}
    `);

    if (pushResult.exitCode !== 0) {
      console.error('🚨 PUSH FAILED. Loft will NOT terminate until this is resolved.');
      console.error('   Fix the issue and run gw loft kill again.');
      console.error('   Or run gw loft kill --skip-push to abandon uncommitted work.');
      console.error(pushResult.stderr);
      throwGroveError(500, SRV_ERRORS.LOFT_FADE_BLOCKED, 'Loft', {
        reason: 'push failed',
        stderr: pushResult.stderr,
      });
    }

    console.log(`✅ Pushed to ${branchName}`);
  } else {
    console.log('✅ Working tree clean.');
  }

  // ── Step 2: Sync workspace to R2 ─────────────────────────
  console.log('☁️  Syncing workspace to R2...');
  await instance.exec(
    'tar -czf /tmp/workspace.tar.gz' +
    ' --exclude="*.env"' +
    ' --exclude="*.env.*"' +
    ' --exclude=".env"' +
    ' --exclude=".env.local"' +
    ' --exclude=".env.production"' +
    ' --exclude="credentials.json"' +
    ' --exclude="secrets.json"' +
    ' /workspace'
  );
  await r2Sync.persist(instance, `loft/${instance.id}/workspace.tar.gz`);
  console.log('✅ Workspace synced.');

  // ── Step 3: Snapshot server image ─────────────────────────
  if (!opts.skipSnapshot) {
    console.log('📸 Snapshotting server image...');
    const snapshot = await provider.snapshot(instance, {
      name: `loft-session-${new Date().toISOString().slice(0, 10)}`,
      tags: ['loft', 'session-snapshot'],
    });
    await kv.put('loft:latest-snapshot', snapshot.id);
    console.log(`✅ Snapshot created: ${snapshot.id}`);
  }

  // ── Step 4: Cleanup credentials ───────────────────────────
  // NOTE: shred is unreliable on network-attached / COW block storage
  // (most cloud providers). The real credential protection is server
  // termination — the disk is destroyed. shred is defense-in-depth
  // for the window between cleanup and termination, not a guarantee.
  console.log('🔒 Cleaning credentials...');
  const shredResult = await instance.exec('shred -u /etc/environment');
  if (shredResult.exitCode !== 0) {
    console.warn('⚠️  shred failed (expected on cloud block storage). Server will be terminated.');
  }

  // ── Step 5: Terminate ─────────────────────────────────────
  console.log('💨 Terminating server...');
  await provider.terminate(instance);

  // ── Step 6: Log session ───────────────────────────────────
  await logSession(instance);
  console.log('🌿 Loft faded. See you next time.');
}
```

---

## R2 State Layout

```
amber.grove.place/
└── loft/
    ├── {session-id}/
    │   ├── workspace.tar.gz       # Full workspace at last sync / fade
    │   └── meta.json              # Session metadata, timestamps, costs
    ├── snapshots/
    │   └── index.json             # Maps snapshot IDs to provider + date
    └── latest.json                # Points to most recent session-id
```

---

## gw CLI Commands

### Core Lifecycle

```bash
gw loft ignite                              # spin up (fly, iad, default)
gw loft ignite --provider do --region nyc1  # specific provider/region
gw loft ignite --from-snapshot latest       # resume from last server snapshot
gw loft status                              # running? URL? cost so far?
gw loft open                                # print/open terminal URL
gw loft open --editor                       # print/open code-server URL
gw loft sync                                # manual R2 sync (mid-session save)
gw loft kill                                # full fade: push → sync → snap → terminate
gw loft kill --skip-push                    # abandon uncommitted work (requires --confirm)
gw loft kill --skip-snapshot                # skip server snapshot, just sync + terminate
gw loft kill --force                        # skip everything, just terminate (emergency)
```

### Session History

```bash
gw loft sessions                            # past sessions with cost + duration
gw loft restore                             # restore latest workspace from R2
gw loft restore --session abc123            # restore specific session
gw loft snapshots                           # list available server snapshots
```

### Cost Visibility

```bash
gw loft costs                               # current session cost (live)
gw loft costs --history                     # past sessions cost breakdown
```

---

## Session Cost Estimates

All estimates assume Atlanta-adjacent usage.

| Pattern | Provider | Cost/Session | Monthly (daily use) |
|---------|----------|-------------|-------------------|
| Quick 2hr session | Fly | ~$0.04 | ~$1.20 |
| 4hr deep work | Fly | ~$0.08 | ~$2.40 |
| 4hr deep work | Hetzner ash | ~$0.03 | ~$0.96 |
| 8hr day | Fly | ~$0.16 | ~$4.80 |
| 8hr day | Hetzner | ~$0.06 | ~$1.92 |
| Forgot to kill (24hr cap) | Fly | ~$0.48 | - |

The 24hr safety cap means the worst case is ~$0.50.

---

## Security Considerations

- **Credentials cleaned on fade, destroyed on termination.** API keys in `/etc/environment` are `shred -u`'d before termination. `shred` is unreliable on cloud block storage (network-attached, COW), so the real protection is server termination — the disk is destroyed with it. `shred` is defense-in-depth for the window between cleanup and termination.
- **CF Tunnel, not open ports.** ttyd and code-server bind to `127.0.0.1` only. They are unreachable from the public internet — only `cloudflared` (running locally on the same server) can reach them. All external traffic routes through Cloudflare's network.
- **Password-protected services.** Both ttyd and code-server require the session password.
- **Pre-push hooks preserved.** Your existing git safety hooks travel with you to the loft.
- **No credential persistence in R2.** Workspace snapshots exclude `/etc/environment` and any `.env` files.

---

## Implementation Checklist

### Phase 0: It Works

**Goal:** `gw loft ignite --repo autumnsgrove/lattice` → URL in browser → terminal → `gw loft kill`

- [ ] Add `loft` consumer profile to Firefly SDK
- [ ] Write `loft-bootstrap.sh` (ttyd + code-server + cloudflared + Crush + OpenCode + Claude Code)
- [ ] Set up wildcard CF Tunnel (`*.loft.grove.place`)
- [ ] Implement basic `FlyProvider` (port from Fly API docs)
- [ ] Implement `gw loft ignite`, `gw loft status`, `gw loft kill`
- [ ] Implement `--repo` flag with deploy key / token injection
- [ ] Password store + retrieve (write to `/run/` on server, `gw loft status` pulls via API, persists in `gw` local keychain)
- [ ] `gw loft open` auto-opens URL with stored auth
- [ ] `gw loft password` retrieves stored session password
- [ ] Basic fade sequence (push check → terminate, skip R2/snapshot for now)
- [ ] Test on iPad Safari: ttyd + code-server PWA behavior, document findings

### Phase 1: Proper Fade

**Goal:** Full fade sequence. Safe to use for real work.

- [ ] R2 workspace sync on fade
- [ ] Push-to-safety-branch with loud failure on push error
- [ ] Copy pre-push hooks to server at bootstrap
- [ ] `gw loft sync` (manual mid-session save)
- [ ] Session logging (duration, cost, provider)
- [ ] `gw loft sessions` history

### Phase 2: Snapshots & Restore

**Goal:** Fast resume from previous session.

- [ ] DO snapshot on fade (implement `DigitalOceanProvider.snapshot()`)
- [ ] `gw loft ignite --from-snapshot latest`
- [ ] R2 workspace restore on fresh ignite
- [ ] `gw loft restore` standalone command
- [ ] `gw loft snapshots` list

### Phase 3: Multi-Provider Polish

**Goal:** Pick provider fluidly, costs visible, everything smooth.

- [ ] Provider comparison at ignite time (`gw loft ignite --compare`)
- [ ] Real-time cost display (`gw loft status` shows live meter)
- [ ] DO Atlanta region test
- [ ] Fly region latency hints
- [ ] `gw loft costs --history` dashboard

---

## Decisions (Resolved)

Answers to the original open questions, decided during spec design.

1. **Crush install path.** Confirm the exact install command before Phase 0. Likely `npm install -g @charmland/crush` since Node is already in the bootstrap.
2. **CF Tunnel: wildcard.** Single pre-created tunnel with `*.loft.grove.place` wildcard routing. No per-session tunnel provisioning needed. Simpler bootstrap, no CF API calls.
3. **code-server + ttyd on iPad: test and document.** Try both single-PWA (terminal only) and split-screen during Phase 0 iPad testing. Document what works. Don't prescribe the UX before real usage.
4. **Password: store + retrieve out-of-band.** Session password is NOT printed to bootstrap stdout (cloud providers capture serial/console logs). Instead, it's written to `/run/loft-session-password` on the server. `gw loft status` retrieves it via API and stores it in `gw`'s local keychain. `gw loft open` auto-opens with auth. `gw loft password` retrieves it if needed elsewhere.
5. **Git repo auto-clone: Phase 0.** `gw loft ignite --repo autumnsgrove/lattice` is a Phase 0 feature. Without it you ignite and then manually git clone anyway. Needs a deploy key or token injected at bootstrap.
6. **Fly snapshots: R2 only.** Fly sessions restore from R2 workspace tarballs only. Reserve machine snapshots for DO where they're mature and first-class.
7. **Crush + OpenCode: install both.** They've diverged enough to complement each other. Crush for Go speed + Charm polish + LSP. OpenCode for TypeScript + Zen gateway. Both in bootstrap.
8. **iPad keyboard: no special accommodations.** The iPad already has a full keyboard setup. Loft finishes the bridge to real dev work on iPad. No custom tmux config or on-screen keyboard considerations needed.

## Remaining Open Questions

1. **Crush exact install command.** Verify `npm install -g @charmland/crush` works before Phase 0. Could be a different package name or a standalone binary.
2. **Deploy key strategy for --repo.** `gw loft ignite --repo` needs auth to clone private repos. Options: inject a GitHub deploy key at bootstrap, use a fine-grained PAT, or create a GitHub App installation token per-session.

---

*Climb up. Spread out. The loft holds your work.*
