#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Grove Dev Stack — Local Development Environment
#
# Runs the real Grove stack locally: real workers, real DOs, real D1/KV/R2.
# No mocks. Single miniflare instance via wrangler multi-config.
#
# Usage:
#   ./scripts/dev-stack.sh                Full stack (workers + aspen)
#   ./scripts/dev-stack.sh fast           Fast: skips builds, Aspen under `vite dev` (HMR)
#   ./scripts/dev-stack.sh workers        Workers only (no SvelteKit apps)
#   ./scripts/dev-stack.sh seed           Apply migrations + seed data only
#   ./scripts/dev-stack.sh reset          Nuke local DBs and re-seed
#   ./scripts/dev-stack.sh stop           Kill any running processes, free ports
#
# Prerequisites:
#   pnpm install                          (workspace deps)
#   pnpm -r run package                   (build engine dist — needed for DOs)
#
# See: docs/LOCAL_DEV.md
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

GROVE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$GROVE_ROOT"

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

# ── State ─────────────────────────────────────────────────────────────
WRANGLER_PID=""
ASPEN_PID=""
PIDS=()
# 1 in `fast` mode: no production builds, Aspen runs under `vite dev`.
FAST_MODE=0

log()  { echo -e "${GREEN}[grove]${RESET} $1"; }
warn() { echo -e "${YELLOW}[grove]${RESET} $1"; }
err()  { echo -e "${RED}[grove]${RESET} $1"; }
dim()  { echo -e "${DIM}$1${RESET}"; }

# ── Cleanup ───────────────────────────────────────────────────────────
cleanup() {
    echo ""
    log "Shutting down..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null || true
        fi
    done
    log "All processes stopped."
}
trap cleanup EXIT INT TERM

# ── Stop (clean up behind us) ────────────────────────────────────────────
# `cleanup()` above only runs when THIS script's own process exits — it's
# useless if the stack was launched backgrounded (`&`) and the launching
# shell/session is long gone by the time you want it stopped. Kills by
# matching the actual `wrangler dev`/`workerd serve` processes and taking
# their PIDs directly, not `pkill -f` pattern matching, which has
# previously missed zombies and left the next run to silently collide with
# a stale process still squatting a port (see docs/LOCAL_DEV.md).
stop_stack() {
    # Pattern must match the CLI parent (which respawns a fresh `workerd
    # serve` child the instant the old one dies) as well as the child
    # itself — the parent's real command line is
    # `.../wrangler-dist/cli.js dev -c ...`, where "wrangler" and "dev"
    # aren't adjacent, so a literal "wrangler dev" match misses it and
    # only ever kills the disposable child, which just comes back.
    local pids
    pids=$(ps aux | grep -E "wrangler.*dev -c|workerd serve" | grep -v grep | awk '{print $2}')

    if [ -z "$pids" ]; then
        log "Nothing running — dev stack already stopped."
        return 0
    fi

    local count
    count=$(echo "$pids" | wc -w | tr -d ' ')
    warn "Stopping dev stack ($count process(es))..."
    echo "$pids" | xargs kill -9 2>/dev/null
    sleep 1
    log "Dev stack stopped. Ports are free for the next run."
}

