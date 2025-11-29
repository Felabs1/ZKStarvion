# #!/bin/bash

# # ==========================================
# # 🛠️ ZKStarvion One-Click Offline Launcher
# # ==========================================

# # Colors for pretty output
# GREEN='\033[0;32m'
# BLUE='\033[0;34m'
# YELLOW='\033[1;33m'
# RED='\033[0;31m'
# NC='\033[0m' # No Color

# echo -e "${BLUE}
#   _____  _  __  _____  _                    _               
#  |__  / | |/ / / ____|| |                  (_)              
#     / /  | ' / | (___  | |_   __ _  _ __  __   __  ___   _ __ 
#    / /   |  <   \___ \ | __| / _\` || '__| \ \ / / / _ \ | '__|
#   / /_   | . \  ____) || |_ | (_| || |     \ V / | (_) || |   
#  /____|  |_|\_\|_____/  \__| \__,_||_|      \_/   \___/ |_|   
                                                              
# ${NC}"
# echo -e "${BLUE}🚀 Initializing Offline Environment...${NC}\n"

# # 1. PREREQUISITE CHECK
# # ---------------------
# echo -e "${YELLOW}🔍 Checking tools...${NC}"
# if ! command -v docker &> /dev/null; then
#     echo -e "${RED}❌ Docker is not installed or not running.${NC}"
#     exit 1
# fi
# if ! command -v scarb &> /dev/null; then
#     echo -e "${RED}❌ Scarb is not installed.${NC}"
#     exit 1
# fi
# if ! command -v node &> /dev/null; then
#     echo -e "${RED}❌ Node.js is not installed.${NC}"
#     exit 1
# fi
# echo -e "${GREEN}✅ All tools found.${NC}\n"

# # 2. CREDENTIALS INPUT
# # --------------------
# # We need these to deploy the contract and configure the relayer
# if [ -f .env.secrets ]; then
#     echo -e "${GREEN}🔑 Found .env.secrets file, loading keys...${NC}"
#     source .env.secrets
# else
#     echo -e "${YELLOW}🔑 Enter your Starknet Sepolia Credentials (Argent/Braavos):${NC}"
#     read -p "Private Key (0x...): " PRIVATE_KEY
#     read -p "Account Address (0x...): " ACCOUNT_ADDRESS
    
#     # Save for next time (Optional convenience)
#     echo "ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY" > .env.secrets
#     echo "ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS" >> .env.secrets
# fi

# # 3. BUILD CONTRACT
# # -----------------
# echo -e "\n${BLUE}🏗️  Building Starknet Contract...${NC}"
# cd verifier_contract
# scarb build
# if [ $? -ne 0 ]; then
#     echo -e "${RED}❌ Scarb build failed.${NC}"
#     exit 1
# fi
# cd ..

# # 4. DEPLOY CONTRACT
# # ------------------
# echo -e "\n${BLUE}📜 Deploying Contract to Sepolia...${NC}"
# cd scripts
# npm install --silent

# # Run deploy script and capture output to find the address
# # We pass keys as env vars to the node process temporarily
# export ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
# export ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS

# DEPLOY_OUTPUT=$(node declare.js)
# echo "$DEPLOY_OUTPUT"

# # Extract Address using Regex (Assuming output contains "Contract Address: 0x...")
# CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[0-9a-fA-F]{50,}")

# if [ -z "$CONTRACT_ADDRESS" ]; then
#     echo -e "${RED}❌ Could not capture Contract Address from deploy script.${NC}"
#     # Fallback: Ask user to paste it if auto-detection fails
#     read -p "Please paste the Deployed Contract Address manually: " CONTRACT_ADDRESS
# else
#     echo -e "${GREEN}✅ Captured Contract Address: $CONTRACT_ADDRESS${NC}"
# fi
# cd ..

# # 5. SETUP RELAYER
# # ----------------
# echo -e "\n${BLUE}🔌 Configuring Relayer...${NC}"
# cd zcash_relayer
# npm install --silent

# # Write the .env file for the Relayer
# cat <<EOF > .env
# # Starknet Keys
# ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
# ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS
# BRIDGE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

# # Zcash Config (Auto-filled by setup.js)
# BRIDGE_ADDR=
# USER_Z_ADDRESS=
# EOF

# echo -e "${GREEN}✅ Relayer .env created.${NC}"

# # Run the Magic Docker Setup
# echo -e "\n${BLUE}🐳 Starting Zcash Docker Node & Mining...${NC}"
# node setup.js

# # 6. LAUNCH SERVICES
# # ------------------
# echo -e "\n${BLUE}🚀 Launching Services...${NC}"

# # Function to kill background processes on exit
# cleanup() {
#     echo -e "\n${YELLOW}🛑 Shutting down Relayer & UI...${NC}"
#     kill $RELAYER_PID
#     exit
# }
# trap cleanup SIGINT

# # Start Relayer Server in Background
# echo -e "${GREEN}🔥 Starting Relayer API (Background)...${NC}"
# node server.js &
# RELAYER_PID=$!

# # Wait a moment for server to spin up
# sleep 3

