#!/bin/bash
# Test script for Qwen TTS Web Interface
# Starts backend, waits for it to be ready, then runs Playwright tests

set -e

echo "=== Qwen TTS E2E Tests ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
FRONTEND_DIR="$SCRIPT_DIR"

echo -e "${YELLOW}Starting backend server...${NC}"

# Start backend in background
cd "$BACKEND_DIR"
python main.py &
BACKEND_PID=$!

# Function to cleanup on exit
cleanup() {
  echo -e "${YELLOW}Cleaning up...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}Backend is ready!${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}Backend failed to start within 30 seconds${NC}"
    exit 1
  fi
  sleep 1
done

echo -e "${YELLOW}Running Playwright tests...${NC}"

# Run Playwright tests
cd "$FRONTEND_DIR"
bun playwright test e2e/tts.spec.ts

echo -e "${GREEN}Tests completed!${NC}"