# ── Preflight checks ─────────────────────────────────────────────────
preflight() {
    local missing=0

    if ! command -v wrangler &>/dev/null; then
        err "wrangler not found on PATH. Install it globally: npm i -g wrangler"
        missing=1
    fi

    # Always rebuild — apps/aspen and the workers import engine via its
    # published dist/, not source, so a stale dist silently serves old
    # component code even after source edits. Missing-file check alone
    # isn't enough (that only catches a dist that was never built).
    # Fast mode skips the rebuild only when no engine source is newer than the
    # stamp left by the last successful build, so a stale dist is still caught.
    local engine_stamp="libs/engine/dist/.dev-stack-built"
    if [ "$FAST_MODE" -eq 1 ] && [ -f "$engine_stamp" ] &&
        [ -z "$(find libs/engine/src libs/engine/package.json -newer "$engine_stamp" -print -quit)" ]; then
        log "Engine dist is up to date — skipping rebuild."
    else
        log "Building engine dist (apps/aspen and workers import from dist, not source)..."
        (cd libs/engine && pnpm run package) || {
            err "Engine package build failed — see output above"
            exit 1
        }
        touch "$engine_stamp"
    fi

    # Check for .dev.vars files (warn but don't block)
    local services=("apps/aspen" "apps/plant" "apps/landing" "services/heartwood" "services/zephyr" "services/durable-objects")
    for svc in "${services[@]}"; do
        if [ ! -f "$svc/.dev.vars" ] && [ -f "$svc/.dev.vars.example" ]; then
            warn "Missing $svc/.dev.vars — copy from .dev.vars.example"
        fi
    done

    if [ "$missing" -eq 1 ]; then
        exit 1
    fi
}

# ── Database seeding ──────────────────────────────────────────────────
apply_migrations() {
    log "Applying D1 migrations..."

    # Engine DB (118 migrations)
    dim "  → engine (grove-engine-db)"
    wrangler d1 migrations apply grove-engine-db \
        --local \
        -c apps/aspen/wrangler.toml \
        2>&1 | grep -E "applied|Already|Migrations" || true

    # Curios DB
    if [ -d "libs/engine/migrations/curios" ]; then
        dim "  → curios (grove-curios-db)"
        wrangler d1 migrations apply grove-curios-db \
            --local \
            -c apps/aspen/wrangler.toml \
            2>&1 | grep -E "applied|Already|Migrations" || true
    fi

    # Heartwood DB
    # Heartwood's SQL lives in src/db/migrations (no migrations_dir configured, so
    # `wrangler d1 migrations apply` finds nothing and used to fail silently,
    # leaving the local auth DB empty). Apply just the files Better Auth needs
    # locally — the older numbered files assume legacy tables and aren't replayable.
    # All three are safe to re-run except the ALTER in 0011, whose "duplicate
    # column" error on a second run is expected and ignored.
    dim "  → heartwood (groveauth)"
    for m in 0001_better_auth 0011_ba_user_two_factor_enabled 0015_rate_limits_table; do
        if ! out=$(wrangler d1 execute groveauth \
            --local \
            -c services/heartwood/wrangler.toml \
            --file "services/heartwood/src/db/migrations/$m.sql" 2>&1); then
            # A re-run of 0011's ALTER is expected to fail; anything else is real.
            if ! grep -qi "duplicate column" <<<"$out"; then
                warn "Heartwood migration $m failed — email-code sign-in may not work locally"
                echo "$out" | tail -3 | sed 's/^/      /'
            fi
        fi
    done

    log "Migrations complete."
}

seed_data() {
    local profile="${1:-blog}"

    log "Seeding data (profile: ${CYAN}$profile${RESET})..."

    case "$profile" in
        blog)
            dim "  → Midnight Bloom tenant (4 posts, 5 pages)"
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-midnight-bloom.sql \
                -y 2>&1 | tail -3

            if [ -f "scripts/db/add-midnight-bloom-pages.sql" ]; then
                wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/add-midnight-bloom-pages.sql \
                    -y 2>&1 | tail -3
            fi

            if [ -f "scripts/db/fix-midnight-bloom-content.sql" ]; then
                wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/fix-midnight-bloom-content.sql \
                    -y 2>&1 | tail -3
            fi

            # Two more tenants for cross-account testing (Lantern friends,
            # Reeds comments) — see #1581. Local-only, unlike Midnight
            # Bloom's tenants row (migration 010, also applied to prod).
            dim "  → Driftwood & Ink tenant (3 posts, 2 pages)"
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-tenant-002.sql \
                -y 2>&1 | tail -3

            dim "  → The Quiet Orchard tenant (3 posts, 2 pages)"
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-tenant-003.sql \
                -y 2>&1 | tail -3

            # Comped/beta invite rows for apps/landing's Wayfinder-only
            # /arbor/comped-invites admin page — pending, used, and legacy
            # "beta"-typed invites so the list/filter/audit views have real
            # data instead of an empty state.
            dim "  → Comped invites (pending, used, legacy beta)"
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-comped-invites.sql \
                -y 2>&1 | tail -3
            ;;
        empty)
            dim "  → Empty tenant (defaults only)"
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-empty-grove.sql \
                -y 2>&1 | tail -3
            ;;
        fresh)
            dim "  → Fresh (migrations only, no data)"
            ;;
        *)
            err "Unknown profile: $profile (use: blog, empty, fresh)"
            exit 1
            ;;
    esac

    log "Seed complete."
}

