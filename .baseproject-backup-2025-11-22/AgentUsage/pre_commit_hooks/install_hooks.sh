#!/bin/bash
# Git Hooks Installer for BaseProject
# Interactive script to install appropriate hooks based on project type

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Git Hooks Installer - BaseProject        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# DETECT PROJECT ROOT AND HOOKS DIRECTORY
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_SOURCE="$SCRIPT_DIR"
HOOKS_DEST="$PROJECT_ROOT/.git/hooks"

echo -e "${CYAN}Project root:${NC} $PROJECT_ROOT"
echo -e "${CYAN}Hooks source:${NC} $HOOKS_SOURCE"
echo -e "${CYAN}Hooks destination:${NC} $HOOKS_DEST"
echo ""

# Check if .git directory exists
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${RED}✗ Error: .git directory not found!${NC}"
    echo -e "${YELLOW}This script must be run from within a git repository.${NC}"
    echo -e "${YELLOW}Run 'git init' first.${NC}"
    exit 1
fi

# ============================================================================
# DETECT PROJECT TYPE
# ============================================================================
echo -e "${YELLOW}🔍 Detecting project type...${NC}"
echo ""

PROJECT_TYPES=()

# Python
if [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/setup.py" ]; then
    PROJECT_TYPES+=("python")
    echo -e "  ${GREEN}✓ Python project detected${NC}"
fi

# JavaScript/Node
if [ -f "$PROJECT_ROOT/package.json" ]; then
    PROJECT_TYPES+=("javascript")
    echo -e "  ${GREEN}✓ JavaScript/Node project detected${NC}"
fi

# Go
if [ -f "$PROJECT_ROOT/go.mod" ]; then
    PROJECT_TYPES+=("go")
    echo -e "  ${GREEN}✓ Go project detected${NC}"
fi

# Rust
if [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
    PROJECT_TYPES+=("rust")
    echo -e "  ${GREEN}✓ Rust project detected${NC}"
fi

echo ""

# ============================================================================
# DETERMINE INSTALLATION STRATEGY
# ============================================================================
SELECTED_TYPE=""

if [ ${#PROJECT_TYPES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠ No specific project type detected${NC}"
    echo -e "${YELLOW}What type of project is this?${NC}"
    echo ""
    echo "  1) Python"
    echo "  2) JavaScript/TypeScript/Node"
    echo "  3) Go"
    echo "  4) Rust"
    echo "  5) Multi-language (install all language hooks)"
    echo "  6) Minimal (only commit-msg and secrets scanner)"
    echo ""
    read -p "Select option (1-6): " choice

    case $choice in
        1) SELECTED_TYPE="python";;
        2) SELECTED_TYPE="javascript";;
        3) SELECTED_TYPE="go";;
        4) SELECTED_TYPE="rust";;
        5) SELECTED_TYPE="multi";;
        6) SELECTED_TYPE="minimal";;
        *) echo -e "${RED}Invalid choice${NC}"; exit 1;;
    esac

