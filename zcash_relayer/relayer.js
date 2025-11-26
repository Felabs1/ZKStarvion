const {
  RpcProvider,
  Account,
  ec,
  hash,
  CallData,
  ETransactionVersion,
  defaultDeployer,
  constants,
} = require("starknet");
require("dotenv").config();

// ================= CONFIGURATION =================
// 1. The Private Key of the Relayer (Must match the Public Key you deployed the contract with!)
const RELAYER_PRIVATE_KEY = process.env["ZCASH_RELAYER_PRIVATE_KEY"];
const RELAYER_ADDRESS = process.env["ZCASH_RELAYER_ACCOUNT_ADDRESS"];

// 2. The Address of your new Starknet ZcashBridge contract
const BRIDGE_CONTRACT_ADDRESS =
  "0x584b5dcd436d354fd991f9e1be2c5cadbeb1f02519928e4d22026b3152ed875";

// 3. RPC URL (Sepolia)
const NODE_URL = "https://rpc.starknet-testnet.lava.build/rpc/v0_9";
// =================================================

async function main() {
  // Initialize Provider and Account
  const provider = new RpcProvider({ nodeUrl: NODE_URL });
  //   const relayerAccount = new Account(
  //     provider,
  //     RELAYER_ADDRESS,
  //     RELAYER_PRIVATE_KEY
  //   );

  const relayerAccount = new Account({
    provider: provider,
    address: RELAYER_ADDRESS,
    signer: RELAYER_PRIVATE_KEY,
    cairoVersion: "1", // optional - Cairo version ('1' is default)
    transactionVersion: ETransactionVersion.V3, // ETransactionVersion.V3 is the default and only option
    paymaster: undefined, // optional - paymaster for sponsored transactions
    deployer: defaultDeployer, // optional - custom deployer (defaultDeployer or legacyDeployer)
    defaultTipType: "recommendedTip", // optional - tip strategy for transactions
  });

  console.log("--------------------------------------------------");
  console.log("🚀 Zcash <-> Starknet Relayer Started");
  console.log(`Watching for Zcash transactions...`);
  console.log("--------------------------------------------------");

  // MOCKING ZCASH:
  // Since we don't have a live Zcash node connected right now,
  // we will simulate finding a transaction every 10 seconds.
  setInterval(async () => {
    await processMockZcashTransaction(relayerAccount);
  }, 10000);
}

// async function processMockZcashTransaction(account) {
//   // 1. SIMULATE DATA FROM ZCASH
//   // In production, you would get this from 'zcash-cli listreceivedbyaddress'
//   const mockZcashTxId =
//     "0x" + Math.floor(Math.random() * 1000000000).toString(16); // Random Hex
//   const mockPayload = "100"; // Represents "100 ZEC" or "100 Tokens"

//   console.log(
//     `\n🔎 Found Zcash Tx: ${mockZcashTxId} | Payload: ${mockPayload}`
//   );

//   try {
//     // 2. PREPARE THE DATA FOR STARKNET
//     // We must match the Contract Logic: message_hash = zcash_tx_id + payload
//     // NOTE: In production, use Pederson or Poseidon hashing.
//     const zcashTxFelt = BigInt(mockZcashTxId);
//     const payloadFelt = BigInt(mockPayload);
//     const msgHash = zcashTxFelt + payloadFelt;

//     // 3. SIGN THE MESSAGE
//     // We sign the hash so the contract knows this came from US (the trusted relayer)
//     console.log("✍️  Signing message...");
//     const signature = ec.starkCurve.sign(
//       hash.computeHashOnElements([msgHash]),
//       RELAYER_PRIVATE_KEY
//     );

//     // 4. SEND TO STARKNET
//     console.log("📨 Relaying to Starknet...");

//     const { transaction_hash } = await account.execute({
//       contractAddress: BRIDGE_CONTRACT_ADDRESS,
//       entrypoint: "process_zcash_message",
//       //   calldata: CallData.compile({
//       //     zcash_tx_id: zcashTxFelt.toString(),
//       //     payload: payloadFelt.toString(),
//       //     signature: [signature.r.toString(), signature.s.toString()],
//       //   }),

//       calldata: CallData.compile([
//         zcashTxFelt.toString(),
//         payloadFelt.toString(),
//         signature.r.toString(),
//         signature.s.toString(),
//       ]),
//     });

//     console.log(`✅ Success! Starknet Tx Hash: ${transaction_hash}`);
//     console.log(
//       `   Verify at: https://sepolia.starkscan.co/tx/${transaction_hash}`
//     );
//   } catch (error) {
//     console.error("❌ Relay Failed:", error.message);
//     // Common error: "Tx already processed" if we accidentally reuse the ID
//   }
// }

async function processMockZcashTransaction(account) {
  const mockZcashTxId =
    "0x" + Math.floor(Math.random() * 1000000000).toString(16);
  const mockPayload = "100";

  console.log(
    `\n🔎 Found Zcash Tx: ${mockZcashTxId} | Payload: ${mockPayload}`
  );

  try {
    const zcashTxFelt = BigInt(mockZcashTxId);
    const payloadFelt = BigInt(mockPayload);

    // FIX 1: Use Pedersen Hash to match the Cairo Contract
    // We use hash.pedersen from starknet.js
    // Access pedersen directly from the StarkCurve object
    const msgHash = ec.starkCurve.pedersen(zcashTxFelt, payloadFelt);

    console.log("✍️  Signing message...");
    // FIX 2: Sign the msgHash directly
    const signature = ec.starkCurve.sign(msgHash, RELAYER_PRIVATE_KEY);

    console.log("📨 Relaying to Starknet...");

    const { transaction_hash } = await account.execute({
      contractAddress: BRIDGE_CONTRACT_ADDRESS,
      entrypoint: "process_zcash_message",
      // FIX 3: Keep the Flat Array from the previous fix
      calldata: CallData.compile([
        zcashTxFelt.toString(),
        payloadFelt.toString(),
        signature.r.toString(),
        signature.s.toString(),
      ]),
    });

    console.log(`✅ Success! Starknet Tx Hash: ${transaction_hash}`);
    console.log(
      `   Verify at: https://sepolia.starkscan.co/tx/${transaction_hash}`
    );
  } catch (error) {
    console.error("❌ Relay Failed:", error.message);
  }
}

main();