# # Start UI
# echo -e "${GREEN}✨ Starting UI...${NC}"
# cd ../zcash-starknet-ui
# npm install --silent
# echo -e "${BLUE}Opening Dashboard at http://localhost:5173${NC}"
# npm run dev

# # Keep script running to maintain background processes
# wait $RELAYER_PID



#!/bin/bash

# ==========================================
# 🛠️ ZKStarvion One-Click Offline Launcher
# ==========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Initializing Offline Environment...${NC}\n"

echo -e "${BLUE}
  ______  ______  _                   _             
|__  / |/ / ___|| |_ __ _ _ ____   _(_) ___  _ __  
  / /| ' /\\___ \\| __/ _\` | '__\\ \\ / / |/ _ \\| '_ \\ 
 / /_| . \\ ___) | || (_| | |   \\ V /| | (_) | | | |
/____|_|\\_\\____/ \\__\\__,_|_|    \\_/ |_|\\___/|_| |_|
${NC}"

# 1. PREREQUISITE CHECK
if ! command -v docker &> /dev/null; then echo -e "${RED}❌ Docker missing.${NC}"; exit 1; fi
if ! command -v scarb &> /dev/null; then echo -e "${RED}❌ Scarb missing.${NC}"; exit 1; fi
if ! command -v node &> /dev/null; then echo -e "${RED}❌ Node.js missing.${NC}"; exit 1; fi

# 2. CREDENTIALS INPUT (FIXED)
# --------------------
if [ -f .env.secrets ]; then
    echo -e "${GREEN}🔑 Found .env.secrets file, loading keys...${NC}"
    source .env.secrets
    
    # FIX 1: Map the loaded variables to the short names used later
    PRIVATE_KEY=$ZCASH_RELAYER_PRIVATE_KEY
    ACCOUNT_ADDRESS=$ZCASH_RELAYER_ACCOUNT_ADDRESS
else
    echo -e "${YELLOW}🔑 Enter your Starknet Sepolia Credentials:${NC}"
    read -p "Private Key (0x...): " PRIVATE_KEY
    read -p "Account Address (0x...): " ACCOUNT_ADDRESS
    
    # Save properly
    echo "ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY" > .env.secrets
    echo "ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS" >> .env.secrets
fi

# 3. BUILD CONTRACT
echo -e "\n${BLUE}🏗️  Building Starknet Contract...${NC}"
cd verifier_contract
scarb build
cd ..

# 4. DEPLOY CONTRACT (FIXED)
# ------------------
echo -e "\n${BLUE}📜 Deploying Contract to Sepolia...${NC}"
cd scripts
npm install --silent

export ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
export ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS

# Run deploy and capture output
DEPLOY_OUTPUT=$(node declare.js)
echo "$DEPLOY_OUTPUT"

# FIX 2: Precise Address Extraction
# We look specifically for the line "CONTRACT DEPLOYED AT:" and grab the last word
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "CONTRACT DEPLOYED AT:" | awk '{print $NF}')

# Fallback: If your script output format is different, try generic regex but HEAD -1
if [ -z "$CONTRACT_ADDRESS" ]; then
    # Try grabbing the LAST hex string found in the output
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[0-9a-fA-F]{50,}" | tail -n 1)
fi

if [[ -z "$CONTRACT_ADDRESS" || ${#CONTRACT_ADDRESS} -lt 50 ]]; then
    echo -e "${RED}❌ Could not auto-detect Contract Address.${NC}"
    read -p "Please paste the Contract Address manually: " CONTRACT_ADDRESS
else
    echo -e "${GREEN}✅ Captured Contract Address: $CONTRACT_ADDRESS${NC}"
fi
cd ..

# 5. SETUP RELAYER (FIXED)
# ----------------
echo -e "\n${BLUE}🔌 Configuring Relayer...${NC}"
cd zcash_relayer
npm install --silent

# Write .env cleanly
cat <<EOF > .env
# Starknet Keys
ZCASH_RELAYER_PRIVATE_KEY=$PRIVATE_KEY
ZCASH_RELAYER_ACCOUNT_ADDRESS=$ACCOUNT_ADDRESS
BRIDGE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

# Zcash Config (Auto-filled by setup.js)
BRIDGE_ADDR=
USER_Z_ADDRESS=
EOF

echo -e "${GREEN}✅ Relayer .env created.${NC}"

# Run Setup
echo -e "\n${BLUE}🐳 Starting Zcash Docker Node...${NC}"
node setup.js

# 6. LAUNCH SERVICES
echo -e "\n${BLUE}🚀 Launching Services...${NC}"

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    kill $RELAYER_PID
    exit
}
trap cleanup SIGINT

# Start Relayer
node server.js &
RELAYER_PID=$!
sleep 3

# Start UI
cd ../zcash-starknet-ui
npm install --silent
echo -e "${GREEN}✨ funding relayer wallet ${NC}"
curl -X POST http://localhost:3001/refill

echo -e "${BLUE}Opening Dashboard at http://localhost:5173${NC}"
npm run dev

wait $RELAYER_PID