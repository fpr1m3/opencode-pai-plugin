#!/bin/bash
# test-full-flow.sh - End-to-end test for PAI Plugin Auto-Initialization

set -e

REPO_ROOT=$(pwd)
TEST_DIR="/tmp/opencode-full-test-$(date +%s)"

# 1. Establish Pristine Environment
./scripts/create-test-env.sh "$TEST_DIR"

# 2. Preparation
export PAI_DIR="$TEST_DIR/local-pai"

echo "🛠️ Verifying auto-initialization via plugin lifecycle..."
cd "$REPO_ROOT"
bun scripts/verify-auto-init.ts

echo "✅ End-to-end verification successful!"
