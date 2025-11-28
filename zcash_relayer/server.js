const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const util = require("util");
const {
  RpcProvider,
  Account,
  ec,
  CallData,
  ETransactionVersion,
} = require("starknet");
const axios = require("axios");
require("dotenv").config();

const execPromise = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

// ===================== CONFIG =====================
const ZCASH_RPC_URL = "http://127.0.0.1:18232";
const RPC_USER = "hackathon";
const RPC_PASS = "winner";

// DETECT ENVIRONMENT: Are we on Render?
// Render automatically sets the 'RENDER' env var to true
const IS_CLOUD = process.env.RENDER === "true";

// SMART COMMAND BUILDER
// If Cloud: Run 'zcash-cli' directly
// If Laptop: Run 'docker exec ... zcash-cli'
const BASE_CMD = IS_CLOUD
  ? `zcash-cli -regtest -rpcuser=${RPC_USER} -rpcpassword=${RPC_PASS}`
  : `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=${RPC_USER} -rpcpassword=${RPC_PASS}`;

// STARKNET KEYS (From Environment)
const RELAYER_PRIVATE_KEY = process.env.ZCASH_RELAYER_PRIVATE_KEY;
const RELAYER_ADDRESS = process.env.ZCASH_RELAYER_ACCOUNT_ADDRESS;
const BRIDGE_CONTRACT = process.env.BRIDGE_CONTRACT_ADDRESS;

// ===================== STARKNET SETUP =====================
const provider = new RpcProvider({
  nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
});
const account = new Account({
  provider,
  address: RELAYER_ADDRESS,
  signer: RELAYER_PRIVATE_KEY,
  cairoVersion: "1",
  transactionVersion: ETransactionVersion.V3,
});

const processedTxs = new Set();
let bridgeHistory = [];

// ===================== API ENDPOINTS =====================

