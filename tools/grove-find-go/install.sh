#!/bin/bash
# gf installer - Auto-detect platform and install gf binary
# Usage: bash install.sh

set -e

# Detect platform
detect_platform() {
  local os=$(uname -s)
  local arch=$(uname -m)

  case "$os" in
    Linux)
      os_name="linux"
      ;;
    Darwin)
      os_name="darwin"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      os_name="windows"
      ;;
    *)
      echo "❌ Unsupported OS: $os"
      exit 1
      ;;
  esac

  case "$arch" in
    x86_64|amd64)
      arch_name="x86_64"
      ;;
    arm64|aarch64)
      arch_name="arm64"
      ;;
    *)
      echo "❌ Unsupported architecture: $arch"
      exit 1
      ;;
  esac

  echo "${os_name}-${arch_name}"
}

# Main install
main() {
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local platform=$(detect_platform)
  local binary_name="gf"

  if [ "$platform" = "windows-x86_64" ]; then
    binary_name="gf.exe"
  fi

  local src_binary="$script_dir/dist/gf-${platform}"
  if [ "$platform" = "windows-x86_64" ]; then
    src_binary="$script_dir/dist/gf-windows-x86_64.exe"
  fi

  if [ ! -f "$src_binary" ]; then
    echo "❌ Binary not found for $platform at $src_binary"
    echo ""
    echo "Available binaries:"
    ls -1 "$script_dir/dist/" 2>/dev/null || echo "   (no dist/ directory)"
    echo ""
    echo "Falling back to local build..."
    cd "$script_dir"
    go build -o ~/.local/bin/$binary_name .
    echo "✓ gf built and installed to ~/.local/bin/$binary_name"
    return 0
  fi

  # Create ~/.local/bin if needed
  mkdir -p ~/.local/bin

  # Copy binary
  cp "$src_binary" ~/.local/bin/$binary_name
  chmod +x ~/.local/bin/$binary_name

  echo "✓ gf installed to ~/.local/bin/$binary_name"
  echo ""
  echo "Detected platform: $platform"
  echo "Binary size: $(du -h ~/.local/bin/$binary_name | cut -f1)"
  echo ""
  echo "Next: Ensure ~/.local/bin is in your PATH"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  gf --help 2>&1 | head -3 || echo "(gf available, run 'gf --help' for usage)"
}

main "$@"
