// const {
//   RpcProvider,
//   Account,
//   ec,
//   CallData,
//   ETransactionVersion,
//   defaultDeployer,
// } = require("starknet");
// const axios = require("axios");
// require("dotenv").config();

// // ===================== 1. ZCASH CONFIG (DOCKER) =====================
// const ZCASH_RPC_URL = "http://127.0.0.1:18232";
// const RPC_USER = "hackathon";
// const RPC_PASS = "winner";

// // ⚠️ PASTE THE 'zreg...' ADDRESS YOU CREATED IN STEP 3.1 HERE
// const BRIDGE_Z_ADDRESS = process.env["BRIDGE_ADDR"];

// // ===================== 2. STARKNET CONFIG =====================
// // ⚠️ YOUR STARKNET DETAILS
// const RELAYER_PRIVATE_KEY = process.env["ZCASH_RELAYER_PRIVATE_KEY"];
// const RELAYER_ADDRESS = process.env["ZCASH_RELAYER_ACCOUNT_ADDRESS"];
// const BRIDGE_CONTRACT = process.env["BRIDGE_CONTRACT_ADDRESS"];

// // ==============================================================

// const provider = new RpcProvider({
//   nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
// });
// const account = new Account({
//   provider: provider,
//   address: RELAYER_ADDRESS,
//   signer: RELAYER_PRIVATE_KEY,
//   cairoVersion: "1", // optional - Cairo version ('1' is default)
//   transactionVersion: ETransactionVersion.V3, // ETransactionVersion.V3 is the default and only option
//   paymaster: undefined, // optional - paymaster for sponsored transactions
//   deployer: defaultDeployer, // optional - custom deployer (defaultDeployer or legacyDeployer)
//   defaultTipType: "recommendedTip", // optional - tip strategy for transactions
// });
// const processedTxs = new Set();

// async function main() {
//   console.log("--------------------------------------------------");
//   console.log("🚀 Docker Relayer Started");
//   console.log(`📡 Watching Local Zcash Node: ${ZCASH_RPC_URL}`);
//   console.log(`🎯 Target Bridge Address: ${BRIDGE_Z_ADDRESS}`);
//   console.log("--------------------------------------------------");

//   // Check for new transactions every 5 seconds
//   setInterval(checkZcashNode, 5000);
//   checkZcashNode();
// }

// async function checkZcashNode() {
//   try {
//     // 1. Ask Zcash Node: "What encrypted messages do I have?"
//     const response = await zcashRpc("z_listreceivedbyaddress", [
//       BRIDGE_Z_ADDRESS,
//       0,
//     ]);
//     const transactions = response.result;

//     for (const tx of transactions) {
//       // Skip if we already processed this TxID
//       if (processedTxs.has(tx.txid)) continue;

//       // 2. Parse the Memo (Zcash returns it as Hex string)
//       const memoString = parseMemo(tx.memo);

//       // If valid memo found, RELAY IT!
//       if (memoString) {
//         console.log(`\n⚡ New Request Found!`);
//         console.log(`   TxID: ${tx.txid}`);
//         console.log(`   Memo: ${memoString} (Starknet Tokens)`);

//         // mark as processed immediately the next loop picks it up
//         processedTxs.add(tx.txid);

//         try {
//           await relayToStarknet(tx.txid, memoString);
//         } catch (err) {
//           console.error(
//             "Relay failed, but we won't retry to avoid nonce errors."
//           );
//         }
//       }
//     }
//   } catch (error) {
//     if (error.code === "ECONNREFUSED") {
//       console.error("❌ Connection Error: Is your Docker container running?");
//     } else if (error.response) {
//       // Ignore empty address errors on startup
//       // console.error("RPC Error:", error.response.data);
//     } else {
//       console.error("Error:", error.message);
//     }
//   }
// }

// async function relayToStarknet(zcashTxIdHex, payloadStr) {
//   try {
//     // Prepare Data for Starknet (Felts)
//     // Note: Taking first 62 chars of TxID to fit in 252-bit Felt
//     const zcashTxFelt = BigInt("0x" + zcashTxIdHex.substring(0, 62));
//     const payloadFelt = BigInt(payloadStr);

