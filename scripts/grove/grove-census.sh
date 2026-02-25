#!/bin/bash
#
# 🌲 Grove Census — Directory-level codebase snapshot pipeline
#
# Captures the monorepo's directory tree structure with per-language line counts.
# Stores snapshots in a SQLite database for the Living Grove visualization.
#
# This is SEPARATE from repo-snapshot.sh. Different pipeline, different output.
#
# Usage:
#   ./scripts/grove/grove-census.sh --backfill     Walk full git history (one snapshot per day)
#   ./scripts/grove/grove-census.sh --today         Snapshot current state only
#   ./scripts/grove/grove-census.sh --help          Show this help
#
# Output: apps/landing/static/data/grove_census.db (SQLite)
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DB_DIR="$PROJECT_ROOT/apps/landing/static/data"
DB_FILE="$DB_DIR/grove_census.db"

# Directories to exclude from counting
EXCLUDES="node_modules .git dist .svelte-kit _archived .turbo .wrangler .vercel coverage __pycache__ .mypy_cache"

# ===========================================================================
# HELPERS
# ===========================================================================

usage() {
    echo "Usage: $(basename "$0") [--backfill|--today|--help]"
    echo ""
    echo "  --backfill   Walk full git history, one snapshot per calendar day"
    echo "  --today      Capture only today's snapshot"
    echo "  --help       Show this help message"
    exit 0
}

log() {
    echo -e "${CYAN}[census]${NC} $1"
}

success() {
    echo -e "${GREEN}[census]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[census]${NC} $1"
}

error() {
    echo -e "${RED}[census]${NC} $1" >&2
}

# Escape single quotes for safe SQL string interpolation
# Usage: sql_escape "it's a path" → "it''s a path"
sql_escape() {
    echo "${1//\'/\'\'}"
}

# ===========================================================================
# DATABASE SETUP
# ===========================================================================