reset_databases() {
    warn "Nuking local databases..."
    rm -rf apps/aspen/.wrangler/state
    rm -rf apps/plant/.wrangler/state
    rm -rf apps/landing/.wrangler/state
    rm -rf services/heartwood/.wrangler/state
    rm -rf services/durable-objects/.wrangler/state
    rm -rf services/zephyr/.wrangler/state
    log "Local databases cleared."
    apply_migrations
    seed_data "blog"
}

# ── Demo mode ─────────────────────────────────────────────────────────
# Reads DEMO_MODE_SECRET from apps/aspen/.dev.vars and prints the exact
# URL that trades it for the grove_demo_mode cookie, so nobody has to
# manually dig the secret out of .dev.vars and hand-build the URL
# every time (see project_local_dev_login memory for the full flow).
demo_login_url() {
    # Optional: a seeded tenant's subdomain (e.g. "driftwood-ink") to log
    # into directly, instead of relying on the sticky grove_local_subdomain
    # cookie / hardcoded "midnight-bloom" default in hooks.server.ts.
    local subdomain="${1:-}"
    local dev_vars="apps/aspen/.dev.vars"
    if [ ! -f "$dev_vars" ]; then
        return 1
    fi

    local secret
    secret=$(grep -E "^DEMO_MODE_SECRET=" "$dev_vars" | head -1 | cut -d= -f2-)
    if [ -z "$secret" ]; then
        return 1
    fi

    if [ -n "$subdomain" ]; then
        echo "http://localhost:5173/arbor?demo=$secret&subdomain=$subdomain"
    else
        echo "http://localhost:5173/arbor?demo=$secret"
    fi
}

# Prints one demo login URL per seeded tenant (#1581) so switching between
# the three accounts locally doesn't require manual DB lookups. Once logged
# into any of them, Lantern's "Demo Identity" column can switch which
# tenant's owner the session acts as without changing the URL/subdomain.
print_demo_tenant_urls() {
    if ! demo_login_url >/dev/null; then
        warn "DEMO_MODE_SECRET not found in apps/aspen/.dev.vars — demo login unavailable"
        return 1
    fi

    echo -e "  ${CYAN}Demo logins (3 seeded tenants):${RESET}"
    echo -e "    Midnight Bloom:  $(demo_login_url midnight-bloom)"
    echo -e "    Driftwood & Ink: $(demo_login_url driftwood-ink)"
    echo -e "    Quiet Orchard:   $(demo_login_url quiet-orchard)"
    echo -e "  ${DIM}(first visit sets grove_demo_mode + grove_local_subdomain cookies)${RESET}"
}

# Aspen's isBetaDeployment (apps/aspen/src/lib/server/beta.ts) auto-activates
# on localhost when the checked-out branch is "beta" — no special URL or
# query param needed, unlike the demo-login bypasses above. Surfaced here so
# it's obvious why the Header's Beta pill / Greenhouse card's "Beta Access"
# copy is (or isn't) showing, without having to go read the source.
print_aspen_branch_note() {
    local branch
    branch=$(git branch --show-current 2>/dev/null)
    if [ "$branch" = "beta" ]; then
        echo -e "  ${CYAN}Branch:${RESET} beta — isBetaDeployment is auto-true on localhost"
        echo -e "  ${DIM}(Header shows the Beta pill, Greenhouse card shows \"Beta Access\" — no ?demo= needed for this part)${RESET}"
    else
        echo -e "  ${DIM}Branch: ${branch:-unknown} — isBetaDeployment is false locally (checkout beta to test it)${RESET}"
    fi
}