//     // 1. Hash the Data (Pedersen Hash)
//     // This must match the logic in your Cairo contract
//     const msgHash = ec.starkCurve.pedersen(zcashTxFelt, payloadFelt);

//     // 2. Sign the Hash (Asymmetric Cryptography)
//     const signature = ec.starkCurve.sign(msgHash, RELAYER_PRIVATE_KEY);

//     console.log("📨 Relaying to Starknet Sepolia...");

//     // 3. Send Transaction
//     const { transaction_hash } = await account.execute({
//       contractAddress: BRIDGE_CONTRACT,
//       entrypoint: "process_zcash_message",
//       calldata: CallData.compile([
//         zcashTxFelt.toString(),
//         payloadFelt.toString(),
//         signature.r.toString(),
//         signature.s.toString(),
//       ]),
//     });

//     console.log(`✅ Success! Starknet Tx: ${transaction_hash}`);
//     console.log(`   View: https://sepolia.starkscan.co/tx/${transaction_hash}`);
//   } catch (err) {
//     console.error("❌ Starknet Error:", err.message);
//   }
// }

// // === HELPERS ===

// // Connects to Docker JSON-RPC
// async function zcashRpc(method, params) {
//   const response = await axios.post(
//     ZCASH_RPC_URL,
//     {
//       jsonrpc: "1.0",
//       id: "relayer",
//       method: method,
//       params: params,
//     },
//     {
//       auth: { username: RPC_USER, password: RPC_PASS },
//     }
//   );
//   return response.data;
// }

// // Converts Hex Memo (e.g., "313030") to String ("100")
// function parseMemo(hexMemo) {
//   if (!hexMemo || hexMemo.startsWith("f6")) return null; // Ignore empty memos
//   try {
//     let str = "";
//     for (let i = 0; i < hexMemo.length; i += 2) {
//       const code = parseInt(hexMemo.substr(i, 2), 16);
//       if (code === 0) break;
//       str += String.fromCharCode(code);
//     }
//     return str.length > 0 ? str : hexMemo;
//   } catch (e) {
//     return hexMemo;
//   }
// }

// main();

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
  defaultDeployer,
} = require("starknet");
const axios = require("axios");
require("dotenv").config();

// Promisify exec for the API commands
const execPromise = util.promisify(exec);

// Initialize Express App
const app = express();
app.use(cors());
app.use(express.json());

// ===================== 1. CONFIGURATION =====================
const ZCASH_RPC_URL = "http://127.0.0.1:18232";
const RPC_USER = "hackathon";
const RPC_PASS = "winner";

const BRIDGE_Z_ADDRESS = process.env["BRIDGE_ADDR"];
const USER_Z_ADDRESS = process.env["USER_Z_ADDRESS"]; // <--- NEW: Needed for sending from UI

const RELAYER_PRIVATE_KEY = process.env["ZCASH_RELAYER_PRIVATE_KEY"];
const RELAYER_ADDRESS = process.env["ZCASH_RELAYER_ACCOUNT_ADDRESS"];
const BRIDGE_CONTRACT = process.env["BRIDGE_CONTRACT_ADDRESS"];

// ===================== 2. STARKNET SETUP (YOUR EXACT CODE) =====================
const provider = new RpcProvider({
  nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
});

const account = new Account({
  provider: provider,
  address: RELAYER_ADDRESS,
  signer: RELAYER_PRIVATE_KEY,
  cairoVersion: "1",
  transactionVersion: ETransactionVersion.V3,
  paymaster: undefined,
  deployer: defaultDeployer,
  defaultTipType: "recommendedTip",
});

// State for the UI
const processedTxs = new Set();
let bridgeHistory = [];

// ===================== 3. API ENDPOINTS (FOR UI) =====================

