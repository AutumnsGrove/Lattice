#!/bin/bash
# gw installer — three-tier fallback:
#   1. GitHub Releases (gh CLI or curl)
#   2. Local dist/ directory
#   3. go build from source
#
# Usage: bash install.sh

set -e

# ── Constants ──────────────────────────────────
REPO="AutumnsGrove/Lattice"
TOOL="gw"
TAG_PREFIX="gw/v"
ALIASES="grove mycel mycelium"
INSTALL_DIR="$HOME/.local/bin"

# ── Platform detection ─────────────────────────
detect_platform() {
  local os arch
  os=$(uname -s)
  arch=$(uname -m)

  case "$os" in
    Linux)   os_name="linux" ;;
    Darwin)  os_name="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) os_name="windows" ;;
    *) echo "Unsupported OS: $os"; exit 1 ;;
  esac

  case "$arch" in
    x86_64|amd64) arch_name="x86_64" ;;
    arm64|aarch64) arch_name="arm64" ;;
    *) echo "Unsupported architecture: $arch"; exit 1 ;;
  esac

  echo "${os_name}-${arch_name}"
}

# ── Tier 1: GitHub Releases ───────────────────
try_github_release() {
  local platform="$1"
  local binary_name="$2"
  local asset="${TOOL}-${platform}"
  if [ "$platform" = "windows-x86_64" ]; then
    asset="${TOOL}-windows-x86_64.exe"
  fi

  echo "Checking GitHub Releases..."

  # Try gh CLI first (handles auth automatically)
  if command -v gh >/dev/null 2>&1; then
    # Find latest release tag matching our prefix
    local tag
    tag=$(gh release list --repo "$REPO" --limit 20 2>/dev/null \
      | grep "${TAG_PREFIX}" \
      | head -1 \
      | cut -f3)

    if [ -n "$tag" ]; then
      echo "Found release: $tag"
      echo "Downloading $asset..."
      if gh release download "$tag" \
        --repo "$REPO" \
        --pattern "$asset" \
        --dir /tmp \
        --clobber 2>/dev/null; then
        mv "/tmp/$asset" "$INSTALL_DIR/$binary_name.tmp"
        mv "$INSTALL_DIR/$binary_name.tmp" "$INSTALL_DIR/$binary_name"
        chmod +x "$INSTALL_DIR/$binary_name"
        return 0
      fi
      echo "Download failed, trying next method..."
    fi
  fi

  # Fallback: curl to GitHub API (no auth required for public repos)
  local api_url="https://api.github.com/repos/${REPO}/releases"
  local tag
  tag=$(curl -sf "$api_url" 2>/dev/null \
    | grep '"tag_name"' \
    | grep "\"${TAG_PREFIX}" \
    | head -1 \
    | cut -d'"' -f4)

  if [ -n "$tag" ]; then
    echo "Found release: $tag (via API)"
    local download_url="https://github.com/${REPO}/releases/download/${tag}/${asset}"
    echo "Downloading $asset..."
    if curl -sfL "$download_url" -o "$INSTALL_DIR/$binary_name.tmp" 2>/dev/null; then
      # Verify we got a binary, not an error page
      if [ -s "$INSTALL_DIR/$binary_name.tmp" ]; then
        mv "$INSTALL_DIR/$binary_name.tmp" "$INSTALL_DIR/$binary_name"
        chmod +x "$INSTALL_DIR/$binary_name"
        return 0
      fi
      rm -f "$INSTALL_DIR/$binary_name.tmp"
    fi
    echo "Download failed, trying next method..."
  fi

  return 1
}

# ── Tier 2: Local dist/ ───────────────────────
try_local_dist() {
  local platform="$1"
  local binary_name="$2"
  local script_dir="$3"
  local src="${script_dir}/dist/${TOOL}-${platform}"
  if [ "$platform" = "windows-x86_64" ]; then
    src="${script_dir}/dist/${TOOL}-windows-x86_64.exe"
  fi

  if [ -f "$src" ]; then
    echo "Found local binary: $src"
    cp "$src" "$INSTALL_DIR/$binary_name"
    chmod +x "$INSTALL_DIR/$binary_name"
    return 0
  fi

  return 1
}

# ── Tier 3: Build from source ─────────────────
try_go_build() {
  local binary_name="$1"
  local script_dir="$2"

  if ! command -v go >/dev/null 2>&1; then
    echo "Go not found. Install Go or download a pre-built binary from:"
    echo "  https://github.com/${REPO}/releases"
    exit 1
  fi

  echo "Building from source..."
  cd "$script_dir"
  go build -o "$INSTALL_DIR/$binary_name" .
  return 0
}

# ── Main ──────────────────────────────────────
main() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local platform
  platform=$(detect_platform)
  local binary_name="$TOOL"
  if [ "$platform" = "windows-x86_64" ]; then
    binary_name="${TOOL}.exe"
  fi

  mkdir -p "$INSTALL_DIR"

  echo "Installing $TOOL for $platform..."
  echo ""

  if try_github_release "$platform" "$binary_name"; then
    echo "Installed from GitHub Releases"
  elif try_local_dist "$platform" "$binary_name" "$script_dir"; then
    echo "Installed from local dist/"
  elif try_go_build "$binary_name" "$script_dir"; then
    echo "Built and installed from source"
  else
    echo "All install methods failed."
    exit 1
  fi

  # Create aliases
  for alias in $ALIASES; do
    ln -sf "$INSTALL_DIR/$binary_name" "$INSTALL_DIR/$alias"
  done

  echo ""
  echo "$TOOL installed to $INSTALL_DIR/$binary_name"
  echo "Aliases: $ALIASES"
  echo "Size: $(du -h "$INSTALL_DIR/$binary_name" | cut -f1)"
  echo ""

  # Verify
  "$INSTALL_DIR/$binary_name" version 2>&1 || true
}

main "$@"