# Same idea as demo_login_url() above, but for Plant's onboarding bypass —
# reads apps/plant/.dev.vars separately since it's a different worker's
# secret store, even though both apps use the same DEMO_MODE_SECRET value
# by local-dev convention (see apps/plant/.dev.vars.example).
plant_demo_url() {
    local dev_vars="apps/plant/.dev.vars"
    if [ ! -f "$dev_vars" ]; then
        return 1
    fi

    local secret
    secret=$(grep -E "^DEMO_MODE_SECRET=" "$dev_vars" | head -1 | cut -d= -f2-)
    if [ -z "$secret" ]; then
        return 1
    fi

    echo "http://localhost:5175/auth/demo?demo=$secret"
}

# Same idea again, but for Landing's Wayfinder-only /arbor (staff tools like
# comped-invites) — reads apps/landing/.dev.vars. Unlike Aspen/Plant's demo
# bypass (a stand-in tenant owner), this one logs in as a real Wayfinder
# identity, since every page under /arbor here gates on isWayfinder(email),
# not tenant ownership. See apps/landing/src/routes/arbor/+layout.server.ts.
landing_arbor_demo_url() {
    local dev_vars="apps/landing/.dev.vars"
    if [ ! -f "$dev_vars" ]; then
        return 1
    fi

    local secret
    secret=$(grep -E "^DEMO_MODE_SECRET=" "$dev_vars" | head -1 | cut -d= -f2-)
    if [ -z "$secret" ]; then
        return 1
    fi

    echo "http://localhost:5174/arbor?demo=$secret"
}

# ── Workers ───────────────────────────────────────────────────────────
wait_for_port() {
    local port=$1
    local name=$2
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s "http://localhost:$port/" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    return 1
}

# ── Local DO config ──────────────────────────────────────────────────
# Production's durable-objects wrangler.toml deliberately has no [[migrations]]
# (history was reset 2026-06-27; the classes already exist in Cloudflare), but
# miniflare only enables SQLite for classes a migration declares. Without one,
# every Loom DO fails locally with "SQL is not enabled for this Durable Object
# class". Write a throwaway copy with a migration appended; class names come
# from the config's own bindings so there's still one source of truth.
write_local_do_config() {
    local src="services/durable-objects/wrangler.toml"
    local dst="services/durable-objects/wrangler.local.toml"
    local classes
    classes=$(sed -n 's/^class_name = "\(.*\)"/"\1"/p' "$src" | paste -sd, - | sed 's/,/, /g')
    {
        cat "$src"
        printf '\n[[migrations]]\ntag = "local-sqlite"\nnew_sqlite_classes = [%s]\n' "$classes"
    } >"$dst"
}

