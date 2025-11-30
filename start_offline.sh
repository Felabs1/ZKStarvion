#!/bin/bash

# ==========================================
# 🛠️ ZKStarvion One-Click Offline Launcher
# ==========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}
  ______  ______  _                   _             
 |__  / |/ / ___|| |_ __ _ _ ____   _(_) ___  _ __  
   / /| ' /\\___ \\| __/ _\` | '__\\ \\ / / |/ _ \\| '_ \\ 
  / /_| . \\ ___) | || (_| | |   \\ V /| | (_) | | | |
 /____|_|\\_\\____/ \\__\\__,_|_|    \\_/ |_|\\___/|_| |_|
${NC}"
echo -e "${BLUE}🚀 Initializing Offline Environment...${NC}\n"

# 1. PREREQUISITE CHECK
if ! command -v docker &> /dev/null; then echo -e "${RED}❌ Docker missing.${NC}"; exit 1; fi
if ! command -v scarb &> /dev/null; then echo -e "${RED}❌ Scarb missing.${NC}"; exit 1; fi
if ! command -v node &> /dev/null; then echo -e "${RED}❌ Node.js missing.${NC}"; exit 1; fi

# 2. CREDENTIALS INPUT
# --------------------
if [ -f .env.secrets ]; then
    echo -e "${GREEN}🔑 Found .env.secrets file, loading keys...${NC}"
    source .env.secrets
    
    PRIVATE_KEY=$ZCASH_RELAYER_PRIVATE_KEY
    ACCOUNT_ADDRESS=$ZCASH_RELAYER_ACCOUNT_ADDRESS
else
    echo -e "${YELLOW}🔑 Enter your Starknet Sepolia Credentials:${NC}"
    read -p "Private Key (0x...): " PRIVATE_KEY
    read -p "Account Address (0x...): " ACCOUNT_ADDRESS
    
    echo "ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY" > .env.secrets
    echo "ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS" >> .env.secrets
fi

# 3. PREPARE RELAYER ENV
# ----------------------
# We create the base .env file for the relayer NOW so deploy.js can read/write to it
echo -e "\n${BLUE}🔌 Preparing Relayer Config...${NC}"
mkdir -p zcash_relayer
cat <<EOF > zcash_relayer/.env
ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS
EOF

# 4. BUILD CONTRACTS
# -----------------
echo -e "\n${BLUE}🏗️  Building Starknet Contracts...${NC}"
cd verifier_contract
scarb clean
scarb build
if [ $? -ne 0 ]; then echo -e "${RED}❌ Scarb build failed.${NC}"; exit 1; fi
cd ..

# 5. DEPLOY CONTRACTS (The Multi-Contract Script)
# ------------------
echo -e "\n${BLUE}📜 Deploying Bridge & Token...${NC}"
cd scripts
npm install --silent

# Pass keys to the script via env vars just in case
export ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
export ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS

# Run the new deploy.js (It handles declaring both and linking them)
node deploy.js
if [ $? -ne 0 ]; then echo -e "${RED}❌ Deployment failed.${NC}"; exit 1; fi
cd ..

# 6. SETUP ZCASH NODE
# ----------------
echo -e "\n${BLUE}🐳 Starting Zcash Docker Node...${NC}"
# Run setup.js (This mines coins and generates addresses)
cd zcash_relayer
npm install --silent
node setup.js

# setup.js writes BRIDGE_ADDR and USER_Z_ADDRESS to console/env
# We assume setup.js (from previous steps) appends to .env correctly.
# If not, ensure your setup.js reads .env, appends, and writes back.

# 7. LAUNCH SERVICES
# ------------------
echo -e "\n${BLUE}🚀 Launching Services...${NC}"

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    if [ ! -z "$RELAYER_PID" ]; then
        kill $RELAYER_PID
    fi
    exit
}
trap cleanup SIGINT

# Start Relayer
node server.js &
RELAYER_PID=$!
sleep 5

# Safety Refill
curl -s -X POST http://localhost:3001/refill > /dev/null

# Start UI
cd ../zcash-starknet-ui
npm install --silent
echo -e "${BLUE}Opening Dashboard at http://localhost:5173${NC}"
npm run dev

wait $RELAYER_PID