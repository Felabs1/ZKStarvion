const { exec } = require("child_process");
const fs = require("fs");
const util = require("util");
const execPromise = util.promisify(exec);

async function main() {
  console.log("🪄  Starting Magic Setup for Zcash <-> Starknet...");

  try {
    // 1. START DOCKER CONTAINER
    console.log("🐳 Starting Zcash Local Node (Regtest)...");
    try {
      // Try to kill old one first to ensure clean state
      await execPromise("docker rm -f zcash-hackathon");
    } catch (e) {}

    // The Massive Command (Mac/Linux compatible)
    const runCmd = `docker run --platform linux/amd64 --name zcash-hackathon -d \
            -p 18232:18232 \
            electriccoinco/zcashd \
            -regtest -rpcuser=hackathon -rpcpassword=winner -rpcport=18232 \
            -rpcbind=0.0.0.0 -rpcallowip=0.0.0.0/0 \
            -txindex=1 -experimentalfeatures=1 -zmergetoaddress \
            -i-am-aware-zcashd-will-be-replaced-by-zebrad-and-zallet-in-2025=1 \
            -nuparams=5ba81b19:1 -nuparams=76b809bb:1 -nuparams=2bb40e60:1 \
            -nuparams=f5b9230b:1 -nuparams=e9ff75a6:1 -nuparams=c2d6d0b4:1 \
            -allowdeprecated=z_getnewaddress -allowdeprecated=z_getbalance`;

    await execPromise(runCmd);
    console.log("⏳ Waiting for node to wake up (10s)...");
    await new Promise((r) => setTimeout(r, 10000));

    // 2. CREATE ADDRESSES
    console.log("🔑 Generating Wallets...");
    const { stdout: bridgeAddr } = await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress`
    );
    const { stdout: userAddr } = await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_getnewaddress`
    );

    const BRIDGE_ADDR = bridgeAddr.trim();
    const USER_ADDR = userAddr.trim();
    console.log(`   Bridge: ${BRIDGE_ADDR.substring(0, 10)}...`);
    console.log(`   User:   ${USER_ADDR.substring(0, 10)}...`);

    // 3. MINE & FUND
    console.log("⛏️  Mining 101 Blocks to generate ZEC...");
    await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 101`
    );

    console.log("💸 Funding User Wallet...");
    await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_shieldcoinbase "*" "${USER_ADDR}"`
    );

    console.log("⛏️  Mining confirmation block...");
    await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 1`
    );

    // 4. SAVE CONFIG TO .ENV
    console.log("💾 Saving configuration...");

    // Read existing .env to keep Starknet keys
    let envContent = "";
    if (fs.existsSync(".env")) {
      envContent = fs.readFileSync(".env", "utf8");
    }

    // Remove old Zcash lines if they exist
    envContent = envContent.replace(/BRIDGE_ADDR=.*\n?/g, "");
    envContent = envContent.replace(/USER_Z_ADDRESS=.*\n?/g, "");

    // Append new addresses
    envContent += `\nBRIDGE_ADDR=${BRIDGE_ADDR}`;
    envContent += `\nUSER_Z_ADDRESS=${USER_ADDR}`;

    fs.writeFileSync(".env", envContent.trim());

    console.log("\n✅ SETUP COMPLETE! Your environment is ready.");
    console.log("👉 Run 'node server.js' to start the backend.");
  } catch (e) {
    console.error("❌ Setup Failed:", e.message);
    console.error("Make sure Docker Desktop is running!");
  }
}

main();
