#!/usr/bin/env bash
set -euo pipefail

# Publish all @autumnsgrove packages in dependency order.
# Usage: ./scripts/publish-all.sh [--dry-run]
#
# Requires: npm auth token configured for registry.npmjs.org

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "🌿 DRY RUN — no packages will be published"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="https://registry.npmjs.org"

publish_pkg() {
  local name="$1"
  local dir="$ROOT/libs/$name"

  if [[ ! -d "$dir" ]]; then
    echo "❌ Directory not found: $dir"
    return 1
  fi

  local version
  version=$(node -p "require('$dir/package.json').version")
  local full_name
  full_name=$(node -p "require('$dir/package.json').name")

  # Check if this version is already published
  if npm view "$full_name@$version" version --registry "$REGISTRY" 2>/dev/null | grep -q "$version"; then
    echo "⏭️  $full_name@$version already published, skipping"
    return 0
  fi

  echo "📦 Publishing $full_name@$version..."
  cd "$dir"
  pnpm publish --access public --registry "$REGISTRY" --no-git-checks $DRY_RUN
  echo "✅ $full_name@$version published"
  echo ""
}

echo ""
echo "═══════════════════════════════════════════"
echo "  🌳 Lattice Package Publisher"
echo "═══════════════════════════════════════════"
echo ""

# Tier 1: Standalone packages (no internal deps)
echo "── Tier 1: Standalone ──"
publish_pkg "grove-errors"
publish_pkg "grove-crypto"
publish_pkg "grove-markdown"
publish_pkg "prism"

# Tier 2: Packages depending on tier 1
echo "── Tier 2: Core infrastructure ──"
publish_pkg "infra"
publish_pkg "loom"
publish_pkg "curios"

# Tier 3: The engine (depends on everything above)
echo "── Tier 3: Engine ──"

# Engine needs pnpm publish (not npm) to convert workspace:* to real versions
echo "📦 Building & publishing @autumnsgrove/lattice..."
cd "$ROOT/libs/engine"
pnpm run package
pnpm publish --access public --registry "$REGISTRY" --no-git-checks $DRY_RUN
echo "✅ @autumnsgrove/lattice published"

echo ""
echo "═══════════════════════════════════════════"
echo "  🌿 All packages published successfully"
echo "═══════════════════════════════════════════"
