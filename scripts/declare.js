// const {
//   RpcProvider,
//   Account,
//   ETransactionVersion,
//   defaultDeployer,
//   json,
//   hash,
// } = require("starknet");
// const fs = require("fs");
// require("dotenv").config();
// const {
//   sierra,
// } = require("../contracts/target/dev/contracts_ZCashBridge.contract_class.json");

// const providerSepoliaTestnetLavaPublic = new RpcProvider({
//   nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
// });

// const account_address = process.env["0xYOUR_ACCOUNT_ADDRESS"];
// const private_key = process.env["0xYOUR_PRIVATE_KEY"];

// const account = new Account({
//   provider: providerSepoliaTestnetLavaPublic,
//   address: account_address,
//   signer: private_key,
//   cairoVersion: "1", // optional - Cairo version ('1' is default)
//   transactionVersion: ETransactionVersion.V3, // ETransactionVersion.V3 is the default and only option
//   paymaster: undefined, // optional - paymaster for sponsored transactions
//   deployer: defaultDeployer, // optional - custom deployer (defaultDeployer or legacyDeployer)
//   defaultTipType: "recommendedTip", // optional - tip strategy for transactions
// });

// // console.log(account);
// // console.log(sierra);

// const compiledSierra = json.parse(
//   fs
//     .readFileSync(
//       "../contracts/target/dev/contracts_ZCashBridge.contract_class.json"
//     )
//     .toString("ascii")
// );

// const compiledCasm = json.parse(
//   fs
//     .readFileSync(
//       "../contracts/target/dev/contracts_ZCashBridge.compiled_contract_class.json"
//     )
//     .toString("ascii")
// );

// // console.log(compiledCasm);
// // const result = hash.computeContractClassHash(compiledSierra);
// // console.log(result);
// // result = "0x67b6b4f02baded46f02feeed58c4f78e26c55364e59874d8abfd3532d85f1ba"

// // const { suggestedMaxFee } = await account.estimateDeclareFee({
// //   contract: sierra,
// //   classHash: result,
// // });

// async function declare() {
//   const declareResponse = await account.declare({
//     contract: compiledSierra,
//     casm: compiledCasm,
//   });

//   await providerSepoliaTestnetLavaPublic.waitForTransaction(
//     declareResponse.transaction_hash
//   );
//   console.log("Class Hash:", declareResponse.class_hash);
// }

// async function deploy() {
//   const existing_class_hash =
//     "0x706367936e29d8774195bc9a4a1107d5ee277f5382c51ff126670faca7e1239";
//   const deployResponse = await account.deployContract({
//     classHash: existing_class_hash,
//     constructorCalldata: {
//       relayer_key: process.env["ZCASH_RELAYER_PUBLIC_KEY"],
//     },
//   });

//   await providerSepoliaTestnetLavaPublic.waitForTransaction(
//     deployResponse.transaction_hash
//   );
//   console.log("Contract Address:", deployResponse.contract_address);
// }

// // declare();
// deploy();

const {
  RpcProvider,
  Account,
  ETransactionVersion,
  CallData,
  ec,
  defaultDeployer,
  json,
  hash,
} = require("starknet");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Automated Deployment...");

  // ================= 1. CONFIGURATION =================
  const provider = new RpcProvider({
    nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
  });

  // Load Keys from .env
  const accountAddress = process.env["0xYOUR_ACCOUNT_ADDRESS"];
  const privateKey = process.env["0xYOUR_PRIVATE_KEY"];

  if (!privateKey || !accountAddress) {
    throw new Error("❌ Missing Starknet Keys in .env file");
  }

  // Initialize Account
  const account = new Account({
    provider: provider,
    address: accountAddress,
    signer: privateKey,
    cairoVersion: "1", // optional - Cairo version ('1' is default)
    transactionVersion: ETransactionVersion.V3, // ETransactionVersion.V3 is the default and only option
    paymaster: undefined, // optional - paymaster for sponsored transactions
    deployer: defaultDeployer, // optional - custom deployer (defaultDeployer or legacyDeployer)
    defaultTipType: "recommendedTip", // optional - tip strategy for transactions
  });

  console.log(`👤 Deploying with Account: ${accountAddress}`);

  // ================= 2. READ ARTIFACTS =================
  // Adjust these paths if your folder structure is different
  const SIERRA_PATH = path.resolve(
    __dirname,
    "../verifier_contract/target/dev/contracts_ZCashBridge.contract_class.json"
  );
  const CASM_PATH = path.resolve(
    __dirname,
    "../verifier_contract/target/dev/contracts_ZCashBridge.compiled_contract_class.json"
  );

  if (!fs.existsSync(SIERRA_PATH) || !fs.existsSync(CASM_PATH)) {
    throw new Error(
      "❌ Compiled contracts not found! Run 'scarb build' first."
    );
  }

  const compiledSierra = json.parse(
    fs.readFileSync(SIERRA_PATH).toString("ascii")
  );
  const compiledCasm = json.parse(fs.readFileSync(CASM_PATH).toString("ascii"));

  // ================= 3. DECLARE CONTRACT =================
  // Calculate Class Hash locally to check if we need to declare
  const classHash = hash.computeContractClassHash(compiledSierra);
  console.log(`📜 Contract Class Hash: ${classHash}`);

  try {
    // Check if already declared to save gas
    await provider.getClassByHash(classHash);
    console.log("✅ Class already declared. Skipping declaration.");
  } catch (error) {
    console.log("⏳ Class not found. Declaring...");
    try {
      const declareResponse = await account.declare({
        contract: compiledSierra,
        casm: compiledCasm,
      });

      console.log(
        `⏳ Waiting for Declare Tx: ${declareResponse.transaction_hash}`
      );
      await provider.waitForTransaction(declareResponse.transaction_hash);
      console.log("✅ Contract Declared!");
    } catch (declareError) {
      if (declareError.message.includes("already declared")) {
        console.log("✅ Class already declared (caught error).");
      } else {
        throw declareError;
      }
    }
  }

  // ================= 4. DEPLOY CONTRACT =================
  // Derive the Public Key for the Constructor
  const relayerPublicKey = ec.starkCurve.getStarkKey(privateKey);
  console.log(`🔐 Derived Relayer Public Key: ${relayerPublicKey}`);

  console.log("⏳ Deploying Contract Instance...");

  // Use deployContract which is the modern helper
  const deployResponse = await account.deployContract({
    classHash: classHash,
    // Pass constructor arguments as an array (safer than object)
    constructorCalldata: CallData.compile([relayerPublicKey]),
  });

  console.log(`⏳ Waiting for Deploy Tx: ${deployResponse.transaction_hash}`);
  await provider.waitForTransaction(deployResponse.transaction_hash);

  const contractAddress = deployResponse.contract_address;
  console.log(`🎉 CONTRACT DEPLOYED AT: ${contractAddress}`);

  // ================= 5. SAVE TO .ENV =================
  console.log("💾 Saving address to .env...");
  const envPath = path.resolve(__dirname, "../.env"); // Adjust path to your root .env

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or Append BRIDGE_CONTRACT_ADDRESS
  if (envContent.includes("BRIDGE_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /BRIDGE_CONTRACT_ADDRESS=.*/g,
      `BRIDGE_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nBRIDGE_CONTRACT_ADDRESS=${contractAddress}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Setup Complete! You can now run the server.");
}

main().catch((error) => {
  console.error("❌ Fatal Error:", error);
  process.exit(1);
});
