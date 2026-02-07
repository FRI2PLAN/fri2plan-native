#!/usr/bin/env bash

# EAS Build hook to override npm ci with npm install --legacy-peer-deps
# This resolves peer dependency conflicts with React 19.1.0 and tRPC

set -e

echo "🔧 EAS Build Pre-Install Hook: Using npm install --legacy-peer-deps"

# The actual npm install will be handled by EAS with .npmrc configuration
# This hook just ensures the environment is ready
