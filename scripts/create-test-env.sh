#!/bin/bash
# create-test-env.sh - Setup a pristine OpenCode test environment
# Usage: ./scripts/create-test-env.sh [target_dir]

set -e

TARGET_DIR="${1:-/tmp/opencode-pristine-$(date +%s)}"
PAI_TEST_DIR="$TARGET_DIR/local-pai"

echo "🚀 Creating pristine OpenCode environment..."
echo "📍 Project Root: $TARGET_DIR"
echo "🏠 Local PAI_DIR: $PAI_TEST_DIR"

mkdir -p "$TARGET_DIR"
mkdir -p "$PAI_TEST_DIR"

# Ensure we're absolute
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)
PAI_TEST_DIR=$(cd "$PAI_TEST_DIR" && pwd)

cd "$TARGET_DIR"

# 1. Initialize Git (OpenCode needs a worktree)
git init -q

# 2. Create basic package.json
cat > package.json <<EOF
{
  "name": "pristine-opencode-project",
  "version": "1.0.0",
  "description": "A fresh OpenCode project for testing PAI plugin",
  "private": true
}
EOF

# 3. Setup .opencode directory
mkdir -p .opencode/plugins

# 4. Create a dummy README
echo "# Pristine Test Project" > README.md

echo ""
echo "✅ Pristine environment established."
echo "------------------------------------------------"
echo "To begin testing:"
echo "export PAI_DIR=$PAI_TEST_DIR"
echo "cd $TARGET_DIR"
echo "------------------------------------------------"

# Output the path for other scripts to capture
echo "$TARGET_DIR" > /tmp/last_opencode_test_env