// Endpoint A: UI asks to send Zcash
app.post("/bridge", async (req, res) => {
  try {
    const { amount } = req.body;
    console.log(`UI requested bridge: ${amount}`);

    // Convert amount string to Hex Memo
    const hexMemo = Buffer.from(amount.toString(), "utf8").toString("hex");

    // Docker Command to send Zcash
    // We send 0.001 ZEC fixed, but the Memo contains the real requested amount
    const cmd = `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner z_sendmany "${USER_Z_ADDRESS}" "[{\\"address\\": \\"${BRIDGE_Z_ADDRESS}\\", \\"amount\\": 0.001, \\"memo\\": \\"${hexMemo}\\"}]" 1 0.0001 "AllowRevealedAmounts"`;

    await execPromise(cmd);

    // Mine immediately for instant UX
    await execPromise(
      `docker exec zcash-hackathon zcash-cli -regtest -rpcuser=hackathon -rpcpassword=winner generate 1`
    );

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint B: UI asks for history
app.get("/history", (req, res) => {
  res.json(bridgeHistory);
});

// ===================== 4. THE WATCHER LOOP =====================
async function checkZcashNode() {
  try {
    const response = await zcashRpc("z_listreceivedbyaddress", [
      BRIDGE_Z_ADDRESS,
      0,
    ]);
    const transactions = response.result;

    for (const tx of transactions) {
      if (processedTxs.has(tx.txid)) continue;

      const memoString = parseMemo(tx.memo);

      if (memoString) {
        console.log(`\n⚡ New Request Found! TxID: ${tx.txid}`);

        // 1. Mark as processed
        processedTxs.add(tx.txid);

        // 2. Add to UI History as "Processing"
        const historyItem = {
          zcashTxId: tx.txid,
          amount: memoString,
          status: "Relaying...",
          starknetTxId: null,
        };
        bridgeHistory.push(historyItem);

        // 3. Relay
        try {
          const starknetHash = await relayToStarknet(tx.txid, memoString);

          // 4. Update UI History to "Success"
          const index = bridgeHistory.findIndex((h) => h.zcashTxId === tx.txid);
          if (index !== -1) {
            bridgeHistory[index].status = "Bridged ✅";
            bridgeHistory[index].starknetTxId = starknetHash;
          }
        } catch (err) {
          console.error("Relay failed:", err);
        }
      }
    }
  } catch (error) {
    if (error.code !== "ECONNREFUSED") console.error("Error:", error.message);
  }
}

async function relayToStarknet(zcashTxIdHex, payloadStr) {
  // 1. SANITIZE THE PAYLOAD
  // Remove null bytes, spaces, and anything that isn't a number
  const cleanPayload = payloadStr.toString().replace(/[^0-9]/g, "");

  // Safety check: if it's empty after cleaning, default to 0
  if (!cleanPayload) {
    console.error("Payload was empty after cleaning");
    return;
  }

  // Prepare Data for Starknet (Felts)
  const zcashTxFelt = BigInt("0x" + zcashTxIdHex.substring(0, 62));

  // 2. CONVERT TO BIGINT (Now safe because it's pure digits)
  const payloadFelt = BigInt(cleanPayload);

  // Hash the Data
  const msgHash = ec.starkCurve.pedersen(zcashTxFelt, payloadFelt);

  // Sign the Hash
  const signature = ec.starkCurve.sign(msgHash, RELAYER_PRIVATE_KEY);

  console.log(`📨 Relaying Value: ${cleanPayload} to Starknet Sepolia...`);

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

  console.log(`✅ Success! Starknet Tx: ${transaction_hash}`);
  return transaction_hash;
}

// === HELPERS ===
async function zcashRpc(method, params) {
  const response = await axios.post(
    ZCASH_RPC_URL,
    { jsonrpc: "1.0", id: "relayer", method: method, params: params },
    { auth: { username: RPC_USER, password: RPC_PASS } }
  );
  return response.data;
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
app.listen(3001, () => {
  console.log("--------------------------------------------------");
  console.log("🚀 Relayer API running on http://localhost:3001");
  console.log(`📡 Watching Zcash Node: ${ZCASH_RPC_URL}`);
  console.log("--------------------------------------------------");
});