elif [ ${#PROJECT_TYPES[@]} -eq 1 ]; then
    # Only one type detected
    SELECTED_TYPE="${PROJECT_TYPES[0]}"
    echo -e "${GREEN}Installing hooks for: $SELECTED_TYPE${NC}"
    echo ""

else
    # Multiple types detected
    echo -e "${YELLOW}Multiple project types detected:${NC} ${PROJECT_TYPES[*]}"
    echo -e "${YELLOW}Recommend using multi-language hooks.${NC}"
    echo ""
    echo "  1) Use multi-language hooks (recommended)"
    echo "  2) Choose specific language"
    echo ""
    read -p "Select option (1-2): " choice

    if [ "$choice" = "1" ]; then
        SELECTED_TYPE="multi"
    else
        echo ""
        echo "Select language:"
        select lang in "${PROJECT_TYPES[@]}"; do
            SELECTED_TYPE="$lang"
            break
        done
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Installing hooks for:${NC} $SELECTED_TYPE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# BACKUP EXISTING HOOKS
# ============================================================================
BACKUP_DIR="$HOOKS_DEST/backup-$(date +%Y%m%d-%H%M%S)"

# Check if any hooks already exist
EXISTING_HOOKS=$(ls -1 "$HOOKS_DEST" 2>/dev/null | grep -v "\.sample$" | grep -v "^backup-" || true)

if [ -n "$EXISTING_HOOKS" ]; then
    echo -e "${YELLOW}⚠ Existing hooks found${NC}"
    echo ""
    read -p "Backup existing hooks? (y/n): " backup_choice

    if [ "$backup_choice" = "y" ] || [ "$backup_choice" = "Y" ]; then
        mkdir -p "$BACKUP_DIR"
        for hook in $EXISTING_HOOKS; do
            if [ -f "$HOOKS_DEST/$hook" ]; then
                cp "$HOOKS_DEST/$hook" "$BACKUP_DIR/"
                echo -e "  ${CYAN}Backed up:${NC} $hook"
            fi
        done
        echo -e "  ${GREEN}✓ Backup saved to: $BACKUP_DIR${NC}"
        echo ""
    fi
fi

# ============================================================================
# INSTALL HOOKS BASED ON PROJECT TYPE
# ============================================================================
install_hook() {
    local hook_name=$1
    local source_file=$2

    if [ ! -f "$HOOKS_SOURCE/$source_file" ]; then
        echo -e "  ${RED}✗ Source file not found: $source_file${NC}"
        return 1
    fi

    cp "$HOOKS_SOURCE/$source_file" "$HOOKS_DEST/$hook_name"
    chmod +x "$HOOKS_DEST/$hook_name"
    echo -e "  ${GREEN}✓ Installed:${NC} $hook_name (from $source_file)"
}

echo -e "${YELLOW}📦 Installing hooks...${NC}"
echo ""

# Universal hooks (always install)
install_hook "commit-msg" "commit-msg"
install_hook "pre-commit-secrets" "pre-commit-secrets-scanner"

# Language-specific hooks
case $SELECTED_TYPE in
    python)
        install_hook "pre-commit" "pre-commit-python"
        install_hook "pre-push" "pre-push"
        install_hook "post-checkout" "post-checkout"
        ;;

    javascript)
        install_hook "pre-commit" "pre-commit-javascript"
        install_hook "pre-push" "pre-push"
        install_hook "post-checkout" "post-checkout"
        ;;

    go)
        install_hook "pre-commit" "pre-commit-go"
        install_hook "pre-push" "pre-push"
        install_hook "post-checkout" "post-checkout"
        ;;

    rust)
        install_hook "pre-push" "pre-push"
        install_hook "post-checkout" "post-checkout"
        echo -e "  ${YELLOW}⚠ No Rust-specific pre-commit hook (use multi-language)${NC}"
        ;;

    multi)
        install_hook "pre-commit" "pre-commit-multi-language"
        install_hook "pre-push" "pre-push"
        install_hook "post-checkout" "post-checkout"
        ;;

    minimal)
        # Only universal hooks (already installed above)
        ;;
esac

# ============================================================================
# OPTIONAL HOOKS
# ============================================================================
echo ""
echo -e "${YELLOW}Optional hooks:${NC}"
echo ""

read -p "Install prepare-commit-msg (auto-adds branch context)? (y/n): " prep_choice
if [ "$prep_choice" = "y" ] || [ "$prep_choice" = "Y" ]; then
    install_hook "prepare-commit-msg" "prepare-commit-msg"
fi

read -p "Install post-commit (shows TODO summary)? (y/n): " post_choice
if [ "$post_choice" = "y" ] || [ "$post_choice" = "Y" ]; then
    install_hook "post-commit" "post-commit"
fi

# ============================================================================
# VERIFY INSTALLATION
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Verifying installation...${NC}"
echo ""

cd "$HOOKS_DEST"
INSTALLED_HOOKS=$(ls -1 | grep -v "\.sample$" | grep -v "^backup-" || true)

for hook in $INSTALLED_HOOKS; do
    if [ -x "$hook" ]; then
        echo -e "  ${GREEN}✓${NC} $hook (executable)"
    else
        echo -e "  ${RED}✗${NC} $hook (not executable)"
    fi
done

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Installed hooks:${NC}"
echo "$INSTALLED_HOOKS" | sed 's/^/  • /'
echo ""

echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  1. Test hooks by making a commit"
echo "  2. Hooks will run automatically on git operations"
echo "  3. Use 'git commit --no-verify' to bypass (not recommended)"
echo "  4. Check AgentUsage/pre_commit_hooks/setup_guide.md for details"
echo ""

echo -e "${CYAN}Hook behavior:${NC}"
echo "  • ${GREEN}commit-msg${NC} - Validates commit message format"
echo "  • ${GREEN}pre-commit-secrets${NC} - Scans for API keys/secrets"
if [ "$SELECTED_TYPE" != "minimal" ]; then
    echo "  • ${GREEN}pre-commit${NC} - Runs code formatters and linters"
    echo "  • ${GREEN}pre-push${NC} - Runs tests before pushing"
    echo "  • ${GREEN}post-checkout${NC} - Auto-updates dependencies"
fi
[ "$prep_choice" = "y" ] && echo "  • ${GREEN}prepare-commit-msg${NC} - Adds branch context to commits"
[ "$post_choice" = "y" ] && echo "  • ${GREEN}post-commit${NC} - Shows TODO summary after commit"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
