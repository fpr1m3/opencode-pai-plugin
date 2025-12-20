#!/bin/bash
# test-full-flow.sh - End-to-end test for PAI Plugin setup

set -e

REPO_ROOT=$(pwd)
TEST_DIR="/tmp/opencode-full-test-$(date +%s)"

# --- Cleanup ---
cleanup() {
    echo "🧹 Cleaning up test directory..."
    rm -rf "$TEST_DIR"
}
# trap cleanup EXIT # Uncomment if you want auto-cleanup

# 1. Establish Pristine Environment
./scripts/create-test-env.sh "$TEST_DIR"

# 2. Preparation for Setup
# We override the package to point to the local repo for the test
export PLUGIN_PACKAGE_OVERRIDE="$REPO_ROOT"
export PAI_DIR="$TEST_DIR/local-pai"

cd "$TEST_DIR"

echo "🛠️ Running setup script inside test environment..."
export PAI_NON_INTERACTIVE="true"
"$REPO_ROOT/setup.sh"

# 3. Verification
echo "🔍 Verifying installation artifacts..."

if [ ! -f ".opencode/plugins/pai.ts" ]; then
    echo "❌ Error: Plugin registration file (.opencode/plugins/pai.ts) not found."
    exit 1
fi

if [ ! -f "local-pai/skills/core/SKILL.md" ]; then
    echo "❌ Error: PAI identity file (local-pai/skills/core/SKILL.md) not found."
    exit 1
fi

if ! grep -q "Personal AI Infrastructure" local-pai/skills/core/SKILL.md; then
    echo "❌ Error: SKILL.md content is invalid or empty."
    exit 1
fi

# Check if dependencies were added to package.json
if ! grep -q "opencode-pai-plugin" package.json; then
    echo "❌ Error: Plugin not found in package.json dependencies."
    exit 1
fi

echo "✅ End-to-end verification successful!"
echo "📍 Test project remains at: $TEST_DIR"
