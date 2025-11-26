const {
  RpcProvider,
  Account,
  ETransactionVersion,
  defaultDeployer,
  json,
  hash,
} = require("starknet");
const fs = require("fs");
require("dotenv").config();
const {
  sierra,
} = require("../contracts/target/dev/contracts_ZCashBridge.contract_class.json");

const providerSepoliaTestnetLavaPublic = new RpcProvider({
  nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
});

const account_address = process.env["0xYOUR_ACCOUNT_ADDRESS"];
const private_key = process.env["0xYOUR_PRIVATE_KEY"];

const account = new Account({
  provider: providerSepoliaTestnetLavaPublic,
  address: account_address,
  signer: private_key,
  cairoVersion: "1", // optional - Cairo version ('1' is default)
  transactionVersion: ETransactionVersion.V3, // ETransactionVersion.V3 is the default and only option
  paymaster: undefined, // optional - paymaster for sponsored transactions
  deployer: defaultDeployer, // optional - custom deployer (defaultDeployer or legacyDeployer)
  defaultTipType: "recommendedTip", // optional - tip strategy for transactions
});

// console.log(account);
// console.log(sierra);

const compiledSierra = json.parse(
  fs
    .readFileSync(
      "../contracts/target/dev/contracts_ZCashBridge.contract_class.json"
    )
    .toString("ascii")
);

const compiledCasm = json.parse(
  fs
    .readFileSync(
      "../contracts/target/dev/contracts_ZCashBridge.compiled_contract_class.json"
    )
    .toString("ascii")
);

// console.log(compiledCasm);
// const result = hash.computeContractClassHash(compiledSierra);
// console.log(result);
// result = "0x67b6b4f02baded46f02feeed58c4f78e26c55364e59874d8abfd3532d85f1ba"

// const { suggestedMaxFee } = await account.estimateDeclareFee({
//   contract: sierra,
//   classHash: result,
// });

async function declare() {
  const declareResponse = await account.declare({
    contract: compiledSierra,
    casm: compiledCasm,
  });

  await providerSepoliaTestnetLavaPublic.waitForTransaction(
    declareResponse.transaction_hash
  );
  console.log("Class Hash:", declareResponse.class_hash);
}

async function deploy() {
  const existing_class_hash =
    "0x706367936e29d8774195bc9a4a1107d5ee277f5382c51ff126670faca7e1239";
  const deployResponse = await account.deployContract({
    classHash: existing_class_hash,
    constructorCalldata: {
      relayer_key: process.env["ZCASH_RELAYER_PUBLIC_KEY"],
    },
  });

  await providerSepoliaTestnetLavaPublic.waitForTransaction(
    deployResponse.transaction_hash
  );
  console.log("Contract Address:", deployResponse.contract_address);
}

// declare();
deploy();
