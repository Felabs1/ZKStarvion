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

echo "⏳ Waiting for Zcash RPC to come online..."

# 2. THE FIX: Smart Wait Loop
# We try to get info. If it fails, we wait 2s and try again. 
# We do this up to 30 times (60 seconds max).
count=0
while ! zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner getblockchaininfo > /dev/null 2>&1; do
  echo "   ... loading ($count/30)"
  sleep 2
  count=$((count+1))
  if [ $count -gt 60 ]; then
    echo "❌ Error: Zcash node failed to start in 2 minutes."
    exit 1
  fi
done

echo "✅ Zcash Node is ONLINE!"

# 3. GENERATE NEW ADDRESSES
RAW_BRIDGE=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)
RAW_USER=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)

BRIDGE_ADDR=$(echo "$RAW_BRIDGE" | xargs)
USER_Z_ADDRESS=$(echo "$RAW_USER" | xargs)

echo "✅ Generated Addresses:"
echo "   Bridge: $BRIDGE_ADDR"
echo "   User:   $USER_Z_ADDRESS"

# 4. EXPORT AS ENVIRONMENT VARIABLES
export BRIDGE_ADDR=$BRIDGE_ADDR
export USER_Z_ADDRESS=$USER_Z_ADDRESS

# 5. MINE & FUND
echo "⛏️  Mining Funds..."
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 101 > /dev/null
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_shieldcoinbase "*" "$USER_Z_ADDRESS"
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 1 > /dev/null

# 6. START NODE.JS
echo "🚀 Starting Relayer..."
node server.js