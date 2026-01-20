#!/bin/bash

# Development server startup script
# Starts both backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ports
BACKEND_PORT=${DEV_BE_PORT:-3401}
FRONTEND_PORT=${DEV_FE_PORT:-3400}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting Claude Code Viewer development servers...${NC}"

# Start backend
echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
NODE_ENV=development npx tsx src/server/main.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Check if backend started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start${NC}"
    exit 1
fi

# Start frontend
echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Servers running:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "  Remote:   ${GREEN}http://localhost:$FRONTEND_PORT/remote${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Wait for either process to exit
wait
