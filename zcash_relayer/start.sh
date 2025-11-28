#!/bin/bash

echo "🚀 Starting Zcash Node in Background..."
# Start Zcashd with all the Regtest flags we figured out earlier
zcashd -daemon \
  -regtest \
  -rpcuser=hackathon -rpcpassword=winner \
  -rpcport=18232 -rpcbind=0.0.0.0 -rpcallowip=0.0.0.0/0 \
  -txindex=1 -experimentalfeatures=1 -zmergetoaddress \
  -i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1 \
  -nuparams=5ba81b19:1 -nuparams=76b809bb:1 -nuparams=2bb40e60:1 \
  -nuparams=f5b9230b:1 -nuparams=e9ff75a6:1 -nuparams=c2d6d0b4:1 \
  -allowdeprecated=z_getnewaddress -allowdeprecated=z_getbalance

echo "⏳ Waiting 15s for Zcash to wake up..."
sleep 15

echo "🔑 Creating Cloud Wallets..."
# Generate addresses
BRIDGE=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)
USER=$(zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress)

echo "   Bridge: $BRIDGE"
echo "   User:   $USER"

# Export them as ENV variables so Node.js can read them
export BRIDGE_ADDR=$BRIDGE
export USER_Z_ADDRESS=$USER

echo "⛏️  Mining Initial Funds (101 Blocks)..."
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 101 > /dev/null

echo "💸 Funding User Account..."
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_shieldcoinbase "*" "$USER"
zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 1 > /dev/null

echo "✅ Cloud Node Ready! Starting API Server..."
# Start your Node.js server
node server.js