init_db() {
    mkdir -p "$DB_DIR"

    sqlite3 "$DB_FILE" <<'SQL'
CREATE TABLE IF NOT EXISTS snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL UNIQUE,
    commit_hash TEXT NOT NULL,
    total_lines INTEGER NOT NULL DEFAULT 0,
    total_files INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS directories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id  INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    path         TEXT NOT NULL,
    depth        INTEGER NOT NULL,
    total_lines  INTEGER NOT NULL DEFAULT 0,
    ts_lines     INTEGER NOT NULL DEFAULT 0,
    svelte_lines INTEGER NOT NULL DEFAULT 0,
    js_lines     INTEGER NOT NULL DEFAULT 0,
    css_lines    INTEGER NOT NULL DEFAULT 0,
    py_lines     INTEGER NOT NULL DEFAULT 0,
    go_lines     INTEGER NOT NULL DEFAULT 0,
    sql_lines    INTEGER NOT NULL DEFAULT 0,
    sh_lines     INTEGER NOT NULL DEFAULT 0,
    tsx_lines    INTEGER NOT NULL DEFAULT 0,
    md_lines     INTEGER NOT NULL DEFAULT 0,
    other_lines  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_directories_snapshot ON directories(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_directories_path ON directories(path);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(date);
SQL
}

# ===========================================================================
# COUNTING
# ===========================================================================

# Count lines for files matching a pattern in a given directory.
# Usage: count_ext <root_dir> <extension>
count_ext() {
    local root="$1"
    local ext="$2"

    # Build find args as an array (no eval needed)
    local -a find_args=("$root" -name "*.$ext" -type f)
    for dir in $EXCLUDES; do
        find_args+=(! -path "*/$dir/*")
    done

    local result
    result=$(find "${find_args[@]}" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    # If no files found or result is empty/non-numeric, return 0
    if [[ -z "$result" ]] || ! [[ "$result" =~ ^[0-9]+$ ]]; then
        echo 0
    else
        echo "$result"
    fi
}

# Count total tracked files in a directory
count_files_in() {
    local root="$1"

    # Build find args as an array (no eval needed)
    local -a find_args=("$root" -type f)
    for dir in $EXCLUDES; do
        find_args+=(! -path "*/$dir/*")
    done
    # Exclude common non-source files
    find_args+=(! -name '*.lock' ! -name '*.png' ! -name '*.jpg' ! -name '*.svg' ! -name '*.ico' ! -name '*.woff*' ! -name '*.ttf' ! -name '*.eot')

    find "${find_args[@]}" 2>/dev/null | wc -l | tr -d ' '
}

# Snapshot a single directory, capturing line counts per language.
# Usage: snapshot_directory <root_dir> <rel_path> <depth> <snapshot_id>
snapshot_directory() {
    local root_dir="$1"
    local rel_path="$2"
    local depth="$3"
    local snapshot_id="$4"

    local full_path="$root_dir/$rel_path"
    [ -d "$full_path" ] || return 0

    local ts_lines svelte_lines js_lines css_lines py_lines go_lines sql_lines sh_lines tsx_lines md_lines other_lines total_lines

    ts_lines=$(count_ext "$full_path" "ts")
    svelte_lines=$(count_ext "$full_path" "svelte")
    js_lines=$(count_ext "$full_path" "js")
    css_lines=$(count_ext "$full_path" "css")
    py_lines=$(count_ext "$full_path" "py")
    go_lines=$(count_ext "$full_path" "go")
    sql_lines=$(count_ext "$full_path" "sql")
    sh_lines=$(count_ext "$full_path" "sh")
    tsx_lines=$(count_ext "$full_path" "tsx")
    md_lines=$(count_ext "$full_path" "md")
    other_lines=0

    total_lines=$((ts_lines + svelte_lines + js_lines + css_lines + py_lines + go_lines + sql_lines + sh_lines + tsx_lines + md_lines))

    # Only insert if directory has any content
    if [ "$total_lines" -gt 0 ]; then
        local safe_path
        safe_path=$(sql_escape "$rel_path")
        sqlite3 "$DB_FILE" "INSERT INTO directories (snapshot_id, path, depth, total_lines, ts_lines, svelte_lines, js_lines, css_lines, py_lines, go_lines, sql_lines, sh_lines, tsx_lines, md_lines, other_lines) VALUES ($snapshot_id, '$safe_path', $depth, $total_lines, $ts_lines, $svelte_lines, $js_lines, $css_lines, $py_lines, $go_lines, $sql_lines, $sh_lines, $tsx_lines, $md_lines, $other_lines);"
    fi
}

# Walk directory tree at configurable depth.
# Level 0: top-level dirs (apps, libs, workers, docs, scripts, services, tools)
# Level 1: packages within (apps/landing, libs/engine, etc.)
# Level 2: subfolders within large packages
walk_tree() {
    local root_dir="$1"
    local snapshot_id="$2"

    # Top-level directories to scan
    local top_dirs="apps libs workers services docs scripts tools"

    for top in $top_dirs; do
        [ -d "$root_dir/$top" ] || continue

        # Depth 0: the top-level category itself
        snapshot_directory "$root_dir" "$top" 0 "$snapshot_id"

        # Depth 1: packages/sub-projects
        for package_dir in "$root_dir/$top"/*/; do
            [ -d "$package_dir" ] || continue
            local package_name
            package_name=$(basename "$package_dir")

            # Skip excluded directories
            local skip=false
            for excl in $EXCLUDES; do
                if [ "$package_name" = "$excl" ]; then
                    skip=true
                    break
                fi
            done
            $skip && continue

            local rel="$top/$package_name"
            snapshot_directory "$root_dir" "$rel" 1 "$snapshot_id"

            # Depth 2: significant subfolders within large packages
            # Only go deeper for packages with src/ directories
            if [ -d "$package_dir/src" ]; then
                for sub_dir in "$package_dir/src"/*/; do
                    [ -d "$sub_dir" ] || continue
                    local sub_name
                    sub_name=$(basename "$sub_dir")
                    local sub_rel="$rel/src/$sub_name"
                    snapshot_directory "$root_dir" "$sub_rel" 2 "$snapshot_id"
                done
            fi
        done
    done
}

# ===========================================================================
# SNAPSHOT FUNCTIONS
# ===========================================================================

# Take a snapshot of a specific commit in a worktree
# Usage: snapshot_commit <commit_hash> <date>
snapshot_commit() {
    local commit_hash="$1"
    local date="$2"

    # Check if this date already exists
    local existing
    existing=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM snapshots WHERE date='$date';")
    if [ "$existing" -gt 0 ]; then
        return 0
    fi

    local short_hash="${commit_hash:0:7}"
    local worktree_dir="/tmp/grove-census-${short_hash}"

    # Create worktree
    if ! git worktree add --detach "$worktree_dir" "$commit_hash" 2>/dev/null; then
        warn "Failed to create worktree for $short_hash ($date), skipping"
        return 0
    fi

    # Count total files
    local total_files
    total_files=$(count_files_in "$worktree_dir")

    # Insert snapshot record
    sqlite3 "$DB_FILE" "INSERT INTO snapshots (date, commit_hash, total_lines, total_files) VALUES ('$date', '$short_hash', 0, $total_files);"
    local snapshot_id
    snapshot_id=$(sqlite3 "$DB_FILE" "SELECT id FROM snapshots WHERE date='$date';")

    # Walk the directory tree
    walk_tree "$worktree_dir" "$snapshot_id"

    # Update total_lines from sum of depth-0 directories
    sqlite3 "$DB_FILE" "UPDATE snapshots SET total_lines = (SELECT COALESCE(SUM(total_lines), 0) FROM directories WHERE snapshot_id = $snapshot_id AND depth = 0) WHERE id = $snapshot_id;"

    # Clean up worktree
    git worktree remove --force "$worktree_dir" 2>/dev/null || rm -rf "$worktree_dir"

    success "  $date ($short_hash): $(sqlite3 "$DB_FILE" "SELECT total_lines FROM snapshots WHERE id=$snapshot_id;") lines, $total_files files"
}

# Snapshot current working tree (no worktree needed)
snapshot_today() {
    local date
    date=$(date +"%Y-%m-%d")
    local commit_hash
    commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Check if today already exists
    local existing
    existing=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM snapshots WHERE date='$date';")
    if [ "$existing" -gt 0 ]; then
        warn "Snapshot for $date already exists. Updating..."
        local old_id
        old_id=$(sqlite3 "$DB_FILE" "SELECT id FROM snapshots WHERE date='$date';")
        sqlite3 "$DB_FILE" "DELETE FROM directories WHERE snapshot_id=$old_id; DELETE FROM snapshots WHERE id=$old_id;"
    fi

    local total_files
    total_files=$(count_files_in "$PROJECT_ROOT")

    sqlite3 "$DB_FILE" "INSERT INTO snapshots (date, commit_hash, total_lines, total_files) VALUES ('$date', '$commit_hash', 0, $total_files);"
    local snapshot_id
    snapshot_id=$(sqlite3 "$DB_FILE" "SELECT id FROM snapshots WHERE date='$date';")

    walk_tree "$PROJECT_ROOT" "$snapshot_id"

    sqlite3 "$DB_FILE" "UPDATE snapshots SET total_lines = (SELECT COALESCE(SUM(total_lines), 0) FROM directories WHERE snapshot_id = $snapshot_id AND depth = 0) WHERE id = $snapshot_id;"

    success "Today ($date, $commit_hash): $(sqlite3 "$DB_FILE" "SELECT total_lines FROM snapshots WHERE id=$snapshot_id;") lines, $total_files files"
}

# ===========================================================================
# BACKFILL
# ===========================================================================

backfill() {
    log "Starting full history backfill..."

    cd "$PROJECT_ROOT"

    # Ensure full history
    if [ -f ".git/shallow" ]; then
        log "Shallow clone detected, fetching full history..."
        git fetch --unshallow origin 2>/dev/null || true
    fi

    # Get all commits grouped by calendar day (latest commit per day)
    # Format: "commit_hash YYYY-MM-DD"
    log "Collecting daily commits..."
    local commits_file="/tmp/grove-census-commits.txt"

    git log --format='%H %aI' --reverse | \
        awk '{split($2,d,"T"); print $1, d[1]}' | \
        awk '!seen[$2]++ {line[$2]=$0} {line[$2]=$0} END {for (d in line) print line[d]}' | \
        sort -k2 > "$commits_file"

    local total_days
    total_days=$(wc -l < "$commits_file" | tr -d ' ')
    log "Found $total_days unique days with commits"

    local count=0
    while IFS=' ' read -r hash date; do
        count=$((count + 1))
        echo -ne "\r${CYAN}[census]${NC} Processing day $count/$total_days: $date  "
        snapshot_commit "$hash" "$date"
    done < "$commits_file"

    echo ""
    rm -f "$commits_file"

    # Clean up any leftover worktrees
    git worktree prune 2>/dev/null || true

    local total_snapshots
    total_snapshots=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM snapshots;")
    local total_dirs
    total_dirs=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM directories;")

    success "Backfill complete: $total_snapshots snapshots, $total_dirs directory records"
}

# ===========================================================================
# JSON EXPORT
# ===========================================================================

export_json() {
    local json_file="$DB_DIR/grove_census.json"
    log "Exporting census data to JSON..."

    local snapshot_count
    snapshot_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM snapshots;")
    if [ "$snapshot_count" -eq 0 ]; then
        warn "No snapshots in database, skipping JSON export"
        return 0
    fi

    # Use Python for proper JSON escaping of path values
    python3 -c "
import sqlite3, json, datetime

db = sqlite3.connect('$DB_FILE')
db.row_factory = sqlite3.Row

frames = []
for snap in db.execute('SELECT id, date, commit_hash, total_lines, total_files FROM snapshots ORDER BY date'):
    dirs = []
    for d in db.execute('''
        SELECT path, depth, total_lines, ts_lines, svelte_lines, js_lines,
               css_lines, py_lines, go_lines, sql_lines, sh_lines, tsx_lines,
               md_lines, other_lines
        FROM directories WHERE snapshot_id=? ORDER BY depth, path
    ''', (snap['id'],)):
        dirs.append({
            'path': d['path'], 'depth': d['depth'],
            'totalLines': d['total_lines'], 'tsLines': d['ts_lines'],
            'svelteLines': d['svelte_lines'], 'jsLines': d['js_lines'],
            'cssLines': d['css_lines'], 'pyLines': d['py_lines'],
            'goLines': d['go_lines'], 'sqlLines': d['sql_lines'],
            'shLines': d['sh_lines'], 'tsxLines': d['tsx_lines'],
            'mdLines': d['md_lines'], 'otherLines': d['other_lines'],
        })
    frames.append({
        'date': snap['date'], 'commit': snap['commit_hash'],
        'totalLines': snap['total_lines'], 'totalFiles': snap['total_files'],
        'directories': dirs,
    })

db.close()

output = {
    'frames': frames,
    'generated': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
}

with open('$json_file', 'w') as f:
    json.dump(output, f, separators=(',', ':'))
"

    local json_size
    json_size=$(du -h "$json_file" 2>/dev/null | cut -f1)
    success "JSON exported: $json_file ($json_size)"
}

# ===========================================================================
# MAIN
# ===========================================================================

echo -e "${CYAN}🌲 Grove Census${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "${1:---help}" in
    --backfill)
        init_db
        backfill
        export_json
        ;;
    --today)
        cd "$PROJECT_ROOT"
        init_db
        snapshot_today
        export_json
        ;;
    --help|-h)
        usage
        ;;
    *)
        error "Unknown option: $1"
        usage
        ;;
esac

echo ""
log "Database: $DB_FILE"
log "Size: $(du -h "$DB_FILE" 2>/dev/null | cut -f1)"
echo ""
