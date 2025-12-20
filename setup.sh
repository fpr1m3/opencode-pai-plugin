#!/bin/bash
# PAI Plugin Setup Script
# Installs the PAI plugin into an OpenCode project

set -e

# --- Configuration ---
PLUGIN_PACKAGE="${PLUGIN_PACKAGE_OVERRIDE:-github:fpr1m3/opencode-pai-plugin}"
PAI_DIR_DEFAULT="$HOME/.claude"

# --- UI Helpers ---
info() { echo -e "\033[0;34m[PAI INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[PAI SUCCESS]\033[0m $1"; }
warn() { echo -e "\033[0;33m[PAI WARN]\033[0m $1"; }
error() { echo -e "\033[0;31m[PAI ERROR]\033[0m $1"; exit 1; }

# --- Logic ---

info "Starting PAI Plugin installation..."

# 1. Project Detection
if [ ! -f "package.json" ]; then
    error "No package.json found. Please run this script from the root of your OpenCode project."
fi

# 2. Dependency Installation
info "Installing plugin package..."
if command -v bun >/dev/null 2>&1; then
    bun add "$PLUGIN_PACKAGE"
elif command -v npm >/dev/null 2>&1; then
    npm install "$PLUGIN_PACKAGE"
else
    error "Neither bun nor npm found. Please install a package manager."
fi

# 3. Plugin Registration
info "Registering PAI Plugin..."
mkdir -p .opencode/plugins

PLUGIN_REG_FILE=".opencode/plugins/pai.ts"
if [ -f "$PLUGIN_REG_FILE" ]; then
    warn "$PLUGIN_REG_FILE already exists. Skipping registration."
else
    cat > "$PLUGIN_REG_FILE" <<EOF
import { PAIPlugin } from "opencode-pai-plugin";

export default PAIPlugin;
EOF
    success "Plugin registered in $PLUGIN_REG_FILE"
fi

# 4. PAI Infrastructure Check
CURRENT_PAI_DIR="${PAI_DIR:-$PAI_DIR_DEFAULT}"
CORE_SKILL_FILE="$CURRENT_PAI_DIR/skills/core/SKILL.md"
info "Checking PAI infrastructure at $CURRENT_PAI_DIR..."

if [ ! -f "$CORE_SKILL_FILE" ]; then
    warn "PAI core identity not found at $CORE_SKILL_FILE"
    # Auto-initialize if non-interactive or if user says yes
    if [[ "$CI" == "true" ]] || [[ "$PAI_NON_INTERACTIVE" == "true" ]]; then
        INITIALIZE_PAI="y"
    else
        read -p "Would you like to initialize a basic PAI structure now? (y/n) " -n 1 -r
        echo ""
        INITIALIZE_PAI=$REPLY
    fi

    if [[ $INITIALIZE_PAI =~ ^[Yy]$ ]]; then
        mkdir -p "$CURRENT_PAI_DIR/skills/core"
        mkdir -p "$CURRENT_PAI_DIR/history/raw-outputs"
        mkdir -p "$CURRENT_PAI_DIR/history/sessions"
        
        cat > "$CORE_SKILL_FILE" <<EOF
# PAI Core Identity
You are {{DA}}, a Personal AI Infrastructure. 
Your primary engineer is {{ENGINEER_NAME}}.
EOF
        info "Created default SKILL.md"
        success "PAI structure initialized."
    fi
fi

success "PAI Plugin installation complete!"
info "You can now run 'opencode' to start using your Personal AI Infrastructure."
