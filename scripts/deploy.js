const {
  RpcProvider,
  Account,
  ETransactionVersion,
  CallData,
  ec,
  defaultDeployer,
  json,
  hash,
  Contract,
} = require("starknet");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Multi-Contract Deployment...");

  // ================= 1. CONFIGURATION =================
  const provider = new RpcProvider({
    nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
  });

  // Load Keys (Using the standardized names from your setup script)
  const accountAddress =
    process.env.ZCASH_RELAYER_ACCOUNT_ADDRESS ||
    process.env["0xYOUR_ACCOUNT_ADDRESS"];
  const privateKey =
    process.env.ZCASH_RELAYER_PRIVATE_KEY || process.env["0xYOUR_PRIVATE_KEY"];

  if (!privateKey || !accountAddress) {
    throw new Error("❌ Missing Starknet Keys in .env file");
  }

  const account = new Account({
    provider: provider,
    address: accountAddress,
    signer: privateKey,
    cairoVersion: "1",
    transactionVersion: ETransactionVersion.V3,
  });

  console.log(`👤 Deploying with Account: ${accountAddress}`);

  // ================= 2. HELPER: LOAD ARTIFACTS =================
  const BASE_PATH = path.resolve(__dirname, "../verifier_contract/target/dev");

  function getArtifacts(contractName) {
    // Scarb usually names files like: package_name_ContractName.contract_class.json
    // Assuming package name is 'contracts' based on previous context.
    // Adjust 'contracts_' if your Scarb.toml name is different.
    const sierraPath = path.join(
      BASE_PATH,
      `contracts_${contractName}.contract_class.json`
    );
    const casmPath = path.join(
      BASE_PATH,
      `contracts_${contractName}.compiled_contract_class.json`
    );

    if (!fs.existsSync(sierraPath) || !fs.existsSync(casmPath)) {
      throw new Error(
        `❌ Artifacts not found for ${contractName} at ${sierraPath}`
      );
    }

    return {
      sierra: json.parse(fs.readFileSync(sierraPath).toString("ascii")),
      casm: json.parse(fs.readFileSync(casmPath).toString("ascii")),
    };
  }

  // ================= 3. DECLARE CONTRACTS =================
  async function declareContract(name, artifacts) {
    const classHash = hash.computeContractClassHash(artifacts.sierra);
    console.log(`📜 ${name} Class Hash: ${classHash}`);

    try {
      await provider.getClassByHash(classHash);
      console.log(`✅ ${name} already declared.`);
    } catch (e) {
      console.log(`⏳ Declaring ${name}...`);
      const declareResponse = await account.declare({
        contract: artifacts.sierra,
        casm: artifacts.casm,
      });
      await provider.waitForTransaction(declareResponse.transaction_hash);
      console.log(`✅ ${name} Declared!`);
    }
    return classHash;
  }

  const bridgeArtifacts = getArtifacts("ZcashBridge");
  const tokenArtifacts = getArtifacts("BridgedToken");

  const bridgeClassHash = await declareContract("ZcashBridge", bridgeArtifacts);
  const tokenClassHash = await declareContract("BridgedToken", tokenArtifacts);

  // ================= 4. DEPLOY BRIDGE =================
  const relayerPublicKey = ec.starkCurve.getStarkKey(privateKey);
  console.log(`🔐 Relayer Public Key: ${relayerPublicKey}`);

  console.log("⏳ Deploying ZcashBridge...");
  const bridgeDeploy = await account.deployContract({
    classHash: bridgeClassHash,
    constructorCalldata: CallData.compile([relayerPublicKey, accountAddress]),
  });
  await provider.waitForTransaction(bridgeDeploy.transaction_hash);
  const bridgeAddress = bridgeDeploy.contract_address;
  console.log(`🎉 Bridge Deployed at: ${bridgeAddress}`);

  // ================= 5. DEPLOY TOKEN =================
  console.log("⏳ Deploying BridgedToken (BZEC)...");
  // The Token needs the Bridge Address in constructor to set Owner
  const tokenDeploy = await account.deployContract({
    classHash: tokenClassHash,
    constructorCalldata: CallData.compile([bridgeAddress]),
  });
  await provider.waitForTransaction(tokenDeploy.transaction_hash);
  const tokenAddress = tokenDeploy.contract_address;
  console.log(`🎉 Token Deployed at: ${tokenAddress}`);

  // ================= 6. LINK CONTRACTS =================
  console.log("🔗 Linking Bridge to Token...");
  // We need to tell the Bridge what the Token address is
  const { transaction_hash: linkTx } = await account.execute({
    contractAddress: bridgeAddress,
    entrypoint: "set_token_address",
    calldata: CallData.compile([tokenAddress]),
  });
  await provider.waitForTransaction(linkTx);
  console.log("✅ Bridge linked to Token successfully.");

  // ================= 7. SAVE TO .ENV =================
  console.log("💾 Saving addresses to .env...");
  const envPath = path.resolve(__dirname, "../zcash_relayer/.env"); // Ensure this points to Relayer env

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Helper to update specific key
  const updateEnvKey = (key, value) => {
    const regex = new RegExp(`${key}=.*`, "g");
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  };

  updateEnvKey("BRIDGE_CONTRACT_ADDRESS", bridgeAddress);
  updateEnvKey("TOKEN_CONTRACT_ADDRESS", tokenAddress); // Optional, good for UI

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Deployment Complete! Relayer .env updated.");
}

main().catch((error) => {
  console.error("❌ Fatal Error:", error);
  process.exit(1);
});
