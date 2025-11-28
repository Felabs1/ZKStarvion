#!/bin/bash

# 1. Start Zcash in background
echo "🚀 Starting Zcash Node..."
zcashd -daemon \
  -regtest \
  -rpcuser=hackathon -rpcpassword=winner \
  -rpcport=18232 -rpcbind=0.0.0.0 -rpcallowip=0.0.0.0/0 \
  -txindex=1 -experimentalfeatures=1 -zmergetoaddress \
  -i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1 \
  -nuparams=5ba81b19:1 -nuparams=76b809bb:1 -nuparams=2bb40e60:1 \
  -nuparams=f5b9230b:1 -nuparams=e9ff75a6:1 -nuparams=c2d6d0b4:1 \
  -allowdeprecated=z_getnewaddress -allowdeprecated=z_getbalance

echo "⏳ Waiting 15s for node initialization..."
sleep 15

# 2. GENERATE NEW ADDRESSES
# We run the command and save the text output into a variable
RAW_BRIDGE=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)
RAW_USER=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)

# Trim any whitespace
BRIDGE_ADDR=$(echo "$RAW_BRIDGE" | xargs)
USER_Z_ADDRESS=$(echo "$RAW_USER" | xargs)

echo "✅ Generated Addresses:"
echo "   Bridge: $BRIDGE_ADDR"
echo "   User:   $USER_Z_ADDRESS"

# 3. EXPORT AS ENVIRONMENT VARIABLES
# This makes them visible to the Node.js script below
export BRIDGE_ADDR=$BRIDGE_ADDR
export USER_Z_ADDRESS=$USER_Z_ADDRESS

# 4. MINE & FUND
echo "⛏️  Mining Funds..."
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 101 > /dev/null
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_shieldcoinbase "*" "$USER_Z_ADDRESS"
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 1 > /dev/null

# 5. START NODE.JS
# Because we exported the variables above, server.js can now read them!
echo "🚀 Starting Relayer..."
node server.js