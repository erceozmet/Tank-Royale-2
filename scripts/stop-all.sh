#!/bin/bash

# Tank Royale 2 - Stop All Containers Script
# This script stops all Tank Royale containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Tank Royale 2 - Stopping All Containers${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get all tank-related containers
CONTAINERS=$(podman ps -a --format "{{.Names}}" | grep "^tank-" || true)

if [ -z "$CONTAINERS" ]; then
    echo -e "${YELLOW}No Tank Royale containers found.${NC}"
    exit 0
fi

echo -e "${YELLOW}Found the following containers:${NC}"
echo "$CONTAINERS"
echo ""

# Ask for confirmation
read -p "Do you want to stop all these containers? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Stopping containers...${NC}\n"

# Stop each container
for container in $CONTAINERS; do
    echo -e "${YELLOW}Stopping $container...${NC}"
    podman stop "$container" 2>/dev/null || echo -e "${RED}✗ Failed to stop $container${NC}"
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Containers Stopped${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Current status:${NC}"
podman ps -a --format "table {{.Names}}\t{{.Status}}" | grep "tank-" || echo "No tank containers running"

echo ""
echo -e "${YELLOW}Note: Containers are stopped but not removed.${NC}"
echo -e "${YELLOW}To start them again, run: ./start-all.sh${NC}"
echo ""
echo -e "${YELLOW}To remove containers and volumes completely:${NC}"
echo "  podman compose down -v"
echo ""