start_workers() {
    write_local_do_config
    log "Starting workers..."
    echo ""
    dim "  Heartwood: groveauth (port 8787) — separate process"
    dim "  Primary:   grove-aspen (port 5173) + auxiliary grove-durable-objects, grove-zephyr"
    dim "  Landing:   grove-landing (port 5174) — separate process"
    dim "  Plant:     grove-plant (port 5175) — separate process"
    dim "  Login:     grove-login (port 5176) — vite dev, separate process"
    echo ""

    # Shared local state directory. Only wrangler dev invocations that point
    # here (via --persist-to) or that run inside the same multi-config group
    # as this path's owner see the same D1/KV/R2 data. Each config directory
    # gets its OWN separate .wrangler/state by default otherwise — a config
    # bundled into a multi-config -c list still only gets its own listening
    # port if it's the FIRST (primary) config; auxiliary configs (durable
    # objects, zephyr here) are service-binding-only, not browsable. Plant
    # and Landing are full apps that need their own port, so they run as
    # separate processes with --persist-to pointed at aspen's state — same
    # trick as Heartwood already uses for ENGINE_DB.
    local shared_state="apps/aspen/.wrangler/state"

    # Start heartwood first (separate process on port 8787)
    # Runs independently so its [[routes]] custom_domain doesn't
    # pollute the primary worker's Host header in multi-config.
    # Service bindings discover it via wrangler's dev registry.
    wrangler dev \
        -c services/heartwood/wrangler.toml \
        --inspector-port 9229 \
        2>&1 | sed "s/^/  ${DIM}[heartwood]${RESET} /" &
    HEARTWOOD_PID=$!
    PIDS+=("$HEARTWOOD_PID")

    log "Waiting for heartwood (port 8787)..."
    if ! wait_for_port 8787 "heartwood"; then
        err "Heartwood failed to start within 30 seconds"
        exit 1
    fi
    log "Heartwood ready."

    # Login hub — the page that hosts "Continue with email" (code sign-in).
    # Runs under `vite dev` (hot reload, no build step); its AUTH service
    # binding finds Heartwood through wrangler's dev registry. Port 5176 is
    # in Heartwood's local trustedOrigins. Email codes print in the
    # [heartwood] log lines above — look for "[LoginCode:dev]".
    (cd apps/login && pnpm exec vite dev --port 5176 --strictPort) \
        2>&1 | sed "s/^/  ${DIM}[login]${RESET} /" &
    LOGIN_PID=$!
    PIDS+=("$LOGIN_PID")

    log "Waiting for login (port 5176)..."
    if ! wait_for_port 5176 "login"; then
        warn "Login hub didn't start on 5176 — email-code sign-in won't be testable (rest of the stack continues)"
    fi

    # wrangler dev serves each app's built .svelte-kit/output — it does NOT
    # watch source files the way `vite dev` does. Always rebuild here so
    # edits made before this run are actually reflected, not a stale bundle.
    # Point every app's "Sign in" button at the local login hub (5176) instead of
    # production login.grove.place. The engine reads VITE_LOGIN_URL at build time
    # (libs/engine/src/lib/auth/login/config.ts), so it must be set before the builds.
    export VITE_LOGIN_URL="http://localhost:5176"

    if [ "$FAST_MODE" -eq 0 ]; then
        log "Building aspen, plant, landing (wrangler dev serves build output, not source)..."
        (cd apps/aspen && pnpm run build) || {
            err "Aspen build failed — see output above"
            exit 1
        }
        (cd apps/plant && pnpm run build) || {
            err "Plant build failed — see output above"
            exit 1
        }
    fi

    # Landing prerenders a couple of pages that fetch from GitHub at build
    # time (e.g. /knowledge/exhibit/sister-museum) — a flaky network or an
    # offline machine shouldn't take down the whole stack over a marketing
    # page. Warn and skip landing rather than exit; aspen + plant are what
    # the signup flow actually needs.
    # Not `local` — main() reads this after start_workers() returns to
    # decide whether to print the Landing URL in the summary banner.
    landing_ready=1
    if [ "$FAST_MODE" -eq 1 ]; then
        landing_ready=0
    elif ! (cd apps/landing && pnpm run build); then
        warn "Landing build failed (often a transient GitHub fetch during prerender) — skipping landing, rest of the stack will still start"
        landing_ready=0
    fi

    if [ "$FAST_MODE" -eq 1 ]; then
        # Fast mode: Aspen runs under `vite dev` (HMR, no build). Its platform
        # proxy (svelte.config.js) reaches the DO and zephyr workers through
        # wrangler's dev registry, so those still run here. --persist-to keeps
        # their state in aspen's shared dir. --port avoids Heartwood's 8787 —
        # the first config in a multi-config list claims the listening port.
        wrangler dev \
            -c services/durable-objects/wrangler.local.toml \
            -c services/zephyr/wrangler.toml \
            --persist-to "$shared_state" \
            --port 8790 \
            --inspector-port 9230 \
            2>&1 | sed "s/^/  ${DIM}[workers]${RESET} /" &
        PIDS+=("$!")

        (cd apps/aspen && pnpm exec vite dev --port 5173 --strictPort) \
            2>&1 | sed "s/^/  ${DIM}[aspen]${RESET} /" &
        ASPEN_PID=$!
        PIDS+=("$ASPEN_PID")

        log "Waiting for aspen (vite dev, port 5173)..."
        if ! wait_for_port 5173 "aspen"; then
            err "Aspen (vite dev) failed to start within 30 seconds"
            exit 1
        fi
        log "Fast mode ready (plant/landing skipped)."
        return 0
    fi

    # Start main multi-config (aspen + auxiliary DOs/zephyr, which are
    # service-binding-only and don't need their own port).
    # Explicit --inspector-port per process — each `wrangler dev` process
    # independently tries to claim the default inspector port and doesn't
    # reliably auto-increment past a collision when several start close
    # together, so a bare default risks one process failing to bind.
    wrangler dev \
        -c apps/aspen/wrangler.toml \
        -c services/durable-objects/wrangler.local.toml \
        -c services/zephyr/wrangler.toml \
        --inspector-port 9230 \
        2>&1 &
    WRANGLER_PID=$!
    PIDS+=("$WRANGLER_PID")

    log "Waiting for aspen (port 5173)..."
    if ! wait_for_port 5173 "aspen"; then
        err "Aspen failed to start within 30 seconds"
        exit 1
    fi

    # Plant — separate process, explicitly shares aspen's local D1/KV so the
    # onboarding flow sees the same seeded tenant data.
    #
    # --local-upstream localhost: without this, wrangler dev simulates the
    # production route (plant.grove.place/* from wrangler.toml) by rewriting
    # the Host/Origin the app sees to "plant.grove.place" over plain HTTP.
    # Plant's hooks.server.ts CSRF check (validateCSRF) correctly requires
    # HTTPS for any non-localhost origin, so EVERY state-changing POST
    # (profile save, plan selection, etc.) gets rejected with a generic
    # "Cross-site request blocked" 403 unless this is set. Found while
    # debugging the profile-save step throwing "Something went wrong."
    wrangler dev \
        -c apps/plant/wrangler.toml \
        --persist-to "$shared_state" \
        --local-upstream localhost \
        --inspector-port 9231 \
        2>&1 | sed "s/^/  ${DIM}[plant]${RESET} /" &
    PLANT_PID=$!
    PIDS+=("$PLANT_PID")

    log "Waiting for plant (port 5175)..."
    if ! wait_for_port 5175 "plant"; then
        err "Plant failed to start within 30 seconds"
        exit 1
    fi

    if [ "$landing_ready" -eq 1 ]; then
        # Same --local-upstream reasoning as plant above — landing has its
        # own production route pattern (grove.place/*) that would otherwise
        # get faked into the Host/Origin headers locally.
        wrangler dev \
            -c apps/landing/wrangler.toml \
            --persist-to "$shared_state" \
            --local-upstream localhost \
            --inspector-port 9232 \
            2>&1 | sed "s/^/  ${DIM}[landing]${RESET} /" &
        LANDING_PID=$!
        PIDS+=("$LANDING_PID")

        log "Waiting for landing (port 5174)..."
        if ! wait_for_port 5174 "landing"; then
            err "Landing failed to start within 30 seconds"
            exit 1
        fi
    fi

    log "All workers ready."
}