app.post("/bridge", async (req, res) => {
  try {
    // RE-FETCH ADDRESSES (In case they changed or loaded late)
    const BRIDGE_Z_ADDRESS = process.env.BRIDGE_ADDR;
    const USER_Z_ADDRESS = process.env.USER_Z_ADDRESS;

    if (!BRIDGE_Z_ADDRESS || !USER_Z_ADDRESS) {
      throw new Error("Addresses not found in Environment variables");
    }

    const { amount } = req.body;
    console.log(`UI requested bridge: ${amount}`);

    const hexMemo = Buffer.from(amount.toString(), "utf8").toString("hex");

    // 1. Send Transaction
    // We use BASE_CMD which automatically adjusts for Cloud vs Laptop
    const cmd = `${BASE_CMD} z_sendmany "${USER_Z_ADDRESS}" "[{\\"address\\": \\"${BRIDGE_Z_ADDRESS}\\", \\"amount\\": 0.001, \\"memo\\": \\"${hexMemo}\\"}]" 1 0.0001 "AllowRevealedAmounts"`;

    const { stdout: opidOutput } = await execPromise(cmd);
    const targetOpid = opidOutput.trim();

    console.log(`⏳ Waiting for ZK Proof (ID: ${targetOpid})...`);

    // 2. Poll for Success
    let isReady = false;
    for (let i = 0; i < 20; i++) {
      const statusCmd = `${BASE_CMD} z_getoperationstatus`;
      const { stdout: statusJson } = await execPromise(statusCmd);
      const operations = JSON.parse(statusJson);
      const myOp = operations.find((op) => op.id === targetOpid);

      if (myOp && myOp.status === "success") {
        isReady = true;
        break;
      } else if (myOp && myOp.status === "failed") {
        throw new Error(myOp.error.message);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!isReady) throw new Error("Transaction timed out");

    // 3. Mine Block
    await execPromise(`${BASE_CMD} generate 1`);

    res.json({ success: true, message: "Transaction Sent & Mined!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint D: Emergency Refill (The Fix)
app.post("/refill", async (req, res) => {
  try {
    console.log("⛽ Manual Refill Requested...");

    // 1. Check if we have addresses loaded
    const USER = process.env.USER_Z_ADDRESS;
    if (!USER) throw new Error("User address not found in ENV");

    // 2. Mine 101 Blocks (Unlock Coinbase)
    console.log("⛏️ Mining 101 blocks...");
    await execPromise(`${BASE_CMD} generate 101`);

    // 3. Shield Funds to User
    console.log(`💸 Moving funds to ${USER}...`);
    // We use "*" to grab ANY mined coins
    await execPromise(`${BASE_CMD} z_shieldcoinbase "*" "${USER}"`);

    // 4. Mine 1 block to confirm
    console.log("⛏️ Mining confirmation block...");
    await execPromise(`${BASE_CMD} generate 1`);

    res.json({
      success: true,
      message: "Wallet Refilled! Try bridging again.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint E: Get Raw Zcash Transaction Details
app.get("/zcash-tx/:txid", async (req, res) => {
  try {
    const { txid } = req.params;
    // Ask the node for the raw transaction data
    const cmd = `${BASE_CMD} gettransaction "${txid}"`;
    const { stdout } = await execPromise(cmd);
    res.json(JSON.parse(stdout));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Transaction not found on local node" });
  }
});

app.get("/history", (req, res) => {
  res.json(bridgeHistory);
});

// Endpoint to check status and addresses
app.get("/status", (req, res) => {
  res.json({
    online: true,
    bridgeAddr: process.env.BRIDGE_ADDR || "Loading...",
    userAddr: process.env.USER_Z_ADDRESS || "Loading...",
  });
});

// ===================== WATCHER LOOP =====================
async function checkZcashNode() {
  try {
    const BRIDGE_Z_ADDRESS = process.env.BRIDGE_ADDR;
    if (!BRIDGE_Z_ADDRESS) {
      // console.log("Waiting for addresses...");
      return;
    }

    const response = await axios.post(
      ZCASH_RPC_URL,
      {
        jsonrpc: "1.0",
        id: "relayer",
        method: "z_listreceivedbyaddress",
        params: [BRIDGE_Z_ADDRESS, 0],
      },
      { auth: { username: RPC_USER, password: RPC_PASS } }
    );

    const transactions = response.data.result;

    for (const tx of transactions) {
      if (processedTxs.has(tx.txid)) continue;

      const memoString = parseMemo(tx.memo);
      if (memoString) {
        console.log(`⚡ Found Request: ${memoString} (Tx: ${tx.txid})`);
        processedTxs.add(tx.txid);

        const historyItem = {
          zcashTxId: tx.txid,
          amount: memoString,
          status: "Relaying...",
          starknetTxId: null,
        };
        bridgeHistory.push(historyItem);

        try {
          const starknetHash = await relayToStarknet(tx.txid, memoString);
          const index = bridgeHistory.findIndex((h) => h.zcashTxId === tx.txid);
          if (index !== -1) {
            bridgeHistory[index].status = "Bridged ✅";
            bridgeHistory[index].starknetTxId = starknetHash;
          }
        } catch (err) {
          console.error("Relay Failed", err);
        }
      }
    }
  } catch (error) {
    /* Ignore connection errors */
  }
}

async function relayToStarknet(zcashTxIdHex, payloadStr) {
  const cleanPayload = payloadStr.toString().replace(/[^0-9]/g, "");
  if (!cleanPayload) return;

  const zcashTxFelt = BigInt("0x" + zcashTxIdHex.substring(0, 62));
  const payloadFelt = BigInt(cleanPayload);
  const msgHash = ec.starkCurve.pedersen(zcashTxFelt, payloadFelt);
  const signature = ec.starkCurve.sign(msgHash, RELAYER_PRIVATE_KEY);

  console.log(`📨 Relaying to Starknet...`);
  const { transaction_hash } = await account.execute({
    contractAddress: BRIDGE_CONTRACT,
    entrypoint: "process_zcash_message",
    calldata: CallData.compile([
      zcashTxFelt.toString(),
      payloadFelt.toString(),
      signature.r.toString(),
      signature.s.toString(),
    ]),
  });

  console.log(`✅ Success! Tx: ${transaction_hash}`);
  return transaction_hash;
}

function parseMemo(hexMemo) {
  if (!hexMemo || hexMemo.startsWith("f6")) return null;
  try {
    return Buffer.from(hexMemo, "hex").toString("utf8");
  } catch (e) {
    return hexMemo;
  }
}

// Start Server
setInterval(checkZcashNode, 5000);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🔥 Server running on ${PORT}`));
