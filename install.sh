#!/usr/bin/env bash
#
# Prompt Refiner Installation Script
# Installs the CLI globally and sets up the environment
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔧 Prompt Refiner Installation"
echo "=============================="
echo ""

# Check for bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo "Install it from https://bun.sh"
    exit 1
fi

# Check for .env file
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        echo -e "${YELLOW}   Please edit .env and set your REFINER_WEBHOOK_URL${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  No .env file found. Create one with REFINER_WEBHOOK_URL set.${NC}"
        echo ""
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

# Build the project
echo "🔨 Building..."
bun run build

# Link globally using bun
echo "🔗 Linking globally..."
bun link

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "Usage:"
echo "  echo \"your prompt\" | prompt-refiner"
echo ""
echo "For daemon mode (faster, cached):"
echo "  prompt-refiner-daemon  # Start daemon in one terminal"
echo "  REFINER_DAEMON=1 echo \"your prompt\" | prompt-refiner"
echo ""
echo "VS Code Extension:"
echo "  The extension works in any workspace after installing the VSIX."
echo "  Install via: code --install-extension $SCRIPT_DIR/prompt-refiner-*.vsix"
echo ""

# Offer to start daemon
read -p "Start the daemon now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting daemon..."
    bun run daemon
fi