# ── Main ──────────────────────────────────────────────────────────────
main() {
    local mode="${1:-full}"

    echo ""
    echo -e "${BOLD}${GREEN}🌲 Grove Dev Stack${RESET}"
    echo -e "${DIM}────────────────────────────────${RESET}"
    echo ""

    # stop doesn't need wrangler/.dev.vars/engine-dist preflight checks —
    # it's just killing processes, and should work even if the stack is in
    # a broken state that would make preflight itself fail.
    if [ "$mode" = "stop" ]; then
        stop_stack
        return 0
    fi

    [ "$mode" = "fast" ] && FAST_MODE=1
    preflight

    case "$mode" in
        seed)
            apply_migrations
            seed_data "${2:-blog}"
            ;;
        reset)
            reset_databases
            ;;
        fast)
            apply_migrations
            seed_data "blog"
            start_workers
            echo ""
            echo -e "  ${CYAN}Aspen (vite dev, HMR):${RESET} http://localhost:5173"
            print_demo_tenant_urls
            echo ""
            log "Fast mode running. Press Ctrl+C to stop."
            wait
            ;;
        workers)
            apply_migrations
            seed_data "blog"
            start_workers
            echo ""
            local plant_url landing_url
            print_demo_tenant_urls
            print_aspen_branch_note
            if plant_url=$(plant_demo_url); then
                echo -e "  ${CYAN}Plant demo signup:${RESET} $plant_url"
                echo -e "  ${DIM}(or click \"Skip sign-in (Dev Mode)\" on http://localhost:5175)${RESET}"
            fi
            if [ "${landing_ready:-0}" -eq 1 ] && landing_url=$(landing_arbor_demo_url); then
                echo -e "  ${CYAN}Landing Wayfinder /arbor:${RESET} $landing_url"
                echo -e "  ${DIM}(comped-invites, greenhouse, porch — logs in as a real Wayfinder identity)${RESET}"
            fi
            echo ""
            log "Workers running. Press Ctrl+C to stop."
            wait
            ;;
        full|"")
            apply_migrations
            seed_data "blog"
            start_workers
            echo ""
            echo -e "${BOLD}${GREEN}Stack is running:${RESET}"
            echo -e "  ${CYAN}Aspen:${RESET}     http://localhost:5173"
            if [ "${landing_ready:-0}" -eq 1 ]; then
                echo -e "  ${CYAN}Landing:${RESET}   http://localhost:5174"
            fi
            echo -e "  ${CYAN}Plant:${RESET}     http://localhost:5175 (onboarding/signup)"
            echo -e "  ${CYAN}Heartwood:${RESET} http://localhost:8787 (auth API)"
            echo -e "  ${CYAN}Login:${RESET}     http://localhost:5176 (email-code sign-in; codes print in [heartwood] logs)"
            echo -e "  ${CYAN}DOs:${RESET}       via service binding (grove-durable-objects)"
            echo -e "  ${CYAN}Email:${RESET}     via service binding (grove-zephyr)"
            echo ""
            local plant_url landing_url
            print_demo_tenant_urls
            print_aspen_branch_note
            if plant_url=$(plant_demo_url); then
                echo -e "  ${CYAN}Plant demo signup:${RESET} $plant_url"
                echo -e "  ${DIM}(or click \"Skip sign-in (Dev Mode)\" on http://localhost:5175)${RESET}"
            else
                warn "DEMO_MODE_SECRET not found in apps/plant/.dev.vars — Plant demo signup unavailable"
            fi
            if [ "${landing_ready:-0}" -eq 1 ]; then
                if landing_url=$(landing_arbor_demo_url); then
                    echo -e "  ${CYAN}Landing Wayfinder /arbor:${RESET} $landing_url"
                    echo -e "  ${DIM}(comped-invites, greenhouse, porch — logs in as a real Wayfinder identity)${RESET}"
                else
                    warn "DEMO_MODE_SECRET not found in apps/landing/.dev.vars — Landing /arbor demo unavailable"
                fi
            fi
            echo ""
            log "Press Ctrl+C to stop all services."
            wait
            ;;
        *)
            echo "Usage: ./scripts/dev-stack.sh [full|workers|seed|reset|stop]"
            echo ""
            echo "Modes:"
            echo "  full      Start everything (default)"
            echo "  workers   Start workers only (no SvelteKit dev server)"
            echo "  stop      Kill any running dev-stack processes and free their ports"
            echo "  seed      Apply migrations + seed data, then exit"
            echo "  reset     Nuke local DBs, re-migrate, re-seed"
            exit 1
            ;;
    esac
}

main "$@"
